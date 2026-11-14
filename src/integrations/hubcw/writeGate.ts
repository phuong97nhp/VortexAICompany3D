import {
  AgentAccount,
  AgentExternalAccount,
  AuditLogEntry,
  CompanySettings,
  DataProvenance,
  ExpenseItem,
  HubCwApiLog,
  HubCwModuleId,
  HubCwReconciliationDiscrepancy,
  HubCwReconciliationReport,
  HubCwUndoSnapshot,
  LeadItem,
  OriginTag,
  ProvenanceSource,
  TaskItem,
} from '../../types';
import {
  HUBCW_MODULE_MAP,
  HUBCW_UNCLEAR_MODULES,
  isCriticalOrCeoOnlyOp,
} from './hubcw.config';
import {
  BusinessSystemConnector,
  HubCwAgentContext,
  HubCwWriteResult,
} from './BusinessSystemConnector';

export const ALLOWED_REAL_PROVENANCE_SOURCES: ProvenanceSource[] = [
  'hubcw_record',
  'user_input',
  'external_document',
  'verified_web',
  'platform_api',
  'calculation',
];

export const BLOCKED_PROVENANCE_SOURCES: ProvenanceSource[] = [
  'llm_generated',
  'estimated',
  'unknown',
];

export interface HubCwWriteRequest {
  agentId: string;
  agentName: string;
  module: HubCwModuleId;
  operation: 'create' | 'update' | 'delete';
  recordId?: string;
  payload: Record<string, unknown>;
  origin?: OriginTag;
  provenance?: DataProvenance;
  expenseCode?: string; // e.g. #CP-101 for financial writes
  existingHubCwRecordIds?: string[];
  idempotencyKey?: string;
}

export interface WriteGateValidationResult {
  allowed: boolean;
  blockedCode?:
    | 'NOT_LIVE_ENV'
    | 'KILL_SWITCH_ACTIVE'
    | 'UNLINKED_OR_INACTIVE_ACCOUNT'
    | 'PERMISSION_DENIED'
    | 'UNCLEAR_MODULE_LOCKED'
    | 'CRITICAL_OP_BLOCKED'
    | 'QUOTA_EXCEEDED'
    | 'SIMULATED_ORIGIN_BLOCKED'
    | 'INVALID_PROVENANCE'
    | 'SCHEMA_INVALID'
    | 'ANTI_HALLUCINATION_BLOCKED'
    | 'CROSS_VERIFY_FAILED'
    | 'EXPENSE_NOT_APPROVED';
  reason?: string;
  requiresAskCeo?: boolean;
}

export interface WriteGateRuntimeDeps {
  settings: CompanySettings;
  rbacAccount?: AgentAccount;
  externalAccount?: AgentExternalAccount;
  decryptedSecret?: string;
  expenses: ExpenseItem[];
  recentApiLogs: HubCwApiLog[];
  connector: BusinessSystemConnector;
  onWriteLog?: (log: HubCwApiLog) => Promise<void> | void;
  onWriteAudit?: (entry: AuditLogEntry) => Promise<void> | void;
  onSaveUndoSnapshot?: (snapshot: HubCwUndoSnapshot) => Promise<void> | void;
  onNotifyBlocked?: (req: HubCwWriteRequest, reason: string) => Promise<void> | void;
}

// === ANTI-HALLUCINATION / FAKE DATA DETECTORS (BỔ SUNG H5e) ===
const FAKE_NAME_PATTERNS: RegExp[] = [
  /\bnguy[ễe]n\s+v[ăa]n\s+[a-z]\b/i,
  /\btr[ầa]n\s+th[ịi]\s+[a-z]\b/i,
  /\bl[êe]\s+v[ăa]n\s+[a-z]\b/i,
  /\bc[ôo]ng\s+ty\s+(abc|xyz|m[ẫa]u|test|demo|sample)\b/i,
  /\b(test\s+customer|sample\s+company|demo\s+client|kh[áa]ch\s+h[àa]ng\s+m[ẫa]u|kh[áa]ch\s+h[àa]ng\s+test|lorem\s+ipsum)\b/i,
  /^\[?m[ôo]\s*ph[ỏo]ng\]?/i,
];

const FAKE_EMAIL_PATTERNS: RegExp[] = [
  /^(test|demo|sample|fake|abc|example|admin|user\d*)@/i,
  /@(example\.(com|org|net)|test\.com|demo\.local|fake\.com|mailinator\.com)$/i,
];

const INVALID_VN_PHONE_SEQUENCES = new Set([
  '0900000000',
  '0911111111',
  '0988888888',
  '0123456789',
  '0987654321',
  '0901234567',
]);

export function detectAntiHallucinationIssues(
  module: HubCwModuleId,
  payload: Record<string, unknown>,
  provenance?: DataProvenance
): string | null {
  // Check simulated tag leaked into string payload fields
  const textFieldsToScan = ['name', 'customerName', 'title', 'company', 'description', 'subject', 'vendor'];
  for (const field of textFieldsToScan) {
    const val = payload[field];
    if (typeof val === 'string' && val.trim()) {
      for (const rx of FAKE_NAME_PATTERNS) {
        if (rx.test(val.trim())) {
          return `Phát hiện tên/nội dung mẫu nghi ảo trong '${field}': "${val.trim()}".`;
        }
      }
      if (/\[MÔ PHỎNG\]|\bSANDBOX\b/i.test(val)) {
        return `Từ chối ghi nội dung chứa nhãn MÔ PHỎNG/SANDBOX trong '${field}'.`;
      }
    }
  }

  // Phone check (Vietnam mobile 10 digits starting 03/05/07/08/09 or +84...)
  if (typeof payload.phone === 'string' && payload.phone.trim()) {
    const clean = payload.phone.replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    if (!/^0(3|5|7|8|9)\d{8}$/.test(clean)) {
      return `Số điện thoại không hợp lệ tại Việt Nam: "${payload.phone}".`;
    }
    if (INVALID_VN_PHONE_SEQUENCES.has(clean) || /(\d)\1{5,}/.test(clean)) {
      return `Phát hiện SĐT giả/lặp chữ số: "${payload.phone}".`;
    }
  }

  // Email check
  if (typeof payload.email === 'string' && payload.email.trim()) {
    const email = payload.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return `Định dạng email không hợp lệ: "${email}".`;
    }
    for (const rx of FAKE_EMAIL_PATTERNS) {
      if (rx.test(email)) {
        return `Phát hiện email giả/mẫu: "${email}".`;
      }
    }
  }

  // Date range check (must not be >1 year in future or before year 2020)
  for (const df of ['date', 'dueDate', 'scheduledAt']) {
    const rawDate = payload[df];
    if (typeof rawDate === 'string' && rawDate.trim()) {
      const ts = Date.parse(rawDate);
      if (Number.isNaN(ts)) {
        return `Ngày không hợp lệ ở trường '${df}': "${rawDate}".`;
      }
      const now = Date.now();
      const oneYearMs = 366 * 24 * 60 * 60 * 1000;
      if (ts > now + oneYearMs || ts < Date.parse('2020-01-01')) {
        return `Ngày '${df}' (${rawDate}) nằm ngoài khoảng hợp lệ (2020 .. +1 năm).`;
      }
    }
  }

  // Financial & number plausibility checks
  const amount = Number(payload.amountVnd ?? payload.amount ?? payload.totalVnd);
  if (Number.isFinite(amount)) {
    if (amount <= 0 && (module === 'orders' || module === 'cashflow' || module === 'wallet')) {
      return `Số tiền phải lớn hơn 0 (nhận: ${amount}).`;
    }
    // Check balance consistency if unitPrice * quantity provided
    if (
      typeof payload.quantity === 'number' &&
      typeof payload.unitPriceVnd === 'number' &&
      Math.abs(payload.quantity * payload.unitPriceVnd - amount) > 1
    ) {
      return `Tổng tiền lệch phép tính (${payload.quantity} x ${payload.unitPriceVnd} != ${amount}).`;
    }
    // Reject arbitrarily large round numbers in financial modules unless verified by calculation or external doc
    if (
      (module === 'cashflow' || module === 'orders' || module === 'wallet') &&
      amount >= 10_000_000 &&
      amount % 1_000_000 === 0 &&
      (!provenance ||
        (provenance.source !== 'hubcw_record' &&
          provenance.source !== 'external_document' &&
          provenance.source !== 'calculation'))
    ) {
      return `Số tiền tròn trịa lớn (${amount.toLocaleString('vi-VN')}đ) cần chứng từ (external_document) hoặc công thức tính (calculation).`;
    }
  }

  return null;
}

/**
 * Deterministic Hard Write Gate (BỔ SUNG H):
 * Inspects environment, kill switch, agent HubCW link/permissions, origin tag,
 * mandatory DataProvenance, schema, anti-hallucination detectors, and #CP-xxx approval.
 */
export function validateHubCwWrite(
  req: HubCwWriteRequest,
  deps: WriteGateRuntimeDeps
): WriteGateValidationResult {
  const { settings, rbacAccount, externalAccount, expenses, recentApiLogs } = deps;

  // (a1) Kill Switch
  if (settings.killSwitchActive) {
    return {
      allowed: false,
      blockedCode: 'KILL_SWITCH_ACTIVE',
      reason: 'KILL SWITCH đang kích hoạt — mọi thao tác ghi Hub.ChuyenWeb bị cắt lập tức.',
    };
  }

  // (a2) Strict environment separation: LIVE only
  if (settings.envMode !== 'live') {
    return {
      allowed: false,
      blockedCode: 'NOT_LIVE_ENV',
      reason: `Môi trường hiện tại là '${settings.envMode.toUpperCase()}'. Chỉ môi trường 'LIVE' mới được ghi vào Hub.ChuyenWeb thật.`,
    };
  }

  // (a3) Strict 1-agent-1-account check (never fallback to shared admin token)
  if (!externalAccount || externalAccount.status !== 'active' || !externalAccount.externalUserId) {
    return {
      allowed: false,
      blockedCode: 'UNLINKED_OR_INACTIVE_ACCOUNT',
      reason: `Agent '${req.agentName}' chưa liên kết tài khoản Hub.ChuyenWeb hoạt động (trạng thái: ${externalAccount?.status || 'unlinked'}).`,
      requiresAskCeo: true,
    };
  }

  // (a4) RBAC + per-agent HubCW module permission check
  if (rbacAccount?.status === 'suspended') {
    return {
      allowed: false,
      blockedCode: 'PERMISSION_DENIED',
      reason: `Tài khoản RBAC của '${req.agentName}' đang bị khóa.`,
    };
  }
  const modPerm = externalAccount.externalPermissions?.[req.module];
  if (!modPerm || !modPerm.write) {
    return {
      allowed: false,
      blockedCode: 'PERMISSION_DENIED',
      reason: `Agent '${req.agentName}' không có quyền GHI trên module '${HUBCW_MODULE_MAP[req.module]?.label || req.module}'.`,
    };
  }

  // (a5) Unclear modules write-lock check
  if (HUBCW_UNCLEAR_MODULES.includes(req.module)) {
    const key = req.module as 'golden_pig' | 'automation' | 'resources';
    if (!settings.hubcw?.unclearWriteUnlocked?.[key]) {
      return {
        allowed: false,
        blockedCode: 'UNCLEAR_MODULE_LOCKED',
        reason: `Module '${HUBCW_MODULE_MAP[req.module].label}' đang KHÓA GHI do chưa xác nhận nghiệp vụ trong HUBCW_API_MAP.md.`,
        requiresAskCeo: true,
      };
    }
  }

  // (a6) Critical CEO-only operation block
  const critical = isCriticalOrCeoOnlyOp(req.module, req.operation);
  if (critical.blockedAlways) {
    return {
      allowed: false,
      blockedCode: 'CRITICAL_OP_BLOCKED',
      reason: critical.reason,
      requiresAskCeo: true,
    };
  }

  // (a7) Hourly write quota
  const oneHourAgo = Date.now() - 3600_000;
  const writesLastHour = recentApiLogs.filter(
    (l) => l.method !== 'GET' && l.result === 'ok' && l.timestamp >= oneHourAgo
  ).length;
  const limit = settings.hubcw?.hourlyWriteLimit || 30;
  if (writesLastHour >= limit) {
    return {
      allowed: false,
      blockedCode: 'QUOTA_EXCEEDED',
      reason: `Vượt hạn mức ghi Hub.ChuyenWeb/giờ (${writesLastHour}/${limit}).`,
      requiresAskCeo: true,
    };
  }

  // (c1) Hard-block simulated origin even if edited/re-imported
  if (req.origin === 'simulated' || req.provenance?.origin === 'simulated' || req.payload.origin === 'simulated') {
    return {
      allowed: false,
      blockedCode: 'SIMULATED_ORIGIN_BLOCKED',
      reason: 'CHẶN CỨNG: Dữ liệu mang nhãn MÔ PHỎNG (origin="simulated") tuyệt đối không được đẩy sang Hub.ChuyenWeb thật.',
      requiresAskCeo: true,
    };
  }

  // (c2) Mandatory provenance check (reject missing or llm_generated/estimated/unknown)
  if (!req.provenance || !req.provenance.source) {
    return {
      allowed: false,
      blockedCode: 'INVALID_PROVENANCE',
      reason: 'Thiếu trường provenance (nguồn gốc dữ liệu bắt buộc theo quy tắc chống bịa số liệu).',
      requiresAskCeo: true,
    };
  }
  if (
    BLOCKED_PROVENANCE_SOURCES.includes(req.provenance.source) ||
    !ALLOWED_REAL_PROVENANCE_SOURCES.includes(req.provenance.source)
  ) {
    return {
      allowed: false,
      blockedCode: 'INVALID_PROVENANCE',
      reason: `Nguồn dữ liệu '${req.provenance.source}' bị từ chối ghi thật. Chỉ chấp nhận: ${ALLOWED_REAL_PROVENANCE_SOURCES.join(', ')}.`,
      requiresAskCeo: true,
    };
  }
  if (req.provenance.source === 'calculation') {
    if (!req.provenance.formula || !req.provenance.inputs || Object.keys(req.provenance.inputs).length === 0) {
      return {
        allowed: false,
        blockedCode: 'INVALID_PROVENANCE',
        reason: "Provenance 'calculation' bắt buộc phải có formula và inputs kiểm chứng được.",
      };
    }
  }

  // (b) Schema / Required fields validation
  const modCfg = HUBCW_MODULE_MAP[req.module];
  if (!modCfg || !modCfg.supportsWrite) {
    return {
      allowed: false,
      blockedCode: 'SCHEMA_INVALID',
      reason: `Module '${req.module}' chỉ hỗ trợ đọc, không hỗ trợ ghi.`,
    };
  }
  if (req.operation === 'create') {
    for (const field of modCfg.requiredWriteFields) {
      const val = req.payload[field];
      if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
        return {
          allowed: false,
          blockedCode: 'SCHEMA_INVALID',
          reason: `Thiếu trường bắt buộc '${field}' khi tạo bản ghi trên '${modCfg.label}'.`,
        };
      }
    }
  }

  // (d) Cross-verification when refId is provided or updating existing record
  if (req.operation === 'update' && !req.recordId) {
    return {
      allowed: false,
      blockedCode: 'CROSS_VERIFY_FAILED',
      reason: 'Cập nhật bản ghi thật bắt buộc phải có recordId tồn tại trên Hub.ChuyenWeb.',
    };
  }
  if (
    req.provenance.source === 'hubcw_record' &&
    req.existingHubCwRecordIds &&
    req.provenance.refId &&
    !req.existingHubCwRecordIds.includes(req.provenance.refId)
  ) {
    return {
      allowed: false,
      blockedCode: 'CROSS_VERIFY_FAILED',
      reason: `Không tìm thấy bản ghi nguồn '${req.provenance.refId}' trên Hub.ChuyenWeb khi đối chiếu chéo.`,
    };
  }

  // (e) Anti-hallucination detector
  const antiFakeIssue = detectAntiHallucinationIssues(req.module, req.payload, req.provenance);
  if (antiFakeIssue) {
    return {
      allowed: false,
      blockedCode: 'ANTI_HALLUCINATION_BLOCKED',
      reason: antiFakeIssue,
      requiresAskCeo: true,
    };
  }

  // (f) Financial modules require approved/paid/reconciled #CP-xxx expense matching amount
  if (modCfg.isFinancial && req.module !== 'golden_pig') {
    const code = (req.expenseCode || (req.payload.expenseCode as string | undefined) || '').trim();
    if (!code) {
      return {
        allowed: false,
        blockedCode: 'EXPENSE_NOT_APPROVED',
        reason: `Ghi dữ liệu tài chính vào '${modCfg.label}' bắt buộc phải gắn mã phiếu chi đã duyệt (#CP-xxx).`,
        requiresAskCeo: true,
      };
    }
    const matchedExpense = expenses.find(
      (e) => e.expenseCode.toLowerCase() === code.toLowerCase() || e.id === code
    );
    if (!matchedExpense) {
      return {
        allowed: false,
        blockedCode: 'EXPENSE_NOT_APPROVED',
        reason: `Không tìm thấy phiếu chi '${code}' trong hệ thống Kế toán nội bộ.`,
        requiresAskCeo: true,
      };
    }
    if (matchedExpense.simulated || matchedExpense.origin === 'simulated') {
      return {
        allowed: false,
        blockedCode: 'SIMULATED_ORIGIN_BLOCKED',
        reason: `Phiếu chi '${code}' là dữ liệu MÔ PHỎNG — không thể dùng để ghi giao dịch thật.`,
      };
    }
    if (!['approved', 'paid', 'reconciled'].includes(matchedExpense.status)) {
      return {
        allowed: false,
        blockedCode: 'EXPENSE_NOT_APPROVED',
        reason: `Phiếu chi '${code}' chưa được duyệt chi (trạng thái hiện tại: ${matchedExpense.status}).`,
        requiresAskCeo: true,
      };
    }
    const writeAmt = Number(req.payload.amountVnd ?? req.payload.amount ?? 0);
    if (writeAmt > 0 && Math.abs(writeAmt - matchedExpense.amountVnd) > 1000) {
      return {
        allowed: false,
        blockedCode: 'CROSS_VERIFY_FAILED',
        reason: `Số tiền ghi (${writeAmt.toLocaleString('vi-VN')}đ) không khớp phiếu chi '${code}' (${matchedExpense.amountVnd.toLocaleString('vi-VN')}đ).`,
      };
    }
  }

  return { allowed: true };
}

export interface ExecuteHubCwWriteOutcome {
  ok: boolean;
  gateResult: WriteGateValidationResult;
  writeResult?: HubCwWriteResult;
  undoSnapshotId?: string;
  idempotencyKey: string;
  requestId: string;
}

/**
 * SINGLE MANDATORY CHOKEPOINT for all agent writes to Hub.ChuyenWeb.
 * Attaches traceability fields, idempotencyKey, logs everything masked, and stores Undo snapshot.
 */
export async function executeHubCwWrite(
  req: HubCwWriteRequest,
  deps: WriteGateRuntimeDeps
): Promise<ExecuteHubCwWriteOutcome> {
  const now = Date.now();
  const idempotencyKey =
    req.idempotencyKey ||
    `idem_${req.agentId}_${req.module}_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const requestId = `req_${now}_${Math.random().toString(36).slice(2, 8)}`;

  const gateResult = validateHubCwWrite(req, deps);
  const modCfg = HUBCW_MODULE_MAP[req.module];
  const endpoint =
    req.operation === 'update'
      ? (modCfg.updatePath || `${modCfg.readPath}/:id`).replace(':id', req.recordId || '')
      : modCfg.createPath || modCfg.readPath;

  if (!gateResult.allowed) {
    const blockedLog: HubCwApiLog = {
      id: `hcwlog_${now}_${Math.random().toString(36).slice(2, 7)}`,
      agentId: req.agentId,
      agentName: req.agentName,
      externalUserId: deps.externalAccount?.externalUserId,
      module: req.module,
      operation: req.operation,
      method: req.operation === 'create' ? 'POST' : req.operation === 'update' ? 'PUT' : 'DELETE',
      endpoint,
      envMode: deps.settings.envMode,
      connectionMode: deps.settings.hubcw.connectionMode,
      result:
        gateResult.blockedCode === 'KILL_SWITCH_ACTIVE'
          ? 'blocked_killswitch'
          : gateResult.blockedCode === 'PERMISSION_DENIED'
            ? 'blocked_permission'
            : 'blocked_gate',
      idempotencyKey,
      requestId,
      reason: gateResult.reason,
      durationMs: 0,
      timestamp: now,
    };
    await deps.onWriteLog?.(blockedLog);
    await deps.onWriteAudit?.({
      id: `aud_${now}_${Math.random().toString(36).slice(2, 7)}`,
      agentId: req.agentId,
      agentName: req.agentName,
      action: `hubcw_write:${req.module}:${req.operation}`,
      permission: 'hubcw:write',
      resource: 'hubcw',
      result: 'denied',
      reason: `[${gateResult.blockedCode}] ${gateResult.reason}`,
      idempotencyKey,
      origin: req.origin,
      timestamp: now,
    });
    if (gateResult.requiresAskCeo && gateResult.reason) {
      await deps.onNotifyBlocked?.(req, gateResult.reason);
    }
    return {
      ok: false,
      gateResult,
      idempotencyKey,
      requestId,
    };
  }

  // Attach mandatory traceability metadata to outgoing real write
  const enrichedPayload: Record<string, unknown> = {
    ...req.payload,
    created_by_agent: req.agentId,
    agent_request_id: requestId,
    source_ref: req.provenance?.refId || req.provenance?.sourceLabel || req.provenance?.source,
    provenance_source: req.provenance?.source,
    approved_by: req.expenseCode || 'ceo_live_policy',
  };

  const ctx: HubCwAgentContext = {
    agentId: req.agentId,
    agentName: req.agentName,
    externalUserId: deps.externalAccount?.externalUserId,
    credentialSecret: deps.decryptedSecret,
    requestId,
    idempotencyKey,
  };

  const writeResult = await deps.connector.writeModule(
    ctx,
    req.module,
    req.operation,
    enrichedPayload,
    req.recordId
  );

  let undoSnapshotId: string | undefined;
  if (writeResult.ok && writeResult.externalRecordId) {
    const snap: HubCwUndoSnapshot = {
      id: `undo_${now}_${Math.random().toString(36).slice(2, 7)}`,
      agentId: req.agentId,
      agentName: req.agentName,
      module: req.module,
      operation: req.operation,
      externalRecordId: writeResult.externalRecordId,
      endpoint,
      beforeData: writeResult.beforeData ?? null,
      afterData: enrichedPayload,
      idempotencyKey,
      requestId,
      reverted: false,
      createdAt: now,
    };
    undoSnapshotId = snap.id;
    await deps.onSaveUndoSnapshot?.(snap);
  }

  const okLog: HubCwApiLog = {
    id: `hcwlog_${now}_${Math.random().toString(36).slice(2, 7)}`,
    agentId: req.agentId,
    agentName: req.agentName,
    externalUserId: deps.externalAccount?.externalUserId,
    module: req.module,
    operation: req.operation,
    method: req.operation === 'create' ? 'POST' : req.operation === 'update' ? 'PUT' : 'DELETE',
    endpoint,
    envMode: deps.settings.envMode,
    connectionMode: deps.settings.hubcw.connectionMode,
    result: writeResult.ok ? 'ok' : 'error',
    statusCode: writeResult.statusCode,
    externalRecordId: writeResult.externalRecordId,
    idempotencyKey,
    requestId,
    reason: writeResult.error,
    durationMs: writeResult.durationMs,
    timestamp: now,
  };
  await deps.onWriteLog?.(okLog);
  await deps.onWriteAudit?.({
    id: `aud_${now}_${Math.random().toString(36).slice(2, 7)}`,
    agentId: req.agentId,
    agentName: req.agentName,
    action: `hubcw_write:${req.module}:${req.operation}`,
    permission: 'hubcw:write',
    resource: 'hubcw',
    result: writeResult.ok ? 'allowed' : 'denied',
    reason: writeResult.ok
      ? `Đã ghi bản ghi thật ID=${writeResult.externalRecordId}`
      : writeResult.error,
    externalRefId: writeResult.externalRecordId,
    idempotencyKey,
    origin: 'hubcw_live',
    timestamp: now,
  });

  return {
    ok: writeResult.ok,
    gateResult,
    writeResult,
    undoSnapshotId,
    idempotencyKey,
    requestId,
  };
}

/**
 * Reverts a previous HubCW write using its captured beforeData snapshot (or marks deactivated if created).
 */
export async function revertHubCwSnapshot(
  snapshot: HubCwUndoSnapshot,
  deps: Omit<WriteGateRuntimeDeps, 'expenses' | 'recentApiLogs'>
): Promise<{ ok: boolean; message: string }> {
  if (snapshot.reverted) {
    return { ok: false, message: 'Thao tác này đã được hoàn tác trước đó.' };
  }
  if (deps.settings.killSwitchActive) {
    return { ok: false, message: 'KILL SWITCH đang bật — tạm dừng kết nối HubCW.' };
  }
  if (deps.settings.envMode !== 'live') {
    return { ok: false, message: 'Chỉ hoàn tác bản ghi thật khi hệ thống ở chế độ LIVE.' };
  }

  const ctx: HubCwAgentContext = {
    agentId: snapshot.agentId,
    agentName: snapshot.agentName,
    externalUserId: deps.externalAccount?.externalUserId,
    credentialSecret: deps.decryptedSecret,
    requestId: `undo_req_${Date.now()}`,
    idempotencyKey: `undo_${snapshot.id}`,
  };

  if (snapshot.operation === 'update' && snapshot.beforeData) {
    const res = await deps.connector.writeModule(
      ctx,
      snapshot.module,
      'update',
      { ...snapshot.beforeData, reverted_by_undo: snapshot.id },
      snapshot.externalRecordId
    );
    await deps.onWriteAudit?.({
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      agentId: snapshot.agentId,
      agentName: snapshot.agentName,
      action: `hubcw_undo:${snapshot.module}`,
      permission: 'hubcw:write',
      resource: 'hubcw',
      result: res.ok ? 'allowed' : 'denied',
      externalRefId: snapshot.externalRecordId,
      reason: res.ok
        ? `Hoàn tác bản ghi ${snapshot.externalRecordId} về trạng thái trước đó`
        : res.error,
      timestamp: Date.now(),
    });
    return {
      ok: res.ok,
      message: res.ok
        ? `Đã hoàn tác ${snapshot.module} #${snapshot.externalRecordId}.`
        : res.error || 'Không thể hoàn tác qua API HubCW.',
    };
  }

  // For 'create' snapshots, mark record archived/cancelled safely instead of hard delete
  const softArchiveRes = await deps.connector.writeModule(
    ctx,
    snapshot.module,
    'update',
    {
      status: 'cancelled',
      archivedByUndo: true,
      undoSnapshotId: snapshot.id,
    },
    snapshot.externalRecordId
  );
  return {
    ok: softArchiveRes.ok,
    message: softArchiveRes.ok
      ? `Đã đánh dấu hủy/thu hồi bản ghi tạo mới #${snapshot.externalRecordId}.`
      : softArchiveRes.error || 'Không thu hồi được bản ghi trên HubCW.',
  };
}

/**
 * Computes Data Trust Stats & runs Reconciliation against HubCW snapshots without auto-mutating money.
 */
export function runHubCwReconciliation(params: {
  leads: LeadItem[];
  tasks: TaskItem[];
  expenses: ExpenseItem[];
  apiLogs: HubCwApiLog[];
  hubcwCustomers?: Array<Record<string, unknown>>;
  hubcwCashflow?: Array<Record<string, unknown>>;
}): HubCwReconciliationReport {
  const allRecords = [
    ...params.leads.map((l) => ({
      origin: l.origin || (l.source.includes('Mẫu') ? 'simulated' : undefined),
      provenance: l.provenance,
    })),
    ...params.tasks.map((t) => ({
      origin: t.origin,
      provenance: t.provenance,
    })),
    ...params.expenses.map((e) => ({
      origin: e.origin || (e.simulated ? 'simulated' : 'user_verified'),
      provenance:
        e.provenance ||
        (!e.simulated
          ? ({ source: 'user_input', refId: e.expenseCode } as DataProvenance)
          : undefined),
    })),
  ];

  const totalLocalRecords = allRecords.length;
  const simulatedRecordCount = allRecords.filter((r) => r.origin === 'simulated').length;
  const validProvenanceCount = allRecords.filter(
    (r) =>
      r.provenance &&
      ALLOWED_REAL_PROVENANCE_SOURCES.includes(r.provenance.source) &&
      r.origin !== 'simulated'
  ).length;
  const validProvenancePercent =
    totalLocalRecords > 0 ? Math.round((validProvenanceCount / totalLocalRecords) * 100) : 100;

  const blockedLogs = params.apiLogs.filter(
    (l) => l.result === 'blocked_gate' || l.result === 'blocked_permission' || l.result === 'blocked_killswitch'
  );
  const reasonMap = new Map<string, number>();
  for (const log of blockedLogs) {
    const key = log.reason || log.result;
    reasonMap.set(key, (reasonMap.get(key) || 0) + 1);
  }
  const topBlockedReasons = [...reasonMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));

  const discrepancies: HubCwReconciliationDiscrepancy[] = [];

  // Reconcile local linked leads vs HubCW customer records (flag only, never auto-edit)
  if (params.hubcwCustomers) {
    for (const lead of params.leads) {
      if (!lead.externalRefId) continue;
      const remote = params.hubcwCustomers.find((c) => String(c.id) === String(lead.externalRefId));
      if (!remote) {
        discrepancies.push({
          id: `disc_cust_missing_${lead.id}`,
          module: 'customers',
          localId: lead.id,
          externalId: lead.externalRefId,
          field: 'record',
          localValue: lead.name,
          hubcwValue: 'Không tồn tại trên HubCW',
          severity: 'warning',
          note: 'Lead nội bộ gắn externalRefId nhưng không thấy trên HubCW.',
        });
      } else if (remote.phone && lead.phone && String(remote.phone) !== String(lead.phone)) {
        discrepancies.push({
          id: `disc_cust_phone_${lead.id}`,
          module: 'customers',
          localId: lead.id,
          externalId: lead.externalRefId,
          field: 'phone',
          localValue: lead.phone,
          hubcwValue: String(remote.phone),
          severity: 'info',
          note: 'SĐT lệch giữa CRM nội bộ và HubCW — cần đồng bộ lại.',
        });
      }
    }
  }

  // Reconcile paid expenses vs HubCW cashflow (flag discrepancies, never auto-edit financial numbers)
  if (params.hubcwCashflow) {
    for (const exp of params.expenses) {
      if (exp.simulated || (exp.status !== 'paid' && exp.status !== 'reconciled')) continue;
      if (!exp.externalRefId) {
        discrepancies.push({
          id: `disc_exp_unlinked_${exp.id}`,
          module: 'cashflow',
          localId: exp.id,
          field: 'externalRefId',
          localValue: `${exp.expenseCode} (${exp.amountVnd.toLocaleString('vi-VN')}đ)`,
          hubcwValue: 'Chưa đối soát Thu Chi HubCW',
          severity: 'warning',
          note: 'Phiếu chi đã thanh toán nội bộ nhưng chưa có mã đối soát Thu Chi trên HubCW.',
        });
      } else {
        const remoteCf = params.hubcwCashflow.find((c) => String(c.id) === String(exp.externalRefId));
        if (remoteCf && Number(remoteCf.amountVnd) !== exp.amountVnd) {
          discrepancies.push({
            id: `disc_exp_amt_${exp.id}`,
            module: 'cashflow',
            localId: exp.id,
            externalId: exp.externalRefId,
            field: 'amountVnd',
            localValue: `${exp.amountVnd.toLocaleString('vi-VN')}đ`,
            hubcwValue: `${Number(remoteCf.amountVnd).toLocaleString('vi-VN')}đ`,
            severity: 'critical',
            note: 'CẢNH BÁO TÀI CHÍNH: Số tiền phiếu chi lệch với Thu Chi HubCW — ưu tiên số liệu HubCW, CEO kiểm tra thủ công.',
          });
        }
      }
    }
  }

  return {
    id: `rec_${Date.now()}`,
    totalLocalRecords,
    validProvenanceCount,
    validProvenancePercent,
    simulatedRecordCount,
    blockedWriteCount: blockedLogs.length,
    topBlockedReasons,
    discrepancies,
    createdAt: Date.now(),
  };
}
