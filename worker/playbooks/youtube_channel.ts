import { detectVerificationGate, openPlatformSession } from '../src/browser.js';
import { PlaybookResult } from './email.js';

export async function runYouTubeChannelPlaybook(action: string): Promise<PlaybookResult> {
  if (process.env.DRY_RUN !== 'false') {
    return {
      platform: 'YouTube Channel',
      status: 'dry_run',
      message: `DRY_RUN: Playbook YouTube Studio (${action}) sẵn sàng.`,
    };
  }

  const session = await openPlatformSession('youtube_channel');
  try {
    await session.page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded' });
    const gate = await detectVerificationGate(session.page);
    if (gate.blocked) {
      return {
        platform: 'YouTube Channel',
        status: 'blocked_ask_ceo',
        message: gate.reason || 'YouTube yêu cầu xác minh 2FA Google Account.',
      };
    }
    await session.saveSession();
    return { platform: 'YouTube Channel', status: 'ok', message: 'Phiên YouTube Studio đã sẵn sàng.' };
  } finally {
    await session.close();
  }
}
