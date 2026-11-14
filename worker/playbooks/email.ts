import { detectVerificationGate, openPlatformSession } from '../src/browser.js';

export interface PlaybookResult {
  platform: string;
  status: 'ok' | 'blocked_ask_ceo' | 'dry_run';
  message: string;
}

export async function runEmailPlaybook(action: string): Promise<PlaybookResult> {
  if (process.env.DRY_RUN !== 'false') {
    return {
      platform: 'Email Doanh Nghiệp (SMTP/Workspace)',
      status: 'dry_run',
      message: `DRY_RUN: Kiểm tra playbook email (${action}) thành công.`,
    };
  }

  const session = await openPlatformSession('email_workspace');
  try {
    await session.page.goto('https://accounts.google.com', { waitUntil: 'domcontentloaded' });
    const gate = await detectVerificationGate(session.page);
    if (gate.blocked) {
      return { platform: 'Email Doanh Nghiệp', status: 'blocked_ask_ceo', message: gate.reason || 'Cần xác minh 2FA' };
    }
    await session.saveSession();
    return { platform: 'Email Doanh Nghiệp', status: 'ok', message: 'Phiên đăng nhập Email đã sẵn sàng.' };
  } finally {
    await session.close();
  }
}
