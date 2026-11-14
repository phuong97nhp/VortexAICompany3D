import { detectVerificationGate, openPlatformSession } from '../src/browser.js';
import { PlaybookResult } from './email.js';

export async function runTikTokBusinessPlaybook(action: string): Promise<PlaybookResult> {
  if (process.env.DRY_RUN !== 'false') {
    return {
      platform: 'TikTok Business',
      status: 'dry_run',
      message: `DRY_RUN: Playbook TikTok Business (${action}) sẵn sàng. Nếu gặp OTP SMS/Captcha thật sẽ dừng và gọi ask_ceo.`,
    };
  }

  const session = await openPlatformSession('tiktok_business');
  try {
    await session.page.goto('https://www.tiktok.com/business/', { waitUntil: 'domcontentloaded' });
    const gate = await detectVerificationGate(session.page);
    if (gate.blocked) {
      return {
        platform: 'TikTok Business',
        status: 'blocked_ask_ceo',
        message: gate.reason || 'TikTok yêu cầu OTP SMS / Captcha người thật.',
      };
    }
    await session.saveSession();
    return { platform: 'TikTok Business', status: 'ok', message: 'Phiên TikTok Business đã sẵn sàng.' };
  } finally {
    await session.close();
  }
}
