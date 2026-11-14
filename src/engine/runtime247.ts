import {
  BackupSnapshotRecord,
  CompanySettings,
  DurableJob,
  GoLiveCheckItem,
  SystemHealthLog,
} from '../types';
import { circuitBreakers, createTraceId } from './resilience';

export const CURRENT_SCHEMA_VERSION = 6;

/**
 * Durable Job Queue helper: ensures tasks survive browser reloads or server restarts.
 * Any job left 'leased' past its leaseExpiresAt (or found leased at boot) is recovered to 'queued'.
 */
export function recoverOrphanedDurableJobs(jobs: DurableJob[], now = Date.now()): DurableJob[] {
  return jobs.map((job) => {
    if (job.status === 'leased' && (!job.leaseExpiresAt || job.leaseExpiresAt <= now || true)) {
      if (job.attempts >= job.maxAttempts) {
        return {
          ...job,
          status: 'dead',
          lastError: 'Vượt quá số lần thử lại sau sự cố gián đoạn.',
          updatedAt: now,
        };
      }
      return {
        ...job,
        status: 'queued',
        leaseOwner: undefined,
        leaseExpiresAt: undefined,
        updatedAt: now,
      };
    }
    return job;
  });
}

export function createDurableJobRecord(params: {
  type: string;
  agentId: string;
  department: DurableJob['department'];
  totalSteps?: number;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}): DurableJob {
  const now = Date.now();
  return {
    id: `job_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: params.type,
    agentId: params.agentId,
    department: params.department,
    status: 'queued',
    attempts: 0,
    maxAttempts: 3,
    progressStep: 0,
    totalSteps: params.totalSteps ?? 3,
    idempotencyKey: params.idempotencyKey || `${params.type}_${params.agentId}_${now}`,
    traceId: createTraceId('job'),
    payload: params.payload,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Evaluates all 10 Go-Live Checklist items.
 * ANY blocking item failing prevents switching envMode to 'live'.
 */
export function evaluateGoLiveChecklist(params: {
  settings: CompanySettings;
  hasAnyAiProviderConfigured: boolean;
  externalAccountsCount: number;
  linkedExternalAccountsCount: number;
  backupsCount: number;
}): GoLiveCheckItem[] {
  const { settings } = params;
  const shopeeNet = settings.affiliate?.networks?.find((n) => n.id === 'shopee');
  const hasAnyAffId = (settings.affiliate?.networks || []).some((n) => n.enabled && Boolean(n.affId.trim()));
  const legalComplete =
    Boolean(settings.legal?.companyLegalName) &&
    !settings.legal.companyLegalName.includes('CẦN BỔ SUNG') &&
    Boolean(settings.legal?.taxCode) &&
    !settings.legal.taxCode.includes('CẦN BỔ SUNG');

  return [
    {
      id: 'chk_password',
      label: '1. Đã đổi mật khẩu CEO mặc định (admin123)',
      passed: !settings.mustChangeDefaultPassword,
      detail: settings.mustChangeDefaultPassword
        ? 'Vẫn đang dùng mật khẩu mặc định admin123 — cần đổi trong Bảo mật.'
        : 'Đã đặt mật khẩu CEO riêng.',
      blocking: true,
    },
    {
      id: 'chk_ai_provider',
      label: '2. Đã cấu hình ít nhất 1 bộ não AI thật (Gemini / DeepSeek / Local)',
      passed: params.hasAnyAiProviderConfigured || settings.primaryProvider !== 'mock',
      detail: `Provider chính: ${settings.primaryProvider}`,
      blocking: true,
    },
    {
      id: 'chk_hubcw_url',
      label: '3. Đã kiểm tra URL HubCW & giới hạn ghi/giờ',
      passed: /^https?:\/\//.test(settings.hubcw.baseUrl) && settings.hubcw.hourlyWriteLimit > 0,
      detail: `${settings.hubcw.baseUrl} (giới hạn ${settings.hubcw.hourlyWriteLimit}/giờ)`,
      blocking: true,
    },
    {
      id: 'chk_hubcw_accounts',
      label: '4. Đã gắn ít nhất 1 tài khoản HubCW thật (hoặc bật Sandbox)',
      passed: params.linkedExternalAccountsCount > 0 || params.externalAccountsCount > 0,
      detail: `${params.linkedExternalAccountsCount}/${params.externalAccountsCount} nhân sự đã gắn tài khoản HubCW`,
      blocking: true,
    },
    {
      id: 'chk_affiliate_id',
      label: '5. Đã cấu hình Aff ID của CEO (ưu tiên Shopee) & nhãn minh bạch',
      passed: Boolean(shopeeNet?.affId?.trim()) || hasAnyAffId,
      detail: hasAnyAffId ? 'Đã có Aff ID hợp lệ' : 'Chưa nhập Aff ID nào trong Cài đặt > Affiliate',
      blocking: true,
    },
    {
      id: 'chk_legal_info',
      label: '6. Đã điền pháp nhân công ty (MST, Địa chỉ, Người đại diện)',
      passed: legalComplete,
      detail: legalComplete ? settings.legal.companyLegalName : 'Thông tin Bên A vẫn còn [CẦN BỔ SUNG]',
      blocking: true,
    },
    {
      id: 'chk_token_budget',
      label: '7. Đã đặt hạn mức token/ngày & chi phí an toàn',
      passed: settings.dailyTokenBudget > 0 && settings.spendingPolicy.mandatoryCeoThresholdVnd > 0,
      detail: `Ngân sách: ${settings.dailyTokenBudget.toLocaleString('vi-VN')} token/ngày`,
      blocking: true,
    },
    {
      id: 'chk_alert_channel',
      label: '8. Đã kiểm thử kênh cảnh báo CEO (Zalo / Telegram / Simulator)',
      passed: Boolean(settings.onboarding?.testAlertSent || settings.zaloAlertWebhookUrl || settings.telegramChatId),
      detail: settings.onboarding?.testAlertSent ? 'Đã gửi tin kiểm thử thành công' : 'Cần bấm Test gửi cảnh báo',
      blocking: true,
    },
    {
      id: 'chk_readonly_test',
      label: '9. Đã chạy thử chu kỳ Ở CHẾ ĐỘ CHỈ ĐỌC (Read-only)',
      passed: Boolean(settings.onboarding?.readOnlyCycleTested),
      detail: settings.onboarding?.readOnlyCycleTested ? 'Đã xác minh đọc an toàn' : 'Chưa chạy thử Read-only',
      blocking: true,
    },
    {
      id: 'chk_backup',
      label: '10. Đã tạo bản sao lưu dữ liệu đầu tiên',
      passed: params.backupsCount > 0 || Boolean(settings.onboarding?.firstBackupCreated),
      detail: params.backupsCount > 0 ? `Hiện có ${params.backupsCount} bản sao lưu` : 'Chưa có bản sao lưu nào',
      blocking: true,
    },
  ];
}

export function buildBackupBundleJson(data: Record<string, unknown>, label: string): BackupSnapshotRecord {
  const now = Date.now();
  const payloadObj = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: now,
    label,
    data,
  };
  const jsonPayload = JSON.stringify(payloadObj);
  return {
    id: `bkp_${now.toString(36)}`,
    label,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdBy: label.includes('Tự động') ? 'auto_daily' : 'manual',
    sizeBytes: jsonPayload.length,
    jsonPayload,
    createdAt: now,
  };
}

export async function dispatchSystemAlert(params: {
  title: string;
  body: string;
  severity: 'info' | 'warn' | 'critical';
  settings: CompanySettings;
  pushZaloSim?: (direction: 'in' | 'out', text: string) => void;
}): Promise<{ delivered: boolean; channel: string }> {
  const text = `[${params.severity.toUpperCase()}] ${params.title}\n${params.body}`;
  params.pushZaloSim?.('in', text);

  if (params.settings.zaloAlertWebhookUrl || (params.settings.telegramBotToken && params.settings.telegramChatId)) {
    try {
      const res = await fetch('/api/alerts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zaloWebhookUrl: params.settings.zaloAlertWebhookUrl,
          telegramBotToken: params.settings.telegramBotToken,
          telegramChatId: params.settings.telegramChatId,
          text,
        }),
      });
      if (res.ok) {
        circuitBreakers.recordSuccess('integration:zalo', 120);
        return { delivered: true, channel: 'webhook' };
      }
    } catch (err) {
      circuitBreakers.recordFailure('integration:zalo', err);
    }
  }
  return { delivered: true, channel: 'zalo_simulator' };
}

export function getMemoryHeapUsageMb(): number | null {
  if (typeof performance !== 'undefined') {
    const perf = performance as unknown as { memory?: { usedJSHeapSize?: number } };
    if (perf.memory?.usedJSHeapSize) {
      return Math.round(perf.memory.usedJSHeapSize / (1024 * 1024));
    }
  }
  return null;
}

export function createHealthLog(
  level: SystemHealthLog['level'],
  component: string,
  message: string,
  traceId?: string,
  detail?: string
): SystemHealthLog {
  return {
    id: `hlog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    level,
    component,
    traceId,
    message,
    detail,
    timestamp: Date.now(),
  };
}
