import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type, type FunctionDeclaration, type Schema } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

function toGeminiSchema(raw: Record<string, unknown> | undefined): Schema {
  if (!raw || typeof raw !== 'object') {
    return { type: Type.OBJECT, properties: {} };
  }
  const rawType = String(raw.type || 'object').toLowerCase();
  const mapType = (t: string): Type => {
    switch (t) {
      case 'string':
        return Type.STRING;
      case 'number':
      case 'integer':
        return Type.NUMBER;
      case 'boolean':
        return Type.BOOLEAN;
      case 'array':
        return Type.ARRAY;
      default:
        return Type.OBJECT;
    }
  };

  const out: Schema = { type: mapType(rawType) };
  if (typeof raw.description === 'string') out.description = raw.description;
  if (Array.isArray(raw.enum)) out.enum = raw.enum.map(String);

  if (rawType === 'object' && raw.properties && typeof raw.properties === 'object') {
    const props: Record<string, Schema> = {};
    for (const [k, v] of Object.entries(raw.properties as Record<string, Record<string, unknown>>)) {
      props[k] = toGeminiSchema(v);
    }
    out.properties = props;
    if (Array.isArray(raw.required)) {
      out.required = raw.required.map(String);
    }
  } else if (rawType === 'array' && raw.items && typeof raw.items === 'object') {
    out.items = toGeminiSchema(raw.items as Record<string, unknown>);
  }
  return out;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Health & Environment capability check
  app.get('/api/health', (_req, res) => {
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    const hasDeepSeek = Boolean(process.env.DEEPSEEK_API_KEY);
    const hasSearch = Boolean(process.env.SEARCH_TAVILY_API_KEY || process.env.SEARCH_SERPER_API_KEY);
    const warnings: string[] = [];
    if (!hasGemini && !hasDeepSeek) {
      warnings.push('Chưa đặt GEMINI_API_KEY hoặc DEEPSEEK_API_KEY trong biến môi trường server (có thể nhập trong Cài đặt hoặc dùng Local/Mock).');
    }
    res.json({
      ok: true,
      mode: 'proxy',
      hasGeminiEnvKey: hasGemini,
      hasDeepSeekEnvKey: hasDeepSeek,
      hasDeepSeekKey: hasDeepSeek,
      hasSearchKey: hasSearch,
      dryRunDefault: process.env.DRY_RUN !== 'false',
      dailyTokenBudget: Number(process.env.DAILY_TOKEN_BUDGET || 500000),
      workerUrl: process.env.WORKER_WS_URL || null,
      warnings,
      uptimeSeconds: Math.round(process.uptime()),
    });
  });

  // Isolated App Realtime SSE Bridge (independent from Vite HMR WebSocket)
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEv = (type: string, payload: Record<string, unknown> = {}) => {
      res.write(`data: ${JSON.stringify({ type, payload, timestamp: Date.now() })}\n\n`);
    };
    sendEv('heartbeat', { status: 'connected' });

    const timer = setInterval(() => {
      sendEv('heartbeat', { uptime: Math.round(process.uptime()) });
    }, 25_000);

    req.on('close', () => {
      clearInterval(timer);
    });
  });

  // Safe Affiliate Link Converter Relay (CEO's converter API endpoint)
  app.post('/api/affiliate/shopee-convert', async (req, res) => {
    const { converterApiUrl, originalUrl, affId, subId } = (req.body || {}) as {
      converterApiUrl?: string;
      originalUrl?: string;
      affId?: string;
      subId?: string;
    };
    if (!converterApiUrl || !/^https?:\/\//.test(converterApiUrl)) {
      return res.status(400).json({ ok: false, error: 'converterApiUrl không hợp lệ' });
    }
    if (!affId || !originalUrl) {
      return res.status(400).json({ ok: false, error: 'Thiếu affId hoặc originalUrl' });
    }
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const upstream = await fetch(converterApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: originalUrl, affId, subId }),
        signal: controller.signal,
      });
      clearTimeout(t);
      const data = await upstream.json().catch(() => ({}));
      return res.status(upstream.ok ? 200 : 502).json(data);
    } catch (err) {
      return res.status(502).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Lỗi kết nối converter API',
      });
    }
  });

  // Safe Official Legal Source Check (vbpl.vn / congbao.chinhphu.vn)
  app.post('/api/legal/check-updates', async (req, res) => {
    const urls = Array.isArray(req.body?.urls) ? (req.body.urls as string[]).slice(0, 12) : [];
    const results: Array<{ url: string; reachable: boolean; status: number; checkedAt: string }> = [];
    const today = new Date().toISOString().slice(0, 10);
    for (const u of urls) {
      if (!/^https:\/\/(vbpl\.vn|congbao\.chinhphu\.vn|thuvienphapluat\.vn|luatvietnam\.vn)/.test(String(u))) {
        results.push({ url: String(u), reachable: false, status: 400, checkedAt: today });
        continue;
      }
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 5000);
        const r = await fetch(u, { method: 'HEAD', signal: controller.signal });
        clearTimeout(t);
        results.push({ url: u, reachable: r.ok || r.status < 500, status: r.status, checkedAt: today });
      } catch {
        results.push({ url: u, reachable: false, status: 504, checkedAt: today });
      }
    }
    return res.json({ ok: true, checkedAt: today, results });
  });

  // Safe CEO Critical Alert Dispatcher (Zalo webhook / Telegram Bot)
  app.post('/api/alerts/send', async (req, res) => {
    const { zaloWebhookUrl, telegramBotToken, telegramChatId, text } = (req.body || {}) as {
      zaloWebhookUrl?: string;
      telegramBotToken?: string;
      telegramChatId?: string;
      text?: string;
    };
    const msg = String(text || '').slice(0, 3500);
    if (!msg) return res.status(400).json({ ok: false, error: 'Thiếu nội dung cảnh báo' });

    const deliveries: string[] = [];
    if (zaloWebhookUrl && /^https?:\/\//.test(zaloWebhookUrl)) {
      try {
        const r = await fetch(zaloWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: msg }),
        });
        if (r.ok) deliveries.push('zalo_webhook');
      } catch {
        // ignore downstream failure, report gracefully
      }
    }
    if (telegramBotToken && telegramChatId) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${encodeURIComponent(telegramBotToken)}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: telegramChatId, text: msg }),
        });
        if (r.ok) deliveries.push('telegram');
      } catch {
        // ignore
      }
    }
    return res.json({ ok: deliveries.length > 0, deliveries });
  });

  // Server-side Gemini API proxy using @google/genai
  app.post('/api/llm/gemini', async (req, res) => {
    const apiKey = (process.env.GEMINI_API_KEY || req.body?.manualApiKey || '').trim();
    if (!apiKey) {
      return res.status(400).json({
        error: 'NO_GEMINI_KEY',
        message: 'Chưa có GEMINI_API_KEY trên server hoặc trong Cài đặt.',
      });
    }

    try {
      const {
        model = 'gemini-2.5-flash',
        messages = [],
        tools = [],
        json = false,
        temperature = 0.4,
        maxTokens = 1600,
      } = req.body as {
        model?: string;
        messages?: Array<{ role: string; content: string; name?: string }>;
        tools?: Array<{ type: string; function: { name: string; description: string; parameters?: Record<string, unknown> } }>;
        json?: boolean;
        temperature?: number;
        maxTokens?: number;
      };

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const systemParts: string[] = [];
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      for (const m of messages) {
        if (m.role === 'system') {
          systemParts.push(m.content);
        } else if (m.role === 'assistant') {
          contents.push({ role: 'model', parts: [{ text: m.content || '...' }] });
        } else if (m.role === 'tool') {
          contents.push({
            role: 'user',
            parts: [{ text: `[Kết quả Tool${m.name ? ` ${m.name}` : ''}]: ${m.content}` }],
          });
        } else {
          contents.push({ role: 'user', parts: [{ text: m.content || '' }] });
        }
      }

      if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: 'Xin chào' }] });
      }

      const functionDeclarations: FunctionDeclaration[] = Array.isArray(tools)
        ? tools
            .filter((t) => t?.function?.name)
            .map((t) => ({
              name: t.function.name,
              description: t.function.description || '',
              parameters: toGeminiSchema(t.function.parameters),
            }))
        : [];

      const config: Record<string, unknown> = {
        temperature: typeof temperature === 'number' ? temperature : 0.4,
        maxOutputTokens: maxTokens,
      };
      if (systemParts.length > 0) {
        config.systemInstruction = systemParts.join('\n\n');
      }
      if (json) {
        config.responseMimeType = 'application/json';
      }
      if (functionDeclarations.length > 0) {
        config.tools = [{ functionDeclarations }];
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });

      const textContent = response.text || '';
      const fnCalls = (response.functionCalls || []).map((fc, i) => ({
        id: `gem_tc_${Date.now()}_${i}`,
        name: fc.name || 'unknown_tool',
        arguments: (fc.args as Record<string, unknown>) || {},
      }));

      const meta = response.usageMetadata;
      return res.json({
        content: textContent,
        toolCalls: fnCalls.length > 0 ? fnCalls : undefined,
        usage: {
          promptTokens: meta?.promptTokenCount || 320,
          completionTokens: meta?.candidatesTokenCount || 240,
          totalTokens: meta?.totalTokenCount || 560,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi gọi Gemini API';
      const status = /429|quota|RESOURCE_EXHAUSTED/i.test(msg) ? 429 : 502;
      return res.status(status).json({ error: 'GEMINI_ERROR', message: msg });
    }
  });

  // DeepSeek OpenAI-compatible proxy (supports both /api/llm/deepseek and /api/llm)
  const handleDeepSeekProxy = async (req: express.Request, res: express.Response) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'NO_SERVER_KEY',
        message: 'Server chưa cấu hình DEEPSEEK_API_KEY. Hãy dùng chế độ Trực tiếp hoặc Mô phỏng.',
      });
    }

    try {
      const { model, messages, tools, tool_choice, temperature, max_tokens, response_format } = req.body;
      const payload: Record<string, unknown> = {
        model: model || 'deepseek-chat',
        messages,
      };
      if (model !== 'deepseek-reasoner') {
        if (typeof temperature === 'number') payload.temperature = temperature;
        if (response_format) payload.response_format = response_format;
        if (Array.isArray(tools) && tools.length > 0) {
          payload.tools = tools;
          payload.tool_choice = tool_choice || 'auto';
        }
      }
      if (typeof max_tokens === 'number') payload.max_tokens = max_tokens;

      const upstream = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await upstream.json();
      if (!upstream.ok) {
        return res.status(upstream.status).json(data);
      }
      return res.json(data);
    } catch (err) {
      return res.status(502).json({
        error: 'PROXY_ERROR',
        message: err instanceof Error ? err.message : 'Lỗi kết nối DeepSeek từ proxy',
      });
    }
  };
  app.post('/api/llm/deepseek', handleDeepSeekProxy);
  app.post('/api/llm', handleDeepSeekProxy);

  // Local OpenAI-compatible Server Proxy (useful when running npm run dev locally to bypass browser CORS)
  app.post('/api/llm/local-models', async (req, res) => {
    const { baseUrl, apiKey } = req.body as { baseUrl?: string; apiKey?: string };
    const clean = (baseUrl || 'http://localhost:11434/v1').trim().replace(/\/+$/, '');
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const r = await fetch(`${clean}/models`, { headers });
      const data = await r.json().catch(() => ({}));
      return res.status(r.status).json(data);
    } catch (err) {
      return res.status(502).json({
        error: 'LOCAL_UNREACHABLE',
        message:
          err instanceof Error
            ? `Không nối được tới ${clean} từ server (${err.message}). Nếu đang xem trên AI Studio Cloud, hãy tải code về chạy npm run dev trên máy cá nhân.`
            : 'Local LLM server unreachable',
      });
    }
  });

  app.post('/api/llm/local-proxy', async (req, res) => {
    const { baseUrl, apiKey, payload } = req.body as {
      baseUrl?: string;
      apiKey?: string;
      payload?: Record<string, unknown>;
    };
    const clean = (baseUrl || 'http://localhost:11434/v1').trim().replace(/\/+$/, '');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const r = await fetch(`${clean}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload || {}),
      });
      const data = await r.json().catch(() => ({}));
      return res.status(r.status).json(data);
    } catch (err) {
      return res.status(502).json({
        error: 'LOCAL_PROXY_ERROR',
        message: err instanceof Error ? err.message : 'Lỗi proxy tới Local LLM Server',
      });
    }
  });

  // Public Web Search proxy: Tavily -> Serper -> DuckDuckGo fallback
  app.post('/api/search', async (req, res) => {
    const query = String(req.body?.query || '').trim();
    const limit = Math.min(Number(req.body?.limit || 6), 10);
    if (!query) {
      return res.status(400).json({ error: 'Thiếu từ khóa tìm kiếm' });
    }

    try {
      if (process.env.SEARCH_TAVILY_API_KEY) {
        const r = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: process.env.SEARCH_TAVILY_API_KEY,
            query,
            max_results: limit,
            include_answer: false,
          }),
        });
        if (r.ok) {
          const d = (await r.json()) as { results?: Array<{ title: string; url: string; content: string }> };
          return res.json({
            provider: 'tavily',
            results: (d.results || []).map((x) => ({
              title: x.title,
              url: x.url,
              snippet: x.content,
            })),
          });
        }
      }

      if (process.env.SEARCH_SERPER_API_KEY) {
        const r = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': process.env.SEARCH_SERPER_API_KEY,
          },
          body: JSON.stringify({ q: query, gl: 'vn', hl: 'vi', num: limit }),
        });
        if (r.ok) {
          const d = (await r.json()) as { organic?: Array<{ title: string; link: string; snippet: string }> };
          return res.json({
            provider: 'serper',
            results: (d.organic || []).map((x) => ({
              title: x.title,
              url: x.link,
              snippet: x.snippet,
            })),
          });
        }
      }

      // DuckDuckGo Instant Answer API fallback (public, zero-key)
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const ddgRes = await fetch(ddgUrl);
      if (ddgRes.ok) {
        const ddg = (await ddgRes.json()) as {
          AbstractText?: string;
          AbstractURL?: string;
          Heading?: string;
          RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
        };
        const results: Array<{ title: string; url: string; snippet: string }> = [];
        if (ddg.AbstractText && ddg.AbstractURL) {
          results.push({
            title: ddg.Heading || query,
            url: ddg.AbstractURL,
            snippet: ddg.AbstractText,
          });
        }
        for (const t of ddg.RelatedTopics || []) {
          if (t.Text && t.FirstURL && results.length < limit) {
            results.push({
              title: t.Text.slice(0, 80),
              url: t.FirstURL,
              snippet: t.Text,
            });
          }
        }
        return res.json({ provider: 'duckduckgo', results });
      }

      return res.json({ provider: 'none', results: [] });
    } catch (err) {
      return res.json({
        provider: 'error',
        results: [],
        error: err instanceof Error ? err.message : 'Search error',
      });
    }
  });

  // Safe Public Page Fetcher (never logs in, extracts public contact info only)
  app.post('/api/fetch-page', async (req, res) => {
    const targetUrl = String(req.body?.url || '').trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'URL không hợp lệ' });
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AICompany-PublicLeadBot/1.0 (+https://example.local/bot-info)',
        },
      });
      clearTimeout(timer);

      const html = await response.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 6000);

      const emails = Array.from(new Set(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])).slice(0, 5);
      const phones = Array.from(new Set(text.match(/(?:\+84|0)(?:\d[\s.-]?){8,10}\d/g) || [])).slice(0, 5);

      return res.json({
        url: targetUrl,
        status: response.status,
        excerpt: text.slice(0, 2000),
        extractedContacts: { emails, phones },
      });
    } catch (err) {
      return res.status(502).json({
        error: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Không tải được trang công khai',
      });
    }
  });

  // Hub.ChuyenWeb.com server-side proxy (enforces URL allowlist & agent identity headers, never logs secrets)
  app.post('/api/hubcw/proxy', async (req, res) => {
    const {
      baseUrl = 'https://hub.chuyenweb.com',
      url,
      method = 'GET',
      token,
      agentId,
      externalUserId,
      requestId,
      idempotencyKey,
      payload,
    } = (req.body || {}) as {
      baseUrl?: string;
      url?: string;
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      token?: string;
      agentId?: string;
      externalUserId?: string;
      requestId?: string;
      idempotencyKey?: string;
      payload?: Record<string, unknown>;
    };

    const cleanBase = String(baseUrl || 'https://hub.chuyenweb.com').trim().replace(/\/+$/, '');
    const targetUrl = String(url || '').trim();
    if (!targetUrl.startsWith(cleanBase) || (!targetUrl.startsWith('https://') && !targetUrl.startsWith('http://'))) {
      return res.status(400).json({
        ok: false,
        error: 'URL đích không thuộc baseUrl đã cấu hình cho Hub.ChuyenWeb.',
      });
    }

    const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
    const upperMethod = String(method || 'GET').toUpperCase();
    if (!allowedMethods.has(upperMethod)) {
      return res.status(400).json({ ok: false, error: 'HTTP method không hợp lệ.' });
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Agent-Id': String(agentId || 'unknown'),
        'X-Agent-Request-Id': String(requestId || `req_${Date.now()}`),
      };
      if (externalUserId) headers['X-External-User-Id'] = String(externalUserId);
      if (idempotencyKey) headers['Idempotency-Key'] = String(idempotencyKey);
      if (token && token.trim()) {
        const cleanToken = token.trim();
        headers.Authorization = cleanToken.toLowerCase().startsWith('bearer ')
          ? cleanToken
          : `Bearer ${cleanToken}`;
      }

      const upstream = await fetch(targetUrl, {
        method: upperMethod,
        headers,
        body: upperMethod !== 'GET' && payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const contentType = upstream.headers.get('content-type') || '';
      const rawText = await upstream.text();
      let parsed: Record<string, unknown> = {};
      if (contentType.includes('application/json')) {
        try {
          parsed = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          parsed = { rawText: rawText.slice(0, 600) };
        }
      } else {
        parsed = { rawText: rawText.slice(0, 600) };
      }

      return res.status(upstream.ok ? 200 : upstream.status).json({
        ok: upstream.ok,
        upstreamStatus: upstream.status,
        ...parsed,
      });
    } catch (err) {
      return res.status(502).json({
        ok: false,
        upstreamStatus: 502,
        error: err instanceof Error ? err.message : 'Không kết nối được tới server Hub.ChuyenWeb',
      });
    }
  });

  app.get('/api/worker/status', (_req, res) => {
    res.json({
      ok: Boolean(process.env.WORKER_WS_URL || process.env.WORKER_HTTP_URL),
      workerUrl: process.env.WORKER_HTTP_URL || process.env.WORKER_WS_URL || null,
      dryRun: process.env.DRY_RUN !== 'false',
    });
  });

  const getWorkerHttpUrl = (): string | null => {
    const raw = process.env.WORKER_HTTP_URL || process.env.WORKER_URL || process.env.WORKER_WS_URL || '';
    if (!raw.trim()) return null;
    return raw.trim().replace(/^ws(s?):\/\//i, 'http$1://').replace(/\/+$/, '');
  };

  async function tryWorkerFetch(subpath: string, init?: RequestInit): Promise<Response | null> {
    const base = getWorkerHttpUrl();
    if (!base) return null;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      const r = await fetch(`${base}${subpath}`, { ...init, signal: controller.signal });
      clearTimeout(t);
      return r;
    } catch {
      return null;
    }
  }

  // === BỔ SUNG M & VOICE UPGRADE: Server-side Voice Key Vault & TTS/STT Providers ===
  const voiceKeyStore = {
    azureKey: process.env.AZURE_SPEECH_KEY || '',
    azureRegion: process.env.AZURE_SPEECH_REGION || 'southeastasia',
    googleTtsKey: process.env.GOOGLE_CLOUD_TTS_KEY || '',
    fptKey: process.env.FPT_AI_API_KEY || '',
  };

  app.get('/api/voice/keys-status', (_req, res) => {
    res.json({
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasAzureKey: Boolean(voiceKeyStore.azureKey),
      azureRegion: voiceKeyStore.azureRegion,
      hasGoogleTtsKey: Boolean(voiceKeyStore.googleTtsKey),
      hasFptKey: Boolean(voiceKeyStore.fptKey),
      hasWorker: Boolean(getWorkerHttpUrl()),
    });
  });

  app.post('/api/voice/keys-save', (req, res) => {
    const body = (req.body || {}) as {
      azureKey?: string;
      azureRegion?: string;
      googleTtsKey?: string;
      fptKey?: string;
    };
    if (typeof body.azureKey === 'string' && body.azureKey.trim()) voiceKeyStore.azureKey = body.azureKey.trim();
    if (typeof body.azureRegion === 'string' && body.azureRegion.trim()) voiceKeyStore.azureRegion = body.azureRegion.trim();
    if (typeof body.googleTtsKey === 'string' && body.googleTtsKey.trim()) voiceKeyStore.googleTtsKey = body.googleTtsKey.trim();
    if (typeof body.fptKey === 'string' && body.fptKey.trim()) voiceKeyStore.fptKey = body.fptKey.trim();
    return res.json({
      ok: true,
      hasAzureKey: Boolean(voiceKeyStore.azureKey),
      azureRegion: voiceKeyStore.azureRegion,
      hasGoogleTtsKey: Boolean(voiceKeyStore.googleTtsKey),
      hasFptKey: Boolean(voiceKeyStore.fptKey),
    });
  });

  const escapeXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // 1) Azure Speech Neural Vietnamese TTS
  app.post('/api/voice/azure-tts', async (req, res) => {
    const text = String(req.body?.text || '').trim().slice(0, 600);
    const voiceName = String(req.body?.voiceName || 'vi-VN-HoaiMyNeural');
    const rate = Number(req.body?.rate ?? 1);
    const pitch = Number(req.body?.pitch ?? 1);
    const region = String(req.body?.region || voiceKeyStore.azureRegion || 'southeastasia').trim();
    const apiKey = voiceKeyStore.azureKey;
    if (!apiKey) return res.json({ ok: false, error: 'Chưa cấu hình AZURE_SPEECH_KEY' });
    if (!text) return res.json({ ok: false, error: 'Thiếu nội dung đọc' });

    const ratePct = `${rate >= 1 ? '+' : ''}${Math.round((Math.max(0.7, Math.min(1.4, rate)) - 1) * 100)}%`;
    const pitchPct = `${pitch >= 1 ? '+' : ''}${Math.round((Math.max(0.8, Math.min(1.2, pitch)) - 1) * 50)}%`;
    const ssml = `<speak version='1.0' xml:lang='vi-VN'><voice xml:lang='vi-VN' name='${escapeXml(voiceName)}'><prosody rate='${ratePct}' pitch='${pitchPct}'>${escapeXml(text)}</prosody></voice></speak>`;

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 10000);
      const r = await fetch(`https://${encodeURIComponent(region)}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'aistudio-build-aicompany',
        },
        body: ssml,
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!r.ok) {
        return res.json({ ok: false, error: `Azure TTS HTTP ${r.status}` });
      }
      const buf = Buffer.from(await r.arrayBuffer());
      return res.json({ ok: true, audioBase64: buf.toString('base64'), mimeType: 'audio/mpeg' });
    } catch (err) {
      return res.json({ ok: false, error: err instanceof Error ? err.message : 'Lỗi kết nối Azure Speech TTS' });
    }
  });

  // 2) Edge-TTS relay (/worker)
  app.post('/api/voice/edge-tts', async (req, res) => {
    const w = await tryWorkerFetch('/voice/edge-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    if (w) {
      const data = await w.json().catch(() => null);
      if (data) return res.json(data);
    }
    return res.json({
      ok: false,
      error: 'Edge-TTS chạy qua Local /worker (pip install edge-tts). Đang chuyển sang nguồn tiếp theo.',
    });
  });

  // 3) Google Cloud Text-to-Speech (vi-VN Neural2 / Wavenet)
  app.post('/api/voice/google-tts', async (req, res) => {
    const text = String(req.body?.text || '').trim().slice(0, 600);
    const voiceName = String(req.body?.voiceName || 'vi-VN-Neural2-A');
    const speakingRate = Math.max(0.7, Math.min(1.4, Number(req.body?.rate ?? 1)));
    const pitchSemi = Math.max(-6, Math.min(6, (Number(req.body?.pitch ?? 1) - 1) * 10));
    const apiKey = voiceKeyStore.googleTtsKey;
    if (!apiKey) return res.json({ ok: false, error: 'Chưa cấu hình Google Cloud TTS Key' });
    if (!text) return res.json({ ok: false, error: 'Thiếu nội dung đọc' });

    try {
      const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'vi-VN', name: voiceName },
          audioConfig: { audioEncoding: 'MP3', speakingRate, pitch: pitchSemi },
        }),
      });
      const data = (await r.json().catch(() => ({}))) as { audioContent?: string; error?: { message?: string } };
      if (!r.ok || !data.audioContent) {
        return res.json({ ok: false, error: data.error?.message || `Google TTS HTTP ${r.status}` });
      }
      return res.json({ ok: true, audioBase64: data.audioContent, mimeType: 'audio/mpeg' });
    } catch (err) {
      return res.json({ ok: false, error: err instanceof Error ? err.message : 'Lỗi Google Cloud TTS' });
    }
  });

  // 4) Gemini TTS (gemini-3.8-flash-lite-tts unary WAV)
  app.post('/api/voice/gemini-tts', async (req, res) => {
    const apiKey = (process.env.GEMINI_API_KEY || req.body?.manualApiKey || '').trim();
    const text = String(req.body?.text || '').trim().slice(0, 600);
    const voiceName = String(req.body?.voiceName || 'Kore');
    if (!apiKey || !text) {
      return res.json({
        ok: false,
        error: !apiKey ? 'Chưa có GEMINI_API_KEY cho Gemini TTS' : 'Thiếu nội dung đọc',
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text,
                speechMetadata: {
                  style: 'Clear, natural native Vietnamese business voice, standard pronunciation',
                },
              } as Record<string, unknown>,
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        } as Record<string, unknown>,
      });

      const part = response.candidates?.[0]?.content?.parts?.[0] as
        | { inlineData?: { data?: string; mimeType?: string } }
        | undefined;
      if (part?.inlineData?.data) {
        return res.json({
          ok: true,
          audioBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'audio/wav',
        });
      }
      return res.json({ ok: false, error: 'Gemini TTS không trả dữ liệu audio.' });
    } catch (err) {
      return res.json({
        ok: false,
        error: err instanceof Error ? err.message : 'Lỗi gọi Gemini TTS',
      });
    }
  });

  // 5) FPT.AI Vietnamese TTS v5
  app.post('/api/voice/fpt-tts', async (req, res) => {
    const text = String(req.body?.text || '').trim().slice(0, 550);
    const voice = String(req.body?.voiceName || 'banmai');
    const speed = String(Math.max(-3, Math.min(3, Math.round((Number(req.body?.rate ?? 1) - 1) * 5))));
    const apiKey = voiceKeyStore.fptKey;
    if (!apiKey) return res.json({ ok: false, error: 'Chưa cấu hình FPT.AI API Key' });
    if (!text) return res.json({ ok: false, error: 'Thiếu nội dung đọc' });

    try {
      const r = await fetch('https://api.fpt.ai/hmi/tts/v5', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          voice,
          speed,
          format: 'mp3',
        },
        body: text,
      });
      const data = (await r.json().catch(() => ({}))) as { async?: string; message?: string };
      if (!r.ok || !data.async) {
        return res.json({ ok: false, error: data.message || `FPT.AI HTTP ${r.status}` });
      }
      // Poll brief readiness for async mp3 URL
      for (let i = 0; i < 6; i++) {
        await new Promise((ok) => setTimeout(ok, 450));
        const audioRes = await fetch(data.async);
        if (audioRes.ok) {
          const buf = Buffer.from(await audioRes.arrayBuffer());
          if (buf.length > 512) {
            return res.json({ ok: true, audioBase64: buf.toString('base64'), mimeType: 'audio/mpeg' });
          }
        }
      }
      return res.json({ ok: false, error: 'FPT.AI audio chưa sẵn sàng kịp thời gian chờ.' });
    } catch (err) {
      return res.json({ ok: false, error: err instanceof Error ? err.message : 'Lỗi FPT.AI TTS' });
    }
  });

  // 6) Piper Local Offline relay (/worker)
  app.post('/api/voice/piper-tts', async (req, res) => {
    const w = await tryWorkerFetch('/voice/piper-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    if (w) {
      const data = await w.json().catch(() => null);
      if (data) return res.json(data);
    }
    return res.json({ ok: false, error: 'Piper offline chỉ chạy khi bật /worker cục bộ có model .onnx tiếng Việt.' });
  });

  // 7) Accurate Vietnamese STT via Gemini 3.5 Transcribe
  app.post('/api/voice/gemini-stt', async (req, res) => {
    const apiKey = (process.env.GEMINI_API_KEY || req.body?.manualApiKey || '').trim();
    const audioBase64 = String(req.body?.audioBase64 || '').trim();
    const mimeType = String(req.body?.mimeType || 'audio/webm');
    if (!apiKey || !audioBase64) {
      return res.json({
        ok: false,
        error: !apiKey ? 'Chưa có GEMINI_API_KEY cho Gemini Transcribe STT' : 'Thiếu dữ liệu âm thanh',
      });
    }
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
            {
              text: 'Transcribe this Vietnamese speech accurately into natural Vietnamese text with proper punctuation. Preserve terms like CEO, COO, CFO, HubCW, Affiliate, KPI, OKR, Zalo, TikTok, Shopee.',
            },
          ],
        },
      });
      const text = (response.text || '').trim();
      return res.json({ ok: Boolean(text), text, confidence: 0.92, provider: 'gemini_stt' });
    } catch (err) {
      return res.json({ ok: false, error: err instanceof Error ? err.message : 'Lỗi Gemini Transcribe STT' });
    }
  });

  // 8) Local Whisper STT relay (/worker)
  app.post('/api/voice/whisper-stt', async (req, res) => {
    const w = await tryWorkerFetch('/voice/whisper-stt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    if (w) {
      const data = await w.json().catch(() => null);
      if (data) return res.json(data);
    }
    return res.json({ ok: false, error: 'Whisper offline cần chạy /worker cục bộ.' });
  });

  // === BỔ SUNG V: On-Demand GitHub Repo Search & Docker Sandbox Runner ===
  app.get('/api/repos/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ ok: false, error: 'Thiếu từ khóa tìm repo', items: [] });
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 7000);
      const r = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=5`,
        {
          signal: controller.signal,
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'AI-Company-RepoScout/1.0',
          },
        }
      );
      clearTimeout(t);
      if (!r.ok) {
        return res.json({ ok: false, items: [], status: r.status });
      }
      const data = (await r.json()) as { items?: unknown[] };
      return res.json({ ok: true, items: data.items || [] });
    } catch (err) {
      return res.json({
        ok: false,
        items: [],
        error: err instanceof Error ? err.message : 'Không truy cập được GitHub API',
      });
    }
  });

  app.post('/api/repos/sandbox-test', async (req, res) => {
    const { repoUrl, repoFullName } = (req.body || {}) as { repoUrl?: string; repoFullName?: string };
    const workerRes = await tryWorkerFetch('/repos/sandbox-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl, fullName: repoFullName }),
    });
    if (workerRes && workerRes.ok) {
      const data = await workerRes.json().catch(() => null);
      if (data) return res.json(data);
    }
    return res.json({
      executed: false,
      passed: false,
      stdoutExcerpt: `Docker Sandbox (--network=none) cần chạy trên máy local qua /worker. Repo "${repoFullName || ''}" giữ nguyên nhãn CHƯA KIỂM CHỨNG.`,
    });
  });

  // === BỔ SUNG O: Zalo Cá nhân (zca-js bridge + Sandbox fallback) ===
  let zaloSimState: {
    status: 'disconnected' | 'qr_pending' | 'connected' | 'expired' | 'blocked_anomaly';
    mode: 'worker_zca_js' | 'sandbox_sim';
    accountName?: string;
    userIdMasked?: string;
    qrExpiresAt?: number;
    lastHeartbeatAt?: number;
  } = { status: 'disconnected', mode: 'sandbox_sim' };

  app.post('/api/zalo-personal/qr-start', async (_req, res) => {
    const w = await tryWorkerFetch('/zalo-personal/qr-start', { method: 'POST' });
    if (w && w.ok) return res.json(await w.json());
    zaloSimState = { status: 'qr_pending', mode: 'sandbox_sim', qrExpiresAt: Date.now() + 120_000 };
    return res.json(zaloSimState);
  });

  app.post('/api/zalo-personal/qr-confirm-sim', async (req, res) => {
    const accountName = String(req.body?.accountName || 'Zalo Công Ty Phụ (Sandbox)');
    const w = await tryWorkerFetch('/zalo-personal/qr-confirm-sim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountName }),
    });
    if (w && w.ok) return res.json(await w.json());
    zaloSimState = {
      status: 'connected',
      mode: 'sandbox_sim',
      accountName,
      userIdMasked: '****8821',
      lastHeartbeatAt: Date.now(),
    };
    return res.json(zaloSimState);
  });

  app.post('/api/zalo-personal/disconnect', async (_req, res) => {
    const w = await tryWorkerFetch('/zalo-personal/disconnect', { method: 'POST' });
    if (w && w.ok) return res.json(await w.json());
    zaloSimState = { status: 'disconnected', mode: 'sandbox_sim' };
    return res.json(zaloSimState);
  });

  app.post('/api/zalo-personal/send', async (req, res) => {
    const { peerId, text, envMode } = (req.body || {}) as { peerId?: string; text?: string; envMode?: string };
    const w = await tryWorkerFetch('/zalo-personal/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId, text }),
    });
    if (w && w.ok) return res.json(await w.json());
    if (zaloSimState.status !== 'connected' && envMode !== 'sandbox') {
      return res.json({ ok: false, error: 'Phiên Zalo Cá nhân chưa quét QR kết nối.' });
    }
    return res.json({ ok: true });
  });

  // === BỔ SUNG X+: Android Device Farm Routes (/api/devices/*) ===
  const DEFAULT_BLOCKED_PACKAGES = [
    'com.vietcombank',
    'com.VCB',
    'com.mbmobile',
    'vn.com.techcombank',
    'com.mservice.momotransfer',
    'com.momo.vn',
    'vn.zalopay',
    'vn.com.vng.zalopay',
    'com.google.android.apps.authenticator2',
    'com.azure.authenticator',
    'com.authy.authy',
    'com.x8bit.bitwarden',
    'com.agilebits.onepassword',
    'com.lastpass.lpandroid',
    'keepass2android.keepass2android',
    'com.dashlane',
    'com.android.settings',
    'com.google.android.apps.photos',
    'com.android.contacts',
  ];

  const renderMockPhoneSvg = (fg: string, note: string, step: number) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="720" viewBox="0 0 360 720">
      <rect width="360" height="720" rx="28" fill="#0F172A"/>
      <rect x="14" y="18" width="332" height="684" rx="20" fill="#1E293B" stroke="#334155" stroke-width="2"/>
      <rect x="28" y="34" width="304" height="36" rx="10" fill="#0EA5E9" fill-opacity="0.18"/>
      <text x="42" y="57" fill="#38BDF8" font-family="sans-serif" font-size="13" font-weight="bold">SANDBOX ANDROID VIEW · ${fg}</text>
      <rect x="28" y="90" width="304" height="110" rx="14" fill="#0F172A" stroke="#475569"/>
      <text x="44" y="122" fill="#F8FAFC" font-family="sans-serif" font-size="14" font-weight="bold">AI Company Mobile Workspace</text>
      <text x="44" y="148" fill="#94A3B8" font-family="sans-serif" font-size="12">Lệnh gần nhất: ${note.replace(/[<>&"]/g, '')}</text>
      <text x="44" y="172" fill="#22C55E" font-family="monospace" font-size="11">Frame #${step} · Chế độ Mô phỏng An toàn</text>
      <rect x="28" y="220" width="304" height="380" rx="14" fill="#020617" stroke="#1E293B"/>
      <text x="44" y="256" fill="#E2E8F0" font-family="sans-serif" font-size="13">[App] ${fg}</text>
      <text x="44" y="286" fill="#94A3B8" font-family="sans-serif" font-size="12">• Đã che dữ liệu nhạy cảm &amp; OTP</text>
      <text x="44" y="312" fill="#94A3B8" font-family="sans-serif" font-size="12">• Chạm / Vuốt / Nhập chữ qua hàng đợi FIFO</text>
      <rect x="44" y="530" width="272" height="44" rx="10" fill="#0EA5E9"/>
      <text x="115" y="557" fill="#FFFFFF" font-family="sans-serif" font-size="13" font-weight="bold">Sẵn sàng nhận lệnh</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  let mockFrameCounter = 1;
  let mockDevicesState: Array<{
    id: string;
    serial: string;
    modelName: string;
    androidVersion: string;
    driverType: 'adb_usb' | 'adb_wifi' | 'emulator' | 'mock';
    status: 'unauthorized' | 'device' | 'offline' | 'controlled' | 'error';
    batteryPercent: number;
    temperatureC: number;
    screenWidth: number;
    screenHeight: number;
    controlMode: 'view_only' | 'approved_actions' | 'policy_auto';
    assignedAgentId?: string;
    assignedDepartment?: string;
    foregroundPackage: string;
    lastScreenshotDataUrl?: string;
    lastOcrTextMasked?: string;
    pausedTask?: {
      taskId: string;
      taskTitle: string;
      stepIndex: number;
      totalSteps: number;
      stepLabel: string;
      progressPercent: number;
      pausedReason?: string;
      pausedAt?: number;
    } | null;
    isStreaming: boolean;
    lastSeenAt: number;
  }> = [
    {
      id: 'dev_mock_pixel7',
      serial: 'MOCK-PIXEL7-01',
      modelName: 'Pixel 7 Pro (Mô phỏng Sandbox)',
      androidVersion: 'Android 14 (Sandbox)',
      driverType: 'mock',
      status: 'device',
      batteryPercent: 88,
      temperatureC: 31.5,
      screenWidth: 1080,
      screenHeight: 2400,
      controlMode: 'view_only',
      assignedAgentId: 'mkt_social',
      assignedDepartment: 'marketing',
      foregroundPackage: 'com.ss.android.ugc.trill',
      lastScreenshotDataUrl: renderMockPhoneSvg('com.ss.android.ugc.trill', 'Chờ lệnh kiểm tra', 1),
      lastOcrTextMasked: 'TikTok Business · Bảng tin công khai · Chế độ CHỈ XEM',
      pausedTask: null,
      isStreaming: false,
      lastSeenAt: Date.now(),
    },
  ];

  app.get('/api/devices/status', async (_req, res) => {
    const w = await tryWorkerFetch('/devices/status');
    if (w && w.ok) return res.json(await w.json());
    return res.json({
      adbFound: false,
      adbVersion: null,
      adbPath: null,
      platformToolsDownload: {
        url: 'https://developer.android.com/tools/releases/platform-tools',
        hint: 'Chạy `/worker` trên máy local và bấm "Tải & Cài ADB Tự động" hoặc cài Platform-Tools để cắm điện thoại thật.',
      },
      troubleshootingTips: [
        'Trên Preview đám mây: dùng MockDeviceDriver an toàn. Chạy /worker trên máy tính cá nhân để cắm cáp USB.',
      ],
      devices: mockDevicesState.map((d) => ({
        ...d,
        manufacturer: 'Google (Sandbox)',
        locale: 'vi-VN',
        storageFreeMb: 48200,
        installedPackages: ['com.zing.zalo', 'com.ss.android.ugc.trill', 'com.shopee.vn', 'com.android.chrome'],
        suggestedAgentId: 'mkt_social',
        adbKeyboardInstalled: true,
      })),
    });
  });

  app.get('/api/devices/doctor', async (_req, res) => {
    const w = await tryWorkerFetch('/devices/doctor');
    if (w && w.ok) return res.json(await w.json());
    return res.json({
      nodeVersion: process.version,
      os: process.platform,
      arch: process.arch,
      adbFound: false,
      adbPath: null,
      adbVersion: null,
      deviceCount: mockDevicesState.length,
      devices: mockDevicesState.map((d) => ({
        id: d.id,
        serial: d.serial,
        modelName: d.modelName,
        status: d.status,
        batteryPercent: d.batteryPercent,
        temperatureC: d.temperatureC,
        adbKeyboardInstalled: true,
      })),
      troubleshootingTips: [
        'Chế độ Preview đang chạy MockDeviceDriver (không cần ADB). Để dùng điện thoại thật, chạy /worker và `npm run device:doctor` trên máy tính.',
      ],
      platformToolsDownload: {
        url: 'https://developer.android.com/tools/releases/platform-tools',
        hint: 'Tải Platform-Tools hoặc bấm nút Cài ADB Tự động khi đang kết nối /worker.',
      },
    });
  });

  app.post('/api/devices/install-adb', async (req, res) => {
    const w = await tryWorkerFetch('/devices/install-adb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    if (w && w.ok) return res.json(await w.json());
    return res.json({
      ok: false,
      message: 'Cài ADB tự động thực thi trên máy chạy /worker cục bộ (cổng 4100). Hãy khởi động /worker rồi thử lại.',
    });
  });

  app.get('/api/devices/logs', async (req, res) => {
    const q = req.query.deviceId ? `?deviceId=${encodeURIComponent(String(req.query.deviceId))}` : '';
    const w = await tryWorkerFetch(`/devices/logs${q}`);
    if (w && w.ok) return res.json(await w.json());
    return res.json({ logs: [] });
  });

  app.get('/api/devices', async (_req, res) => {
    const w = await tryWorkerFetch('/devices');
    if (w && w.ok) return res.json(await w.json());
    return res.json({ devices: mockDevicesState });
  });

  app.post('/api/devices/:id/find-element', async (req, res) => {
    const w = await tryWorkerFetch(`/devices/${encodeURIComponent(req.params.id)}/find-element`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    if (w && w.ok) return res.json(await w.json());
    const q = String(req.body?.query || 'Gửi').trim();
    return res.json({
      ok: true,
      elements: [
        {
          text: q,
          contentDesc: q,
          resourceId: 'com.sandbox:id/primary_btn',
          className: 'android.widget.Button',
          bounds: '[180,1040][900,1160]',
          centerX: 540,
          centerY: 1100,
          clickable: true,
        },
      ],
      matchedElement: {
        text: q,
        contentDesc: q,
        resourceId: 'com.sandbox:id/primary_btn',
        className: 'android.widget.Button',
        bounds: '[180,1040][900,1160]',
        centerX: 540,
        centerY: 1100,
        clickable: true,
      },
    });
  });

  app.post('/api/devices/:id/wait-for', async (req, res) => {
    const w = await tryWorkerFetch(`/devices/${encodeURIComponent(req.params.id)}/wait-for`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    if (w && w.ok) return res.json(await w.json());
    const q = String(req.body?.query || 'Sẵn sàng').trim();
    return res.json({
      ok: true,
      matchedElement: {
        text: q,
        contentDesc: q,
        resourceId: 'com.sandbox:id/ready_state',
        className: 'android.widget.TextView',
        bounds: '[120,420][960,520]',
        centerX: 540,
        centerY: 470,
        clickable: false,
      },
    });
  });

  app.post('/api/devices/:id/playbook', async (req, res) => {
    const w = await tryWorkerFetch(`/devices/${encodeURIComponent(req.params.id)}/playbook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    if (w && w.ok) return res.json(await w.json());
    const steps = Array.isArray(req.body?.steps) ? (req.body.steps as Array<{ action?: string; label?: string }>) : [];
    const dev = mockDevicesState.find((d) => d.id === req.params.id);
    if (!dev || dev.controlMode === 'view_only') {
      return res.json({
        ok: false,
        completedSteps: 0,
        totalSteps: steps.length,
        error: 'Thiết bị đang ở chế độ CHỈ XEM — hãy bật quyền điều khiển trước khi chạy Playbook.',
        stepResults: [],
      });
    }
    return res.json({
      ok: true,
      completedSteps: steps.length,
      totalSteps: steps.length,
      stepResults: steps.map((s, idx) => ({
        stepIndex: idx + 1,
        label: s.label || s.action || `Bước ${idx + 1}`,
        ok: true,
      })),
    });
  });

  app.post('/api/devices/:id/file', async (req, res) => {
    const w = await tryWorkerFetch(`/devices/${encodeURIComponent(req.params.id)}/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    if (w && w.ok) return res.json(await w.json());
    const sub = String(req.body?.remoteSubpath || 'output.txt').replace(/^\/+/, '');
    if (sub.includes('..') || (sub.startsWith('sdcard/') && !sub.startsWith('sdcard/AICompanyWork/'))) {
      return res.json({ ok: false, error: 'Chỉ cho phép đọc/ghi tệp trong /sdcard/AICompanyWork/' });
    }
    return res.json({ ok: true, filePath: `/sdcard/AICompanyWork/${sub}` });
  });

  app.post('/api/devices/:id/install-apk', async (req, res) => {
    const w = await tryWorkerFetch(`/devices/${encodeURIComponent(req.params.id)}/install-apk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    if (w && w.ok) return res.json(await w.json());
    if (req.body?.agentId !== 'ceo' && !req.body?.ceoConfirmed) {
      return res.json({ ok: false, error: 'Cài đặt APK trên điện thoại bắt buộc CEO duyệt trực tiếp.' });
    }
    return res.json({ ok: true, filePath: String(req.body?.localPath || 'app.apk') });
  });

  app.post('/api/devices/pair-wifi', async (req, res) => {
    const w = await tryWorkerFetch('/devices/pair-wifi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    if (w && w.ok) return res.json(await w.json());
    return res.json({
      ok: false,
      message:
        'Ghép đôi Wi-Fi (adb pair) yêu cầu máy chủ local /worker có cài ADB. Trong Preview trình duyệt, vui lòng dùng MockDevice hoặc tải dự án về chạy /worker + npm run device:doctor.',
    });
  });

  app.post('/api/devices/killswitch', async (_req, res) => {
    await tryWorkerFetch('/devices/killswitch', { method: 'POST' });
    mockDevicesState = mockDevicesState.map((d) => ({
      ...d,
      controlMode: 'view_only',
      isStreaming: false,
    }));
    return res.json({ ok: true });
  });

  app.post('/api/devices/:id/mode', async (req, res) => {
    const { mode } = (req.body || {}) as { mode?: 'view_only' | 'approved_actions' | 'policy_auto' };
    const w = await tryWorkerFetch(`/devices/${encodeURIComponent(req.params.id)}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (w && w.ok) return res.json(await w.json());
    if (mode) {
      mockDevicesState = mockDevicesState.map((d) =>
        d.id === req.params.id
          ? {
              ...d,
              controlMode: mode,
              status: d.status === 'offline' ? 'offline' : mode === 'view_only' ? 'device' : 'controlled',
            }
          : d
      );
    }
    return res.json({ ok: true });
  });

  app.post('/api/devices/:id/assign', async (req, res) => {
    const { agentId, department } = (req.body || {}) as { agentId?: string; department?: string };
    const w = await tryWorkerFetch(`/devices/${encodeURIComponent(req.params.id)}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, department }),
    });
    if (w && w.ok) return res.json(await w.json());
    mockDevicesState = mockDevicesState.map((d) =>
      d.id === req.params.id ? { ...d, assignedAgentId: agentId, assignedDepartment: department } : d
    );
    return res.json({ ok: true });
  });

  app.post('/api/devices/:id/task-checkpoint', async (req, res) => {
    const w = await tryWorkerFetch(`/devices/${encodeURIComponent(req.params.id)}/task-checkpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    if (w && w.ok) return res.json(await w.json());
    const { checkpoint } = (req.body || {}) as { checkpoint?: typeof mockDevicesState[number]['pausedTask'] };
    mockDevicesState = mockDevicesState.map((d) =>
      d.id === req.params.id ? { ...d, pausedTask: checkpoint ?? null } : d
    );
    return res.json({ ok: true });
  });

  app.post('/api/devices/:id/simulate-connection', async (req, res) => {
    const { connected } = (req.body || {}) as { connected: boolean };
    const w = await tryWorkerFetch(`/devices/${encodeURIComponent(req.params.id)}/simulate-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connected }),
    });
    if (w && w.ok) return res.json(await w.json());
    mockDevicesState = mockDevicesState.map((d) => {
      if (d.id !== req.params.id) return d;
      if (!connected) {
        return {
          ...d,
          status: 'offline',
          isStreaming: false,
          pausedTask: d.pausedTask || {
            taskId: 'dev_task_1',
            taskTitle: `Đăng bài / Kiểm tra ${d.foregroundPackage}`,
            stepIndex: 2,
            totalSteps: 4,
            stepLabel: 'Đang nhập nội dung đã duyệt',
            progressPercent: 50,
            pausedReason: 'Mất kết nối cáp USB — đã lưu tiến độ để tiếp tục khi cắm lại.',
            pausedAt: Date.now(),
          },
        };
      }
      return {
        ...d,
        status: d.controlMode === 'view_only' ? 'device' : 'controlled',
        pausedTask: d.pausedTask
          ? { ...d.pausedTask, pausedReason: undefined, pausedAt: undefined }
          : null,
        lastSeenAt: Date.now(),
      };
    });
    return res.json({ ok: true, devices: mockDevicesState });
  });

  app.post('/api/devices/:id/stop', async (req, res) => {
    const w = await tryWorkerFetch(`/devices/${encodeURIComponent(req.params.id)}/stop`, { method: 'POST' });
    if (w && w.ok) return res.json(await w.json());
    mockDevicesState = mockDevicesState.map((d) =>
      d.id === req.params.id
        ? { ...d, controlMode: 'view_only', status: d.status === 'offline' ? 'offline' : 'device', isStreaming: false }
        : d
    );
    return res.json({ ok: true });
  });

  app.post('/api/devices/:id/command', async (req, res) => {
    const w = await tryWorkerFetch(`/devices/${encodeURIComponent(req.params.id)}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    if (w && w.ok) return res.json(await w.json());

    const devIdx = mockDevicesState.findIndex((d) => d.id === req.params.id);
    if (devIdx < 0) return res.status(404).json({ ok: false, error: 'Không tìm thấy thiết bị' });
    const dev = mockDevicesState[devIdx];
    const beforeShot = dev.lastScreenshotDataUrl;

    if (dev.status === 'offline') {
      return res.json({
        ok: false,
        error: 'Thiết bị đang mất kết nối (offline) — tác vụ tạm dừng và chờ cắm lại cáp USB.',
      });
    }

    const {
      agentId = 'ceo',
      action = 'screenshot',
      text,
      packageName,
      policy,
    } = (req.body || {}) as {
      agentId?: string;
      action?: string;
      text?: string;
      packageName?: string;
      policy?: { blockedPackages?: string[]; allowedPackages?: string[] };
    };

    const blocked = new Set([...(policy?.blockedPackages || DEFAULT_BLOCKED_PACKAGES)]);
    if (packageName && (blocked.has(packageName) || Array.from(blocked).some((b) => packageName.toLowerCase().includes(b.toLowerCase())))) {
      return res.json({
        ok: false,
        error: `Từ chối tuyệt đối: Ứng dụng "${packageName}" nằm trong danh sách cấm (Ngân hàng/Ví/Quản lý MK/2FA/Cài đặt).`,
        log: {
          id: `dlog_${Date.now().toString(36)}`,
          deviceId: dev.id,
          serial: dev.serial,
          agentId,
          action: `${action}:${packageName}`,
          foregroundPackage: dev.foregroundPackage,
          result: 'blocked_policy',
          reason: 'Blocked sensitive package',
          beforeScreenshotDataUrl: beforeShot,
          afterScreenshotDataUrl: beforeShot,
          timestamp: Date.now(),
        },
      });
    }

    if (action !== 'screenshot' && action !== 'ocr_read' && dev.controlMode === 'view_only') {
      return res.json({
        ok: false,
        error: 'Thiết bị đang ở chế độ CHỈ XEM — chặn mọi thao tác chạm/nhập.',
        log: {
          id: `dlog_${Date.now().toString(36)}`,
          deviceId: dev.id,
          serial: dev.serial,
          agentId,
          action,
          foregroundPackage: dev.foregroundPackage,
          result: 'blocked_mode',
          reason: 'View-only mode active',
          beforeScreenshotDataUrl: beforeShot,
          afterScreenshotDataUrl: beforeShot,
          timestamp: Date.now(),
        },
      });
    }

    mockFrameCounter++;
    const nextFg = action === 'open_app' && packageName ? packageName : dev.foregroundPackage;
    const rawOcr = text
      ? `Vừa nhập: ${text.replace(/\b\d{4,8}\b/g, '***')} · App: ${nextFg}`
      : `Màn hình ${nextFg} · Tác vụ: ${action} (#${mockFrameCounter})`;
    const nextShot = renderMockPhoneSvg(nextFg, `${action}${text ? ` "${text.slice(0, 14)}"` : ''}`, mockFrameCounter);

    const updated = {
      ...dev,
      foregroundPackage: nextFg,
      lastScreenshotDataUrl: nextShot,
      lastOcrTextMasked: rawOcr,
      lastSeenAt: Date.now(),
    };
    mockDevicesState[devIdx] = updated;

    return res.json({
      ok: true,
      screenshotDataUrl: nextShot,
      ocrText: rawOcr,
      device: updated,
      log: {
        id: `dlog_${Date.now().toString(36)}`,
        deviceId: dev.id,
        serial: dev.serial,
        agentId,
        action,
        foregroundPackage: nextFg,
        result: 'ok',
        beforeScreenshotDataUrl: beforeShot,
        afterScreenshotDataUrl: nextShot,
        timestamp: Date.now(),
      },
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VĂN PHÒNG ẢO 3D – AI COMPANY server running at http://localhost:${PORT}`);
  });
}

startServer();
