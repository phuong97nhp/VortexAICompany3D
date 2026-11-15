import {
  AgentAccount,
  AgentProfile,
  ApprovalMatrixRule,
  BcpPlanRecord,
  BrandMentionRecord,
  CompanyRiskRegisterItem,
  CustomerAccountRecord,
  CustomerOnboardingPlan,
  CustomerSurveyRecord,
  DataProcessingActivityRecord,
  DataSubjectRequestRecord,
  DigitalAssetRecord,
  ElectronicInvoiceRecord,
  EngineeringIncidentRecord,
  EngineeringRoadmapItem,
  ExpenseItem,
  InternalAnnouncementRecord,
  KnowledgeBaseArticle,
  LeaveRequestRecord,
  LedgerJournalEntry,
  MarketingAssetItem,
  MarketingEventRecord,
  OkrObjective,
  Permission,
  RefundRequestRecord,
  RoomBookingRecord,
  SalesOrderRecord,
  SalesQuoteRecord,
  SecurityAssetRecord,
  SeoKeywordTrack,
  SoftwareReleaseRecord,
  SupportTicketRecord,
  VendorSubscriptionRecord,
  WebhookEndpointRecord,
  WeeklyBoardReportSnapshot,
} from '../types';

export function calculateCustomerHealthAndChurn(
  customer: CustomerAccountRecord,
  openTicketsCount: number,
  overdueInvoicesCount: number
): { churnRiskScore: number; status: CustomerAccountRecord['status'] } {
  let risk = 10;
  if (openTicketsCount > 0) risk += Math.min(35, openTicketsCount * 14);
  if (overdueInvoicesCount > 0) risk += Math.min(35, overdueInvoicesCount * 20);
  if (typeof customer.csatScore === 'number' && customer.csatScore < 3.5) {
    risk += Math.round((4 - customer.csatScore) * 15);
  }
  if (typeof customer.npsScore === 'number' && customer.npsScore <= 6) {
    risk += 18;
  }
  const clamped = Math.max(0, Math.min(100, risk));
  const status: CustomerAccountRecord['status'] =
    customer.status === 'churned'
      ? 'churned'
      : clamped >= 65
      ? 'at_risk'
      : customer.status === 'trial'
      ? 'trial'
      : 'active';
  return { churnRiskScore: clamped, status };
}

export function calculateVnVat(subtotalVnd: number, vatRatePercent = 8): {
  vatAmountVnd: number;
  totalVnd: number;
} {
  const safeSub = Math.max(0, Math.round(subtotalVnd));
  const vatAmountVnd = Math.round((safeSub * vatRatePercent) / 100);
  return { vatAmountVnd, totalVnd: safeSub + vatAmountVnd };
}

export function buildLedgerFromInvoiceAndExpense(
  invoices: ElectronicInvoiceRecord[],
  expenses: ExpenseItem[],
  refunds: RefundRequestRecord[] = []
): LedgerJournalEntry[] {
  const entries: LedgerJournalEntry[] = [];
  let seq = 100;

  for (const inv of invoices) {
    if (inv.status === 'cancelled' || inv.status === 'draft') continue;
    seq += 1;
    entries.push({
      id: `gl_inv_${inv.id}`,
      entryCode: `#GL-${seq}`,
      date: new Date(inv.issuedAt).toISOString().slice(0, 10),
      type: inv.status === 'paid' ? 'revenue' : 'receivable',
      accountCode: inv.status === 'paid' ? '511' : '131',
      accountName: inv.status === 'paid' ? 'Doanh thu bán hàng & dịch vụ' : 'Phải thu của khách hàng',
      description: `HĐ ${inv.series}-${inv.invoiceNumber} (${inv.customerName})`,
      debitVnd: 0,
      creditVnd: inv.subtotalVnd,
      referenceCode: inv.invoiceNumber,
      createdBy: 'cfo',
      source: inv.source,
      createdAt: inv.issuedAt,
    });
  }

  for (const exp of expenses) {
    if (exp.status === 'rejected' || exp.status === 'draft') continue;
    const isPaid = exp.status === 'paid' || exp.status === 'reconciled';
    if (!isPaid && exp.status !== 'approved') continue;
    seq += 1;
    entries.push({
      id: `gl_exp_${exp.id}`,
      entryCode: `#GL-${seq}`,
      date: new Date(exp.createdAt).toISOString().slice(0, 10),
      type: isPaid ? 'expense' : 'payable',
      accountCode: isPaid ? '642' : '331',
      accountName: isPaid ? 'Chi phí quản lý & vận hành' : 'Phải trả nhà cung cấp',
      description: `${exp.expenseCode} – ${exp.title} (${exp.vendor})`,
      debitVnd: exp.amountVnd,
      creditVnd: 0,
      referenceCode: exp.expenseCode,
      createdBy: exp.requesterId,
      source: exp.simulated ? 'simulated' : 'manual',
      createdAt: exp.createdAt,
    });
  }

  for (const rf of refunds) {
    if (rf.status !== 'refunded' && rf.status !== 'approved') continue;
    seq += 1;
    entries.push({
      id: `gl_ref_${rf.id}`,
      entryCode: `#GL-${seq}`,
      date: new Date(rf.createdAt).toISOString().slice(0, 10),
      type: 'refund',
      accountCode: '521',
      accountName: 'Các khoản giảm trừ doanh thu (Hoàn tiền)',
      description: `${rf.code} – Hoàn tiền ${rf.customerName}`,
      debitVnd: rf.amountVnd,
      creditVnd: 0,
      referenceCode: rf.code,
      createdBy: rf.requestedBy,
      source: 'manual',
      createdAt: rf.createdAt,
    });
  }

  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

export function computeProfitAndLoss(
  ledger: LedgerJournalEntry[],
  invoices: ElectronicInvoiceRecord[],
  expenses: ExpenseItem[]
): {
  recognizedRevenueVnd: number;
  collectedCashVnd: number;
  arPendingVnd: number;
  apPendingVnd: number;
  totalExpensesVnd: number;
  vatPayableEstimateVnd: number;
  netProfitVnd: number;
} {
  const activeInvoices = invoices.filter((i) => i.status !== 'cancelled' && i.status !== 'draft');
  const recognizedRevenueVnd = activeInvoices.reduce((s, i) => s + i.subtotalVnd, 0);
  const collectedCashVnd = activeInvoices.reduce((s, i) => s + i.paidAmountVnd, 0);
  const arPendingVnd = activeInvoices.reduce((s, i) => s + Math.max(0, i.totalVnd - i.paidAmountVnd), 0);
  const vatOutput = activeInvoices.reduce((s, i) => s + i.vatAmountVnd, 0);

  const validExpenses = expenses.filter(
    (e) => e.status === 'approved' || e.status === 'paid' || e.status === 'reconciled'
  );
  const totalExpensesVnd = validExpenses.reduce((s, e) => s + e.amountVnd, 0);
  const apPendingVnd = expenses
    .filter((e) => e.status === 'approved')
    .reduce((s, e) => s + e.amountVnd, 0);

  const refundsDebit = ledger
    .filter((l) => l.type === 'refund')
    .reduce((s, l) => s + l.debitVnd, 0);

  const netProfitVnd = recognizedRevenueVnd - refundsDebit - totalExpensesVnd;
  const vatPayableEstimateVnd = Math.max(0, vatOutput - Math.round(totalExpensesVnd * 0.05));

  return {
    recognizedRevenueVnd,
    collectedCashVnd,
    arPendingVnd,
    apPendingVnd,
    totalExpensesVnd,
    vatPayableEstimateVnd,
    netProfitVnd,
  };
}

export function computeCashflowForecast90Days(params: {
  startingCashVnd: number;
  customers: CustomerAccountRecord[];
  invoices: ElectronicInvoiceRecord[];
  vendorSubscriptions: VendorSubscriptionRecord[];
}): Array<{ dayOffset: number; label: string; projectedCashVnd: number; inflowVnd: number; outflowVnd: number }> {
  const mrrTotal = params.customers
    .filter((c) => c.status === 'active' || c.status === 'at_risk')
    .reduce((s, c) => s + c.mrrVnd, 0);
  const arCollectable = params.invoices
    .filter((i) => i.status === 'issued' || i.status === 'overdue')
    .reduce((s, i) => s + Math.max(0, i.totalVnd - i.paidAmountVnd), 0);
  const vendorMonthlyOut = params.vendorSubscriptions
    .filter((v) => v.status === 'active')
    .reduce((s, v) => s + v.monthlyCostVnd, 0);

  const points: Array<{ dayOffset: number; label: string; projectedCashVnd: number; inflowVnd: number; outflowVnd: number }> = [];
  let running = params.startingCashVnd;

  for (const day of [0, 15, 30, 45, 60, 75, 90]) {
    if (day === 0) {
      points.push({
        dayOffset: 0,
        label: 'Hôm nay',
        projectedCashVnd: running,
        inflowVnd: 0,
        outflowVnd: 0,
      });
      continue;
    }
    const inflow = Math.round(mrrTotal * 0.5 + (day === 15 ? arCollectable * 0.65 : day === 30 ? arCollectable * 0.35 : 0));
    const outflow = Math.round(vendorMonthlyOut * 0.5 + 12_000_000);
    running = running + inflow - outflow;
    points.push({
      dayOffset: day,
      label: `+${day} ngày`,
      projectedCashVnd: running,
      inflowVnd: inflow,
      outflowVnd: outflow,
    });
  }
  return points;
}

export function buildWeeklyBoardReport(params: {
  invoices: ElectronicInvoiceRecord[];
  expenses: ExpenseItem[];
  tickets: SupportTicketRecord[];
  okrs: OkrObjective[];
  risks: CompanyRiskRegisterItem[];
}): WeeklyBoardReportSnapshot {
  const pnl = computeProfitAndLoss([], params.invoices, params.expenses);
  const openTickets = params.tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;
  const resolvedWithSla = params.tickets.filter((t) => t.resolvedAt);
  const slaMetCount = resolvedWithSla.filter((t) => (t.resolvedAt || 0) <= t.slaDueAt).length;
  const avgSlaCompliancePercent =
    resolvedWithSla.length > 0 ? Math.round((slaMetCount / resolvedWithSla.length) * 100) : 95;

  let totalKrPct = 0;
  let krCount = 0;
  for (const okr of params.okrs) {
    for (const kr of okr.keyResults) {
      krCount += 1;
      totalKrPct += kr.targetValue > 0 ? Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100)) : 0;
    }
  }
  const okrProgressPercent = krCount > 0 ? Math.round(totalKrPct / krCount) : 0;
  const topRisks = params.risks
    .filter((r) => r.status !== 'closed')
    .slice(0, 3)
    .map((r) => `[${r.code}] ${r.title} (${r.impact.toUpperCase()})`);

  const now = new Date();
  const weekLabel = `Tuần ${Math.ceil(now.getDate() / 7)} · ${now.toLocaleDateString('vi-VN')}`;
  return {
    id: `wbr_${Date.now()}`,
    weekLabel,
    generatedAt: Date.now(),
    revenueVnd: pnl.recognizedRevenueVnd,
    expensesVnd: pnl.totalExpensesVnd,
    netProfitVnd: pnl.netProfitVnd,
    openTickets,
    avgSlaCompliancePercent,
    okrProgressPercent,
    topRisks,
    executiveSummary: `Doanh thu ghi nhận ${(pnl.recognizedRevenueVnd / 1_000_000).toFixed(1)}tr · Chi phí ${(pnl.totalExpensesVnd / 1_000_000).toFixed(1)}tr · SLA đạt ${avgSlaCompliancePercent}% · OKR ${okrProgressPercent}%.`,
  };
}

export function exportRecordsToCsv(headers: string[], rows: Array<Array<string | number | boolean | undefined>>): string {
  const esc = (v: unknown) => {
    const str = v === undefined || v === null ? '' : String(v);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  return '\uFEFF' + [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}

export function parseCsvRows(csvText: string): Array<Record<string, string>> {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };
  const headers = splitLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = splitLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] || '';
    });
    return obj;
  });
}

export function checkErpRbacPermission(account: AgentAccount | undefined, perm: Permission): boolean {
  if (!account) return true; // CEO manual UI action when account is ceo
  if (account.status !== 'active') return false;
  if (account.role === 'CEO') return true;
  return account.permissions.includes(perm);
}

export function buildSeedErpData(agents: AgentProfile[]) {
  const now = Date.now();
  const findOwner = (id: string) => agents.find((a) => a.id === id)?.id || agents[0]?.id || 'ceo';

  const customerAccounts: CustomerAccountRecord[] = [
    {
      id: 'cust_sim_1',
      code: 'KH-1001',
      name: 'Hệ thống Anh ngữ SunLight Academy',
      taxCode: '0315849201',
      contactName: 'Cô Thanh Mai',
      contactEmail: 'tuyensinh@sunlight-english.vn',
      contactPhone: '0908412319',
      tier: 'enterprise',
      planName: 'EduCenter Pro Enterprise (3 cơ sở)',
      mrrVnd: 2_490_000,
      ltvVnd: 29_880_000,
      churnRiskScore: 18,
      npsScore: 9,
      csatScore: 4.8,
      status: 'active',
      renewalDate: new Date(now + 95 * 86400_000).toISOString().slice(0, 10),
      ownerAgentId: findOwner('account_executive'),
      source: 'simulated',
      createdAt: now - 45 * 86400_000,
      updatedAt: now - 86400_000,
    },
    {
      id: 'cust_sim_2',
      code: 'KH-1002',
      name: 'Trường Mầm non Song ngữ Hoa Hướng Dương',
      taxCode: '0316220144',
      contactName: 'Thầy Hoàng Minh',
      contactEmail: 'bgh@hoahuongduong.edu.vn',
      contactPhone: '0912778445',
      tier: 'pro',
      planName: 'PreSchool Care Plus',
      mrrVnd: 1_590_000,
      ltvVnd: 19_080_000,
      churnRiskScore: 68,
      npsScore: 6,
      csatScore: 3.3,
      status: 'at_risk',
      renewalDate: new Date(now + 18 * 86400_000).toISOString().slice(0, 10),
      ownerAgentId: findOwner('customer_success'),
      source: 'simulated',
      createdAt: now - 60 * 86400_000,
      updatedAt: now - 3600_000,
    },
  ];

  const salesQuotes: SalesQuoteRecord[] = [
    {
      id: 'qt_sim_1',
      code: '#BG-2026-01',
      customerId: 'cust_sim_2',
      customerName: 'Trường Mầm non Song ngữ Hoa Hướng Dương',
      productId: 'preschool-care',
      planLabel: 'Gói Pro 12 tháng (-10%)',
      subtotalVnd: 17_172_000,
      discountPercent: 10,
      vatRatePercent: 8,
      totalVnd: 18_545_760,
      validUntil: new Date(now + 14 * 86400_000).toISOString().slice(0, 10),
      status: 'sent',
      ownerAgentId: findOwner('pricing_proposal'),
      notes: 'Đã trình CEO duyệt mức ưu đãi 10%.',
      source: 'simulated',
      createdAt: now - 3 * 86400_000,
    },
  ];

  const salesOrders: SalesOrderRecord[] = [
    {
      id: 'ord_sim_1',
      code: '#DH-2026-01',
      customerId: 'cust_sim_1',
      customerName: 'Hệ thống Anh ngữ SunLight Academy',
      itemsSummary: 'EduCenter Pro Enterprise 12 tháng + Cài đặt Zalo OA',
      amountVnd: 29_880_000,
      vatAmountVnd: 2_390_400,
      totalVnd: 32_270_400,
      paymentStatus: 'paid',
      fulfillmentStatus: 'active',
      ownerAgentId: findOwner('account_executive'),
      source: 'simulated',
      createdAt: now - 25 * 86400_000,
    },
    {
      id: 'ord_sim_2',
      code: '#DH-2026-02',
      customerId: 'cust_sim_2',
      customerName: 'Trường Mầm non Song ngữ Hoa Hướng Dương',
      itemsSummary: 'PreSchool Care Plus 12 tháng (Cơ sở Phú Nhuận)',
      amountVnd: 19_080_000,
      vatAmountVnd: 1_526_400,
      totalVnd: 20_606_400,
      paymentStatus: 'partial',
      fulfillmentStatus: 'provisioning',
      ownerAgentId: findOwner('account_executive'),
      source: 'simulated',
      createdAt: now - 10 * 86400_000,
    },
  ];

  const electronicInvoices: ElectronicInvoiceRecord[] = [
    {
      id: 'einv_sim_1',
      invoiceNumber: '0000108',
      series: '1C26TAA',
      orderId: 'ord_sim_1',
      customerName: 'Hệ thống Anh ngữ SunLight Academy',
      buyerTaxCode: '0315849201',
      subtotalVnd: 29_880_000,
      vatRatePercent: 8,
      vatAmountVnd: 2_390_400,
      totalVnd: 32_270_400,
      status: 'paid',
      issuedAt: now - 24 * 86400_000,
      dueDate: new Date(now - 10 * 86400_000).toISOString().slice(0, 10),
      reminderCount: 0,
      paidAmountVnd: 32_270_400,
      reconciledAt: now - 20 * 86400_000,
      source: 'simulated',
    },
    {
      id: 'einv_sim_2',
      invoiceNumber: '0000109',
      series: '1C26TAA',
      orderId: 'ord_sim_2',
      customerName: 'Trường Mầm non Song ngữ Hoa Hướng Dương',
      buyerTaxCode: '0316220144',
      subtotalVnd: 19_080_000,
      vatRatePercent: 8,
      vatAmountVnd: 1_526_400,
      totalVnd: 20_606_400,
      status: 'overdue',
      issuedAt: now - 10 * 86400_000,
      dueDate: new Date(now - 2 * 86400_000).toISOString().slice(0, 10),
      reminderCount: 1,
      lastReminderAt: now - 86400_000,
      paidAmountVnd: 10_000_000,
      source: 'simulated',
    },
  ];

  const refundRequests: RefundRequestRecord[] = [
    {
      id: 'ref_sim_1',
      code: '#HT-2026-01',
      orderId: 'ord_sim_2',
      customerName: 'Trường Mầm non Song ngữ Hoa Hướng Dương',
      amountVnd: 1_500_000,
      reason: 'Khách yêu cầu điều chỉnh giảm gói module SMS khi chưa dùng tháng đầu.',
      status: 'pending_ceo',
      requestedBy: findOwner('customer_success'),
      createdAt: now - 7200_000,
    },
  ];

  const customerSurveys: CustomerSurveyRecord[] = [
    {
      id: 'srv_sim_1',
      customerId: 'cust_sim_1',
      customerName: 'Hệ thống Anh ngữ SunLight Academy',
      kind: 'nps',
      score: 9,
      comment: 'Tính năng nhắc học phí Zalo tự động giảm 60% thời gian gọi nhắc phụ huynh.',
      createdAt: now - 5 * 86400_000,
      source: 'simulated',
    },
  ];

  const supportTickets: SupportTicketRecord[] = [
    {
      id: 'tkt_sim_1',
      code: '#TK-101',
      customerId: 'cust_sim_2',
      customerName: 'Trường Mầm non Song ngữ Hoa Hướng Dương',
      channel: 'zalo_oa',
      subject: 'Đồng bộ ảnh lớp Lá lên app phụ huynh bị chậm vào giờ tan trường',
      description: 'Khoảng 16h30 giáo viên tải 40 ảnh cùng lúc lên bị báo timeout.',
      priority: 'high',
      status: 'in_progress',
      assigneeAgentId: findOwner('customer_success'),
      slaMinutes: 120,
      slaDueAt: now + 45 * 60_000,
      firstResponseAt: now - 25 * 60_000,
      source: 'simulated',
      createdAt: now - 35 * 60_000,
      updatedAt: now - 10 * 60_000,
    },
    {
      id: 'tkt_sim_2',
      code: '#TK-102',
      customerId: 'cust_sim_1',
      customerName: 'Hệ thống Anh ngữ SunLight Academy',
      channel: 'email',
      subject: 'Hướng dẫn xuất bảng công giáo viên nước ngoài sang Excel',
      description: 'Kế toán chi nhánh 2 cần lọc theo mã lớp IELTS.',
      priority: 'medium',
      status: 'resolved',
      assigneeAgentId: findOwner('customer_success'),
      slaMinutes: 240,
      slaDueAt: now - 86400_000,
      firstResponseAt: now - 90000_000,
      resolvedAt: now - 87000_000,
      csatRating: 5,
      csatComment: 'Hỗ trợ rất nhanh và rõ ràng.',
      kbArticleId: 'kb_sim_1',
      source: 'simulated',
      createdAt: now - 92000_000,
      updatedAt: now - 87000_000,
    },
  ];

  const kbArticles: KnowledgeBaseArticle[] = [
    {
      id: 'kb_sim_1',
      title: 'Cách lọc và xuất bảng công giáo viên theo mã lớp sang Excel',
      category: 'EduCenter Pro',
      symptoms: 'Cần tách giờ dạy giáo viên bản ngữ và trợ giảng theo chi nhánh.',
      solutionSteps: '1. Vào Báo cáo > Chấm công.\n2. Chọn Chi nhánh & Mã lớp.\n3. Bấm Xuất Excel (mẫu MISA/Excel).',
      fromTicketId: 'tkt_sim_2',
      viewsCount: 48,
      helpfulCount: 19,
      published: true,
      updatedAt: now - 86400_000,
    },
  ];

  const customerOnboardings: CustomerOnboardingPlan[] = [
    {
      id: 'onb_sim_1',
      customerId: 'cust_sim_2',
      customerName: 'Trường Mầm non Song ngữ Hoa Hướng Dương',
      productName: 'PreSchool Care Plus',
      trainerAgentId: findOwner('customer_success'),
      kickoffDate: new Date(now + 2 * 86400_000).toISOString().slice(0, 10),
      steps: [
        { id: 's1', title: 'Nhập danh sách 180 học sinh & phân lớp', done: true },
        { id: 's2', title: 'Đào tạo giáo viên điểm danh QR & gửi thực đơn', done: true },
        { id: 's3', title: 'Kích hoạt nhắc học phí qua Zalo OA', done: false },
        { id: 's4', title: 'Nghiệm thu tuần đầu (CSAT check)', done: false },
      ],
      progressPercent: 50,
      status: 'in_progress',
      updatedAt: now - 7200_000,
    },
  ];

  const roadmapItems: EngineeringRoadmapItem[] = [
    {
      id: 'rm_sim_1',
      code: '#FEAT-01',
      title: 'Tối ưu nén ảnh hàng loạt WebP cho app Mầm non giờ cao điểm',
      quarter: 'Q2-2026',
      status: 'in_progress',
      priority: 'p0',
      ownerAgentId: findOwner('tech_pm'),
      productId: 'preschool-care',
      releaseVersion: 'v2.4.1',
      source: 'simulated',
      updatedAt: now - 3600_000,
    },
    {
      id: 'rm_sim_2',
      code: '#FEAT-02',
      title: 'Webhook đồng bộ hóa đơn điện tử VNPT / MISA trực tiếp từ HubCW',
      quarter: 'Q2-2026',
      status: 'qa',
      priority: 'p1',
      ownerAgentId: findOwner('tech_pm'),
      productId: 'edu-center',
      releaseVersion: 'v2.4.0',
      source: 'simulated',
      updatedAt: now - 7200_000,
    },
  ];

  const softwareReleases: SoftwareReleaseRecord[] = [
    {
      id: 'rel_sim_1',
      version: 'v2.4.0',
      environment: 'production',
      changelog: 'Tăng tốc truy vấn bảng điểm danh 40%, vá lỗi timeout xuất PDF báo cáo học phí.',
      qaPassRatePercent: 98,
      uptimePercent: 99.94,
      releasedBy: findOwner('tech_pm'),
      status: 'deployed',
      releasedAt: now - 5 * 86400_000,
    },
    {
      id: 'rel_sim_2',
      version: 'v2.4.1-rc1',
      environment: 'staging',
      changelog: 'Upload ảnh đa luồng + retry offline cho giáo viên mầm non.',
      qaPassRatePercent: 95,
      uptimePercent: 99.99,
      releasedBy: findOwner('tech_pm'),
      status: 'staging_ready',
      releasedAt: now - 4 * 3600_000,
    },
  ];

  const engineeringIncidents: EngineeringIncidentRecord[] = [
    {
      id: 'inc_sim_1',
      code: '#INC-09',
      title: 'Độ trễ upload ảnh giờ tan trường (16h30–17h00)',
      severity: 'sev2',
      serviceName: 'media-upload-cdn',
      status: 'mitigated',
      startedAt: now - 8 * 3600_000,
      rootCause: 'Client gửi 40 ảnh gốc >8MB không qua nén WebP trước khi upload.',
      postmortemActions: 'Triển khai nén ảnh phía client ở bản v2.4.1-rc1 và tăng worker concurrency.',
      ownerAgentId: findOwner('tech_pm'),
    },
  ];

  const securityAssets: SecurityAssetRecord[] = [
    {
      id: 'sec_sim_1',
      kind: 'vulnerability',
      title: 'Rà soát Dependency Express & Multer (CVE check)',
      environment: 'production',
      severity: 'low',
      status: 'patched',
      lastCheckedAt: now - 86400_000,
      notes: 'Không phát hiện lỗ hổng High/Critical trên production.',
    },
    {
      id: 'sec_sim_2',
      kind: 'secret_inventory',
      title: 'Zalo OA Refresh Token & HubCW API Token',
      environment: 'worker',
      severity: 'high',
      status: 'verified',
      lastCheckedAt: now - 12 * 3600_000,
      notes: 'Xoay vòng định kỳ 90 ngày, lưu AES-GCM không expose client.',
    },
    {
      id: 'sec_sim_3',
      kind: 'backup_job',
      title: 'Daily Encrypted Snapshot (IndexedDB + Server JSON)',
      environment: 'production',
      severity: 'medium',
      status: 'verified',
      lastCheckedAt: now - 3 * 3600_000,
      notes: 'Kiểm tra khôi phục thử định kỳ thành công.',
    },
  ];

  const marketingAssets: MarketingAssetItem[] = [
    {
      id: 'ma_sim_1',
      title: 'Case Study SunLight Academy: Giảm 60% công nhắc học phí',
      type: 'case_study',
      tags: ['EduCenter', 'Zalo OA', 'Case Study'],
      urlOrNote: 'Đã được Ban Giám đốc SunLight Academy đồng ý công bố tên & số liệu.',
      consentedByCustomer: true,
      ownerAgentId: findOwner('content_writer'),
      createdAt: now - 7 * 86400_000,
    },
    {
      id: 'ma_sim_2',
      title: 'Bộ khung Carousel 1080x1350 chuẩn nhận diện Chuyên Web',
      type: 'template',
      tags: ['Brand Kit', 'Facebook', 'Carousel'],
      urlOrNote: 'Template Figma nội bộ đồng nhất màu #0284C7.',
      ownerAgentId: findOwner('designer_video'),
      createdAt: now - 10 * 86400_000,
    },
  ];

  const seoKeywords: SeoKeywordTrack[] = [
    {
      id: 'kw_sim_1',
      keyword: 'phần mềm quản lý trung tâm ngoại ngữ',
      targetUrl: 'https://chuyenweb.com/educenter-pro',
      monthlyVolume: 2400,
      currentRank: 6,
      targetRank: 3,
      updatedAt: now - 86400_000,
    },
    {
      id: 'kw_sim_2',
      keyword: 'ứng dụng sổ liên lạc mầm non zalo',
      targetUrl: 'https://chuyenweb.com/preschool-care',
      monthlyVolume: 1800,
      currentRank: 9,
      targetRank: 3,
      updatedAt: now - 86400_000,
    },
  ];

  const brandMentions: BrandMentionRecord[] = [
    {
      id: 'bm_sim_1',
      sourcePlatform: 'Facebook Group Chủ Trung Tâm',
      authorMasked: 'Quản lý TT*** (Q.3)',
      excerpt: 'Bên mình vừa chuyển sang EduCenter Pro thấy bảng nhắc học phí Zalo khá ổn.',
      sentiment: 'positive',
      handled: true,
      replyNote: 'Đã cảm ơn và mời tham gia chương trình giới thiệu đối tác.',
      detectedAt: now - 16 * 3600_000,
    },
  ];

  const marketingEvents: MarketingEventRecord[] = [
    {
      id: 'mev_sim_1',
      title: 'Webinar: Tự động hóa thu học phí & CSKH Trung tâm Ngoại ngữ qua Zalo OA',
      kind: 'webinar',
      eventDate: new Date(now + 10 * 86400_000).toISOString().slice(0, 10),
      registeredCount: 64,
      attendedCount: 0,
      leadsGenerated: 19,
      budgetVnd: 1_500_000,
      status: 'upcoming',
    },
  ];

  const legalRisks: CompanyRiskRegisterItem[] = [
    {
      id: 'risk_sim_1',
      code: '#RISK-01',
      title: 'Lưu trữ ảnh trẻ em mầm non cần văn bản đồng ý phụ huynh (NĐ 13/2023)',
      domain: 'Bảo vệ Dữ liệu cá nhân',
      likelihood: 'medium',
      impact: 'high',
      mitigationPlan: 'Bắt buộc tick đồng ý phụ huynh + điều khoản DPA trong HĐ PreSchool.',
      ownerAgentId: findOwner('legal'),
      status: 'mitigating',
      updatedAt: now - 2 * 86400_000,
    },
    {
      id: 'risk_sim_2',
      code: '#RISK-02',
      title: 'Tin nhắn gửi lạnh Zalo cá nhân vượt ngưỡng gây khóa nick',
      domain: 'Vận hành & An toàn kênh',
      likelihood: 'low',
      impact: 'medium',
      mitigationPlan: 'Hard cap <= 20 tin/ngày, delay >= 15s, tự động dừng khi có cảnh báo.',
      ownerAgentId: findOwner('coo'),
      status: 'mitigating',
      updatedAt: now - 86400_000,
    },
  ];

  const dataProcessings: DataProcessingActivityRecord[] = [
    {
      id: 'dpa_sim_1',
      processName: 'Xử lý hồ sơ Lead B2B & Hợp đồng SaaS',
      dataCategories: 'Tên tổ chức, SĐT đại diện, Email công việc, MST',
      legalBasis: 'Thực hiện hợp đồng & Đồng ý chủ thể dữ liệu (NĐ 13/2023)',
      retentionPeriod: '5 năm theo Luật Kế toán / Xóa ngay theo yêu cầu DSAR hợp lệ',
      securityMeasures: 'AES-GCM cục bộ, RBAC, Masking SĐT/OTP trong log',
      updatedAt: now - 3 * 86400_000,
    },
  ];

  const dsarRequests: DataSubjectRequestRecord[] = [
    {
      id: 'dsar_sim_1',
      code: '#DSAR-01',
      requesterMasked: '0903***812 (Khách thử nghiệm cũ)',
      requestType: 'delete',
      status: 'verifying',
      dueDate: new Date(now + 2 * 86400_000).toISOString().slice(0, 10),
      handledBy: findOwner('legal'),
      createdAt: now - 14 * 3600_000,
    },
  ];

  const leaveRequests: LeaveRequestRecord[] = [
    {
      id: 'lv_sim_1',
      agentId: findOwner('designer_video'),
      agentName: agents.find((a) => a.id === 'designer_video')?.name || 'Thiết kế Studio',
      kind: 'maintenance',
      startDate: new Date(now + 86400_000).toISOString().slice(0, 10),
      endDate: new Date(now + 86400_000).toISOString().slice(0, 10),
      reason: 'Bảo trì prompt & đồng bộ kho template video định kỳ 2 giờ chiều.',
      status: 'pending',
      createdAt: now - 5 * 3600_000,
    },
  ];

  const announcements: InternalAnnouncementRecord[] = [
    {
      id: 'ann_sim_1',
      title: 'Cập nhật quy chuẩn phát ngôn & kiểm tra màn hình bất chợt tuần này',
      content: 'Tất cả agent cập nhật bảng giá v2 từ Phòng Sản phẩm trước khi gửi báo giá khách hàng.',
      authorName: 'COO (Điều phối)',
      pinned: true,
      department: 'all',
      createdAt: now - 12 * 3600_000,
    },
  ];

  const roomBookings: RoomBookingRecord[] = [
    {
      id: 'rb_sim_1',
      roomId: 'room-meeting',
      roomName: 'Phòng Họp Lớn (Tầng 1)',
      title: 'Họp Rà soát Phễu OKR & Tỷ lệ Chốt Deal Tuần',
      organizerAgentId: findOwner('coo'),
      startTime: '14:00 Hôm nay',
      durationMinutes: 30,
      attendeeIds: [findOwner('coo'), findOwner('sales_director'), findOwner('cfo')],
      createdAt: now - 4 * 3600_000,
    },
  ];

  const approvalMatrix: ApprovalMatrixRule[] = [
    { id: 'am_1', domain: 'expense', label: 'Chi phí vận hành / Ads', thresholdVnd: 500_000, approverRole: 'Kế toán trưởng (T1)', requiresCeoAboveVnd: 500_000, slaHours: 4 },
    { id: 'am_2', domain: 'refund', label: 'Hoàn tiền khách hàng', thresholdVnd: 0, approverRole: 'CS + CFO thẩm định', requiresCeoAboveVnd: 0, slaHours: 6 },
    { id: 'am_3', domain: 'contract', label: 'Hợp đồng khách hàng', thresholdVnd: 20_000_000, approverRole: 'Pháp chế kiểm tra', requiresCeoAboveVnd: 0, slaHours: 12 },
    { id: 'am_4', domain: 'hr_hire', label: 'Tuyển / Cắt giảm Agent', thresholdVnd: 0, approverRole: 'HR + COO đề xuất', requiresCeoAboveVnd: 0, slaHours: 8 },
    { id: 'am_5', domain: 'release', label: 'Triển khai Production Release', thresholdVnd: 0, approverRole: 'Tech PM + QA Pass >= 95%', requiresCeoAboveVnd: 0, slaHours: 2 },
  ];

  const vendorSubscriptions: VendorSubscriptionRecord[] = [
    {
      id: 'vs_sim_1',
      vendorName: 'Cloud VPS Production (Viettel/VN)',
      category: 'Hạ tầng Server',
      monthlyCostVnd: 2_800_000,
      billingCycle: 'monthly',
      nextRenewalDate: new Date(now + 12 * 86400_000).toISOString().slice(0, 10),
      ownerAgentId: findOwner('tech_pm'),
      status: 'active',
    },
    {
      id: 'vs_sim_2',
      vendorName: 'Zalo OA Business API & ZNS',
      category: 'Kênh CSKH',
      monthlyCostVnd: 1_200_000,
      billingCycle: 'monthly',
      nextRenewalDate: new Date(now + 19 * 86400_000).toISOString().slice(0, 10),
      ownerAgentId: findOwner('account_provisioning'),
      status: 'active',
    },
  ];

  const digitalAssets: DigitalAssetRecord[] = [
    {
      id: 'da_sim_1',
      kind: 'domain',
      identifier: 'hub.chuyenweb.com',
      provider: 'Cloudflare / VN Registrar',
      expiresAt: new Date(now + 210 * 86400_000).toISOString().slice(0, 10),
      ownerAgentId: findOwner('account_provisioning'),
      status: 'healthy',
    },
    {
      id: 'da_sim_2',
      kind: 'ssl_cert',
      identifier: '*.chuyenweb.com (TLS 1.3)',
      provider: 'Let’s Encrypt Auto-Renew',
      expiresAt: new Date(now + 22 * 86400_000).toISOString().slice(0, 10),
      ownerAgentId: findOwner('tech_pm'),
      status: 'expiring_soon',
    },
  ];

  const bcpPlans: BcpPlanRecord[] = [
    {
      id: 'bcp_1',
      scenario: 'Mất kết nối API AI chính (Gemini) hoặc vượt hạn mức token ngày',
      rtoMinutes: 2,
      rpoMinutes: 0,
      ownerAgentId: findOwner('coo'),
      runbookSteps: [
        'Tự động Failover sang DeepSeek hoặc Local Ollama qua Circuit Breaker.',
        'Giữ nguyên hàng đợi DurableJob trong IndexedDB không mất task.',
        'Cảnh báo CEO qua Zalo Giả lập / Telegram nếu cả 2 provider lỗi.',
      ],
      lastDrillAt: now - 7 * 86400_000,
      drillResult: 'Đạt · Failover hoàn tất trong 1.8 giây',
    },
    {
      id: 'bcp_2',
      scenario: 'Lỗi thiết bị Android USB ADB bị rút cáp khi đang chạy tác vụ',
      rtoMinutes: 5,
      rpoMinutes: 1,
      ownerAgentId: findOwner('account_provisioning'),
      runbookSteps: [
        'Lưu immediately DeviceTaskCheckpoint (pausedTask) gồm bước đang chạy & tiến độ %.',
        'Dừng lệnh ADB, báo trạng thái offline + hiển thị nút cắm lại.',
        'Khi cắm cáp & nhận RSA lại, tự động phát sự kiện resume từ checkpoint.',
      ],
      lastDrillAt: now - 2 * 86400_000,
      drillResult: 'Đạt · Phục hồi checkpoint nguyên vẹn',
    },
  ];

  const webhookEndpoints: WebhookEndpointRecord[] = [
    {
      id: 'wh_1',
      name: 'HubCW CRM Lead Sync Webhook',
      targetUrl: 'https://hub.chuyenweb.com/api/webhooks/virtual-office',
      events: ['lead.won', 'invoice.paid', 'ticket.escalated'],
      enabled: false,
    },
  ];

  return {
    customerAccounts,
    salesQuotes,
    salesOrders,
    electronicInvoices,
    refundRequests,
    customerSurveys,
    supportTickets,
    kbArticles,
    customerOnboardings,
    roadmapItems,
    softwareReleases,
    engineeringIncidents,
    securityAssets,
    marketingAssets,
    seoKeywords,
    brandMentions,
    marketingEvents,
    legalRisks,
    dataProcessings,
    dsarRequests,
    leaveRequests,
    announcements,
    roomBookings,
    approvalMatrix,
    vendorSubscriptions,
    digitalAssets,
    bcpPlans,
    webhookEndpoints,
  };
}
