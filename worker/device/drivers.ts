import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runAdbCommand } from './adbDiscovery.js';
import { DeviceConnectionStatus, DeviceDescriptor, DeviceDriver } from './types.js';

const execFileAsync = promisify(execFile);

function parseAdbDevicesOutput(raw: string): Array<{
  serial: string;
  rawState: string;
  model: string;
  isWifi: boolean;
  isEmulator: boolean;
}> {
  const lines = raw.split(/\r?\n/).slice(1);
  const items: Array<{ serial: string; rawState: string; model: string; isWifi: boolean; isEmulator: boolean }> = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    const serial = parts[0];
    const rawState = parts[1] || 'offline';
    const modelMatch = trimmed.match(/model:([^\s]+)/);
    const model = modelMatch ? modelMatch[1].replace(/_/g, ' ') : serial;
    const isEmulator = serial.startsWith('emulator-');
    const isWifi = /^\d+\.\d+\.\d+\.\d+:\d+$/.test(serial) || serial.includes('_adb-tls-connect');
    items.push({ serial, rawState, model, isWifi, isEmulator });
  }
  return items;
}

function mapRawState(rawState: string): DeviceConnectionStatus {
  if (rawState === 'unauthorized') return 'unauthorized';
  if (rawState === 'device') return 'device';
  if (rawState === 'offline') return 'offline';
  return 'error';
}

export class AdbDeviceDriver implements DeviceDriver {
  readonly driverType = 'adb_usb' as const;
  private adbPath: string;

  constructor(adbPath: string) {
    this.adbPath = adbPath;
  }

  async listDevices(): Promise<DeviceDescriptor[]> {
    const out = await runAdbCommand(this.adbPath, ['devices', '-l'], 5000);
    const parsed = parseAdbDevicesOutput(out).filter((d) => !d.isEmulator);
    const now = Date.now();
    const descriptors: DeviceDescriptor[] = [];

    for (const d of parsed) {
      const status = mapRawState(d.rawState);
      let androidVersion = 'Android';
      let batteryPercent = 100;
      let temperatureC = 32;
      let foregroundPackage = 'com.android.launcher';
      let screenWidth = 1080;
      let screenHeight = 2400;

      if (status === 'device') {
        try {
          androidVersion = (await runAdbCommand(this.adbPath, ['-s', d.serial, 'shell', 'getprop', 'ro.build.version.release'], 3000)).trim() || 'Android';
          const tel = await this.getTelemetry(d.serial);
          batteryPercent = tel.batteryPercent;
          temperatureC = tel.temperatureC;
          foregroundPackage = await this.getForegroundPackage(d.serial);
          const wmOut = await runAdbCommand(this.adbPath, ['-s', d.serial, 'shell', 'wm', 'size'], 3000);
          const sz = wmOut.match(/(\d+)x(\d+)/);
          if (sz) {
            screenWidth = Number(sz[1]);
            screenHeight = Number(sz[2]);
          }
        } catch {
          // Non-fatal metadata fetch failure
        }
      }

      descriptors.push({
        id: `dev_${d.serial.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        serial: d.serial,
        modelName: d.model,
        androidVersion: `Android ${androidVersion}`,
        driverType: d.isWifi ? 'adb_wifi' : 'adb_usb',
        status,
        controlMode: 'view_only',
        batteryPercent,
        temperatureC,
        screenWidth,
        screenHeight,
        foregroundPackage,
        isStreaming: false,
        blockedReason:
          status === 'unauthorized'
            ? 'Hãy mở khóa điện thoại và bấm "Cho phép Gỡ lỗi USB (Always allow from this computer)".'
            : undefined,
        lastSeenAt: now,
      });
    }
    return descriptors;
  }

  async getForegroundPackage(serial: string): Promise<string> {
    try {
      const out = await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'dumpsys', 'window', 'windows'], 4000);
      const match = out.match(/mCurrentFocus=Window\{[^}]+\s+([^\s/}]+)\//);
      if (match) return match[1];
    } catch {
      // fallback
    }
    return 'unknown';
  }

  async getTelemetry(serial: string): Promise<{ batteryPercent: number; temperatureC: number }> {
    try {
      const out = await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'dumpsys', 'battery'], 3000);
      const levelMatch = out.match(/level:\s*(\d+)/);
      const tempMatch = out.match(/temperature:\s*(\d+)/);
      return {
        batteryPercent: levelMatch ? Number(levelMatch[1]) : 100,
        temperatureC: tempMatch ? Number((Number(tempMatch[1]) / 10).toFixed(1)) : 32,
      };
    } catch {
      return { batteryPercent: 100, temperatureC: 32 };
    }
  }

  async screenshot(serial: string): Promise<string | undefined> {
    const { stdout } = await execFileAsync(this.adbPath, ['-s', serial, 'exec-out', 'screencap', '-p'], {
      encoding: 'buffer',
      timeout: 7000,
      maxBuffer: 12 * 1024 * 1024,
    });
    if (!stdout || stdout.length < 32) return undefined;
    return `data:image/png;base64,${stdout.toString('base64')}`;
  }

  async readOcrText(serial: string): Promise<string> {
    try {
      await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'uiautomator', 'dump', '/sdcard/ai_ui.xml'], 6000);
      const xml = await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'cat', '/sdcard/ai_ui.xml'], 4000);
      const texts: string[] = [];
      const re = /text="([^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml)) !== null) {
        if (m[1].trim()) texts.push(m[1].trim());
      }
      return texts.slice(0, 60).join(' | ');
    } catch {
      return '';
    }
  }

  async tap(serial: string, x: number, y: number): Promise<void> {
    await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'input', 'tap', String(Math.round(x)), String(Math.round(y))]);
  }

  async swipe(serial: string, x1: number, y1: number, x2: number, y2: number, durationMs = 280): Promise<void> {
    await runAdbCommand(this.adbPath, [
      '-s',
      serial,
      'shell',
      'input',
      'swipe',
      String(Math.round(x1)),
      String(Math.round(y1)),
      String(Math.round(x2)),
      String(Math.round(y2)),
      String(Math.round(durationMs)),
    ]);
  }

  async inputText(serial: string, text: string): Promise<void> {
    // Prefer ADBKeyboard broadcast if installed for full Vietnamese Unicode, else ASCII input text
    const hasUnicode = /[^\x20-\x7E]/.test(text);
    if (hasUnicode) {
      const b64 = Buffer.from(text, 'utf8').toString('base64');
      try {
        await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'am', 'broadcast', '-a', 'ADB_INPUT_B64', '--es', 'msg', b64]);
        return;
      } catch {
        // Fallback to stripped safe ascii
      }
    }
    const escaped = text.replace(/ /g, '%s').replace(/['"\\;&|<>()`$]/g, '');
    await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'input', 'text', escaped]);
  }

  async keyEvent(serial: string, keyCode: number): Promise<void> {
    await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'input', 'keyevent', String(keyCode)]);
  }

  async openApp(serial: string, packageName: string): Promise<void> {
    await runAdbCommand(this.adbPath, [
      '-s',
      serial,
      'shell',
      'monkey',
      '-p',
      packageName,
      '-c',
      'android.intent.category.LAUNCHER',
      '1',
    ]);
  }
}

export class EmulatorDeviceDriver extends AdbDeviceDriver {
  private readonly emuAdb: string;
  constructor(adbPath: string) {
    super(adbPath);
    this.emuAdb = adbPath;
  }

  override async listDevices(): Promise<DeviceDescriptor[]> {
    const out = await runAdbCommand(this.emuAdb, ['devices', '-l'], 5000);
    const parsed = parseAdbDevicesOutput(out).filter((d) => d.isEmulator);
    const now = Date.now();
    return parsed.map((d) => ({
      id: `dev_${d.serial.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      serial: d.serial,
      modelName: `${d.model} (Emulator)`,
      androidVersion: 'Android Emulator',
      driverType: 'emulator',
      status: mapRawState(d.rawState),
      controlMode: 'view_only',
      batteryPercent: 100,
      temperatureC: 30,
      screenWidth: 1080,
      screenHeight: 2400,
      foregroundPackage: 'com.android.launcher',
      isStreaming: false,
      lastSeenAt: now,
    }));
  }
}

function makeMockScreenSvgDataUrl(deviceName: string, appPkg: string, note: string): string {
  const safeApp = appPkg.replace(/[<>&"]/g, '');
  const safeNote = note.slice(0, 48).replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640">
    <rect width="360" height="640" rx="28" fill="#0f172a"/>
    <rect x="14" y="16" width="332" height="608" rx="20" fill="#1e293b" stroke="#334155"/>
    <rect x="120" y="24" width="120" height="10" rx="5" fill="#475569"/>
    <text x="28" y="64" fill="#38bdf8" font-family="sans-serif" font-size="13" font-weight="bold">${deviceName}</text>
    <text x="28" y="84" fill="#94a3b8" font-family="monospace" font-size="11">MÔ PHỎNG SANDBOX · ${safeApp}</text>
    <rect x="28" y="106" width="304" height="120" rx="12" fill="#0f172a" stroke="#1e40af"/>
    <text x="42" y="138" fill="#e2e8f0" font-family="sans-serif" font-size="13">Kênh thiết bị ảo an toàn</text>
    <text x="42" y="164" fill="#94a3b8" font-family="sans-serif" font-size="12">${safeNote}</text>
    <rect x="28" y="244" width="304" height="54" rx="10" fill="#064e3b" opacity="0.65"/>
    <text x="42" y="276" fill="#6ee7b7" font-family="sans-serif" font-size="12">Chính sách bảo mật đang bật (Cấm Bank/Ví/2FA)</text>
    <text x="28" y="596" fill="#64748b" font-family="monospace" font-size="10">MOCK DRIVER — KHÔNG CHẠM HUBCW</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

/**
 * Isolated MockDeviceDriver for preview & CI tests.
 * Never connects to Hub.ChuyenWeb or external services.
 */
export class MockDeviceDriver implements DeviceDriver {
  readonly driverType = 'mock' as const;
  private devices: Map<string, DeviceDescriptor>;
  private mockOcrMap: Map<string, string> = new Map();

  constructor(initial?: DeviceDescriptor[]) {
    const now = Date.now();
    const seed = initial || [
      {
        id: 'dev_mock_pixel7',
        serial: 'MOCK-PIXEL7-01',
        modelName: 'Pixel 7 Pro (Mô phỏng)',
        androidVersion: 'Android 14 (Sandbox)',
        driverType: 'mock',
        status: 'device',
        controlMode: 'view_only',
        batteryPercent: 86,
        temperatureC: 31.5,
        screenWidth: 1080,
        screenHeight: 2400,
        foregroundPackage: 'com.zing.zalo',
        isStreaming: false,
        lastScreenshotDataUrl: makeMockScreenSvgDataUrl('Pixel 7 Pro (Sandbox)', 'com.zing.zalo', 'Sẵn sàng kiểm thử'),
        lastOcrTextMasked: 'Zalo OA · Hộp thư khách hàng · Chờ thao tác',
        lastSeenAt: now,
      },
    ];
    this.devices = new Map(seed.map((d) => [d.serial, d]));
  }

  private getBySerial(serial: string): DeviceDescriptor | undefined {
    return this.devices.get(serial);
  }

  setMockOcrText(serial: string, text: string) {
    this.mockOcrMap.set(serial, text);
  }

  async listDevices(): Promise<DeviceDescriptor[]> {
    const now = Date.now();
    return Array.from(this.devices.values()).map((d) => ({ ...d, lastSeenAt: now }));
  }

  async getForegroundPackage(serial: string): Promise<string> {
    return this.getBySerial(serial)?.foregroundPackage || 'com.zing.zalo';
  }

  async getTelemetry(serial: string): Promise<{ batteryPercent: number; temperatureC: number }> {
    const d = this.getBySerial(serial);
    return { batteryPercent: d?.batteryPercent ?? 85, temperatureC: d?.temperatureC ?? 31.5 };
  }

  async screenshot(serial: string): Promise<string | undefined> {
    const d = this.getBySerial(serial);
    if (!d) return undefined;
    const img = makeMockScreenSvgDataUrl(d.modelName, d.foregroundPackage, `Cập nhật ${new Date().toLocaleTimeString('vi-VN')}`);
    d.lastScreenshotDataUrl = img;
    return img;
  }

  async readOcrText(serial: string): Promise<string> {
    return this.mockOcrMap.get(serial) || this.getBySerial(serial)?.lastOcrTextMasked || 'Màn hình Zalo OA Sandbox';
  }

  async tap(serial: string, x: number, y: number): Promise<void> {
    const d = this.getBySerial(serial);
    if (d) {
      d.lastScreenshotDataUrl = makeMockScreenSvgDataUrl(d.modelName, d.foregroundPackage, `Chạm (${x}, ${y})`);
    }
  }

  async swipe(serial: string, x1: number, y1: number, x2: number, y2: number): Promise<void> {
    const d = this.getBySerial(serial);
    if (d) {
      d.lastScreenshotDataUrl = makeMockScreenSvgDataUrl(d.modelName, d.foregroundPackage, `Vuốt (${x1},${y1})→(${x2},${y2})`);
    }
  }

  async inputText(serial: string, text: string): Promise<void> {
    const d = this.getBySerial(serial);
    if (d) {
      d.lastOcrTextMasked = `Đã nhập: ${text.slice(0, 60)}`;
      d.lastScreenshotDataUrl = makeMockScreenSvgDataUrl(d.modelName, d.foregroundPackage, `Nhập chữ: ${text.slice(0, 24)}`);
    }
  }

  async keyEvent(serial: string, keyCode: number): Promise<void> {
    const d = this.getBySerial(serial);
    if (d && keyCode === 3) {
      d.foregroundPackage = 'com.android.launcher';
    }
  }

  async openApp(serial: string, packageName: string): Promise<void> {
    const d = this.getBySerial(serial);
    if (d) {
      d.foregroundPackage = packageName;
      d.lastScreenshotDataUrl = makeMockScreenSvgDataUrl(d.modelName, packageName, `Đang mở ${packageName}`);
    }
  }
}
