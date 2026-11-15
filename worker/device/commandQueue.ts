type QueuedJob = {
  run: () => Promise<void>;
  reject: (err: Error) => void;
};

/**
 * Strictly sequential FIFO command queue per Android device serial,
 * ensuring at most 1 action runs on a physical device at any instant.
 */
export class DeviceCommandQueue {
  private queues = new Map<string, QueuedJob[]>();
  private running = new Set<string>();
  private killSwitched = false;

  setKillSwitch(active: boolean) {
    this.killSwitched = active;
    if (active) {
      this.flushAll('Kill Switch kích hoạt — đã hủy toàn bộ hàng đợi lệnh thiết bị.');
    }
  }

  isKillSwitched(): boolean {
    return this.killSwitched;
  }

  flushAll(reason = 'Đã hủy hàng đợi thao tác.') {
    for (const [deviceId, list] of this.queues.entries()) {
      for (const job of list) {
        job.reject(new Error(reason));
      }
      this.queues.set(deviceId, []);
    }
  }

  flushDevice(deviceId: string, reason = 'CEO giành lại quyền điều khiển — đã dừng hàng đợi.') {
    const list = this.queues.get(deviceId) || [];
    for (const job of list) {
      job.reject(new Error(reason));
    }
    this.queues.set(deviceId, []);
  }

  enqueue<T>(deviceId: string, fn: () => Promise<T>): Promise<T> {
    if (this.killSwitched) {
      return Promise.reject(new Error('Kill Switch đang bật — không nhận thêm lệnh thiết bị.'));
    }

    return new Promise<T>((resolve, reject) => {
      const list = this.queues.get(deviceId) || [];
      list.push({
        run: async () => {
          try {
            const result = await fn();
            resolve(result);
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        },
        reject,
      });
      this.queues.set(deviceId, list);
      this.pump(deviceId);
    });
  }

  private pump(deviceId: string) {
    if (this.running.has(deviceId)) return;
    const list = this.queues.get(deviceId);
    if (!list || list.length === 0) return;

    const next = list.shift()!;
    this.running.add(deviceId);
    next.run().finally(() => {
      this.running.delete(deviceId);
      this.pump(deviceId);
    });
  }
}
