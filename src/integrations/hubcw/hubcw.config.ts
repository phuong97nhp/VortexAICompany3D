import {
  DepartmentId,
  HubCwModuleId,
  HubCwModulePermissionFlag,
  RoleType,
} from '../../types';

export interface HubCwModuleEndpointConfig {
  id: HubCwModuleId;
  label: string;
  readPath: string;
  createPath?: string;
  updatePath?: string; // supports :id placeholder
  deletePath?: string; // supports :id placeholder
  supportsRead: boolean;
  supportsWrite: boolean;
  isFinancial?: boolean;
  isCriticalAdmin?: boolean;
  isUnclear?: boolean;
  unclearNote?: string;
  requiredWriteFields: string[];
}

export const DEFAULT_HUBCW_BASE_URL = 'https://hub.chuyenweb.com';

export const HUBCW_MODULES: HubCwModuleEndpointConfig[] = [
  {
    id: 'dashboard',
    label: 'Bảng điều khiển',
    readPath: '/api/v1/dashboard/summary',
    supportsRead: true,
    supportsWrite: false,
    requiredWriteFields: [],
  },
  {
    id: 'customers',
    label: 'Khách hàng',
    readPath: '/api/v1/customers',
    createPath: '/api/v1/customers',
    updatePath: '/api/v1/customers/:id',
    deletePath: '/api/v1/customers/:id',
    supportsRead: true,
    supportsWrite: true,
    requiredWriteFields: ['name'],
  },
  {
    id: 'orders',
    label: 'Đơn hàng',
    readPath: '/api/v1/orders',
    createPath: '/api/v1/orders',
    updatePath: '/api/v1/orders/:id',
    supportsRead: true,
    supportsWrite: true,
    isFinancial: true,
    requiredWriteFields: ['customerId', 'amountVnd'],
  },
  {
    id: 'wallet',
    label: 'Ví',
    readPath: '/api/v1/wallet',
    createPath: '/api/v1/wallet/transactions',
    supportsRead: true,
    supportsWrite: true,
    isFinancial: true,
    isCriticalAdmin: true,
    requiredWriteFields: ['amountVnd', 'type', 'description'],
  },
  {
    id: 'golden_pig',
    label: 'Heo vàng',
    readPath: '/api/v1/golden-pig',
    createPath: '/api/v1/golden-pig/entries',
    supportsRead: true,
    supportsWrite: true,
    isFinancial: true,
    isUnclear: true,
    unclearNote: 'Nghiệp vụ tích điểm / thưởng / quỹ Heo vàng chưa xác nhận quy tắc cộng/trừ -> KHÓA GHI mặc định.',
    requiredWriteFields: ['amount', 'reason'],
  },
  {
    id: 'resources',
    label: 'Tài nguyên',
    readPath: '/api/v1/resources',
    createPath: '/api/v1/resources',
    updatePath: '/api/v1/resources/:id',
    supportsRead: true,
    supportsWrite: true,
    isUnclear: true,
    unclearNote: 'Chưa xác nhận danh mục tài nguyên (server/VPS/hosting/tài liệu số) -> KHÓA GHI mặc định.',
    requiredWriteFields: ['name', 'type'],
  },
  {
    id: 'automation',
    label: 'Tự động',
    readPath: '/api/v1/automation/workflows',
    createPath: '/api/v1/automation/workflows',
    updatePath: '/api/v1/automation/workflows/:id',
    supportsRead: true,
    supportsWrite: true,
    isUnclear: true,
    unclearNote: 'Kịch bản tự động có thể gửi tin hàng loạt/webhook thật -> KHÓA GHI mặc định.',
    requiredWriteFields: ['name', 'trigger'],
  },
  {
    id: 'accounts',
    label: 'Tài khoản',
    readPath: '/api/v1/accounts',
    createPath: '/api/v1/accounts',
    updatePath: '/api/v1/accounts/:id',
    supportsRead: true,
    supportsWrite: true,
    isCriticalAdmin: true,
    requiredWriteFields: ['username', 'provider'],
  },
  {
    id: 'licenses',
    label: 'License',
    readPath: '/api/v1/licenses',
    createPath: '/api/v1/licenses',
    updatePath: '/api/v1/licenses/:id',
    supportsRead: true,
    supportsWrite: true,
    requiredWriteFields: ['productId', 'customerId'],
  },
  {
    id: 'products',
    label: 'Sản phẩm',
    readPath: '/api/v1/products',
    createPath: '/api/v1/products',
    updatePath: '/api/v1/products/:id',
    supportsRead: true,
    supportsWrite: true,
    requiredWriteFields: ['name', 'priceVnd'],
  },
  {
    id: 'cashflow',
    label: 'Thu Chi',
    readPath: '/api/v1/cashflow',
    createPath: '/api/v1/cashflow',
    updatePath: '/api/v1/cashflow/:id',
    supportsRead: true,
    supportsWrite: true,
    isFinancial: true,
    requiredWriteFields: ['direction', 'amountVnd', 'description'],
  },
  {
    id: 'reports',
    label: 'Báo cáo',
    readPath: '/api/v1/reports',
    supportsRead: true,
    supportsWrite: false,
    requiredWriteFields: [],
  },
  {
    id: 'users',
    label: 'Người dùng',
    readPath: '/api/v1/users',
    createPath: '/api/v1/users',
    updatePath: '/api/v1/users/:id',
    deletePath: '/api/v1/users/:id',
    supportsRead: true,
    supportsWrite: true,
    isCriticalAdmin: true,
    requiredWriteFields: ['username', 'email', 'role'],
  },
  {
    id: 'tasks',
    label: 'Công việc',
    readPath: '/api/v1/tasks',
    createPath: '/api/v1/tasks',
    updatePath: '/api/v1/tasks/:id',
    supportsRead: true,
    supportsWrite: true,
    requiredWriteFields: ['title'],
  },
  {
    id: 'support',
    label: 'Hỗ trợ',
    readPath: '/api/v1/support/tickets',
    createPath: '/api/v1/support/tickets',
    updatePath: '/api/v1/support/tickets/:id',
    supportsRead: true,
    supportsWrite: true,
    requiredWriteFields: ['subject', 'message'],
  },
  {
    id: 'documents',
    label: 'Tài liệu',
    readPath: '/api/v1/documents',
    createPath: '/api/v1/documents',
    updatePath: '/api/v1/documents/:id',
    supportsRead: true,
    supportsWrite: true,
    requiredWriteFields: ['title', 'content'],
  },
  {
    id: 'permissions',
    label: 'Phân quyền',
    readPath: '/api/v1/permissions',
    updatePath: '/api/v1/permissions/:id',
    supportsRead: true,
    supportsWrite: true,
    isCriticalAdmin: true,
    requiredWriteFields: ['role', 'permissions'],
  },
  {
    id: 'notifications',
    label: 'Thông báo',
    readPath: '/api/v1/notifications',
    createPath: '/api/v1/notifications',
    updatePath: '/api/v1/notifications/:id/read',
    supportsRead: true,
    supportsWrite: true,
    requiredWriteFields: ['title'],
  },
  {
    id: 'settings',
    label: 'Cài đặt',
    readPath: '/api/v1/settings',
    updatePath: '/api/v1/settings',
    supportsRead: true,
    supportsWrite: true,
    isCriticalAdmin: true,
    requiredWriteFields: [],
  },
];

export const HUBCW_MODULE_MAP: Record<HubCwModuleId, HubCwModuleEndpointConfig> =
  HUBCW_MODULES.reduce((acc, m) => {
    acc[m.id] = m;
    return acc;
  }, {} as Record<HubCwModuleId, HubCwModuleEndpointConfig>);

export const HUBCW_UNCLEAR_MODULES: HubCwModuleId[] = ['golden_pig', 'automation', 'resources'];

export const HUBCW_AUTH_HEADERS = {
  authType: 'Bearer',
  tokenHeader: 'Authorization',
  agentIdHeader: 'X-Agent-Id',
  requestIdHeader: 'X-Agent-Request-Id',
  idempotencyHeader: 'Idempotency-Key',
  extraHeaders: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
};

export function createEmptyHubCwPermissions(): Record<HubCwModuleId, HubCwModulePermissionFlag> {
  const perms = {} as Record<HubCwModuleId, HubCwModulePermissionFlag>;
  for (const mod of HUBCW_MODULES) {
    perms[mod.id] = { read: false, write: false };
  }
  return perms;
}

/**
 * Least-privilege default HubCW permissions per department/role/template.
 * Never grants write access to critical CEO-only modules (permissions, settings, users create/delete, wallet)
 * or unclear modules by default.
 */
export function buildDefaultHubCwPermissions(
  department: DepartmentId,
  role: RoleType,
  title = ''
): Record<HubCwModuleId, HubCwModulePermissionFlag> {
  const perms = createEmptyHubCwPermissions();
  const lowerTitle = title.toLowerCase();

  // Base read for tasks, notifications, documents, products
  perms.tasks = { read: true, write: role !== 'Read-only' };
  perms.notifications = { read: true, write: false };
  perms.documents = { read: true, write: role !== 'Read-only' };
  perms.products = { read: true, write: false };

  if (department === 'sales' || lowerTitle.includes('sales') || lowerTitle.includes('kinh doanh') || lowerTitle.includes('chốt đơn')) {
    perms.customers = { read: true, write: true };
    perms.orders = { read: true, write: true };
    perms.licenses = { read: true, write: role === 'Dept Head' || role === 'Exec' };
    perms.reports = { read: true, write: false };
    perms.dashboard = { read: true, write: false };
  }

  if (department === 'cs' || lowerTitle.includes('chăm sóc') || lowerTitle.includes('support') || lowerTitle.includes('triển khai')) {
    perms.support = { read: true, write: true };
    perms.customers = { read: true, write: true };
    perms.licenses = { read: true, write: true };
    perms.orders = { read: true, write: false };
  }

  if (department === 'marketing') {
    perms.documents = { read: true, write: true };
    perms.customers = { read: true, write: false };
    perms.products = { read: true, write: role === 'Dept Head' };
    perms.accounts = { read: true, write: false };
    perms.reports = { read: true, write: false };
  }

  if (department === 'product' || lowerTitle.includes('tech') || lowerTitle.includes('kỹ thuật')) {
    perms.products = { read: true, write: true };
    perms.licenses = { read: true, write: true };
    perms.support = { read: true, write: true };
    perms.resources = { read: true, write: false }; // unclear write locked by default
    perms.automation = { read: true, write: false };
  }

  if (department === 'data' || lowerTitle.includes('phân tích') || lowerTitle.includes('báo cáo')) {
    perms.dashboard = { read: true, write: false };
    perms.reports = { read: true, write: false };
    perms.customers = { read: true, write: false };
    perms.orders = { read: true, write: false };
    perms.cashflow = { read: true, write: false };
  }

  if (department === 'backoffice' || lowerTitle.includes('kế toán') || lowerTitle.includes('tài chính')) {
    if (lowerTitle.includes('kế toán') || lowerTitle.includes('tài chính')) {
      perms.cashflow = { read: true, write: true };
      perms.orders = { read: true, write: false };
      perms.wallet = { read: true, write: false }; // CEO-critical write
      perms.reports = { read: true, write: false };
      perms.golden_pig = { read: true, write: false };
    }
    if (lowerTitle.includes('nhân sự') || lowerTitle.includes('hr')) {
      perms.users = { read: true, write: false }; // creating/deleting users requires CEO approval
    }
  }

  if (department === 'exec' || department === 'reception' || role === 'Exec') {
    perms.dashboard = { read: true, write: false };
    perms.reports = { read: true, write: false };
    perms.customers = { read: true, write: false };
    perms.orders = { read: true, write: false };
    perms.tasks = { read: true, write: true };
    perms.notifications = { read: true, write: true };
  }

  if (role === 'CEO') {
    for (const mod of HUBCW_MODULES) {
      perms[mod.id] = { read: true, write: mod.supportsWrite };
    }
  }

  return perms;
}

/**
 * Operations that are hard-blocked or require explicit CEO approval even for privileged agents.
 */
export function isCriticalOrCeoOnlyOp(
  module: HubCwModuleId,
  operation: 'create' | 'update' | 'delete'
): { blockedAlways: boolean; requiresCeoApproval: boolean; reason?: string } {
  if (operation === 'delete') {
    return {
      blockedAlways: true,
      requiresCeoApproval: true,
      reason: `Lệnh XÓA (${module}) bị khóa cứng đối với AI Agent. Chỉ CEO thao tác trực tiếp trên phần mềm.`,
    };
  }
  if (module === 'permissions' || module === 'settings') {
    return {
      blockedAlways: true,
      requiresCeoApproval: true,
      reason: `Module '${HUBCW_MODULE_MAP[module].label}' thuộc quyền tối cao CEO, AI Agent không được phép ghi.`,
    };
  }
  if (module === 'users' && (operation === 'create' || operation === 'update')) {
    return {
      blockedAlways: false,
      requiresCeoApproval: true,
      reason: `Tạo/sửa phân quyền Người dùng trên HubCW yêu cầu phê duyệt CEO.`,
    };
  }
  if (module === 'wallet') {
    return {
      blockedAlways: false,
      requiresCeoApproval: true,
      reason: `Biến động Ví / rút-chuyển tiền yêu cầu phiếu chi đã duyệt (#CP-xxx) & xác nhận CEO.`,
    };
  }
  return { blockedAlways: false, requiresCeoApproval: false };
}

/**
 * Mask PII (Vietnam phone numbers, emails) before including customer records in LLM prompts.
 * Full unmasked contact details remain only in HubCW / CRM state for authorized execution tools.
 */
export function maskCustomerPiiForPrompt(input: string): string {
  if (!input) return '';
  // Mask VN mobile numbers like 0912345678 or +84912345678
  let masked = input.replace(/(\+?84|0)(3|5|7|8|9)\d{8}\b/g, (match) => {
    return `${match.slice(0, 4)}****${match.slice(-2)}`;
  });
  // Mask emails like user@domain.com -> us***@domain.com
  masked = masked.replace(/\b([a-zA-Z0-9._%+-]{1,})@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, (_, user, domain) => {
    const prefix = user.length > 2 ? user.slice(0, 2) : user.slice(0, 1);
    return `${prefix}***@${domain}`;
  });
  return masked;
}
