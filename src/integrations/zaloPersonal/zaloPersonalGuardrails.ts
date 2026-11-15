import { CompanySettings, ZaloPersonalConfig, ZaloPersonalMessageLog } from '../../types';

export interface ZaloPersonalGuardCheckResult {
  allowed: boolean;
  blockStatus?: ZaloPersonalMessageLog['status'];
  reason?: string;
}

export function normalizeZaloPeerId(raw: string): string {
  return raw.replace(/\s+/g, '').trim();
}

export function maskPeerId(raw: string): string {
  const s = normalizeZaloPeerId(raw);
  if (s.length <= 4) return '****';
  return `${'*'.repeat(Math.max(2, s.length - 4))}${s.slice(-4)}`;
}

/**
 * Enforces mandatory safety guardrails for Zalo Personal (`zca-js`):
 * - Kill switch instant halt
 * - Must have CEO explicit risk confirmation + enabled toggle
 * - Blocks DNC list
 * - Blocks cold marketing unless explicitly approved by Legal & enabled
 * - Caps cold/non-inbound-reply outbound at <= 20 messages/day (replies to inbound exempt)
 * - Enforces delay spacing between outbound messages
 * - Halts automatically if anomaly pause is active
 */
export function checkZaloPersonalOutboundGuardrails(params: {
  settings: CompanySettings;
  peerId: string;
  isReplyToInbound: boolean;
  isColdMarketing: boolean;
  todayLogs: ZaloPersonalMessageLog[];
  now?: number;
}): ZaloPersonalGuardCheckResult {
  const now = params.now ?? Date.now();
  const cfg: ZaloPersonalConfig | undefined = params.settings.zaloPersonal;

  if (params.settings.killSwitchActive || params.settings.paused) {
    return {
      allowed: false,
      blockStatus: 'blocked_killswitch',
      reason: 'Kill Switch hoặc tạm dừng công ty đang bật — dừng gửi Zalo Cá nhân ngay lập tức.',
    };
  }

  if (!cfg || !cfg.enabled || cfg.priorityMode === 'personal_disabled') {
    return {
      allowed: false,
      blockStatus: 'blocked_unconfirmed',
      reason: 'Zalo Cá nhân chưa được bật (Zalo OA vẫn là kênh chính thức ưu tiên).',
    };
  }

  if (!cfg.riskConfirmedByCeo || !cfg.dedicatedCompanyAccountConfirmed) {
    return {
      allowed: false,
      blockStatus: 'blocked_unconfirmed',
      reason: 'CEO chưa xác nhận cảnh báo rủi ro không chính thức & dùng SIM/tài khoản công ty riêng.',
    };
  }

  if (cfg.anomalyPausedReason) {
    return {
      allowed: false,
      blockStatus: 'blocked_unconfirmed',
      reason: `Đang tự động tạm dừng do dấu hiệu bất thường: ${cfg.anomalyPausedReason}`,
    };
  }

  const normalizedPeer = normalizeZaloPeerId(params.peerId);
  const dncHit = (cfg.dncList || []).some((entry) => normalizeZaloPeerId(entry) === normalizedPeer);
  if (dncHit) {
    return {
      allowed: false,
      blockStatus: 'blocked_dnc',
      reason: 'Người nhận nằm trong danh sách Không làm phiền (DNC) — chặn tuyệt đối.',
    };
  }

  if (params.isColdMarketing && !cfg.allowColdMarketingApprovedByLegal) {
    return {
      allowed: false,
      blockStatus: 'blocked_marketing',
      reason: 'CẤM dùng Zalo Cá nhân để gửi quảng cáo lạnh hàng loạt (chưa có Legal duyệt).',
    };
  }

  // Replies to inbound customer messages are exempt from cold cap, still rate-spaced
  if (!params.isReplyToInbound) {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const coldCountToday = params.todayLogs.filter(
      (l) =>
        l.direction === 'outbound' &&
        !l.isReplyToInbound &&
        l.status === 'sent' &&
        l.timestamp >= startOfDay.getTime()
    ).length;

    const strictCap = Math.min(20, Math.max(1, cfg.dailyColdOutboundCap || 20));
    if (coldCountToday >= strictCap) {
      return {
        allowed: false,
        blockStatus: 'blocked_cap',
        reason: `Đã chạm ngưỡng tối đa ${strictCap} tin nhắn chủ động/ngày trên Zalo Cá nhân (chống khóa nick).`,
      };
    }
  }

  // Check spacing delay
  const minDelayMs = Math.max(12, cfg.minDelaySecondsBetweenMsgs || 15) * 1000;
  const lastOut = params.todayLogs
    .filter((l) => l.direction === 'outbound' && l.status === 'sent')
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (lastOut && now - lastOut.timestamp < minDelayMs) {
    const waitSec = Math.ceil((minDelayMs - (now - lastOut.timestamp)) / 1000);
    return {
      allowed: false,
      blockStatus: 'blocked_cap',
      reason: `Đang giãn cách an toàn giữa các tin nhắn — vui lòng chờ thêm ${waitSec} giây.`,
    };
  }

  return { allowed: true };
}
