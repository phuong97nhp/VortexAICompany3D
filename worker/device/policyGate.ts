import { DeviceCommandRequest, DeviceDescriptor, DevicePolicy } from './types.js';

export const DEFAULT_DEVICE_POLICY: DevicePolicy = {
  allowedPackages: [
    'com.zing.zalo',
    'com.ss.android.ugc.trill',
    'com.facebook.katana',
    'com.facebook.orca',
    'com.shopee.vn',
    'com.google.android.youtube',
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
    'com.google.android.apps.photos',
    'com.android.contacts',
    'com.android.mms',
  ],
  maxActionsPerMinute: 18,
  maxContinuousMinutes: 20,
  maskPasswordAndOtpRegions: true,
  requireCeoForInstallApk: true,
  stopBatteryBelowPercent: 15,
  stopTempAboveC: 44,
};

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

export function evaluateDevicePolicyGate(params: {
  device: DeviceDescriptor;
  req: DeviceCommandRequest;
  foregroundPackage: string;
  ocrText?: string;
  killSwitchActive: boolean;
  now?: number;
}): PolicyEvaluationResult {
  const { device, req, foregroundPackage, ocrText = '', killSwitchActive } = params;
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

  // Telemetry safety guard
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

  const isReadOnlyAction = req.action === 'screenshot' || req.action === 'ocr_read';

  // Package check applies on active package or target packageName
  const targetPkg = req.packageName || foregroundPackage;
  if (policy.blockedPackages.some((b) => targetPkg.toLowerCase().includes(b.toLowerCase()))) {
    return {
      allowed: false,
      resultCode: 'blocked_policy',
      reason: `Ứng dụng "${targetPkg}" nằm trong danh sách CẤM (Ngân hàng/Ví/2FA/Cài đặt/Ảnh).`,
    };
  }

  if (!isReadOnlyAction) {
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

    if (
      policy.allowedPackages.length > 0 &&
      targetPkg !== 'unknown' &&
      !policy.allowedPackages.some((a) => targetPkg.toLowerCase().includes(a.toLowerCase()))
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
