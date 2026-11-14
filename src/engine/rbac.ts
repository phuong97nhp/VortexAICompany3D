import { AgentAccount, AuditLogEntry, Permission, RoleType, ToolName } from '../types';

export const ALL_PERMISSIONS: Array<{ key: Permission; label: string; group: string }> = [
  { key: 'lead:read', label: 'Xem danh sách Lead', group: 'CRM & Sales' },
  { key: 'lead:write', label: 'Thêm / sửa Lead', group: 'CRM & Sales' },
  { key: 'lead:export', label: 'Xuất CSV Lead', group: 'CRM & Sales' },
  { key: 'outreach:send', label: 'Gửi tin tiếp cận (SDR)', group: 'CRM & Sales' },
  { key: 'quote:create', label: 'Tạo báo giá nháp', group: 'CRM & Sales' },
  { key: 'quote:send', label: 'Gửi báo giá cho khách', group: 'CRM & Sales' },
  { key: 'contract:draft', label: 'Soạn hợp đồng nháp', group: 'CRM & Sales' },
  { key: 'account:create', label: 'Khởi tạo tài khoản nền tảng', group: 'Tài khoản & Vault' },
  { key: 'vault:use', label: 'Sử dụng Credential Vault', group: 'Tài khoản & Vault' },
  { key: 'browser:use', label: 'Điều khiển trình duyệt Playbook', group: 'Tài khoản & Vault' },
  { key: 'doc:write', label: 'Ghi tài liệu vào Kho', group: 'Vận hành' },
  { key: 'task:assign', label: 'Giao việc cho Agent khác', group: 'Vận hành' },
  { key: 'meeting:call', label: 'Triệu tập cuộc họp', group: 'Vận hành' },
  { key: 'kpi:read', label: 'Đọc số liệu KPI', group: 'Vận hành' },
  { key: 'budget:spend', label: 'Đề xuất chi ngân sách', group: 'Tài chính & Quản trị' },
  { key: 'approval:request', label: 'Gửi yêu cầu phê duyệt', group: 'Tài chính & Quản trị' },
  { key: 'settings:write', label: 'Thay đổi cài đặt hệ thống', group: 'Tài chính & Quản trị' },
  { key: 'memory:read', label: 'Đọc bộ nhớ Agent', group: 'Bộ nhớ' },
  { key: 'memory:write', label: 'Ghi bộ nhớ Agent', group: 'Bộ nhớ' },
  { key: 'post:publish', label: 'Đăng bài lên Kênh MXH', group: 'Marketing & Kênh' },
  { key: 'ads:manage', label: 'Tạo & đề xuất chiến dịch Ads', group: 'Marketing & Kênh' },
];

export const TOOL_PERMISSION_MAP: Partial<Record<ToolName, Permission>> = {
  find_leads: 'lead:write',
  save_lead: 'lead:write',
  update_lead: 'lead:write',
  score_lead: 'lead:write',
  send_outreach: 'outreach:send',
  schedule_followup: 'outreach:send',
  create_account: 'account:create',
  browser_action: 'browser:use',
  create_quote: 'quote:create',
  write_document: 'doc:write',
  create_task: 'task:assign',
  assign_task: 'task:assign',
  call_meeting: 'meeting:call',
  get_kpis: 'kpi:read',
  generate_report: 'kpi:read',
  request_approval: 'approval:request',
  read_memory: 'memory:read',
  write_memory: 'memory:write',
  generate_brand_kit: 'doc:write',
  provision_channel: 'account:create',
  schedule_social_post: 'doc:write',
  publish_social_post: 'post:publish',
  reply_social_comment: 'post:publish',
  create_ad_campaign: 'ads:manage',
};

export const ROLE_LABELS: Record<RoleType, string> = {
  CEO: 'CEO (Toàn quyền)',
  Exec: 'Ban Giám đốc',
  'Dept Head': 'Trưởng phòng',
  Specialist: 'Chuyên viên',
  'Read-only': 'Chỉ xem',
};

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
}

export function authorize(
  account: AgentAccount | undefined,
  permission: Permission,
  actionName: string,
  agentDisplayName: string,
  onAudit?: (entry: AuditLogEntry) => void
): AuthorizationResult {
  const now = Date.now();
  const mkLog = (result: 'allowed' | 'denied', reason?: string): AuditLogEntry => ({
    id: `aud_${now}_${Math.random().toString(36).slice(2, 7)}`,
    agentId: account?.agentId || 'unknown',
    agentName: agentDisplayName,
    action: actionName,
    permission,
    resource: permission.split(':')[0],
    result,
    reason,
    timestamp: now,
  });

  if (!account) {
    const reason = 'Tài khoản agent không tồn tại trong hệ thống RBAC.';
    onAudit?.(mkLog('denied', reason));
    return { allowed: false, reason };
  }

  if (account.status === 'suspended') {
    const reason = `Tài khoản ${account.username} đang bị tạm khóa.`;
    onAudit?.(mkLog('denied', reason));
    return { allowed: false, reason };
  }

  if (account.role === 'CEO') {
    onAudit?.(mkLog('allowed', 'Quyền CEO tối cao'));
    return { allowed: true };
  }

  if (!account.permissions.includes(permission)) {
    const reason = `Thiếu quyền '${permission}' cho thao tác '${actionName}' (Role: ${account.role}).`;
    onAudit?.(mkLog('denied', reason));
    return { allowed: false, reason };
  }

  onAudit?.(mkLog('allowed'));
  return { allowed: true };
}
