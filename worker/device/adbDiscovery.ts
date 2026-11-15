import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

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

  if (process.env.ADB_PATH) {
    candidates.push(process.env.ADB_PATH);
  }
  candidates.push(path.resolve(process.cwd(), '.tools', 'platform-tools', exe));
  if (isWin && process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', exe));
  }
  if (process.platform === 'darwin') {
    candidates.push(path.join(home, 'Library', 'Android', 'sdk', 'platform-tools', exe));
  }
  candidates.push(path.join(home, 'Android', 'Sdk', 'platform-tools', exe));
  candidates.push(exe); // fallback to system PATH
  return candidates;
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
      hint: 'Giải nén vào .tools/platform-tools hoặc thêm vào PATH.',
    };
  }
  if (platform === 'darwin') {
    return {
      url: 'https://dl.google.com/android/repository/platform-tools-latest-darwin.zip',
      hint: 'Giải nén vào ~/.tools/platform-tools hoặc cài qua `brew install android-platform-tools`.',
    };
  }
  return {
    url: 'https://dl.google.com/android/repository/platform-tools-latest-linux.zip',
    hint: 'Cài qua `sudo apt install adb` hoặc giải nén vào .tools/platform-tools.',
  };
}

export async function runAdbCommand(adbPath: string, args: string[], timeoutMs = 8000): Promise<string> {
  const { stdout } = await execFileAsync(adbPath, args, {
    timeout: timeoutMs,
    maxBuffer: 12 * 1024 * 1024,
  });
  return stdout;
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
