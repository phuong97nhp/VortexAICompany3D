import { detectVerificationGate, openPlatformSession } from '../src/browser.js';
import { PlaybookResult } from './email.js';

export async function runGoogleBusinessPlaybook(action: string): Promise<PlaybookResult> {
  if (process.env.DRY_RUN !== 'false') {
    return {
      platform: 'Google Business Profile',
      status: 'dry_run',
      message: `DRY_RUN: Playbook Google Business (${action}) sẵn sàng.`,
    };
  }

  const session = await openPlatformSession('google_business');
  try {
    await session.page.goto('https://business.google.com', { waitUntil: 'domcontentloaded' });
    const gate = await detectVerificationGate(session.page);
    if (gate.blocked) {
      return {
        platform: 'Google Business Profile',
        status: 'blocked_ask_ceo',
        message: gate.reason || 'Google yêu cầu xác minh doanh nghiệp',
      };
    }
    await session.saveSession();
    return { platform: 'Google Business Profile', status: 'ok', message: 'Đã cập nhật phiên Google Business.' };
  } finally {
    await session.close();
  }
}
