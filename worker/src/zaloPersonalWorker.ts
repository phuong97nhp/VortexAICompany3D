import { redactForLog } from './vault.js';

export interface ZaloPersonalWorkerSession {
  status: 'disconnected' | 'qr_pending' | 'connected' | 'expired' | 'blocked_anomaly';
  qrDataUrl?: string;
  qrExpiresAt?: number;
  accountName?: string;
  userIdMasked?: string;
  mode: 'worker_zca_js' | 'sandbox_sim';
  lastHeartbeatAt?: number;
  lastError?: string;
}

/**
 * Safe wrapper around `zca-js` so /worker supports real Personal Zalo QR login & messaging
 * when DRY_RUN=false, while defaulting to safe sandbox simulation in DRY_RUN=true.
 */
export class ZaloPersonalWorker {
  private session: ZaloPersonalWorkerSession = {
    status: 'disconnected',
    mode: process.env.DRY_RUN === 'false' ? 'worker_zca_js' : 'sandbox_sim',
  };
  private zcaApi: unknown = null;

  getSession(): ZaloPersonalWorkerSession {
    return this.session;
  }

  async startQrLogin(): Promise<ZaloPersonalWorkerSession> {
    if (process.env.DRY_RUN !== 'false') {
      this.session = {
        status: 'qr_pending',
        mode: 'sandbox_sim',
        qrExpiresAt: Date.now() + 120_000,
      };
      return this.session;
    }

    try {
      const zcaMod = (await import('zca-js')) as { Zalo?: new () => { loginQR: (opts?: unknown, cb?: (evt: { data?: { image?: string } }) => void) => Promise<unknown> } };
      if (!zcaMod.Zalo) {
        throw new Error('zca-js module unavailable');
      }
      const zalo = new zcaMod.Zalo();
      let capturedQr: string | undefined;
      this.session = {
        status: 'qr_pending',
        mode: 'worker_zca_js',
        qrExpiresAt: Date.now() + 120_000,
      };

      // Trigger loginQR non-blocking with short wait for initial QR image event
      const loginPromise = zalo.loginQR(undefined, (event) => {
        if (event?.data?.image) {
          capturedQr = `data:image/png;base64,${event.data.image}`;
          this.session = {
            ...this.session,
            qrDataUrl: capturedQr,
          };
        }
      });

      loginPromise
        .then((api) => {
          this.zcaApi = api;
          this.session = {
            status: 'connected',
            mode: 'worker_zca_js',
            accountName: 'Zalo Công Ty (zca-js)',
            lastHeartbeatAt: Date.now(),
          };
        })
        .catch((err) => {
          this.session = {
            status: 'expired',
            mode: 'worker_zca_js',
            lastError: redactForLog(String(err)),
          };
        });

      await new Promise((r) => setTimeout(r, 900));
      return this.session;
    } catch (err) {
      this.session = {
        status: 'qr_pending',
        mode: 'sandbox_sim',
        qrExpiresAt: Date.now() + 120_000,
        lastError: redactForLog(String(err)),
      };
      return this.session;
    }
  }

  confirmSimulatedQr(accountName = 'Zalo Công Ty Phụ (Sandbox)'): ZaloPersonalWorkerSession {
    this.session = {
      status: 'connected',
      mode: 'sandbox_sim',
      accountName,
      userIdMasked: '****8821',
      lastHeartbeatAt: Date.now(),
    };
    return this.session;
  }

  disconnect(): ZaloPersonalWorkerSession {
    this.zcaApi = null;
    this.session = {
      status: 'disconnected',
      mode: process.env.DRY_RUN === 'false' ? 'worker_zca_js' : 'sandbox_sim',
    };
    return this.session;
  }

  async sendMessage(params: {
    peerId: string;
    text: string;
  }): Promise<{ ok: boolean; anomalyDetected?: string; error?: string }> {
    if (this.session.status !== 'connected') {
      return { ok: false, error: 'Phiên Zalo Cá nhân chưa kết nối (hãy quét QR trước).' };
    }
    if (this.session.mode === 'sandbox_sim' || !this.zcaApi) {
      return { ok: true };
    }
    try {
      const api = this.zcaApi as {
        sendMessage?: (msg: string | { msg: string }, threadId: string) => Promise<unknown>;
      };
      if (typeof api.sendMessage === 'function') {
        await api.sendMessage(params.text, params.peerId);
        return { ok: true };
      }
      return { ok: false, error: 'API sendMessage của phiên zca-js không sẵn sàng.' };
    } catch (err) {
      const msg = redactForLog(String(err));
      const isAnomaly = /(rate|block|captcha|checkpoint|429)/i.test(msg);
      if (isAnomaly) {
        this.session = { ...this.session, status: 'blocked_anomaly', lastError: msg };
      }
      return {
        ok: false,
        anomalyDetected: isAnomaly ? msg : undefined,
        error: msg,
      };
    }
  }
}
