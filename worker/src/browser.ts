import fs from 'node:fs';
import path from 'node:path';
import { chromium, BrowserContext, Page } from 'playwright';

const SESSIONS_DIR = path.resolve(process.cwd(), '.sessions');

export interface BrowserSessionHandle {
  page: Page;
  close: () => Promise<void>;
  saveSession: () => Promise<void>;
}

export async function openPlatformSession(platformKey: string): Promise<BrowserSessionHandle> {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
  const statePath = path.join(SESSIONS_DIR, `${platformKey}.json`);
  const headless = process.env.HEADLESS !== 'false';

  const browser = await chromium.launch({ headless });
  const contextOptions = fs.existsSync(statePath) ? { storageState: statePath } : {};
  const context: BrowserContext = await browser.newContext(contextOptions);
  const page = await context.newPage();

  return {
    page,
    saveSession: async () => {
      await context.storageState({ path: statePath });
    },
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

/**
 * Checks whether the current page asks for CAPTCHA, OTP, or 2FA.
 * Policy: NEVER bypass automatically. Stop immediately and escalate via ask_ceo.
 */
export async function detectVerificationGate(page: Page): Promise<{ blocked: boolean; reason?: string }> {
  const content = (await page.content()).toLowerCase();
  const patterns = [
    { match: /captcha|recaptcha|hcaptcha|arkose/i, reason: 'Phát hiện CAPTCHA — Dừng ngay để hỏi CEO' },
    { match: /two-factor|2fa|xác thực hai yếu tố|mã otp|nhập mã xác nhận/i, reason: 'Yêu cầu OTP / 2FA — Dừng ngay để hỏi CEO' },
    { match: /identity verification|giấy tờ tùy thân|cccd|giấy phép kinh doanh/i, reason: 'Yêu cầu xác minh giấy tờ — Dừng ngay để hỏi CEO' },
  ];

  for (const p of patterns) {
    if (p.match.test(content)) {
      return { blocked: true, reason: p.reason };
    }
  }
  return { blocked: false };
}
