export type RealtimeStatus = 'connected' | 'reconnecting' | 'offline';

export interface RealtimeBridgeEvent {
  type: 'heartbeat' | 'alert' | 'law_update' | 'sync';
  payload?: Record<string, unknown>;
  timestamp: number;
}

class RealtimeBridgeClient {
  private source: EventSource | null = null;
  private status: RealtimeStatus = 'offline';
  private retryAttempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;
  private statusListeners = new Set<(s: RealtimeStatus) => void>();
  private eventListeners = new Set<(ev: RealtimeBridgeEvent) => void>();

  getStatus(): RealtimeStatus {
    return this.status;
  }

  subscribeStatus(fn: (s: RealtimeStatus) => void): () => void {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  subscribeEvents(fn: (ev: RealtimeBridgeEvent) => void): () => void {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  private setStatus(s: RealtimeStatus) {
    if (this.status === s) return;
    this.status = s;
    for (const fn of this.statusListeners) fn(s);
  }

  start(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.source) {
      this.source.close();
      this.source = null;
    }
    this.setStatus('offline');
  }

  /** Force a reconnect cycle (useful in tests & recovery controls) */
  forceReconnect(): void {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
    this.retryAttempt = 0;
    if (!this.stopped) {
      this.setStatus('reconnecting');
      this.connect();
    }
  }

  private connect(): void {
    if (this.stopped) return;
    try {
      const es = new EventSource('/api/events');
      this.source = es;

      es.onopen = () => {
        this.retryAttempt = 0;
        this.setStatus('connected');
      };

      es.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data) as RealtimeBridgeEvent;
          for (const fn of this.eventListeners) fn(parsed);
        } catch {
          // Ignore malformed event line
        }
      };

      es.onerror = () => {
        es.close();
        this.source = null;
        if (this.stopped) return;
        this.setStatus('reconnecting');
        const delayMs = Math.min(20_000, 1000 * Math.pow(2, this.retryAttempt)) + Math.floor(Math.random() * 400);
        this.retryAttempt += 1;
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          this.connect();
        }, delayMs);
      };
    } catch {
      this.setStatus('reconnecting');
    }
  }
}

export const realtimeBridge = new RealtimeBridgeClient();
