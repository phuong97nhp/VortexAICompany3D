import assert from 'node:assert/strict';

const memoryStorage = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => memoryStorage.get(k) ?? null,
      setItem: (k: string, v: string) => memoryStorage.set(k, String(v)),
      removeItem: (k: string) => memoryStorage.delete(k),
      clear: () => memoryStorage.clear(),
      key: (i: number) => Array.from(memoryStorage.keys())[i] ?? null,
      get length() {
        return memoryStorage.size;
      },
    },
    configurable: true,
  });
}

import { DEFAULT_DEVICE_POLICY } from '../../worker/device/policyGate';
import { buildFallbackBaseSettings } from '../db/schemaMigration';
import { buildSeedAgents, buildSeedDepartments } from '../engine/liveRegistry';
import {
  autoSeatAgentsInPreset,
  buildBuiltinOfficePresets,
  exportOfficeLayoutJson,
  parseOfficeLayoutJson,
  snapToGrid,
  validateOfficeLayout,
} from '../engine/officeEditorEngine';
import {
  buildLedgerFromInvoiceAndExpense,
  buildSeedErpData,
  buildWeeklyBoardReport,
  calculateCustomerHealthAndChurn,
  calculateVnVat,
  checkErpRbacPermission,
  computeCashflowForecast90Days,
  computeProfitAndLoss,
  exportRecordsToCsv,
  parseCsvRows,
} from '../engine/erpEngine';
import { AgentAccount, ElectronicInvoiceRecord, ExpenseItem, SupportTicketRecord } from '../types';

async function runTests() {
  const SEED_AGENTS = buildSeedAgents();
  const SEED_DEPARTMENTS = buildSeedDepartments();

  // === 1. BỔ SUNG X: Device Guardrails & Settings ===
  const baseSettings = buildFallbackBaseSettings();
  assert.ok(baseSettings.schemaVersion >= 1, 'fallback base settings must include schemaVersion');
  assert.ok(
    DEFAULT_DEVICE_POLICY.blockedPackages.some(
      (p) => p.includes('keepass') || p.includes('1password') || p.includes('bitwarden')
    ),
    'blockedPackages must forbid password managers'
  );
  assert.ok(
    DEFAULT_DEVICE_POLICY.blockedPackages.some((p) => p.includes('authenticator') || p.includes('authy')),
    'blockedPackages must forbid 2FA authenticator apps'
  );
  assert.ok((DEFAULT_DEVICE_POLICY.minActionDelayMs ?? 0) >= 500, 'minActionDelayMs must rate-limit device automation');

  // === 2. BỔ SUNG Y: Office Layout Editor Engine ===
  assert.equal(snapToGrid(1.24, 0.5), 1.0);
  assert.equal(snapToGrid(1.26, 0.5), 1.5);

  const presets = buildBuiltinOfficePresets(SEED_DEPARTMENTS, SEED_AGENTS);
  assert.equal(presets.length, 4, 'Must build 4 built-in office presets');
  const standard = presets[0];
  const validStd = validateOfficeLayout(standard, SEED_AGENTS);
  assert.equal(validStd.overlapErrors.length, 0, 'Standard 3F preset should have zero room overlaps');

  // Detect room overlap
  const overlappingPreset = {
    ...standard,
    rooms: [
      ...standard.rooms.slice(0, 2),
      { ...standard.rooms[0], id: 'dup_overlap', center: [...standard.rooms[0].center] as [number, number, number] },
    ],
  };
  const overlapReport = validateOfficeLayout(overlappingPreset, SEED_AGENTS);
  assert.ok(overlapReport.overlapErrors.length > 0, 'Overlapping rooms must be reported');

  // Auto-seat unseated agent in open studio
  const openStudio = presets.find((p) => p.id === 'preset_open_studio')!;
  const seatedRes = autoSeatAgentsInPreset(openStudio, SEED_AGENTS.slice(0, 4));
  assert.equal(Object.keys(seatedRes.updatedAgentPositions).length, 4, 'Should auto-seat all 4 active agents');
  assert.ok(seatedRes.preset.props.some((p) => p.kind === 'desk' && p.assignedAgentId === SEED_AGENTS[0].id));

  // JSON roundtrip
  const exportedJson = exportOfficeLayoutJson(standard);
  const imported = parseOfficeLayoutJson(exportedJson);
  assert.equal(imported.ok, true);
  if (imported.ok) {
    assert.equal(imported.preset.rooms.length, standard.rooms.length);
  }
  const badJson = parseOfficeLayoutJson('{"invalid": true}');
  assert.equal(badJson.ok, false);

  // === 3. BỔ SUNG Z: Enterprise ERP Engine ===
  // 3.1 VAT Calculation
  const vat = calculateVnVat(10_000_000, 8);
  assert.equal(vat.vatAmountVnd, 800_000);
  assert.equal(vat.totalVnd, 10_800_000);

  // 3.2 Ledger + P&L + 90D Cashflow
  const invoices: ElectronicInvoiceRecord[] = [
    {
      id: 'inv_t1',
      invoiceNumber: '0000101',
      series: '1C26TCW',
      orderId: 'ord_t1',
      customerName: 'Công ty Test',
      subtotalVnd: 10_000_000,
      vatRatePercent: 8,
      vatAmountVnd: 800_000,
      totalVnd: 10_800_000,
      paidAmountVnd: 10_800_000,
      status: 'paid',
      issuedAt: Date.now(),
      dueDate: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
      reminderCount: 0,
      source: 'manual',
    },
    {
      id: 'inv_t2',
      invoiceNumber: '0000102',
      series: '1C26TCW',
      orderId: 'ord_t2',
      customerName: 'Công ty Nợ',
      subtotalVnd: 5_000_000,
      vatRatePercent: 8,
      vatAmountVnd: 400_000,
      totalVnd: 5_400_000,
      paidAmountVnd: 0,
      status: 'overdue',
      issuedAt: Date.now() - 10 * 86400_000,
      dueDate: new Date(Date.now() - 86400_000).toISOString().slice(0, 10),
      reminderCount: 1,
      source: 'manual',
    },
  ];
  const expenses: ExpenseItem[] = [
    {
      id: 'exp_t1',
      expenseCode: '#CP-900',
      requesterId: 'cto',
      department: 'product',
      projectOrCampaign: 'Hạ tầng Cloud',
      category: 'cloud_infra',
      title: 'Cloud Server',
      amountVnd: 3_000_000,
      frequency: 'recurring',
      justification: 'Duy trì máy chủ vận hành 24/7',
      expectedRoi: 'Uptime 99.9%',
      vendor: 'Viettel IDC',
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'paid',
      flags: [],
      history: [],
      simulated: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
  const gl = buildLedgerFromInvoiceAndExpense(invoices, expenses, []);
  assert.equal(gl.length, 3, 'GL should contain 2 invoices + 1 paid expense');
  const pnl = computeProfitAndLoss(gl, invoices, expenses);
  assert.equal(pnl.recognizedRevenueVnd, 15_000_000);
  assert.equal(pnl.collectedCashVnd, 10_800_000);
  assert.equal(pnl.arPendingVnd, 5_400_000);
  assert.equal(pnl.totalExpensesVnd, 3_000_000);
  assert.equal(pnl.netProfitVnd, 12_000_000);

  const seedErp = buildSeedErpData(SEED_AGENTS);
  assert.ok(seedErp.customerAccounts.every((c) => c.source === 'simulated'));

  const forecast = computeCashflowForecast90Days({
    startingCashVnd: 100_000_000,
    customers: seedErp.customerAccounts,
    invoices,
    vendorSubscriptions: seedErp.vendorSubscriptions,
  });
  assert.equal(forecast.length, 7);
  assert.equal(forecast[0].dayOffset, 0);
  assert.equal(forecast[6].dayOffset, 90);

  // 3.3 Customer Health & Churn Risk
  const healthyCust = seedErp.customerAccounts[0];
  const riskCalc = calculateCustomerHealthAndChurn(healthyCust, 2, 2);
  assert.ok(
    riskCalc.churnRiskScore >= 65 && riskCalc.status === 'at_risk',
    'Multiple overdue + open tickets must raise churn risk'
  );

  // 3.4 Weekly Board Report
  const tickets: SupportTicketRecord[] = [
    {
      id: 'tk_1',
      code: '#TK-01',
      customerId: healthyCust.id,
      customerName: healthyCust.name,
      channel: 'zalo_oa',
      subject: 'Lỗi kết nối Zalo',
      description: 'Không gửi được webhook',
      priority: 'high',
      status: 'resolved',
      assigneeAgentId: 'cskh_1',
      slaMinutes: 120,
      slaDueAt: Date.now() + 3600_000,
      resolvedAt: Date.now(),
      source: 'manual',
      createdAt: Date.now() - 1800_000,
      updatedAt: Date.now(),
    },
  ];
  const board = buildWeeklyBoardReport({
    invoices,
    expenses,
    tickets,
    okrs: [],
    risks: seedErp.legalRisks,
  });
  assert.equal(board.revenueVnd, 15_000_000);
  assert.equal(board.avgSlaCompliancePercent, 100);

  // 3.5 CSV Export/Import & ERP RBAC
  const csv = exportRecordsToCsv(
    ['name', 'phone'],
    [
      ['Anh Vũ', '0901234567'],
      ['Công ty "A, B"', '0911'],
    ]
  );
  const parsedCsv = parseCsvRows(csv);
  assert.equal(parsedCsv.length, 2);
  assert.equal(parsedCsv[1].name, 'Công ty "A, B"');

  const inactiveAcc: AgentAccount = {
    agentId: 'sales_1',
    username: 'sales1',
    internalEmail: 'sales1@chuyenweb.internal',
    role: 'Specialist',
    department: 'sales',
    status: 'suspended',
    tokenHash: 'hash_test',
    permissions: ['lead:write'],
    lastActiveAt: Date.now(),
  };
  assert.equal(checkErpRbacPermission(inactiveAcc, 'lead:write'), false, 'Suspended account must fail ERP RBAC check');

  console.log('✅ All BỔ SUNG X, Y, Z unit tests passed!');
}

runTests().catch((err) => {
  console.error('❌ addonsXYZ.test.ts failed:', err);
  process.exit(1);
});
