import { detectVerificationGate, openPlatformSession } from '../src/browser.js';
import { PlaybookResult } from './email.js';

export async function runFacebookPagePlaybook(action: string): Promise<PlaybookResult> {
  if (process.env.DRY_RUN !== 'false') {
    return {
      platform: 'Facebook Page',
      status: 'dry_run',
      message: `DRY_RUN: Playbook Facebook Page (${action}) sẵn sàng.`,
    };
  }

  const session = await openPlatformSession('facebook_page');
  try {
    await session.page.goto('https://business.facebook.com', { waitUntil: 'domcontentloaded' });
    const gate = await detectVerificationGate(session.page);
    if (gate.blocked) {
      return {
        platform: 'Facebook Page',
        status: 'blocked_ask_ceo',
        message: gate.reason || 'Facebook yêu cầu xác thực 2FA/Captcha',
      };
    }
    await session.saveSession();
    return { platform: 'Facebook Page', status: 'ok', message: 'Phiên Meta Business đã sẵn sàng.' };
  } finally {
    await session.close();
  }
}
