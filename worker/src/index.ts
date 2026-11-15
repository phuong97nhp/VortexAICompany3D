import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';
import { sendEmailSmtp, sendTelegramFallback } from './channels.js';
import { runWorkerLlmChat } from './llmProvider.js';
import { encryptSecretObject, redactForLog } from './vault.js';
import { sendZaloOAMessage, verifyZaloWebhookSignature } from './zalo.js';
import { runEmailPlaybook } from '../playbooks/email.js';
import { runZaloOaPlaybook } from '../playbooks/zalo_oa.js';
import { runFacebookPagePlaybook } from '../playbooks/facebook_page.js';
import { runGoogleBusinessPlaybook } from '../playbooks/google_business.js';
import { runCanvaSocialPlaybook } from '../playbooks/canva_social.js';
import { runTikTokBusinessPlaybook } from '../playbooks/tiktok_business.js';
import { runYouTubeChannelPlaybook } from '../playbooks/youtube_channel.js';
import { runLinkedInPagePlaybook } from '../playbooks/linkedin_page.js';
import { DeviceFarmService } from '../device/deviceService.js';
import { ZaloPersonalWorker } from './zaloPersonalWorker.js';
import { runRepoInDockerSandbox } from './repoSandboxRunner.js';

const PORT = Number(process.env.PORT || 4100);
const prisma = new PrismaClient();
const zaloPersonal = new ZaloPersonalWorker();

const app = express();
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
    },
  })
);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcastEvent(event: string, data: unknown) {
  const payload = JSON.stringify({ event, data, timestamp: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    dryRun: process.env.DRY_RUN !== 'false',
    llmProvider: process.env.LLM_PROVIDER || 'gemini',
  });
});

// Shared Multi-Provider LLM endpoint in /worker
app.post('/llm/chat', async (req, res) => {
  try {
    const out = await runWorkerLlmChat(req.body);
    res.json(out);
  } catch (err) {
    res.status(502).json({ error: redactForLog(String(err)) });
  }
});

// Proxy endpoints for Local Ollama / LM Studio
app.post('/proxy/local/models', async (req, res) => {
  const baseUrl = String(req.body?.baseUrl || process.env.LOCAL_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
  try {
    const r = await fetch(`${baseUrl}/models`);
    const data = await r.json().catch(() => ({}));
    res.status(r.status).json(data);
  } catch (err) {
    res.status(502).json({ error: redactForLog(String(err)) });
  }
});

app.post('/proxy/local/chat', async (req, res) => {
  const baseUrl = String(req.body?.baseUrl || process.env.LOCAL_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body?.payload || {}),
    });
    const data = await r.json().catch(() => ({}));
    res.status(r.status).json(data);
  } catch (err) {
    res.status(502).json({ error: redactForLog(String(err)) });
  }
});

// Store encrypted credential into SQLite Vault (never logged or returned raw)
app.post('/vault/store', async (req, res) => {
  try {
    const { id, platform, accountHandle, secretData } = req.body as {
      id: string;
      platform: string;
      accountHandle: string;
      secretData: Record<string, unknown>;
    };
    const enc = encryptSecretObject(secretData);
    await prisma.vaultEntry.upsert({
      where: { id },
      create: { id, platform, accountHandle, ...enc },
      update: { platform, accountHandle, ...enc },
    });
    res.json({ ok: true, id, platform, accountHandle });
  } catch (err) {
    res.status(400).json({ ok: false, error: redactForLog(String(err)) });
  }
});

// Execute Platform Playbook
app.post('/playbook/run', async (req, res) => {
  const { platform, action = 'verify' } = req.body as { platform: string; action?: string };
  let result;
  switch (platform) {
    case 'email':
      result = await runEmailPlaybook(action);
      break;
    case 'zalo_oa':
      result = await runZaloOaPlaybook(action);
      break;
    case 'facebook_page':
      result = await runFacebookPagePlaybook(action);
      break;
    case 'google_business':
      result = await runGoogleBusinessPlaybook(action);
      break;
    case 'tiktok':
    case 'tiktok_business':
      result = await runTikTokBusinessPlaybook(action);
      break;
    case 'youtube':
    case 'youtube_channel':
      result = await runYouTubeChannelPlaybook(action);
      break;
    case 'linkedin':
    case 'linkedin_page':
      result = await runLinkedInPagePlaybook(action);
      break;
    default:
      result = await runCanvaSocialPlaybook(action);
  }
  if (result.status === 'blocked_ask_ceo') {
    broadcastEvent('ask_ceo', result);
  }
  res.json(result);
});

// Send Ask CEO via Zalo OA (with Telegram / Email fallback)
app.post('/ask-ceo', async (req, res) => {
  const { ticketId, agentId, question, options = [], urgency = 'normal' } = req.body as {
    ticketId: string;
    agentId: string;
    question: string;
    options?: string[];
    urgency?: string;
  };

  await prisma.askCeoTicket.create({
    data: {
      id: ticketId,
      agentId,
      question,
      options: JSON.stringify(options),
      urgency,
    },
  });

  const msg = `[#${ticketId}] Agent ${agentId}:\n${question}\n${options.join('\n')}`;
  const ceoZaloId = process.env.ZALO_OA_CEO_USER_ID || '';
  const zaloRes = ceoZaloId ? await sendZaloOAMessage(ceoZaloId, msg) : { ok: false };

  if (!zaloRes.ok) {
    const tgRes = await sendTelegramFallback(msg);
    if (!tgRes.ok && process.env.SMTP_USER) {
      await sendEmailSmtp({ to: process.env.SMTP_USER, subject: `[Hỏi CEO #${ticketId}]`, text: msg });
    }
  }

  broadcastEvent('ask_ceo_sent', { ticketId, zaloRes });
  res.json({ ok: true, ticketId });
});

// Zalo OA Webhook Receiver with Signature Check
app.post('/webhooks/zalo', async (req, res) => {
  const rawBody = (req as express.Request & { rawBody?: string }).rawBody || JSON.stringify(req.body);
  const sig = req.header('X-ZEvent-Signature');
  const appId = String(req.body?.app_id || process.env.ZALO_OA_APP_ID || '');
  const ts = String(req.body?.timestamp || '');

  if (process.env.DRY_RUN === 'false' && !verifyZaloWebhookSignature(rawBody, sig, appId, ts)) {
    return res.status(401).json({ error: 'Invalid Zalo webhook signature' });
  }

  const text = String(req.body?.message?.text || '').trim();
  const match = text.match(/#(CEO-\d+)/i);
  if (match) {
    const ticketId = match[1].toUpperCase();
    const answer = text.replace(/#CEO-\d+/i, '').trim() || text;
    await prisma.askCeoTicket.updateMany({
      where: { id: ticketId, status: 'pending' },
      data: { status: 'answered', answer, answeredAt: new Date() },
    });
    broadcastEvent('ceo_answered', { ticketId, answer, via: 'zalo_oa' });
  }

  res.json({ ok: true });
});

// Outbound Email endpoint
app.post('/outreach/email', async (req, res) => {
  const { to, subject, text } = req.body as { to: string; subject: string; text: string };
  const result = await sendEmailSmtp({ to, subject, text });
  res.json(result);
});

// Personal Zalo (zca-js) endpoints
app.get('/zalo-personal/status', (_req, res) => {
  res.json(zaloPersonal.getSession());
});
app.post('/zalo-personal/qr-start', async (_req, res) => {
  const session = await zaloPersonal.startQrLogin();
  res.json(session);
});
app.post('/zalo-personal/qr-confirm-sim', (req, res) => {
  const session = zaloPersonal.confirmSimulatedQr(req.body?.accountName);
  res.json(session);
});
app.post('/zalo-personal/disconnect', (_req, res) => {
  res.json(zaloPersonal.disconnect());
});
app.post('/zalo-personal/send', async (req, res) => {
  const { peerId, text } = req.body as { peerId: string; text: string };
  const out = await zaloPersonal.sendMessage({ peerId: String(peerId || ''), text: String(text || '') });
  res.json(out);
});

// Docker --network=none Repo Sandbox Runner (BỔ SUNG V)
app.post('/repos/sandbox-test', async (req, res) => {
  const { repoUrl, fullName } = req.body as { repoUrl: string; fullName: string };
  const out = await runRepoInDockerSandbox(String(repoUrl || ''), String(fullName || ''));
  res.json(out);
});

// Plug-and-Play Android Device Farm (BỔ SUNG X+)
const deviceFarm = new DeviceFarmService(broadcastEvent);
app.use('/devices', deviceFarm.createRouter());

deviceFarm.init().catch((err) => {
  console.error('[DeviceFarmService] Init warning:', err);
});

server.listen(PORT, () => {
  console.log(`AI Company Local Worker listening on http://localhost:${PORT} (DRY_RUN=${process.env.DRY_RUN !== 'false'})`);
});
