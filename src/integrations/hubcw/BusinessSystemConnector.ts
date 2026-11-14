import {
  HubCwConnectionMode,
  HubCwModuleHealth,
  HubCwModuleId,
  OriginTag,
} from '../../types';
import { DEFAULT_HUBCW_BASE_URL, HUBCW_MODULE_MAP, HUBCW_MODULES } from './hubcw.config';

export interface HubCwAgentContext {
  agentId: string;
  agentName: string;
  externalUserId?: string;
  credentialSecret?: string; // decrypted on demand strictly inside runtime for THIS agent only
  requestId: string;
  idempotencyKey?: string;
}

export interface HubCwReadResult<T = Record<string, unknown>> {
  ok: boolean;
  module: HubCwModuleId;
  mode: HubCwConnectionMode;
  origin: OriginTag;
  items: T[];
  total?: number;
  statusCode?: number;
  fetchedAt: number;
  error?: string;
  sourceLabel: string;
}

export interface HubCwWriteResult {
  ok: boolean;
  module: HubCwModuleId;
  mode: HubCwConnectionMode;
  origin: OriginTag;
  externalRecordId?: string;
  version?: string | number;
  beforeData?: Record<string, unknown> | null;
  data?: Record<string, unknown>;
  statusCode?: number;
  needsCeoAuth?: boolean;
  ceoPrompt?: string;
  error?: string;
  durationMs: number;
}

export interface BusinessSystemConnector {
  readonly mode: HubCwConnectionMode;
  readonly baseUrl: string;
  testConnection(ctx: HubCwAgentContext): Promise<{
    ok: boolean;
    statusCode?: number;
    latencyMs: number;
    message: string;
    externalUserId?: string;
  }>;
  checkModuleHealth(ctx: HubCwAgentContext, module: HubCwModuleId): Promise<HubCwModuleHealth>;
  readModule(
    ctx: HubCwAgentContext,
    module: HubCwModuleId,
    query?: Record<string, string | number | boolean>
  ): Promise<HubCwReadResult>;
  writeModule(
    ctx: HubCwAgentContext,
    module: HubCwModuleId,
    operation: 'create' | 'update' | 'delete',
    payload: Record<string, unknown>,
    recordId?: string
  ): Promise<HubCwWriteResult>;
}

const SANDBOX_FIXTURES: Partial<Record<HubCwModuleId, Array<Record<string, unknown>>>> = {
  dashboard: [
    {
      id: 'sim_dash_1',
      label: 'Dữ liệu mẫu Sandbox',
      activeCustomers: 4,
      openOrders: 2,
      revenueMonthVnd: 0,
      note: 'Sandbox - chưa nối phần mềm thật',
      origin: 'simulated',
    },
  ],
  customers: [
    {
      id: 'sim_cust_1',
      name: '[MÔ PHỎNG] Trung tâm Anh ngữ Sunrise',
      email: 'contact@sunrise-demo.local',
      phone: '0911000001',
      status: 'active',
      origin: 'simulated',
    },
    {
      id: 'sim_cust_2',
      name: '[MÔ PHỎNG] Trường Mầm non Hoa Mai',
      email: 'info@hoamai-demo.local',
      phone: '0911000002',
      status: 'lead',
      origin: 'simulated',
    },
  ],
  orders: [
    {
      id: 'sim_ord_1',
      orderCode: 'ORD-SIM-001',
      customerName: '[MÔ PHỎNG] Trung tâm Anh ngữ Sunrise',
      amountVnd: 9900000,
      status: 'pending',
      origin: 'simulated',
    },
  ],
  cashflow: [
    {
      id: 'sim_cf_1',
      direction: 'in',
      amountVnd: 9900000,
      description: '[MÔ PHỎNG] Thu mẫu Sandbox',
      date: new Date().toISOString().slice(0, 10),
      origin: 'simulated',
    },
  ],
  tasks: [],
  support: [],
  reports: [],
  notifications: [],
};

export class SandboxHubCwAdapter implements BusinessSystemConnector {
  readonly mode: HubCwConnectionMode = 'sandbox';
  readonly baseUrl: string;

  constructor(baseUrl = DEFAULT_HUBCW_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async testConnection(ctx: HubCwAgentContext) {
    return {
      ok: true,
      statusCode: 200,
      latencyMs: 12,
      message: `Sandbox sẵn sàng cho ${ctx.agentName} (chưa nối phần mềm thật).`,
      externalUserId: ctx.externalUserId || `sim_${ctx.agentId}`,
    };
  }

  async checkModuleHealth(_ctx: HubCwAgentContext, module: HubCwModuleId): Promise<HubCwModuleHealth> {
    const cfg = HUBCW_MODULE_MAP[module];
    return {
      moduleId: module,
      status: cfg.supportsRead ? 'ok' : 'unsupported',
      latencyMs: 8,
      lastCheckedAt: Date.now(),
      message: 'Sandbox - chưa nối phần mềm thật',
    };
  }

  async readModule(_ctx: HubCwAgentContext, module: HubCwModuleId): Promise<HubCwReadResult> {
    const items = (SANDBOX_FIXTURES[module] || []).map((item) => ({
      ...item,
      origin: 'simulated' as const,
    }));
    return {
      ok: true,
      module,
      mode: 'sandbox',
      origin: 'simulated',
      items,
      total: items.length,
      statusCode: 200,
      fetchedAt: Date.now(),
      sourceLabel: 'Sandbox - chưa nối phần mềm thật',
    };
  }

  async writeModule(
    ctx: HubCwAgentContext,
    module: HubCwModuleId,
    operation: 'create' | 'update' | 'delete',
    payload: Record<string, unknown>,
    recordId?: string
  ): Promise<HubCwWriteResult> {
    const started = Date.now();
    const externalRecordId = recordId || `sim_${module}_${Date.now()}`;
    return {
      ok: true,
      module,
      mode: 'sandbox',
      origin: 'simulated',
      externalRecordId,
      version: 1,
      beforeData: operation === 'update' ? { id: externalRecordId } : null,
      data: {
        ...payload,
        id: externalRecordId,
        origin: 'simulated',
        created_by_agent: ctx.agentId,
        agent_request_id: ctx.requestId,
      },
      statusCode: 200,
      durationMs: Date.now() - started,
    };
  }
}

export class ApiHubCwAdapter implements BusinessSystemConnector {
  readonly mode: HubCwConnectionMode = 'api';
  readonly baseUrl: string;

  constructor(baseUrl = DEFAULT_HUBCW_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private async callProxy(
    ctx: HubCwAgentContext,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>
  ): Promise<{ ok: boolean; status: number; data: Record<string, unknown>; error?: string; latencyMs: number }> {
    const started = Date.now();
    try {
      const targetUrl = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
      const res = await fetch('/api/hubcw/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: this.baseUrl,
          url: targetUrl,
          method,
          token: ctx.credentialSecret,
          agentId: ctx.agentId,
          externalUserId: ctx.externalUserId,
          requestId: ctx.requestId,
          idempotencyKey: ctx.idempotencyKey,
          payload: body,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return {
        ok: res.ok && json.ok !== false,
        status: typeof json.upstreamStatus === 'number' ? json.upstreamStatus : res.status,
        data: json,
        error: typeof json.error === 'string' ? json.error : undefined,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        data: {},
        error: err instanceof Error ? err.message : 'Lỗi kết nối proxy HubCW',
        latencyMs: Date.now() - started,
      };
    }
  }

  async testConnection(ctx: HubCwAgentContext) {
    if (!ctx.credentialSecret) {
      return {
        ok: false,
        statusCode: 401,
        latencyMs: 0,
        message: `Agent ${ctx.agentName} chưa liên kết tài khoản/token HubCW.`,
      };
    }
    const probe = await this.callProxy(ctx, 'GET', '/api/v1/auth/me');
    if (probe.ok) {
      return {
        ok: true,
        statusCode: probe.status,
        latencyMs: probe.latencyMs,
        message: 'Kết nối API Hub.ChuyenWeb thành công.',
        externalUserId:
          typeof probe.data?.id === 'string'
            ? probe.data.id
            : typeof (probe.data?.data as Record<string, unknown> | undefined)?.id === 'string'
              ? String((probe.data.data as Record<string, unknown>).id)
              : ctx.externalUserId,
      };
    }
    return {
      ok: false,
      statusCode: probe.status,
      latencyMs: probe.latencyMs,
      message: probe.error || `HTTP ${probe.status} khi kiểm tra /api/v1/auth/me`,
    };
  }

  async checkModuleHealth(ctx: HubCwAgentContext, module: HubCwModuleId): Promise<HubCwModuleHealth> {
    const cfg = HUBCW_MODULE_MAP[module];
    if (!cfg) {
      return { moduleId: module, status: 'unsupported', lastCheckedAt: Date.now() };
    }
    const res = await this.callProxy(ctx, 'GET', cfg.readPath);
    if (res.ok) {
      return {
        moduleId: module,
        status: 'ok',
        latencyMs: res.latencyMs,
        lastCheckedAt: Date.now(),
        message: `HTTP ${res.status}`,
      };
    }
    if (res.status === 404 || res.status === 501) {
      return {
        moduleId: module,
        status: 'unsupported',
        latencyMs: res.latencyMs,
        lastCheckedAt: Date.now(),
        message: `HTTP ${res.status} — Kiểm tra HUBCW_API_MAP.md`,
      };
    }
    return {
      moduleId: module,
      status: 'error',
      latencyMs: res.latencyMs,
      lastCheckedAt: Date.now(),
      message: res.error || `HTTP ${res.status}`,
    };
  }

  async readModule(
    ctx: HubCwAgentContext,
    module: HubCwModuleId,
    query?: Record<string, string | number | boolean>
  ): Promise<HubCwReadResult> {
    const cfg = HUBCW_MODULE_MAP[module];
    if (!cfg || !cfg.supportsRead) {
      return {
        ok: false,
        module,
        mode: 'api',
        origin: 'hubcw_live',
        items: [],
        fetchedAt: Date.now(),
        error: `Module ${module} không hỗ trợ đọc.`,
        sourceLabel: `${this.baseUrl} (${module})`,
      };
    }
    const qs = query
      ? '?' +
        Object.entries(query)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    const res = await this.callProxy(ctx, 'GET', `${cfg.readPath}${qs}`);
    const rawItems = Array.isArray(res.data?.items)
      ? res.data.items
      : Array.isArray(res.data?.data)
        ? res.data.data
        : res.data?.data && typeof res.data.data === 'object'
          ? [res.data.data]
          : [];
    return {
      ok: res.ok,
      module,
      mode: 'api',
      origin: 'hubcw_live',
      items: rawItems as Array<Record<string, unknown>>,
      total: typeof res.data?.total === 'number' ? res.data.total : rawItems.length,
      statusCode: res.status,
      fetchedAt: Date.now(),
      error: res.ok ? undefined : res.error || `HTTP ${res.status}`,
      sourceLabel: `${this.baseUrl}${cfg.readPath}`,
    };
  }

  async writeModule(
    ctx: HubCwAgentContext,
    module: HubCwModuleId,
    operation: 'create' | 'update' | 'delete',
    payload: Record<string, unknown>,
    recordId?: string
  ): Promise<HubCwWriteResult> {
    const started = Date.now();
    const cfg = HUBCW_MODULE_MAP[module];
    let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
    let path = cfg.createPath || cfg.readPath;
    let beforeData: Record<string, unknown> | null = null;

    if (operation === 'update') {
      method = 'PUT';
      if (!cfg.updatePath || !recordId) {
        return {
          ok: false,
          module,
          mode: 'api',
          origin: 'hubcw_live',
          error: `Thiếu updatePath hoặc recordId cho thao tác cập nhật '${module}'.`,
          durationMs: Date.now() - started,
        };
      }
      path = cfg.updatePath.replace(':id', encodeURIComponent(recordId));
      // Fetch pre-image snapshot for Undo before writing
      const pre = await this.callProxy(ctx, 'GET', path);
      if (pre.ok && pre.data?.data && typeof pre.data.data === 'object') {
        beforeData = pre.data.data as Record<string, unknown>;
      }
    } else if (operation === 'delete') {
      method = 'DELETE';
      path = (cfg.deletePath || `${cfg.readPath}/:id`).replace(':id', encodeURIComponent(recordId || ''));
    }

    const res = await this.callProxy(ctx, method, path, payload);
    const dataObj = (res.data?.data && typeof res.data.data === 'object' ? res.data.data : res.data) as Record<
      string,
      unknown
    >;
    const extId =
      typeof dataObj?.id === 'string'
        ? dataObj.id
        : typeof dataObj?.id === 'number'
          ? String(dataObj.id)
          : recordId;

    return {
      ok: res.ok && Boolean(extId),
      module,
      mode: 'api',
      origin: 'hubcw_live',
      externalRecordId: extId,
      version: (dataObj?.version as string | number | undefined) || Date.now(),
      beforeData,
      data: dataObj,
      statusCode: res.status,
      error: res.ok
        ? extId
          ? undefined
          : 'Server trả về HTTP OK nhưng thiếu externalRecordId xác nhận.'
        : res.error || `HTTP ${res.status}`,
      durationMs: Date.now() - started,
    };
  }
}

export class BrowserHubCwAdapter implements BusinessSystemConnector {
  readonly mode: HubCwConnectionMode = 'browser';
  readonly baseUrl: string;

  constructor(baseUrl = DEFAULT_HUBCW_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async testConnection(ctx: HubCwAgentContext) {
    const started = Date.now();
    try {
      const res = await fetch('/api/worker/status');
      if (!res.ok) {
        return {
          ok: false,
          statusCode: res.status,
          latencyMs: Date.now() - started,
          message: `Worker Playwright chưa sẵn sàng để mở phiên ${ctx.agentName}.`,
        };
      }
      return {
        ok: true,
        statusCode: 200,
        latencyMs: Date.now() - started,
        message: `Chế độ Browser Playwright sẵn sàng (profile riêng: worker-sessions/hubcw-${ctx.agentId}).`,
      };
    } catch {
      return {
        ok: false,
        statusCode: 0,
        latencyMs: Date.now() - started,
        message: 'Không kết nối được Worker Playwright. Kiểm tra /worker hoặc chuyển sang chế độ API.',
      };
    }
  }

  async checkModuleHealth(_ctx: HubCwAgentContext, module: HubCwModuleId): Promise<HubCwModuleHealth> {
    const cfg = HUBCW_MODULE_MAP[module];
    return {
      moduleId: module,
      status: cfg?.supportsRead ? 'untested' : 'unsupported',
      lastCheckedAt: Date.now(),
      message: 'Kiểm tra qua Worker Playwright (yêu cầu chạy /worker)',
    };
  }

  async readModule(ctx: HubCwAgentContext, module: HubCwModuleId): Promise<HubCwReadResult> {
    return {
      ok: false,
      module,
      mode: 'browser',
      origin: 'hubcw_live',
      items: [],
      fetchedAt: Date.now(),
      error: `Chế độ Browser cần /worker chạy phiên Playwright riêng của ${ctx.agentName} (hồ sơ ${ctx.agentId}).`,
      sourceLabel: `${this.baseUrl} [Browser:${ctx.agentId}]`,
    };
  }

  async writeModule(
    ctx: HubCwAgentContext,
    module: HubCwModuleId,
    _operation: 'create' | 'update' | 'delete',
    _payload: Record<string, unknown>
  ): Promise<HubCwWriteResult> {
    return {
      ok: false,
      module,
      mode: 'browser',
      origin: 'hubcw_live',
      needsCeoAuth: true,
      ceoPrompt: `Worker Playwright (${ctx.agentName}) cần xác nhận phiên đăng nhập hoặc OTP/CAPTCHA trên ${this.baseUrl} để ghi '${module}'.`,
      error: 'Worker Playwright chưa có phiên xác thực hoạt động.',
      durationMs: 0,
    };
  }
}

export function createHubCwConnector(
  mode: HubCwConnectionMode,
  baseUrl = DEFAULT_HUBCW_BASE_URL
): BusinessSystemConnector {
  if (mode === 'api') return new ApiHubCwAdapter(baseUrl);
  if (mode === 'browser') return new BrowserHubCwAdapter(baseUrl);
  return new SandboxHubCwAdapter(baseUrl);
}

export function getAllHubCwModuleIds(): HubCwModuleId[] {
  return HUBCW_MODULES.map((m) => m.id);
}
