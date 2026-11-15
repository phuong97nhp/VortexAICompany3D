import { ZaloPersonalSession } from '../../types';

/**
 * Browser client adapter communicating with /api/zalo-personal/* (which bridges to /worker zca-js
 * or provides a transparent Sandbox QR simulation in preview mode).
 */
export const zaloPersonalAdapter = {
  async requestQrLogin(): Promise<ZaloPersonalSession> {
    try {
      const res = await fetch('/api/zalo-personal/qr-start', { method: 'POST' });
      if (res.ok) {
        return (await res.json()) as ZaloPersonalSession;
      }
    } catch {
      // fallback below
    }
    return {
      status: 'qr_pending',
      mode: 'sandbox_sim',
      qrExpiresAt: Date.now() + 120_000,
      lastError: undefined,
    };
  },

  async confirmSimulatedQrScan(accountName = 'Zalo Công Ty Phụ'): Promise<ZaloPersonalSession> {
    try {
      const res = await fetch('/api/zalo-personal/qr-confirm-sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountName }),
      });
      if (res.ok) return (await res.json()) as ZaloPersonalSession;
    } catch {
      // fallback
    }
    return {
      status: 'connected',
      mode: 'sandbox_sim',
      accountName,
      userIdMasked: '****8821',
      lastHeartbeatAt: Date.now(),
    };
  },

  async disconnect(): Promise<ZaloPersonalSession> {
    try {
      await fetch('/api/zalo-personal/disconnect', { method: 'POST' });
    } catch {
      // ignore
    }
    return { status: 'disconnected', mode: 'sandbox_sim' };
  },

  async sendMessage(params: {
    peerId: string;
    peerName: string;
    text: string;
    envMode: string;
  }): Promise<{ ok: boolean; anomalyDetected?: string; error?: string }> {
    try {
      const res = await fetch('/api/zalo-personal/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return (await res.json()) as { ok: boolean; anomalyDetected?: string; error?: string };
    } catch (err) {
      return {
        ok: params.envMode === 'sandbox',
        error: err instanceof Error ? err.message : 'Lỗi kết nối Zalo Cá nhân',
      };
    }
  },
};
