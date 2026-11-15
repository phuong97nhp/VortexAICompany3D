import { AgentAccount, AuditLogEntry, Permission, RoleType, ToolName } from '../types';

export const ALL_PERMISSIONS: Array<{ key: Permission; label: string; group: string }> = [
  { key: 'lead:read', label: 'Xem danh sách Lead', group: 'CRM & Sales' },
  { key: 'lead:write', label: 'Thêm / sửa Lead', group: 'CRM & Sales' },
  { key: 'lead:export', label: 'Xuất CSV Lead', group: 'CRM & Sales' },
  { key: 'outreach:send', label: 'Gửi tin tiếp cận (SDR)', group: 'CRM & Sales' },
  { key: 'quote:create', label: 'Tạo báo giá nháp', group: 'CRM & Sales' },
  { key: 'quote:send', label: 'Gửi báo giá cho khách', group: 'CRM & Sales' },
  { key: 'account:create', label: 'Khởi tạo tài khoản nền tảng', group: 'Tài khoản & Vault' },
  { key: 'vault:use', label: 'Sử dụng Credential Vault', group: 'Tài khoản & Vault' },
  { key: 'browser:use', label: 'Điều khiển trình duyệt Playbook', group: 'Tài khoản & Vault' },
  { key: 'doc:write', label: 'Ghi tài liệu vào Kho', group: 'Vận hành' },
  { key: 'task:assign', label: 'Giao việc cho Agent khác', group: 'Vận hành' },
  { key: 'meeting:call', label: 'Triệu tập cuộc họp', group: 'Vận hành' },
  { key: 'kpi:read', label: 'Đọc số liệu KPI', group: 'Vận hành' },
  { key: 'hr:manage', label: 'Quản lý nhân sự (tuyển/sửa/cho nghỉ)', group: 'Nhân sự & Quản trị' },
  { key: 'settings:write', label: 'Thay đổi cài đặt hệ thống', group: 'Nhân sự & Quản trị' },
  { key: 'system:admin', label: 'Quản trị 24/7, Sao lưu & Go-Live', group: 'Nhân sự & Quản trị' },
  { key: 'budget:spend', label: 'Đề xuất chi ngân sách', group: 'Tài chính & Kế toán' },
  { key: 'expense:request', label: 'Tạo phiếu xin chi phí', group: 'Tài chính & Kế toán' },
  { key: 'expense:review', label: 'Kế toán thẩm định chi phí (tầng 1)', group: 'Tài chính & Kế toán' },
  { key: 'expense:approve_final', label: 'Duyệt chi cuối cùng (tầng 2 CEO)', group: 'Tài chính & Kế toán' },
  { key: 'expense:rule_manage', label: 'Tạo & sửa Quy tắc tự duyệt', group: 'Tài chính & Kế toán' },
  { key: 'expense:mark_paid', label: 'Đánh dấu đã chi & đối soát chứng từ', group: 'Tài chính & Kế toán' },
  { key: 'policy:write', label: 'Chỉnh Chính sách chi tiêu (CEO)', group: 'Tài chính & Kế toán' },
  { key: 'approval:request', label: 'Gửi yêu cầu phê duyệt', group: 'Tài chính & Kế toán' },
  { key: 'memory:read', label: 'Đọc bộ nhớ Agent', group: 'Bộ nhớ' },
  { key: 'memory:write', label: 'Ghi bộ nhớ Agent', group: 'Bộ nhớ' },
  { key: 'post:publish', label: 'Đăng bài lên Kênh MXH', group: 'Marketing & Kênh' },
  { key: 'ads:manage', label: 'Tạo & đề xuất chiến dịch Ads', group: 'Marketing & Kênh' },
  { key: 'affiliate:read', label: 'Xem sản phẩm & báo cáo Affiliate', group: 'Khối Affiliate (Tầng 3)' },
  { key: 'affiliate:write', label: 'Săn hàng Win, tạo link sub_id & soạn bài', group: 'Khối Affiliate (Tầng 3)' },
  { key: 'affiliate:publish', label: 'Đăng bài lên kênh Affiliate', group: 'Khối Affiliate (Tầng 3)' },
  { key: 'affiliate:compliance', label: 'Kiểm soát & chặn đăng vi phạm Affiliate', group: 'Khối Affiliate (Tầng 3)' },
  { key: 'legal:research', label: 'Tra cứu & cập nhật Kho pháp luật VN', group: 'Phòng Pháp chế' },
  { key: 'contract:draft', label: 'Soạn hợp đồng & báo cáo pháp lý', group: 'Phòng Pháp chế' },
  { key: 'contract:review', label: 'Rà soát rủi ro & bảo vệ dữ liệu (DPO)', group: 'Phòng Pháp chế' },
  { key: 'contract:send', label: 'Phê duyệt gửi/ký hợp đồng thật (Chỉ CEO)', group: 'Phòng Pháp chế' },
  { key: 'legal:publish_template', label: 'Xuất bản mẫu hợp đồng chuẩn', group: 'Phòng Pháp chế' },
  { key: 'hubcw:read', label: 'Đọc dữ liệu Hub.ChuyenWeb', group: 'Kết nối phần mềm thật' },
  { key: 'hubcw:write', label: 'Ghi dữ liệu vào Hub.ChuyenWeb (qua Cổng kiểm soát)', group: 'Kết nối phần mềm thật' },
  { key: 'monitor:view', label: 'Kiểm tra màn hình làm việc bất chợt (CEO/COO)', group: 'Giám sát & Hội họp' },
  { key: 'voice:host', label: 'Điều phối phòng họp giọng nói & trực tiếp', group: 'Giám sát & Hội họp' },
  { key: 'zalo_personal:send', label: 'Nhắn tin qua Zalo Cá nhân có rào chắn', group: 'Giám sát & Hội họp' },
  { key: 'okr:manage', label: 'Quản trị mục tiêu OKR & phễu doanh thu', group: 'Chiến lược & Sản phẩm' },
  { key: 'sop:manage', label: 'Quản trị quy chuẩn SOP & Onboarding nhân sự', group: 'Nhân sự & Quản trị' },
  { key: 'product:approve', label: 'Phê duyệt thông số Sản phẩm & Tuyên bố', group: 'Chiến lược & Sản phẩm' },
  { key: 'bank:manage', label: 'Quản trị tài khoản ngân hàng công ty (2FA CEO)', group: 'Tài chính & Kế toán' },
  { key: 'handover:manage', label: 'Bàn giao liên phòng ban & SLA', group: 'Vận hành' },
  { key: 'strategy:propose', label: 'Đề xuất kế hoạch kiếm tiền & theo dõi đối thủ', group: 'Chiến lược & Sản phẩm' },
  { key: 'upgrade:approve', label: 'Phê duyệt & triển khai nâng cấp công ty', group: 'Nhân sự & Quản trị' },
  { key: 'repo:scout', label: 'Tìm & thử nghiệm repo Git trong Sandbox', group: 'Vận hành' },
  { key: 'playbook:manage', label: 'Quản trị Playbook tự học & bộ nhớ kinh nghiệm', group: 'Vận hành' },
  { key: 'device:control', label: 'Điều khiển thiết bị Android cắm qua ADB', group: 'Thiết bị & Tự động' },
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
  hire_agent: 'hr:manage',
  request_expense: 'expense:request',
  review_expense: 'expense:review',
  pay_expense: 'expense:mark_paid',
  buy_domain: 'budget:spend',
  subscribe_tool: 'budget:spend',
  spend: 'budget:spend',
  hubcw_read: 'hubcw:read',
  hubcw_write: 'hubcw:write',
  hubcw_sync: 'hubcw:write',
  affiliate_search_offers: 'affiliate:read',
  affiliate_create_link: 'affiliate:write',
  affiliate_check_links: 'affiliate:read',
  affiliate_compliance_check: 'affiliate:compliance',
  request_collab: 'task:assign',
  legal_research: 'legal:research',
  draft_contract: 'contract:draft',
  review_contract: 'contract:review',
  quality_review: 'doc:write',
  council_vote: 'strategy:propose',
  create_handover: 'handover:manage',
  propose_money_plan: 'strategy:propose',
  watch_competitor: 'strategy:propose',
  propose_upgrade: 'strategy:propose',
  scout_git_repo: 'repo:scout',
  run_device_action: 'device:control',
  device_list: 'device:control',
  device_screenshot: 'device:control',
  device_read_screen: 'device:control',
  device_open_app: 'device:control',
  device_tap: 'device:control',
  device_swipe: 'device:control',
  device_type: 'device:control',
  device_key: 'device:control',
  device_wait_for: 'device:control',
  device_find_element: 'device:control',
  device_install_apk: 'device:control',
  device_push_file: 'device:control',
  device_pull_file: 'device:control',
  device_run_playbook: 'device:control',
  send_zalo_personal: 'zalo_personal:send',
};

export const ROLE_LABELS: Record<RoleType, string> = {
  CEO: 'CEO (Toàn quyền)',
  Exec: 'Ban Giám đốc',
  'Dept Head': 'Trưởng phòng',
  Specialist: 'Chuyên viên',
  'Read-only': 'Chỉ xem',
};

export const ROLE_DEFAULT_PERMISSIONS: Record<RoleType, Permission[]> = {
  CEO: ALL_PERMISSIONS.map((p) => p.key),
  Exec: [
    'lead:read',
    'doc:write',
    'task:assign',
    'meeting:call',
    'kpi:read',
    'approval:request',
    'expense:request',
    'memory:read',
    'memory:write',
    'hubcw:read',
    'hubcw:write',
    'affiliate:read',
    'monitor:view',
    'voice:host',
    'okr:manage',
    'handover:manage',
    'strategy:propose',
  ],
  'Dept Head': [
    'lead:read',
    'lead:write',
    'doc:write',
    'task:assign',
    'meeting:call',
    'kpi:read',
    'approval:request',
    'expense:request',
    'memory:read',
    'memory:write',
    'hubcw:read',
    'hubcw:write',
    'handover:manage',
    'strategy:propose',
    'playbook:manage',
  ],
  Specialist: [
    'lead:read',
    'doc:write',
    'kpi:read',
    'expense:request',
    'memory:read',
    'memory:write',
    'hubcw:read',
    'hubcw:write',
  ],
  'Read-only': ['lead:read', 'kpi:read', 'memory:read', 'hubcw:read', 'affiliate:read'],
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
    const reason = 'Tài khoản agent không tồn tại hoặc đã bị thu hồi token trong hệ thống RBAC.';
    onAudit?.(mkLog('denied', reason));
    return { allowed: false, reason };
  }

  if (account.status === 'suspended') {
    const reason = `Tài khoản ${account.username} đang bị tạm khóa hoặc đã thôi việc.`;
    onAudit?.(mkLog('denied', reason));
    return { allowed: false, reason };
  }

  if (account.role === 'CEO') {
    onAudit?.(mkLog('allowed', 'Quyền CEO tối cao'));
    return { allowed: true };
  }

  // contract:send strictly requires CEO or explicit grant; never implicitly allowed for non-CEO without explicit permission
  if (!account.permissions.includes(permission)) {
    const reason = `Thiếu quyền '${permission}' cho thao tác '${actionName}' (Role: ${account.role}).`;
    onAudit?.(mkLog('denied', reason));
    return { allowed: false, reason };
  }

  onAudit?.(mkLog('allowed'));
  return { allowed: true };
}
