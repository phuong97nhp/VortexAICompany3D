import { spawnAdbTrackDevices } from './adbDiscovery.js';
import { DeviceDescriptor, DeviceDriver } from './types.js';

export interface HotplugEvent {
  type: 'device_connected' | 'device_disconnected' | 'device_unauthorized' | 'device_state_changed';
  device: DeviceDescriptor;
  timestamp: number;
}

/**
 * Monitors USB/Wi-Fi/Emulator hotplug via real-time `adb track-devices` stream
 * paired with a 2s polling safety fallback.
 */
export class DeviceHotplugMonitor {
  private drivers: DeviceDriver[];
  private lastSnapshot = new Map<string, DeviceDescriptor>();
  private timer: NodeJS.Timeout | null = null;
  private stopTrackDevices: (() => void) | null = null;
  private listeners = new Set<(evt: HotplugEvent) => void>();

  constructor(drivers: DeviceDriver[]) {
    this.drivers = drivers;
  }

  updateDrivers(drivers: DeviceDriver[]) {
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
            suggestedAgentId: dev.suggestedAgentId || prev.suggestedAgentId,
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

  start(intervalMs = 2000, adbPath?: string | null) {
    if (adbPath && !this.stopTrackDevices) {
      this.stopTrackDevices = spawnAdbTrackDevices(adbPath, () => {
        this.scanOnce().catch(() => {});
      });
    }
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.scanOnce().catch(() => {});
    }, intervalMs);
  }

  stop() {
    if (this.stopTrackDevices) {
      this.stopTrackDevices();
      this.stopTrackDevices = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
