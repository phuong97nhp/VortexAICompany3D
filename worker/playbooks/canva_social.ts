import { detectVerificationGate, openPlatformSession } from '../src/browser.js';
import { PlaybookResult } from './email.js';

export async function runCanvaSocialPlaybook(action: string): Promise<PlaybookResult> {
  if (process.env.DRY_RUN !== 'false') {
    return {
      platform: 'Canva / TikTok / YouTube',
      status: 'dry_run',
      message: `DRY_RUN: Playbook Canva & Social (${action}) sẵn sàng.`,
    };
  }

  const session = await openPlatformSession('canva_social');
  try {
    await session.page.goto('https://www.canva.com', { waitUntil: 'domcontentloaded' });
    const gate = await detectVerificationGate(session.page);
    if (gate.blocked) {
      return {
        platform: 'Canva / Social',
        status: 'blocked_ask_ceo',
        message: gate.reason || 'Yêu cầu CAPTCHA/2FA khi đăng nhập Canva',
      };
    }
    await session.saveSession();
    return { platform: 'Canva / Social', status: 'ok', message: 'Đã lưu session Canva.' };
  } finally {
    await session.close();
  }
}
