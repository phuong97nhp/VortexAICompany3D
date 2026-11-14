import assert from 'node:assert/strict';
import {
  detectAntiHallucinationIssues,
  executeHubCwWrite,
  revertHubCwSnapshot,
  validateHubCwWrite,
  WriteGateRuntimeDeps,
} from './writeGate';
import {
  BusinessSystemConnector,
  HubCwAgentContext,
  HubCwReadResult,
  HubCwWriteResult,
} from './BusinessSystemConnector';
import { buildDefaultHubCwPermissions } from './hubcw.config';
import {
  AgentAccount,
  AgentExternalAccount,
  AuditLogEntry,
  CompanySettings,
  ExpenseItem,
  HubCwApiLog,
  HubCwModuleId,
  HubCwUndoSnapshot,
} from '../../types';
import { createDefaultSpendingPolicy } from '../../engine/expenseEngine';
import { buildFallbackBaseSettings } from '../../db/schemaMigration';

// Mock BusinessSystemConnector capturing payloads for verification
class MockLiveConnector implements BusinessSystemConnector {
  readonly mode = 'api' as const;
  readonly baseUrl = 'https://staging.hub.chuyenweb.com';
  public writeCalls: Array<{
    ctx: HubCwAgentContext;
    module: HubCwModuleId;
    operation: 'create' | 'update' | 'delete';
    payload: Record<string, unknown>;
    recordId?: string;
  }> = [];

  async testConnection(ctx: HubCwAgentContext) {
    return { ok: true, statusCode: 200, latencyMs: 5, message: 'OK', externalUserId: ctx.externalUserId };
  }

  async checkModuleHealth(_ctx: HubCwAgentContext, module: HubCwModuleId) {
    return { moduleId: module, status: 'ok' as const, latencyMs: 5, lastCheckedAt: Date.now() };
  }

  async readModule(_ctx: HubCwAgentContext, module: HubCwModuleId): Promise<HubCwReadResult> {
    return {
      ok: true,
      module,
      mode: 'api',
      origin: 'hubcw_live',
      items: [],
      fetchedAt: Date.now(),
      sourceLabel: this.baseUrl,
    };
  }

  async writeModule(
    ctx: HubCwAgentContext,
    module: HubCwModuleId,
    operation: 'create' | 'update' | 'delete',
    payload: Record<string, unknown>,
    recordId?: string
  ): Promise<HubCwWriteResult> {
    this.writeCalls.push({ ctx, module, operation, payload, recordId });
    const extId = recordId || `hcw_${module}_9001`;
    return {
      ok: true,
      module,
      mode: 'api',
      origin: 'hubcw_live',
      externalRecordId: extId,
      version: 2,
      beforeData: operation === 'update' ? { id: extId, name: 'Trước khi sửa' } : null,
      data: { ...payload, id: extId },
      statusCode: 200,
      durationMs: 10,
    };
  }
}

function makeBaseSettings(overrides: Partial<CompanySettings> = {}): CompanySettings {
  const base = buildFallbackBaseSettings();
  return {
    ...base,
    id: 'default',
    companyName: 'Chuyên Web',
    primaryProvider: 'gemini',
    fallbackProvider: 'mock',
    dryRun: false,
    autonomyLevel: 2,
    autopilotDailyLeadTarget: 10,
    priorityProductId: 'edu-center',
    ceoPasswordHash: 'hash',
    ceoPasswordSalt: 'salt',
    mustChangeDefaultPassword: false,
    spendingPolicy: createDefaultSpendingPolicy(),
    envMode: 'live',
    hubcw: {
      baseUrl: 'https://staging.hub.chuyenweb.com',
      connectionMode: 'api',
      hourlyWriteLimit: 40,
      requireApprovalForCritical: true,
      unclearWriteUnlocked: { golden_pig: false, automation: false, resources: false },
      moduleHealth: {},
    },
    ...overrides,
  };
}

function makeDeps(overrides: Partial<WriteGateRuntimeDeps> = {}): WriteGateRuntimeDeps & {
  connector: MockLiveConnector;
  logs: HubCwApiLog[];
  audits: AuditLogEntry[];
  snapshots: HubCwUndoSnapshot[];
} {
  const { connector: overrideConnector, ...restOverrides } = overrides;
  const connector: MockLiveConnector = (overrideConnector as MockLiveConnector) || new MockLiveConnector();
  const logs: HubCwApiLog[] = [];
  const audits: AuditLogEntry[] = [];
  const snapshots: HubCwUndoSnapshot[] = [];

  const rbacAccount: AgentAccount = {
    agentId: 'ae_lead',
    username: 'ae_lead',
    internalEmail: 'ae@chuyenweb.com',
    role: 'Specialist',
    department: 'sales',
    status: 'active',
    tokenHash: 'sha256_x',
    permissions: ['hubcw:read', 'hubcw:write'],
    lastActiveAt: Date.now(),
  };

  const externalAccount: AgentExternalAccount = {
    agentId: 'ae_lead',
    system: 'hubcw',
    externalUserId: 'hcw_u_12',
    username: 'minh.ae',
    email: 'minh@chuyenweb.com',
    externalRole: 'Sales',
    externalPermissions: {
      ...buildDefaultHubCwPermissions('sales', 'Specialist', 'Sales'),
      cashflow: { read: true, write: true },
      golden_pig: { read: true, write: true },
    },
    status: 'active',
  };

  const approvedExpense: ExpenseItem = {
    id: 'exp_real_1',
    expenseCode: '#CP-777',
    requesterId: 'ae_lead',
    department: 'sales',
    projectOrCampaign: 'Triển khai khách mới',
    category: 'Phần mềm & Công cụ',
    title: 'Thanh toán gói thiết lập tên miền khách hàng',
    amountVnd: 1_250_000,
    frequency: 'once',
    justification: 'Khách hàng xác nhận hợp đồng thật',
    expectedRoi: 'Thu 12.500.000đ',
    vendor: 'VNNIC / Cloudflare',
    dueDate: new Date().toISOString().slice(0, 10),
    status: 'approved',
    flags: [],
    simulated: false,
    origin: 'user_verified',
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return {
    settings: makeBaseSettings(),
    rbacAccount,
    externalAccount,
    decryptedSecret: 'real_token_secret_123',
    expenses: [approvedExpense],
    recentApiLogs: [],
    connector,
    logs,
    audits,
    snapshots,
    onWriteLog: (l) => {
      logs.push(l);
    },
    onWriteAudit: (a) => {
      audits.push(a);
    },
    onSaveUndoSnapshot: (s) => {
      snapshots.push(s);
    },
    ...restOverrides,
  };
}

async function runTests() {
  console.log('--- Bắt đầu chạy Unit Test Cổng Kiểm Soát Dữ Liệu Thật (Write Gate) ---');

  // TEST 1: Hard-block origin='simulated' (including copied/edited payloads or simulated expense)
  {
    const deps = makeDeps();
    const res1 = validateHubCwWrite(
      {
        agentId: 'ae_lead',
        agentName: 'Nguyễn Văn Minh',
        module: 'customers',
        operation: 'create',
        origin: 'simulated',
        provenance: { source: 'user_input', origin: 'user_verified' },
        payload: { name: 'Trung tâm Ngoại ngữ Hòa Bình', phone: '0912345678' },
      },
      deps
    );
    assert.equal(res1.allowed, false);
    assert.equal(res1.blockedCode, 'SIMULATED_ORIGIN_BLOCKED');

    const res2 = validateHubCwWrite(
      {
        agentId: 'ae_lead',
        agentName: 'Nguyễn Văn Minh',
        module: 'customers',
        operation: 'create',
        provenance: { source: 'user_input', origin: 'simulated' },
        payload: { name: 'Trung tâm Ngoại ngữ Hòa Bình' },
      },
      deps
    );
    assert.equal(res2.allowed, false);
    assert.equal(res2.blockedCode, 'SIMULATED_ORIGIN_BLOCKED');
    console.log('PASS [1] Chặn cứng bản ghi origin="simulated"');
  }

  // TEST 2: Reject missing / invalid provenance (llm_generated, estimated, unknown, incomplete calculation)
  {
    const deps = makeDeps();
    const missingProv = validateHubCwWrite(
      {
        agentId: 'ae_lead',
        agentName: 'Minh AE',
        module: 'customers',
        operation: 'create',
        payload: { name: 'Trung tâm Anh ngữ Sao Mai', phone: '0918223344' },
      },
      deps
    );
    assert.equal(missingProv.allowed, false);
    assert.equal(missingProv.blockedCode, 'INVALID_PROVENANCE');

    for (const badSrc of ['llm_generated', 'estimated', 'unknown'] as const) {
      const bad = validateHubCwWrite(
        {
          agentId: 'ae_lead',
          agentName: 'Minh AE',
          module: 'customers',
          operation: 'create',
          provenance: { source: badSrc },
          payload: { name: 'Trung tâm Anh ngữ Sao Mai', phone: '0918223344' },
        },
        deps
      );
      assert.equal(bad.allowed, false);
      assert.equal(bad.blockedCode, 'INVALID_PROVENANCE');
    }

    const badCalc = validateHubCwWrite(
      {
        agentId: 'ae_lead',
        agentName: 'Minh AE',
        module: 'customers',
        operation: 'create',
        provenance: { source: 'calculation' },
        payload: { name: 'Trung tâm Anh ngữ Sao Mai' },
      },
      deps
    );
    assert.equal(badCalc.allowed, false);
    assert.equal(badCalc.blockedCode, 'INVALID_PROVENANCE');
    console.log('PASS [2] Từ chối thiếu provenance hoặc llm_generated / estimated / unknown');
  }

  // TEST 3: Anti-hallucination detector (fake phones, fake emails, fake names, bad dates, mismatched totals)
  {
    assert.ok(detectAntiHallucinationIssues('customers', { name: 'Nguyễn Văn A' }));
    assert.ok(detectAntiHallucinationIssues('customers', { name: 'Công ty ABC' }));
    assert.ok(detectAntiHallucinationIssues('customers', { name: 'Khách thật', phone: '0900000000' }));
    assert.ok(detectAntiHallucinationIssues('customers', { name: 'Khách thật', phone: '0123456789' }));
    assert.ok(detectAntiHallucinationIssues('customers', { name: 'Khách thật', email: 'test@example.com' }));
    assert.ok(detectAntiHallucinationIssues('tasks', { title: 'Việc thật', dueDate: '2035-01-01' }));
    assert.ok(
      detectAntiHallucinationIssues('orders', {
        customerId: 'c1',
        quantity: 3,
        unitPriceVnd: 1000000,
        amountVnd: 2500000,
      })
    );

    const deps = makeDeps();
    const resFake = validateHubCwWrite(
      {
        agentId: 'ae_lead',
        agentName: 'Minh AE',
        module: 'customers',
        operation: 'create',
        provenance: { source: 'user_input', verifiedBy: 'ceo' },
        payload: { name: 'Công ty ABC', phone: '0900000000', email: 'test@example.com' },
      },
      deps
    );
    assert.equal(resFake.allowed, false);
    assert.equal(resFake.blockedCode, 'ANTI_HALLUCINATION_BLOCKED');
    console.log('PASS [3] Anti-hallucination chặn SĐT/email/tên giả, ngày sai & tổng tiền lệch');
  }

  // TEST 4: Financial writes require approved/paid #CP-xxx matching amount
  {
    const deps = makeDeps();
    const noCp = validateHubCwWrite(
      {
        agentId: 'ae_lead',
        agentName: 'Minh AE',
        module: 'cashflow',
        operation: 'create',
        provenance: { source: 'external_document', refId: 'HD-991' },
        payload: { direction: 'out', amountVnd: 1_250_000, description: 'Chi tên miền' },
      },
      deps
    );
    assert.equal(noCp.allowed, false);
    assert.equal(noCp.blockedCode, 'EXPENSE_NOT_APPROVED');

    const mismatchAmt = validateHubCwWrite(
      {
        agentId: 'ae_lead',
        agentName: 'Minh AE',
        module: 'cashflow',
        operation: 'create',
        expenseCode: '#CP-777',
        provenance: { source: 'external_document', refId: 'HD-991' },
        payload: { direction: 'out', amountVnd: 9_999_000, description: 'Chi sai số tiền' },
      },
      deps
    );
    assert.equal(mismatchAmt.allowed, false);
    assert.equal(mismatchAmt.blockedCode, 'CROSS_VERIFY_FAILED');
    console.log('PASS [4] Chặn ghi tài chính thiếu phiếu #CP-xxx đã duyệt hoặc lệch số tiền');
  }

  // TEST 5: Cross-verification failures (update missing recordId, missing remote hubcw_record refId)
  {
    const deps = makeDeps();
    const noRecId = validateHubCwWrite(
      {
        agentId: 'ae_lead',
        agentName: 'Minh AE',
        module: 'customers',
        operation: 'update',
        provenance: { source: 'user_input' },
        payload: { name: 'Trung tâm Anh ngữ Ánh Dương' },
      },
      deps
    );
    assert.equal(noRecId.allowed, false);
    assert.equal(noRecId.blockedCode, 'CROSS_VERIFY_FAILED');

    const missingRemote = validateHubCwWrite(
      {
        agentId: 'ae_lead',
        agentName: 'Minh AE',
        module: 'customers',
        operation: 'create',
        existingHubCwRecordIds: ['hcw_1', 'hcw_2'],
        provenance: { source: 'hubcw_record', refId: 'hcw_999_not_exist' },
        payload: { name: 'Trung tâm Anh ngữ Ánh Dương' },
      },
      deps
    );
    assert.equal(missingRemote.allowed, false);
    assert.equal(missingRemote.blockedCode, 'CROSS_VERIFY_FAILED');
    console.log('PASS [5] Chặn lỗi đối chiếu chéo (thiếu recordId / thiếu refId trên HubCW)');
  }

  // TEST 6: Environment, Kill Switch, Unlinked Account, Unclear Module Lock & Permission Checks
  {
    // Sandbox / Read-only
    for (const envMode of ['sandbox', 'read_only'] as const) {
      const deps = makeDeps({ settings: makeBaseSettings({ envMode }) });
      const res = validateHubCwWrite(
        {
          agentId: 'ae_lead',
          agentName: 'Minh AE',
          module: 'customers',
          operation: 'create',
          provenance: { source: 'user_input' },
          payload: { name: 'Trường Mầm non Bình Minh' },
        },
        deps
      );
      assert.equal(res.allowed, false);
      assert.equal(res.blockedCode, 'NOT_LIVE_ENV');
    }

    // Kill Switch
    {
      const deps = makeDeps({ settings: makeBaseSettings({ killSwitchActive: true }) });
      const res = validateHubCwWrite(
        {
          agentId: 'ae_lead',
          agentName: 'Minh AE',
          module: 'customers',
          operation: 'create',
          provenance: { source: 'user_input' },
          payload: { name: 'Trường Mầm non Bình Minh' },
        },
        deps
      );
      assert.equal(res.allowed, false);
      assert.equal(res.blockedCode, 'KILL_SWITCH_ACTIVE');
    }

    // Unlinked account
    {
      const deps = makeDeps({
        externalAccount: {
          agentId: 'ae_lead',
          system: 'hubcw',
          externalPermissions: buildDefaultHubCwPermissions('sales', 'Specialist'),
          status: 'unlinked',
        },
      });
      const res = validateHubCwWrite(
        {
          agentId: 'ae_lead',
          agentName: 'Minh AE',
          module: 'customers',
          operation: 'create',
          provenance: { source: 'user_input' },
          payload: { name: 'Trường Mầm non Bình Minh' },
        },
        deps
      );
      assert.equal(res.allowed, false);
      assert.equal(res.blockedCode, 'UNLINKED_OR_INACTIVE_ACCOUNT');
    }

    // Unclear module locked (golden_pig)
    {
      const deps = makeDeps();
      const res = validateHubCwWrite(
        {
          agentId: 'ae_lead',
          agentName: 'Minh AE',
          module: 'golden_pig',
          operation: 'create',
          provenance: { source: 'user_input' },
          payload: { amount: 50000, reason: 'Thưởng KPI' },
        },
        deps
      );
      assert.equal(res.allowed, false);
      assert.equal(res.blockedCode, 'UNCLEAR_MODULE_LOCKED');
    }

    // Critical delete blocked
    {
      const deps = makeDeps();
      const res = validateHubCwWrite(
        {
          agentId: 'ae_lead',
          agentName: 'Minh AE',
          module: 'customers',
          operation: 'delete',
          recordId: 'cust_1',
          provenance: { source: 'user_input' },
          payload: {},
        },
        deps
      );
      assert.equal(res.allowed, false);
      assert.equal(res.blockedCode, 'CRITICAL_OP_BLOCKED');
    }
    console.log('PASS [6] Chặn đúng môi trường non-LIVE, Kill Switch, TK chưa gắn, module chưa rõ & lệnh xóa');
  }

  // TEST 7: Valid LIVE write succeeds with traceability metadata + Undo Snapshot
  {
    const deps = makeDeps();
    const outcome = await executeHubCwWrite(
      {
        agentId: 'ae_lead',
        agentName: 'Minh AE',
        module: 'cashflow',
        operation: 'create',
        expenseCode: '#CP-777',
        provenance: {
          source: 'external_document',
          refId: 'HD-VNNIC-777',
          sourceLabel: 'Hóa đơn VNNIC do CEO tải lên',
        },
        payload: {
          direction: 'out',
          amountVnd: 1_250_000,
          description: 'Thanh toán gói thiết lập tên miền khách hàng',
          phone: '0918456789',
          email: 'ketoan@anhnguhoasen.vn',
        },
      },
      deps
    );
    assert.equal(outcome.ok, true);
    assert.ok(outcome.writeResult?.externalRecordId);
    assert.ok(outcome.undoSnapshotId);
    assert.equal(deps.connector.writeCalls.length, 1);
    assert.equal(deps.connector.writeCalls[0].payload.created_by_agent, 'ae_lead');
    assert.equal(deps.connector.writeCalls[0].payload.approved_by, '#CP-777');
    assert.equal(deps.snapshots.length, 1);
    assert.equal(deps.logs.length, 1);
    assert.equal(deps.logs[0].result, 'ok');
    console.log('PASS [7] Ghi LIVE hợp lệ kèm provenance & #CP-777 -> sinh externalRecordId + UndoSnapshot');
  }

  // TEST 8: Revert Undo Snapshot restores pre-image or safely archives created record
  {
    const deps = makeDeps();
    const updateWrite = await executeHubCwWrite(
      {
        agentId: 'ae_lead',
        agentName: 'Minh AE',
        module: 'customers',
        operation: 'update',
        recordId: 'cust_real_55',
        provenance: { source: 'user_input', refId: 'CEO-CHAT-9' },
        payload: { name: 'Trung tâm Anh ngữ Hoa Sen (Cập nhật)' },
      },
      deps
    );
    assert.equal(updateWrite.ok, true);
    assert.equal(deps.snapshots.length, 1);

    const revertRes = await revertHubCwSnapshot(deps.snapshots[0], deps);
    assert.equal(revertRes.ok, true);
    assert.equal(deps.connector.writeCalls.length, 2);
    assert.equal(deps.connector.writeCalls[1].operation, 'update');
    assert.equal(deps.connector.writeCalls[1].payload.name, 'Trước khi sửa');
    assert.ok(deps.audits.some((a) => a.action === 'hubcw_undo:customers' && a.result === 'allowed'));
    console.log('PASS [8] Hoàn tác Undo Snapshot khôi phục dữ liệu trước khi ghi & ghi Audit Log');
  }

  console.log('--- TẤT CẢ 8/8 NHÓM TEST WRITE GATE ĐỀU ĐẠT ---');
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
