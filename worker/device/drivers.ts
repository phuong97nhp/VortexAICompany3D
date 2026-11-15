import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runAdbCommand } from './adbDiscovery.js';
import { tryOcrImageWithTesseract } from './ocrProvider.js';
import { validateSandboxRemotePath } from './policyGate.js';
import { DeviceConnectionStatus, DeviceDescriptor, DeviceDriver, UiElementNode } from './types.js';

const execFileAsync = promisify(execFile);

export function parseAdbDevicesOutput(raw: string): Array<{
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

export function parseUiAutomatorNodes(xml: string): UiElementNode[] {
  const nodes: UiElementNode[] = [];
  const nodeRe = /<node\s+([^>]+?)\/?\s*>/g;
  let match: RegExpExecArray | null;
  while ((match = nodeRe.exec(xml)) !== null) {
    const attrs = match[1];
    const readAttr = (name: string) => {
      const m = attrs.match(new RegExp(`${name}="([^"]*)"`));
      return m ? m[1] : '';
    };
    const text = readAttr('text');
    const contentDesc = readAttr('content-desc');
    const resourceId = readAttr('resource-id');
    const className = readAttr('class');
    const bounds = readAttr('bounds');
    const clickable = readAttr('clickable') === 'true';

    const bMatch = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    const x1 = bMatch ? Number(bMatch[1]) : 0;
    const y1 = bMatch ? Number(bMatch[2]) : 0;
    const x2 = bMatch ? Number(bMatch[3]) : 0;
    const y2 = bMatch ? Number(bMatch[4]) : 0;
    const centerX = Math.round((x1 + x2) / 2);
    const centerY = Math.round((y1 + y2) / 2);

    if (text || contentDesc || resourceId || clickable) {
      nodes.push({
        text,
        contentDesc,
        resourceId,
        className,
        bounds,
        centerX,
        centerY,
        clickable,
      });
    }
  }
  return nodes;
}

function mapRawState(rawState: string): DeviceConnectionStatus {
  if (rawState === 'unauthorized') return 'unauthorized';
  if (rawState === 'device') return 'device';
  if (rawState === 'offline') return 'offline';
  return 'error';
}

export class AdbDeviceDriver implements DeviceDriver {
  readonly driverType = 'adb_usb' as const;
  protected adbPath: string;

  constructor(adbPath: string) {
    this.adbPath = adbPath;
  }

  async listDevices(): Promise<DeviceDescriptor[]> {
    const out = await runAdbCommand(this.adbPath, ['devices', '-l'], 5000);
    const parsed = parseAdbDevicesOutput(out).filter((d) => !d.isEmulator);
    const now = Date.now();
    const descriptors: DeviceDescriptor[] = [];

    for (const d of parsed) {
      descriptors.push(await this.buildDescriptor(d, now, d.isWifi ? 'adb_wifi' : 'adb_usb'));
    }
    return descriptors;
  }

  protected async buildDescriptor(
    d: { serial: string; rawState: string; model: string },
    now: number,
    driverType: DeviceDescriptor['driverType']
  ): Promise<DeviceDescriptor> {
    const status = mapRawState(d.rawState);
    let androidVersion = 'Android';
    let manufacturer: string | undefined;
    let locale: string | undefined;
    let storageFreeMb: number | undefined;
    let batteryPercent = 100;
    let temperatureC = 32;
    let foregroundPackage = 'com.android.launcher';
    let screenWidth = 1080;
    let screenHeight = 2400;
    let screenLocked = false;
    let adbKeyboardInstalled = false;
    let installedPackages: string[] = [];

    if (status === 'device') {
      try {
        androidVersion = (await runAdbCommand(this.adbPath, ['-s', d.serial, 'shell', 'getprop', 'ro.build.version.release'], 3000)).trim() || 'Android';
        manufacturer = (await runAdbCommand(this.adbPath, ['-s', d.serial, 'shell', 'getprop', 'ro.product.manufacturer'], 2500)).trim() || undefined;
        locale = (await runAdbCommand(this.adbPath, ['-s', d.serial, 'shell', 'getprop', 'persist.sys.locale'], 2500)).trim() || 'vi-VN';
        const tel = await this.getTelemetry(d.serial);
        batteryPercent = tel.batteryPercent;
        temperatureC = tel.temperatureC;
        foregroundPackage = await this.getForegroundPackage(d.serial);
        screenLocked = await this.isScreenLocked(d.serial);
        const wmOut = await runAdbCommand(this.adbPath, ['-s', d.serial, 'shell', 'wm', 'size'], 3000);
        const sz = wmOut.match(/(\d+)x(\d+)/);
        if (sz) {
          screenWidth = Number(sz[1]);
          screenHeight = Number(sz[2]);
        }
        const dfOut = await runAdbCommand(this.adbPath, ['-s', d.serial, 'shell', 'df', '-m', '/sdcard'], 2500).catch(() => '');
        const dfLine = dfOut.split(/\r?\n/).find((l) => /\d+/.test(l) && !l.startsWith('Filesystem'));
        if (dfLine) {
          const cols = dfLine.trim().split(/\s+/);
          const avail = Number(cols[3]);
          if (Number.isFinite(avail)) storageFreeMb = avail;
        }
        const imeOut = await runAdbCommand(this.adbPath, ['-s', d.serial, 'shell', 'ime', 'list', '-a'], 2500).catch(() => '');
        adbKeyboardInstalled = imeOut.includes('ADBKeyboard');
        installedPackages = await this.listInstalledPackages(d.serial);
      } catch {
        // Non-fatal metadata fetch failure
      }
    }

    return {
      id: `dev_${d.serial.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      serial: d.serial,
      modelName: driverType === 'emulator' ? `${d.model} (Emulator)` : d.model,
      manufacturer,
      androidVersion: driverType === 'emulator' ? `Emulator Android ${androidVersion}` : `Android ${androidVersion}`,
      locale,
      storageFreeMb,
      installedPackages: installedPackages.slice(0, 60),
      driverType,
      status,
      controlMode: 'view_only',
      batteryPercent,
      temperatureC,
      screenWidth,
      screenHeight,
      foregroundPackage,
      isStreaming: false,
      screenLocked,
      adbKeyboardInstalled,
      blockedReason:
        status === 'unauthorized'
          ? 'Mở khóa điện thoại và bấm "Cho phép Gỡ lỗi USB (Always allow from this computer)".'
          : undefined,
      lastSeenAt: now,
    };
  }

  async listInstalledPackages(serial: string): Promise<string[]> {
    try {
      const out = await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'pm', 'list', 'packages', '-3'], 4000);
      return out
        .split(/\r?\n/)
        .map((l) => l.replace(/^package:/, '').trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  async isScreenLocked(serial: string): Promise<boolean> {
    try {
      const winOut = await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'dumpsys', 'window'], 3000);
      if (/mDreamingLockscreen=true|mShowingLockscreen=true|isStatusBarKeyguard=true/i.test(winOut)) {
        return true;
      }
      const pwrOut = await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'dumpsys', 'power'], 2500);
      if (/mWakefulness=Asleep|Display Power: state=OFF/i.test(pwrOut)) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async keepAwake(serial: string, enabled: boolean): Promise<void> {
    await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'svc', 'power', 'stayon', enabled ? 'usb' : 'false'], 3000);
  }

  async getForegroundPackage(serial: string): Promise<string> {
    try {
      const out = await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'dumpsys', 'window', 'windows'], 4000);
      const match = out.match(/(?:mCurrentFocus|mFocusedApp)=.*?\s+([^\s/}]+)\//);
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

  async dumpUiNodes(serial: string): Promise<UiElementNode[]> {
    try {
      await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'uiautomator', 'dump', '/sdcard/ai_ui.xml'], 6000);
      const xml = await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'cat', '/sdcard/ai_ui.xml'], 4000);
      return parseUiAutomatorNodes(xml);
    } catch {
      return [];
    }
  }

  async findElement(serial: string, query: string): Promise<UiElementNode[]> {
    const nodes = await this.dumpUiNodes(serial);
    const q = query.trim().toLowerCase();
    if (!q) return nodes.slice(0, 40);
    return nodes.filter(
      (n) =>
        n.text.toLowerCase().includes(q) ||
        n.contentDesc.toLowerCase().includes(q) ||
        n.resourceId.toLowerCase().includes(q)
    );
  }

  async waitForElement(serial: string, query: string, timeoutMs = 8000): Promise<UiElementNode | null> {
    const deadline = Date.now() + Math.min(20_000, Math.max(1000, timeoutMs));
    while (Date.now() < deadline) {
      const matches = await this.findElement(serial, query);
      if (matches.length > 0) return matches[0];
      await new Promise((r) => setTimeout(r, 900));
    }
    return null;
  }

  async readOcrText(serial: string): Promise<string> {
    const nodes = await this.dumpUiNodes(serial);
    const uiText = nodes
      .map((n) => n.text || n.contentDesc)
      .filter(Boolean)
      .slice(0, 60)
      .join(' | ');
    if (uiText.length >= 12) return uiText;
    // Fallback to optional Tesseract OCR if UI tree is WebView/Canvas/image-heavy
    const shot = await this.screenshot(serial).catch(() => undefined);
    const ocrFallback = await tryOcrImageWithTesseract(shot);
    return ocrFallback || uiText;
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
    const hasUnicode = /[^\x20-\x7E]/.test(text);
    if (hasUnicode) {
      // 1) Prefer ADBKeyboard broadcast if active
      try {
        const imeOut = await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'ime', 'list', '-a'], 2500);
        if (imeOut.includes('ADBKeyboard')) {
          const b64 = Buffer.from(text, 'utf8').toString('base64');
          await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'am', 'broadcast', '-a', 'ADB_INPUT_B64', '--es', 'msg', b64]);
          return;
        }
      } catch {
        // continue to clipboard fallback
      }
      // 2) Clipboard set + KEYCODE_PASTE fallback (Android 10+ / Termux/clip)
      try {
        const safeClip = text.replace(/"/g, '\\"');
        await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'cmd', 'clipboard', 'set', safeClip], 3000);
        await this.keyEvent(serial, 279); // KEYCODE_PASTE
        return;
      } catch {
        // fallback to ASCII
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

  async installApk(serial: string, apkPath: string): Promise<void> {
    await runAdbCommand(this.adbPath, ['-s', serial, 'install', '-r', apkPath], 45_000);
  }

  async pushFile(serial: string, localPath: string, remoteSubpath: string): Promise<string> {
    const check = validateSandboxRemotePath(remoteSubpath);
    if (!check.ok) throw new Error(check.error || 'Đường dẫn remote không hợp lệ');
    await runAdbCommand(this.adbPath, ['-s', serial, 'shell', 'mkdir', '-p', '/sdcard/AICompanyWork'], 3000);
    await runAdbCommand(this.adbPath, ['-s', serial, 'push', localPath, check.normalized], 25_000);
    return check.normalized;
  }

  async pullFile(serial: string, remoteSubpath: string, localPath: string): Promise<string> {
    const check = validateSandboxRemotePath(remoteSubpath);
    if (!check.ok) throw new Error(check.error || 'Đường dẫn remote không hợp lệ');
    await runAdbCommand(this.adbPath, ['-s', serial, 'pull', check.normalized, localPath], 25_000);
    return localPath;
  }
}

export class EmulatorDeviceDriver extends AdbDeviceDriver {
  override async listDevices(): Promise<DeviceDescriptor[]> {
    const out = await runAdbCommand(this.adbPath, ['devices', '-l'], 5000);
    const parsed = parseAdbDevicesOutput(out).filter((d) => d.isEmulator);
    const now = Date.now();
    const outList: DeviceDescriptor[] = [];
    for (const d of parsed) {
      outList.push(await this.buildDescriptor(d, now, 'emulator'));
    }
    return outList;
  }
}

/**
 * Adapter wrapper so an existing external "Phone Farm" ADB controller module can be plugged in
 * cleanly behind our unified DeviceDriver + PolicyGate + DeviceCommandQueue contracts.
 */
export interface ExternalPhoneFarmClient {
  listSerials(): Promise<Array<{ serial: string; model?: string; status?: string }>>;
  capturePngBase64(serial: string): Promise<string>;
  tap(serial: string, x: number, y: number): Promise<void>;
  swipe(serial: string, x1: number, y1: number, x2: number, y2: number, ms?: number): Promise<void>;
  input(serial: string, text: string): Promise<void>;
  key(serial: string, code: number): Promise<void>;
  launch(serial: string, pkg: string): Promise<void>;
  readScreenText?(serial: string): Promise<string>;
}

export class PhoneFarmAdapter implements DeviceDriver {
  readonly driverType = 'adb_usb' as const;
  private client: ExternalPhoneFarmClient;

  constructor(client: ExternalPhoneFarmClient) {
    this.client = client;
  }

  async listDevices(): Promise<DeviceDescriptor[]> {
    const rows = await this.client.listSerials();
    const now = Date.now();
    return rows.map((r) => ({
      id: `dev_${r.serial.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      serial: r.serial,
      modelName: r.model || r.serial,
      androidVersion: 'Android (PhoneFarm Adapter)',
      driverType: 'adb_usb',
      status: r.status === 'unauthorized' ? 'unauthorized' : r.status === 'offline' ? 'offline' : 'device',
      controlMode: 'view_only',
      batteryPercent: 100,
      temperatureC: 32,
      screenWidth: 1080,
      screenHeight: 2400,
      foregroundPackage: 'unknown',
      isStreaming: false,
      lastSeenAt: now,
    }));
  }

  async getForegroundPackage(): Promise<string> {
    return 'unknown';
  }

  async getTelemetry(): Promise<{ batteryPercent: number; temperatureC: number }> {
    return { batteryPercent: 100, temperatureC: 32 };
  }

  async screenshot(serial: string): Promise<string | undefined> {
    const b64 = await this.client.capturePngBase64(serial);
    if (!b64) return undefined;
    return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
  }

  async readOcrText(serial: string): Promise<string> {
    return (await this.client.readScreenText?.(serial)) || '';
  }

  async tap(serial: string, x: number, y: number): Promise<void> {
    await this.client.tap(serial, x, y);
  }

  async swipe(serial: string, x1: number, y1: number, x2: number, y2: number, durationMs = 280): Promise<void> {
    await this.client.swipe(serial, x1, y1, x2, y2, durationMs);
  }

  async inputText(serial: string, text: string): Promise<void> {
    await this.client.input(serial, text);
  }

  async keyEvent(serial: string, keyCode: number): Promise<void> {
    await this.client.key(serial, keyCode);
  }

  async openApp(serial: string, packageName: string): Promise<void> {
    await this.client.launch(serial, packageName);
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

export class MockDeviceDriver implements DeviceDriver {
  readonly driverType = 'mock' as const;
  private devices: Map<string, DeviceDescriptor>;
  private mockOcrMap: Map<string, string> = new Map();
  private disconnectedSerials: Set<string> = new Set();

  constructor(initial?: DeviceDescriptor[]) {
    const now = Date.now();
    const seed = initial || [
      {
        id: 'dev_mock_pixel7',
        serial: 'MOCK-PIXEL7-01',
        modelName: 'Pixel 7 Pro (Mô phỏng)',
        manufacturer: 'Google (Sandbox)',
        androidVersion: 'Android 14 (Sandbox)',
        locale: 'vi-VN',
        storageFreeMb: 48200,
        installedPackages: ['com.zing.zalo', 'com.ss.android.ugc.trill', 'com.shopee.vn', 'com.android.chrome'],
        driverType: 'mock',
        status: 'device',
        controlMode: 'view_only',
        suggestedAgentId: 'mkt_social',
        batteryPercent: 86,
        temperatureC: 31.5,
        screenWidth: 1080,
        screenHeight: 2400,
        foregroundPackage: 'com.zing.zalo',
        isStreaming: false,
        screenLocked: false,
        adbKeyboardInstalled: true,
        lastScreenshotDataUrl: makeMockScreenSvgDataUrl('Pixel 7 Pro (Sandbox)', 'com.zing.zalo', 'Sẵn sàng kiểm thử'),
        lastOcrTextMasked: 'Zalo OA · Hộp thư khách hàng · Nút Gửi tin · Chờ thao tác',
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

  setMockScreenLocked(serial: string, locked: boolean) {
    const d = this.getBySerial(serial);
    if (d) d.screenLocked = locked;
  }

  setDisconnected(serial: string, disconnected: boolean) {
    if (disconnected) {
      this.disconnectedSerials.add(serial);
    } else {
      this.disconnectedSerials.delete(serial);
    }
  }

  async listDevices(): Promise<DeviceDescriptor[]> {
    const now = Date.now();
    return Array.from(this.devices.values())
      .filter((d) => !this.disconnectedSerials.has(d.serial))
      .map((d) => ({ ...d, lastSeenAt: now }));
  }

  async listInstalledPackages(serial: string): Promise<string[]> {
    return this.getBySerial(serial)?.installedPackages || ['com.zing.zalo', 'com.shopee.vn'];
  }

  async isScreenLocked(serial: string): Promise<boolean> {
    return Boolean(this.getBySerial(serial)?.screenLocked);
  }

  async keepAwake(): Promise<void> {}

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

  async findElement(serial: string, query: string): Promise<UiElementNode[]> {
    const text = await this.readOcrText(serial);
    const parts = text.split('·').map((s) => s.trim()).filter(Boolean);
    const q = query.trim().toLowerCase();
    return parts
      .filter((p) => !q || p.toLowerCase().includes(q))
      .map((p, idx) => ({
        text: p,
        contentDesc: p,
        resourceId: `com.sandbox:id/btn_${idx}`,
        className: 'android.widget.Button',
        bounds: `[120,${320 + idx * 140}][960,${420 + idx * 140}]`,
        centerX: 540,
        centerY: 370 + idx * 140,
        clickable: true,
      }));
  }

  async waitForElement(serial: string, query: string): Promise<UiElementNode | null> {
    const matches = await this.findElement(serial, query);
    return matches[0] || null;
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

  async installApk(serial: string, apkPath: string): Promise<void> {
    const d = this.getBySerial(serial);
    if (d) {
      d.lastOcrTextMasked = `Đã cài APK mô phỏng: ${apkPath}`;
    }
  }

  async pushFile(_serial: string, _localPath: string, remoteSubpath: string): Promise<string> {
    const check = validateSandboxRemotePath(remoteSubpath);
    if (!check.ok) throw new Error(check.error);
    return check.normalized;
  }

  async pullFile(_serial: string, remoteSubpath: string, localPath: string): Promise<string> {
    const check = validateSandboxRemotePath(remoteSubpath);
    if (!check.ok) throw new Error(check.error);
    return localPath;
  }
}
