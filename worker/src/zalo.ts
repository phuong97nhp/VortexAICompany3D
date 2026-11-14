import crypto from 'node:crypto';

let cachedAccessToken = '';
let tokenExpiresAt = 0;

export function verifyZaloWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  appId: string,
  timestamp: string
): boolean {
  const secret = process.env.ZALO_WEBHOOK_SECRET || process.env.ZALO_OA_SECRET_KEY || '';
  if (!secret || !signatureHeader) return false;
  const payload = `${appId}${rawBody}${timestamp}${secret}`;
  const expected = 'mac=' + crypto.createHash('sha256').update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export async function refreshZaloAccessToken(): Promise<string> {
  const appId = process.env.ZALO_OA_APP_ID || '';
  const secretKey = process.env.ZALO_OA_SECRET_KEY || '';
  const refreshToken = process.env.ZALO_OA_REFRESH_TOKEN || '';

  if (!appId || !secretKey || !refreshToken) {
    throw new Error('Thiếu ZALO_OA_APP_ID / ZALO_OA_SECRET_KEY / ZALO_OA_REFRESH_TOKEN');
  }

  const res = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      secret_key: secretKey,
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      app_id: appId,
      grant_type: 'refresh_token',
    }),
  });

  const data = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || 'Không thể làm mới Zalo OA access_token');
  }

  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + ((data.expires_in || 3600) - 120) * 1000;
  return cachedAccessToken;
}

async function getValidAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }
  return refreshZaloAccessToken();
}

export async function sendZaloOAMessage(userId: string, text: string): Promise<{ ok: boolean; dryRun?: boolean; error?: string }> {
  if (process.env.DRY_RUN !== 'false') {
    console.log(`[DRY_RUN Zalo OA -> ${userId}]: ${text}`);
    return { ok: true, dryRun: true };
  }

  try {
    const token = await getValidAccessToken();
    const res = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: token,
      },
      body: JSON.stringify({
        recipient: { user_id: userId },
        message: { text },
      }),
    });
    const data = (await res.json()) as { error?: number; message?: string };
    if (!res.ok || (data.error && data.error !== 0)) {
      return { ok: false, error: data.message || `Zalo API error ${data.error}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Zalo send failed' };
  }
}
