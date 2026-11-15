import path from 'node:path';
import { DeviceCommandRequest, DeviceDescriptor, DevicePolicy } from './types.js';

export const DEFAULT_ALLOWED_WORKSPACE_DIR = '/sdcard/AICompanyWork';

export const DEFAULT_BLOCKED_APP_LABELS = [
  'vietcombank',
  'techcombank',
  'mbbank',
  'bidv',
  'agribank',
  'vpbank',
  'tpbank',
  'acb',
  'momo',
  'zalopay',
  'vnpay',
  'authenticator',
  'bitwarden',
  '1password',
  'lastpass',
  'keepass',
  'cài đặt',
  'settings',
  'thư viện ảnh',
  'photos',
  'google play',
  'ch play',
];

export const DEFAULT_DEVICE_POLICY: DevicePolicy = {
  allowedPackages: [
    'com.zing.zalo',
    'com.ss.android.ugc.trill',
    'com.facebook.katana',
    'com.facebook.orca',
    'com.shopee.vn',
    'com.google.android.youtube',
    'com.android.chrome',
    'com.android.launcher',
  ],
  blockedPackages: [
    'com.android.settings',
    'com.android.vending',
    'com.vietcombank',
    'com.VCB',
    'vn.com.techcombank',
    'com.mbmobile',
    'com.mservice.momotransfer',
    'vn.com.vng.zalopay',
    'com.google.android.apps.authenticator2',
    'com.azure.authenticator',
    'com.authy.authy',
    'com.x8bit.bitwarden',
    'com.agilebits.onepassword',
    'com.lastpass.lpandroid',
    'keepass2android.keepass2android',
    'com.dashlane',
    'com.google.android.apps.photos',
    'com.android.contacts',
    'com.android.mms',
  ],
  blockedAppLabels: DEFAULT_BLOCKED_APP_LABELS,
  maxActionsPerMinute: 18,
  maxContinuousMinutes: 20,
  minActionDelayMs: 650,
  maskPasswordAndOtpRegions: true,
  requireCeoForInstallApk: true,
  stopBatteryBelowPercent: 15,
  stopTempAboveC: 44,
  logRetentionDays: 14,
  keepAwakeWhileActive: true,
};

export function computeHumanPacingDelayMs(baseMs = 650): number {
  if (baseMs <= 0) return 0;
  const jitter = Math.floor(Math.random() * Math.min(450, Math.round(baseMs * 0.5)));
  return baseMs + jitter;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  resultCode: 'ok' | 'blocked_policy' | 'blocked_killswitch' | 'blocked_mode' | 'ask_ceo_otp';
  reason?: string;
}

const recentActionTimestamps = new Map<string, number[]>();

export function maskSensitiveDeviceText(raw: string): string {
  return raw
    .replace(/\b(?:OTP|mã\s*xác\s*thực|PIN)\s*[:\-]?\s*(\d{4,8})\b/gi, 'OTP:[ĐÃ CHE]')
    .replace(/\b(\d{9,16})\b/g, (m) => `****${m.slice(-4)}`)
    .replace(/(password|mật khẩu)\s*[:=]\s*([^\s|]+)/gi, '$1=[ĐÃ CHE]');
}

export function detectOtpOrCaptchaPrompt(ocrText: string): boolean {
  return /(?:nhập mã\s*otp|mã\s*xác\s*minh|captcha|xác nhận không phải robot|2fa|two-factor)/i.test(ocrText);
}

export function detectDangerousActionText(ocrText: string, typedText = ''): string | null {
  const combined = `${ocrText}\n${typedText}`;
  if (/(?:chuyển khoản ngay|xác nhận thanh toán|gửi tiền|rút tiền|nạp tiền|khôi phục cài đặt gốc|factory reset)/i.test(combined)) {
    return 'Phát hiện hành động tài chính hoặc đặt lại hệ thống nguy hiểm (chuyển khoản/thanh toán/factory reset).';
  }
  return null;
}

export function validateSandboxRemotePath(remoteSubpath: string): { ok: boolean; normalized: string; error?: string } {
  const cleaned = path.posix.normalize(remoteSubpath.trim());
  if (!cleaned || cleaned.includes('..')) {
    return { ok: false, normalized: cleaned, error: 'Đường dẫn tệp không hợp lệ.' };
  }
  const full = cleaned.startsWith('/') ? cleaned : `${DEFAULT_ALLOWED_WORKSPACE_DIR}/${cleaned}`;
  if (!full.startsWith(`${DEFAULT_ALLOWED_WORKSPACE_DIR}/`) && full !== DEFAULT_ALLOWED_WORKSPACE_DIR) {
    return {
      ok: false,
      normalized: full,
      error: `Chỉ cho phép trao đổi tệp bên trong thư mục an toàn ${DEFAULT_ALLOWED_WORKSPACE_DIR}/`,
    };
  }
  return { ok: true, normalized: full };
}

export function evaluateDevicePolicyGate(params: {
  device: DeviceDescriptor;
  req: DeviceCommandRequest;
  foregroundPackage: string;
  ocrText?: string;
  screenLocked?: boolean;
  killSwitchActive: boolean;
  now?: number;
}): PolicyEvaluationResult {
  const { device, req, foregroundPackage, ocrText = '', screenLocked = false, killSwitchActive } = params;
  const now = params.now ?? Date.now();
  const policy = req.policy || DEFAULT_DEVICE_POLICY;

  if (killSwitchActive) {
    return {
      allowed: false,
      resultCode: 'blocked_killswitch',
      reason: 'Kill Switch đang kích hoạt — từ chối mọi thao tác thiết bị.',
    };
  }

  if (device.status === 'unauthorized' || device.status === 'offline' || device.status === 'error') {
    return {
      allowed: false,
      resultCode: 'blocked_mode',
      reason: `Thiết bị chưa sẵn sàng (${device.status}).`,
    };
  }

  if (device.batteryPercent < policy.stopBatteryBelowPercent) {
    return {
      allowed: false,
      resultCode: 'blocked_policy',
      reason: `Pin thiết bị còn ${device.batteryPercent}% (< ${policy.stopBatteryBelowPercent}%) — tự động dừng để bảo vệ máy.`,
    };
  }
  if (device.temperatureC > policy.stopTempAboveC) {
    return {
      allowed: false,
      resultCode: 'blocked_policy',
      reason: `Nhiệt độ máy ${device.temperatureC}°C (> ${policy.stopTempAboveC}°C) — tạm dừng chống quá nhiệt.`,
    };
  }

  const isReadOnlyAction =
    req.action === 'screenshot' ||
    req.action === 'ocr_read' ||
    req.action === 'find_element' ||
    req.action === 'wait_for';

  // Package & app-label check
  const targetPkg = req.packageName || foregroundPackage;
  const targetLower = targetPkg.toLowerCase();
  if (policy.blockedPackages.some((b) => targetLower.includes(b.toLowerCase()))) {
    return {
      allowed: false,
      resultCode: 'blocked_policy',
      reason: `Ứng dụng "${targetPkg}" nằm trong danh sách CẤM (Ngân hàng/Ví/2FA/Cài đặt/Ảnh).`,
    };
  }

  const blockedLabels = policy.blockedAppLabels || DEFAULT_BLOCKED_APP_LABELS;
  const headOcrLower = ocrText.slice(0, 220).toLowerCase();
  const matchedLabel = blockedLabels.find(
    (lbl) => targetLower.includes(lbl.toLowerCase()) || (!isReadOnlyAction && headOcrLower.includes(lbl.toLowerCase()))
  );
  if (matchedLabel) {
    return {
      allowed: false,
      resultCode: 'blocked_policy',
      reason: `Chặn theo tên ứng dụng nhạy cảm ("${matchedLabel}") trên màn hình / package "${targetPkg}".`,
    };
  }

  if (!isReadOnlyAction) {
    if (screenLocked) {
      return {
        allowed: false,
        resultCode: 'blocked_mode',
        reason: 'Màn hình điện thoại đang khóa — vui lòng mở khóa thiết bị trước khi agent thao tác.',
      };
    }

    if (device.controlMode === 'view_only') {
      return {
        allowed: false,
        resultCode: 'blocked_mode',
        reason: 'Thiết bị đang ở chế độ CHỈ XEM (mặc định) — chặn thao tác điều khiển.',
      };
    }

    if (device.controlMode === 'approved_actions' && req.agentId !== 'ceo' && !req.ceoConfirmed) {
      return {
        allowed: false,
        resultCode: 'blocked_mode',
        reason: 'Chế độ ĐIỀU KHIỂN CÓ DUYỆT yêu cầu CEO xác nhận thao tác này.',
      };
    }

    if (req.action === 'install_apk' && req.agentId !== 'ceo' && !req.ceoConfirmed) {
      return {
        allowed: false,
        resultCode: 'blocked_policy',
        reason: 'Cài file APK trên điện thoại bắt buộc CEO duyệt trực tiếp.',
      };
    }

    if ((req.action === 'push_file' || req.action === 'pull_file') && req.remoteSubpath) {
      const pathCheck = validateSandboxRemotePath(req.remoteSubpath);
      if (!pathCheck.ok) {
        return {
          allowed: false,
          resultCode: 'blocked_policy',
          reason: pathCheck.error,
        };
      }
    }

    if (
      req.action !== 'install_apk' &&
      req.action !== 'push_file' &&
      req.action !== 'pull_file' &&
      policy.allowedPackages.length > 0 &&
      targetPkg !== 'unknown' &&
      !policy.allowedPackages.some((a) => targetLower.includes(a.toLowerCase()))
    ) {
      return {
        allowed: false,
        resultCode: 'blocked_policy',
        reason: `Ứng dụng "${targetPkg}" chưa nằm trong danh sách Cho phép (Allowlist).`,
      };
    }

    if (detectOtpOrCaptchaPrompt(ocrText)) {
      return {
        allowed: false,
        resultCode: 'ask_ceo_otp',
        reason: 'Phát hiện màn hình yêu cầu OTP / CAPTCHA — dừng tự động và chuyển CEO xử lý (ask_ceo).',
      };
    }

    const dangerousReason = detectDangerousActionText(ocrText, req.text || '');
    if (dangerousReason && req.agentId !== 'ceo' && !req.ceoConfirmed) {
      return {
        allowed: false,
        resultCode: 'ask_ceo_otp',
        reason: `${dangerousReason} Yêu cầu CEO xác nhận.`,
      };
    }

    // Rate limit per device
    const windowStart = now - 60_000;
    const history = (recentActionTimestamps.get(device.id) || []).filter((ts) => ts >= windowStart);
    if (history.length >= policy.maxActionsPerMinute) {
      return {
        allowed: false,
        resultCode: 'blocked_policy',
        reason: `Vượt tốc độ tối đa (${policy.maxActionsPerMinute} thao tác/phút).`,
      };
    }
    history.push(now);
    recentActionTimestamps.set(device.id, history);
  }

  return { allowed: true, resultCode: 'ok' };
}

export function resetDeviceRateLimits() {
  recentActionTimestamps.clear();
}
