import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AdbBinaryInfo {
  found: boolean;
  adbPath: string | null;
  version?: string;
  source?: string;
}

export function getCandidateAdbPaths(): string[] {
  const home = os.homedir();
  const isWin = process.platform === 'win32';
  const exe = isWin ? 'adb.exe' : 'adb';
  const candidates: string[] = [];

  // 1. Explicit env ADB_PATH
  if (process.env.ADB_PATH) {
    candidates.push(process.env.ADB_PATH);
  }
  // 2. System PATH
  candidates.push(exe);
  // 3. worker/vendor/platform-tools (portable plug-and-play folder)
  candidates.push(path.resolve(__dirname, '..', 'vendor', 'platform-tools', exe));
  candidates.push(path.resolve(process.cwd(), 'worker', 'vendor', 'platform-tools', exe));
  // 4. Legacy .tools/platform-tools fallback
  candidates.push(path.resolve(process.cwd(), '.tools', 'platform-tools', exe));
  // 5. Standard Android SDK locations
  if (isWin && process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', exe));
  }
  if (process.platform === 'darwin') {
    candidates.push(path.join(home, 'Library', 'Android', 'sdk', 'platform-tools', exe));
  }
  candidates.push(path.join(home, 'Android', 'Sdk', 'platform-tools', exe));

  return Array.from(new Set(candidates));
}

export async function findAdbBinary(): Promise<AdbBinaryInfo> {
  const candidates = getCandidateAdbPaths();
  for (const candidate of candidates) {
    if (candidate !== 'adb' && candidate !== 'adb.exe' && !existsSync(candidate)) {
      continue;
    }
    try {
      const { stdout } = await execFileAsync(candidate, ['version'], { timeout: 4000 });
      const firstLine = stdout.split(/\r?\n/)[0]?.trim() || 'Android Debug Bridge';
      return {
        found: true,
        adbPath: candidate,
        version: firstLine,
        source: candidate === 'adb' || candidate === 'adb.exe' ? 'PATH' : candidate,
      };
    } catch {
      // try next candidate
    }
  }
  return { found: false, adbPath: null };
}

export function getPlatformToolsDownloadInfo() {
  const platform = process.platform;
  if (platform === 'win32') {
    return {
      url: 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip',
      hint: 'Tự cài vào worker/vendor/platform-tools bằng nút "Cài ADB Tự động" hoặc cài Android USB Driver nếu Windows báo dấu chấm than.',
    };
  }
  if (platform === 'darwin') {
    return {
      url: 'https://dl.google.com/android/repository/platform-tools-latest-darwin.zip',
      hint: 'Tự cài vào worker/vendor/platform-tools hoặc chạy `brew install android-platform-tools`.',
    };
  }
  return {
    url: 'https://dl.google.com/android/repository/platform-tools-latest-linux.zip',
    hint: 'Tự cài vào worker/vendor/platform-tools hoặc cài `sudo apt install adb` + thêm udev rule `/etc/udev/rules.d/51-android.rules`.',
  };
}

export function getOsDriverTroubleshootingTips(): string[] {
  if (process.platform === 'win32') {
    return [
      'Windows: Mở Device Manager kiểm tra mục "Android Composite ADB Interface". Nếu thấy dấu chấm than vàng, cài Google USB Driver hoặc Samsung/Xiaomi USB Driver.',
      'Đổi cổng USB 2.0/3.0 trực tiếp trên mainboard và dùng cáp truyền dữ liệu (tránh cáp chỉ sạc).',
    ];
  }
  if (process.platform === 'linux') {
    return [
      'Linux: Nếu thấy "no permissions (udev)", thêm rule `/etc/udev/rules.d/51-android.rules` (SUBSYSTEM=="usb", MODE="0666", GROUP="plugdev") rồi chạy `sudo udevadm control --reload-rules`.',
      'Thêm user vào nhóm plugdev: `sudo usermod -aG plugdev $USER` và cắm lại cáp USB.',
    ];
  }
  return [
    'macOS: Nếu không nhận máy, thử đổi cáp USB-C/Adapter trực tiếp và bấm Cho phép phụ kiện USB.',
  ];
}

export async function installOfficialPlatformTools(options: {
  confirmDownload: boolean;
  targetVendorDir?: string;
}): Promise<{
  ok: boolean;
  adbPath?: string;
  version?: string;
  sha256?: string;
  message: string;
}> {
  if (!options.confirmDownload) {
    return {
      ok: false,
      message: 'Cần xác nhận đồng ý tải Android Platform-Tools chính thức từ dl.google.com.',
    };
  }

  const vendorRoot =
    options.targetVendorDir || path.resolve(__dirname, '..', 'vendor');
  const extractDir = path.join(vendorRoot, 'platform-tools');
  const dl = getPlatformToolsDownloadInfo();
  const tmpZip = path.join(os.tmpdir(), `platform-tools-${Date.now()}.zip`);

  try {
    mkdirSync(vendorRoot, { recursive: true });
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 90_000);
    const resp = await fetch(dl.url, { signal: controller.signal });
    clearTimeout(t);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} khi tải Platform-Tools từ Google`);
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    // Verify ZIP magic bytes (PK\x03\x04) & reasonable minimum size (> 1MB)
    if (buf.length < 1_000_000 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
      throw new Error('File tải về không đúng định dạng ZIP hợp lệ của Android Platform-Tools.');
    }
    const sha256 = createHash('sha256').update(buf).digest('hex');
    await fs.writeFile(tmpZip, buf);

    if (process.platform === 'win32') {
      await execFileAsync(
        'powershell',
        ['-NoProfile', '-Command', `Expand-Archive -Path "${tmpZip}" -DestinationPath "${vendorRoot}" -Force`],
        { timeout: 60_000 }
      );
    } else {
      await execFileAsync('unzip', ['-o', '-q', tmpZip, '-d', vendorRoot], { timeout: 60_000 });
      const adbBin = path.join(extractDir, 'adb');
      if (existsSync(adbBin)) {
        await fs.chmod(adbBin, 0o755);
      }
    }

    await fs.unlink(tmpZip).catch(() => {});

    const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';
    const finalAdb = path.join(extractDir, exe);
    if (!existsSync(finalAdb)) {
      throw new Error(`Giải nén xong nhưng không thấy ${finalAdb}`);
    }

    const { stdout: verOut } = await execFileAsync(finalAdb, ['version'], { timeout: 5000 });
    await execFileAsync(finalAdb, ['start-server'], { timeout: 8000 }).catch(() => {});

    return {
      ok: true,
      adbPath: finalAdb,
      version: verOut.split(/\r?\n/)[0]?.trim() || 'ADB Installed',
      sha256,
      message: `Đã cài xong Google Platform-Tools tại ${extractDir} và khởi động adb server.`,
    };
  } catch (err) {
    await fs.unlink(tmpZip).catch(() => {});
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Lỗi tải hoặc giải nén Platform-Tools.',
    };
  }
}

export async function runAdbCommand(adbPath: string, args: string[], timeoutMs = 8000): Promise<string> {
  const { stdout } = await execFileAsync(adbPath, args, {
    timeout: timeoutMs,
    maxBuffer: 12 * 1024 * 1024,
  });
  return stdout;
}

export function spawnAdbTrackDevices(
  adbPath: string,
  onChange: () => void,
  onError?: (err: string) => void
): () => void {
  let stopped = false;
  let child: ReturnType<typeof spawn> | null = null;

  const startTrack = () => {
    if (stopped) return;
    try {
      child = spawn(adbPath, ['track-devices'], { stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout?.on('data', () => {
        onChange();
      });
      child.stderr?.on('data', (chunk) => {
        const msg = String(chunk || '').trim();
        if (msg && onError) onError(msg);
      });
      child.on('exit', () => {
        if (!stopped) {
          setTimeout(startTrack, 4000);
        }
      });
      child.on('error', (err) => {
        if (onError) onError(err.message);
      });
    } catch (err) {
      if (onError) onError(err instanceof Error ? err.message : String(err));
    }
  };

  startTrack();
  return () => {
    stopped = true;
    try {
      child?.kill();
    } catch {
      // ignore
    }
  };
}

export async function pairAndConnectWirelessAdb(
  adbPath: string,
  ipPort: string,
  pairingCode?: string
): Promise<{ ok: boolean; message: string }> {
  const cleanTarget = ipPort.trim();
  if (!/^[a-zA-Z0-9._-]+:\d{2,5}$/.test(cleanTarget)) {
    return { ok: false, message: 'Địa chỉ phải có dạng IP:PORT (ví dụ 192.168.1.55:5555).' };
  }
  try {
    if (pairingCode && pairingCode.trim()) {
      const out = await runAdbCommand(adbPath, ['pair', cleanTarget, pairingCode.trim()], 10000);
      return { ok: !/failed/i.test(out), message: out.trim() || 'Đã ghép nối Wireless Debugging.' };
    }
    const out = await runAdbCommand(adbPath, ['connect', cleanTarget], 10000);
    const ok = /connected to/i.test(out) || /already connected/i.test(out);
    return { ok, message: out.trim() || (ok ? 'Kết nối thành công.' : 'Không kết nối được.') };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Lỗi thực thi ADB wireless' };
  }
}
