import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { detectVerificationGate } from '../src/browser.js';

export interface HubCwPlaybookInput {
  agentId: string;
  baseUrl?: string;
  modulePath: string;
  username?: string;
  action: 'test_login' | 'read_table' | 'submit_form';
  formData?: Record<string, string>;
}

export interface HubCwPlaybookResult {
  platform: 'hub_chuyenweb';
  agentId: string;
  status: 'ok' | 'dry_run' | 'needs_ceo_auth' | 'error';
  message: string;
  sessionProfileDir: string;
  externalUrl?: string;
}

/**
 * Isolated per-agent Playwright automation for hub.chuyenweb.com.
 * Policy: each agent MUST use its own isolated userDataDir/session profile.
 * Never share cookies/sessions across agents. Stops immediately on OTP/CAPTCHA/2FA.
 */
export async function runHubCwAgentPlaybook(
  input: HubCwPlaybookInput
): Promise<HubCwPlaybookResult> {
  const baseUrl = (input.baseUrl || 'https://hub.chuyenweb.com').replace(/\/+$/, '');
  const sessionProfileDir = path.resolve(
    process.cwd(),
    '.sessions',
    `hubcw-agent-${input.agentId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
  );

  if (process.env.DRY_RUN !== 'false') {
    return {
      platform: 'hub_chuyenweb',
      agentId: input.agentId,
      status: 'dry_run',
      message: `DRY_RUN: Playbook HubCW (${input.action} -> ${baseUrl}${input.modulePath}) đã cô lập profile cho agent ${input.agentId}.`,
      sessionProfileDir,
    };
  }

  if (!fs.existsSync(sessionProfileDir)) {
    fs.mkdirSync(sessionProfileDir, { recursive: true });
  }

  const headless = process.env.HEADLESS !== 'false';
  const context = await chromium.launchPersistentContext(sessionProfileDir, { headless });

  try {
    const page = context.pages()[0] || (await context.newPage());
    const targetUrl = `${baseUrl}${input.modulePath.startsWith('/') ? input.modulePath : `/${input.modulePath}`}`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

    const gate = await detectVerificationGate(page);
    if (gate.blocked) {
      return {
        platform: 'hub_chuyenweb',
        agentId: input.agentId,
        status: 'needs_ceo_auth',
        message: gate.reason || `Hub.ChuyenWeb yêu cầu xác thực OTP/CAPTCHA cho agent ${input.agentId}.`,
        sessionProfileDir,
        externalUrl: page.url(),
      };
    }

    const currentUrl = page.url();
    if (/login|signin|auth/i.test(currentUrl)) {
      return {
        platform: 'hub_chuyenweb',
        agentId: input.agentId,
        status: 'needs_ceo_auth',
        message: `Phiên trình duyệt riêng của agent ${input.agentId} chưa đăng nhập Hub.ChuyenWeb (${currentUrl}). CEO cần đăng nhập một lần hoặc cung cấp token.`,
        sessionProfileDir,
        externalUrl: currentUrl,
      };
    }

    return {
      platform: 'hub_chuyenweb',
      agentId: input.agentId,
      status: 'ok',
      message: `Phiên Playwright HubCW của agent ${input.agentId} hoạt động tại ${currentUrl}.`,
      sessionProfileDir,
      externalUrl: currentUrl,
    };
  } catch (err) {
    return {
      platform: 'hub_chuyenweb',
      agentId: input.agentId,
      status: 'error',
      message: err instanceof Error ? err.message : 'Lỗi thao tác Playwright trên HubCW',
      sessionProfileDir,
    };
  } finally {
    await context.close();
  }
}
