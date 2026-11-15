import { DeviceDescriptor, DeviceDriver } from './types.js';

/**
 * Throttled 1-2 fps screenshot streamer that ONLY captures when a device has
 * active UI viewers (`isStreaming = true`) to save battery and USB bandwidth.
 */
export class DeviceScreenStreamer {
  private timers = new Map<string, NodeJS.Timeout>();

  startStreaming(
    device: DeviceDescriptor,
    driver: DeviceDriver,
    onFrame: (deviceId: string, screenshotDataUrl: string) => void,
    fps = 1.5
  ) {
    this.stopStreaming(device.id);
    const intervalMs = Math.max(400, Math.round(1000 / Math.min(3, Math.max(1, fps))));
    const timer = setInterval(async () => {
      try {
        const frame = await driver.screenshot(device.serial);
        if (frame) {
          onFrame(device.id, frame);
        }
      } catch {
        // transient capture hiccup
      }
    }, intervalMs);
    this.timers.set(device.id, timer);
  }

  stopStreaming(deviceId: string) {
    const t = this.timers.get(deviceId);
    if (t) {
      clearInterval(t);
      this.timers.delete(deviceId);
    }
  }

  stopAll() {
    for (const id of this.timers.keys()) {
      this.stopStreaming(id);
    }
  }
}
