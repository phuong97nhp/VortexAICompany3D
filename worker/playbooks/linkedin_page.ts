import { detectVerificationGate, openPlatformSession } from '../src/browser.js';
import { PlaybookResult } from './email.js';

export async function runLinkedInPagePlaybook(action: string): Promise<PlaybookResult> {
  if (process.env.DRY_RUN !== 'false') {
    return {
      platform: 'LinkedIn Company Page',
      status: 'dry_run',
      message: `DRY_RUN: Playbook LinkedIn Company Page (${action}) sẵn sàng.`,
    };
  }

  const session = await openPlatformSession('linkedin_page');
  try {
    await session.page.goto('https://www.linkedin.com/company/setup/new/', { waitUntil: 'domcontentloaded' });
    const gate = await detectVerificationGate(session.page);
    if (gate.blocked) {
      return {
        platform: 'LinkedIn Company Page',
        status: 'blocked_ask_ceo',
        message: gate.reason || 'LinkedIn yêu cầu xác minh đăng nhập hoặc Captcha.',
      };
    }
    await session.saveSession();
    return { platform: 'LinkedIn Company Page', status: 'ok', message: 'Phiên LinkedIn Company Page đã sẵn sàng.' };
  } finally {
    await session.close();
  }
}
