import { detectVerificationGate, openPlatformSession } from '../src/browser.js';
import { PlaybookResult } from './email.js';

export async function runZaloOaPlaybook(action: string): Promise<PlaybookResult> {
  if (process.env.DRY_RUN !== 'false') {
    return {
      platform: 'Zalo Official Account',
      status: 'dry_run',
      message: `DRY_RUN: Đã kiểm tra trạng thái Zalo OA (${action}).`,
    };
  }

  const session = await openPlatformSession('zalo_oa');
  try {
    await session.page.goto('https://oa.zalo.me/manage', { waitUntil: 'domcontentloaded' });
    const gate = await detectVerificationGate(session.page);
    if (gate.blocked) {
      return { platform: 'Zalo OA', status: 'blocked_ask_ceo', message: gate.reason || 'Cần quét QR / OTP Zalo OA' };
    }
    await session.saveSession();
    return { platform: 'Zalo OA', status: 'ok', message: 'Phiên Zalo OA Manage đã lưu.' };
  } finally {
    await session.close();
  }
}
