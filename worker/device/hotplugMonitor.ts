import { DeviceDescriptor, DeviceDriver } from './types.js';

export interface HotplugEvent {
  type: 'device_connected' | 'device_disconnected' | 'device_unauthorized' | 'device_state_changed';
  device: DeviceDescriptor;
  timestamp: number;
}

/**
 * Polls connected drivers at 2s intervals (safe cross-platform hotplug fallback alongside adb track-devices)
 * and emits structured transition events without leaking duplicate notifications.
 */
export class DeviceHotplugMonitor {
  private drivers: DeviceDriver[];
  private lastSnapshot = new Map<string, DeviceDescriptor>();
  private timer: NodeJS.Timeout | null = null;
  private listeners = new Set<(evt: HotplugEvent) => void>();

  constructor(drivers: DeviceDriver[]) {
    this.drivers = drivers;
  }

  subscribe(fn: (evt: HotplugEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(evt: HotplugEvent) {
    for (const fn of this.listeners) {
      try {
        fn(evt);
      } catch {
        // ignore listener error
      }
    }
  }

  async scanOnce(): Promise<DeviceDescriptor[]> {
    const all: DeviceDescriptor[] = [];
    for (const driver of this.drivers) {
      try {
        const list = await driver.listDevices();
        all.push(...list);
      } catch {
        // driver offline/unavailable
      }
    }

    const nextMap = new Map<string, DeviceDescriptor>();
    const now = Date.now();

    for (const dev of all) {
      const prev = this.lastSnapshot.get(dev.id);
      const merged: DeviceDescriptor = prev
        ? {
            ...dev,
            controlMode: prev.controlMode,
            assignedAgentId: prev.assignedAgentId,
            assignedDepartment: prev.assignedDepartment,
            isStreaming: prev.isStreaming,
            lastScreenshotDataUrl: dev.lastScreenshotDataUrl || prev.lastScreenshotDataUrl,
            lastOcrTextMasked: dev.lastOcrTextMasked || prev.lastOcrTextMasked,
          }
        : dev;
      nextMap.set(merged.id, merged);

      if (!prev) {
        this.emit({
          type: merged.status === 'unauthorized' ? 'device_unauthorized' : 'device_connected',
          device: merged,
          timestamp: now,
        });
      } else if (prev.status !== merged.status) {
        this.emit({
          type: merged.status === 'unauthorized' ? 'device_unauthorized' : 'device_state_changed',
          device: merged,
          timestamp: now,
        });
      }
    }

    for (const [oldId, oldDev] of this.lastSnapshot.entries()) {
      if (!nextMap.has(oldId)) {
        this.emit({
          type: 'device_disconnected',
          device: { ...oldDev, status: 'offline', isStreaming: false },
          timestamp: now,
        });
      }
    }

    this.lastSnapshot = nextMap;
    return Array.from(nextMap.values());
  }

  getCachedDevices(): DeviceDescriptor[] {
    return Array.from(this.lastSnapshot.values());
  }

  start(intervalMs = 2000) {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.scanOnce().catch(() => {});
    }, intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
