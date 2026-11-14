import {
  AdCampaignItem,
  AgentProfile,
  DepartmentConfig,
  DepartmentId,
  ExpenseBudget,
  ExpenseCategoryConfig,
  ExpenseItem,
  ExpenseRule,
  LeadItem,
  MarketingChannelRecord,
  SpendingPolicy,
} from '../types';
import { foldVietnamese } from './roleTemplates';

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryConfig[] = [
  { id: 'cat_ads', name: 'Quảng cáo', isDefault: true },
  { id: 'cat_saas', name: 'Công cụ / SaaS', isDefault: true },
  { id: 'cat_domain', name: 'Tên miền / Hosting', isDefault: true },
  { id: 'cat_ai_token', name: 'Token AI', isDefault: true },
  { id: 'cat_outsource', name: 'Thuê ngoài', isDefault: true },
  { id: 'cat_ops', name: 'Vận hành / Khác', isDefault: true },
  { id: 'cat_first_ads', name: 'Quảng cáo lần đầu', isDefault: true, blockedForAutoDefault: true },
  { id: 'cat_new_vendor', name: 'Nhà cung cấp mới', isDefault: true, blockedForAutoDefault: true },
  { id: 'cat_cash_gift', name: 'Quà tặng / Tiền mặt', isDefault: true, blockedForAutoDefault: true },
  { id: 'cat_long_contract', name: 'Hợp đồng dài hạn', isDefault: true, blockedForAutoDefault: true },
];

export function createDefaultSpendingPolicy(): SpendingPolicy {
  return {
    autoApproveMaxPerTxVnd: 1_000_000,
    autoApproveMaxPerMonthVnd: 10_000_000,
    mandatoryCeoThresholdVnd: 2_000_000,
    allowedAutoCategories: ['Công cụ / SaaS', 'Tên miền / Hosting', 'Token AI', 'Quảng cáo'],
    blockedAutoCategories: [
      'Quảng cáo lần đầu',
      'Nhà cung cấp mới',
      'Quà tặng / Tiền mặt',
      'Hợp đồng dài hạn',
    ],
    requireOneTimeCeoRuleConfirm: true,
    blockBudgetAt100Percent: true,
    anomalyThresholdPercent: 30,
    overdueReminderHours: 4,
    updatedAt: Date.now(),
  };
}

export function currentMonthKey(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 7);
}

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
}

export function normalizeVendor(vendor: string): string {
  return foldVietnamese(vendor).replace(/[^a-z0-9]/g, '');
}

export function buildSeedExpenseBudgets(): ExpenseBudget[] {
  const mk = currentMonthKey();
  const now = Date.now();
  return [
    {
      id: `${mk}::marketing::Quảng cáo`,
      monthKey: mk,
      department: 'marketing',
      category: 'Quảng cáo',
      limitVnd: 12_000_000,
      proposedBy: 'cfo',
      ceoApproved: true,
      updatedAt: now,
    },
    {
      id: `${mk}::marketing::Công cụ / SaaS`,
      monthKey: mk,
      department: 'marketing',
      category: 'Công cụ / SaaS',
      limitVnd: 4_000_000,
      proposedBy: 'cfo',
      ceoApproved: true,
      updatedAt: now,
    },
    {
      id: `${mk}::product::Tên miền / Hosting`,
      monthKey: mk,
      department: 'product',
      category: 'Tên miền / Hosting',
      limitVnd: 5_000_000,
      proposedBy: 'cfo',
      ceoApproved: true,
      updatedAt: now,
    },
    {
      id: `${mk}::sales::Quảng cáo`,
      monthKey: mk,
      department: 'sales',
      category: 'Quảng cáo',
      limitVnd: 6_000_000,
      proposedBy: 'cfo',
      ceoApproved: true,
      updatedAt: now,
    },
    {
      id: `${mk}::all::Token AI`,
      monthKey: mk,
      department: 'all',
      category: 'Token AI',
      limitVnd: 5_000_000,
      proposedBy: 'cfo',
      ceoApproved: true,
      updatedAt: now,
    },
    {
      id: `${mk}::backoffice::Vận hành / Khác`,
      monthKey: mk,
      department: 'backoffice',
      category: 'Vận hành / Khác',
      limitVnd: 8_000_000,
      proposedBy: 'cfo',
      ceoApproved: true,
      updatedAt: now,
    },
  ];
}

export function buildSeedExpenseRules(): ExpenseRule[] {
  const now = Date.now();
  const mk = currentMonthKey(now);
  return [
    {
      id: 'rule_seed_saas',
      ruleCode: '#QT-01',
      name: 'Gia hạn Canva Pro / Hosting nhỏ hàng tháng',
      ruleType: 'accountant_auto',
      category: 'Công cụ / SaaS',
      vendorPattern: 'Canva',
      department: 'all',
      requesterId: 'all',
      maxPerExpenseVnd: 500_000,
      maxPerMonthVnd: 2_000_000,
      maxCountPerMonth: 5,
      requiresAttachment: false,
      expiresAt: now + 90 * 86400_000,
      enabled: true,
      ceoConfirmedOnce: true,
      createdBy: 'cfo',
      usageMonthKey: mk,
      usedCountMonth: 1,
      usedAmountMonthVnd: 299_000,
      createdAt: now - 86400_000 * 5,
      updatedAt: now - 86400_000 * 2,
    },
  ];
}

export function buildSeedExpenses(): ExpenseItem[] {
  const now = Date.now();
  return [
    {
      id: 'exp_seed_1',
      expenseCode: '#CP-101',
      requesterId: 'ads_specialist',
      department: 'marketing',
      projectOrCampaign: 'EduCenter Pro – Lead Q4',
      category: 'Quảng cáo',
      title: 'Ngân sách chạy Lead Ads Trung tâm Ngoại ngữ TP.HCM (7 ngày)',
      amountVnd: 1_800_000,
      frequency: 'once',
      justification: 'Tìm kiếm 35–45 trung tâm ngoại ngữ đang cần quản lý lịch học & học phí tự động.',
      expectedRoi: 'Ước tính CPL 45.000đ, 40 Lead → 3 Demo → 1 Hợp đồng (29.880.000đ).',
      vendor: 'Meta Ads Vietnam',
      dueDate: new Date(now + 2 * 86400_000).toISOString().slice(0, 10),
      attachmentName: 'ke-hoach-ads-educenter.pdf',
      status: 'pending_accountant',
      flags: [],
      simulated: true,
      history: [
        {
          at: now - 3600_000 * 2,
          actorId: 'ads_specialist',
          actorName: 'Ngô Bảo Nam',
          fromStatus: 'draft',
          toStatus: 'pending_accountant',
          note: 'Gửi đề xuất chi quảng cáo tầng 1 cho Kế toán thẩm định.',
        },
      ],
      createdAt: now - 3600_000 * 2,
      updatedAt: now - 3600_000 * 2,
    },
    {
      id: 'exp_seed_2',
      expenseCode: '#CP-100',
      requesterId: 'designer',
      department: 'marketing',
      projectOrCampaign: 'Brand Launch Kit',
      category: 'Công cụ / SaaS',
      title: 'Gia hạn Canva Teams tháng hiện tại',
      amountVnd: 299_000,
      frequency: 'recurring',
      recurringCycleDays: 30,
      nextDueAt: now + 24 * 86400_000,
      justification: 'Thiết kế banner, thumbnail TikTok/YouTube & tài liệu sales kit.',
      expectedRoi: 'Phục vụ toàn bộ 30 bài đăng/tháng & 4 sản phẩm.',
      vendor: 'Canva Pty Ltd',
      dueDate: new Date(now - 86400_000 * 3).toISOString().slice(0, 10),
      attachmentName: 'invoice-canva-100.pdf',
      status: 'paid',
      accountantId: 'cfo',
      accountantNote: 'Hợp lệ theo quy tắc #QT-01, còn trong ngân sách Công cụ Marketing.',
      accountantCheckedAt: now - 86400_000 * 4,
      ceoDecisionNote: 'Duyệt chi định kỳ.',
      ceoDecidedAt: now - 86400_000 * 3.5,
      paidAt: now - 86400_000 * 3,
      paidNote: 'Đã thanh toán thẻ công ty (mô phỏng).',
      autoApprovedByRuleId: 'rule_seed_saas',
      autoApprovedByRuleName: 'Gia hạn Canva Pro / Hosting nhỏ hàng tháng',
      flags: [],
      simulated: true,
      history: [
        {
          at: now - 86400_000 * 4,
          actorId: 'designer',
          actorName: 'Vũ Ngọc Mai',
          fromStatus: 'draft',
          toStatus: 'pending_accountant',
        },
        {
          at: now - 86400_000 * 3.5,
          actorId: 'cfo',
          actorName: 'Hồ Thảo Nhi',
          fromStatus: 'pending_accountant',
          toStatus: 'approved',
          note: 'Kế toán tự duyệt theo #QT-01',
        },
        {
          at: now - 86400_000 * 3,
          actorId: 'cfo',
          actorName: 'Hồ Thảo Nhi',
          fromStatus: 'approved',
          toStatus: 'paid',
          note: 'Đã tải chứng từ & thanh toán',
        },
      ],
      createdAt: now - 86400_000 * 4,
      updatedAt: now - 86400_000 * 3,
    },
  ];
}

export interface RiskAnalysisResult {
  flags: string[];
  budgetRemainingVnd: number | null;
  budgetLimitVnd: number | null;
  budgetUsedPct: number;
  isOverBudget100: boolean;
  isWarning80: boolean;
  isDuplicate: boolean;
  isAnomaly: boolean;
  isMissingAttachment: boolean;
  isSplitTransactionRisk: boolean;
  sameVendorTodayTotalVnd: number;
}

export function analyzeExpenseRisks(
  draft: {
    id?: string;
    department: DepartmentId;
    category: string;
    vendor: string;
    amountVnd: number;
    attachmentName?: string;
    attachmentDataUrl?: string;
  },
  allExpenses: ExpenseItem[],
  budgets: ExpenseBudget[],
  policy: SpendingPolicy
): RiskAnalysisResult {
  const mk = currentMonthKey();
  const flags: string[] = [];

  // 1. Budget check (match exact dept+category, or all+category)
  const budget =
    budgets.find((b) => b.monthKey === mk && b.department === draft.department && b.category === draft.category) ||
    budgets.find((b) => b.monthKey === mk && b.department === 'all' && b.category === draft.category);

  const monthSpent = allExpenses
    .filter((e) => {
      if (e.id === draft.id) return false;
      if (e.status === 'rejected' || e.status === 'draft') return false;
      if (currentMonthKey(e.createdAt) !== mk) return false;
      if (e.category !== draft.category) return false;
      if (budget?.department === 'all') return true;
      return e.department === draft.department;
    })
    .reduce((acc, e) => acc + e.amountVnd, 0);

  let budgetRemainingVnd: number | null = null;
  let budgetLimitVnd: number | null = null;
  let budgetUsedPct = 0;
  let isOverBudget100 = false;
  let isWarning80 = false;

  if (budget && budget.limitVnd > 0) {
    budgetLimitVnd = budget.limitVnd;
    const projected = monthSpent + draft.amountVnd;
    budgetUsedPct = Math.round((projected / budget.limitVnd) * 100);
    budgetRemainingVnd = budget.limitVnd - monthSpent;

    if (projected > budget.limitVnd && !budget.unlockedOverLimit) {
      isOverBudget100 = true;
      flags.push(`Vượt 100% ngân sách tháng (${formatVnd(projected)} / ${formatVnd(budget.limitVnd)})`);
    } else if (budgetUsedPct >= 80) {
      isWarning80 = true;
      flags.push(`Đạt ${budgetUsedPct}% ngân sách tháng mục ${draft.category}`);
    }
  }

  // 2. Duplicate check (same normalized vendor + exact amount within 48h)
  const normV = normalizeVendor(draft.vendor);
  const now = Date.now();
  const dup = allExpenses.find(
    (e) =>
      e.id !== draft.id &&
      e.status !== 'rejected' &&
      normalizeVendor(e.vendor) === normV &&
      Math.abs(e.amountVnd - draft.amountVnd) < 1000 &&
      now - e.createdAt < 48 * 3600_000
  );
  const isDuplicate = Boolean(dup);
  if (dup) {
    flags.push(`Nghi trùng khoản chi ${dup.expenseCode} cùng nhà cung cấp trong 48h`);
  }

  // 3. Anomaly >30% above historical category average
  const catHistory = allExpenses.filter(
    (e) => e.id !== draft.id && e.category === draft.category && e.status !== 'rejected' && e.amountVnd > 0
  );
  let isAnomaly = false;
  if (catHistory.length >= 2) {
    const avg = catHistory.reduce((s, e) => s + e.amountVnd, 0) / catHistory.length;
    const threshold = avg * (1 + (policy.anomalyThresholdPercent || 30) / 100);
    if (draft.amountVnd > threshold) {
      isAnomaly = true;
      flags.push(`Bất thường: cao hơn >${policy.anomalyThresholdPercent}% mức TB lịch sử (${formatVnd(avg)})`);
    }
  }

  // 4. Missing quote/invoice attachment for >= 1,000,000đ
  const hasAtt = Boolean(draft.attachmentName?.trim() || draft.attachmentDataUrl?.trim());
  const isMissingAttachment = draft.amountVnd >= 1_000_000 && !hasAtt;
  if (isMissingAttachment) {
    flags.push('Khoản chi ≥ 1.000.000đ nhưng chưa đính kèm báo giá / hóa đơn');
  }

  // 5. Split-transaction check (aggregate today's spend for same vendor)
  const todayKey = new Date(now).toISOString().slice(0, 10);
  const sameVendorTodayPrior = allExpenses
    .filter(
      (e) =>
        e.id !== draft.id &&
        e.status !== 'rejected' &&
        normalizeVendor(e.vendor) === normV &&
        new Date(e.createdAt).toISOString().slice(0, 10) === todayKey
    )
    .reduce((s, e) => s + e.amountVnd, 0);
  const sameVendorTodayTotalVnd = sameVendorTodayPrior + draft.amountVnd;
  const isSplitTransactionRisk =
    sameVendorTodayPrior > 0 &&
    (sameVendorTodayTotalVnd > policy.autoApproveMaxPerTxVnd ||
      sameVendorTodayTotalVnd >= policy.mandatoryCeoThresholdVnd);
  if (isSplitTransactionRisk) {
    flags.push(
      `Cảnh báo tách nhỏ hóa đơn: tổng chi hôm nay cho "${draft.vendor}" = ${formatVnd(sameVendorTodayTotalVnd)}`
    );
  }

  return {
    flags,
    budgetRemainingVnd,
    budgetLimitVnd,
    budgetUsedPct,
    isOverBudget100,
    isWarning80,
    isDuplicate,
    isAnomaly,
    isMissingAttachment,
    isSplitTransactionRisk,
    sameVendorTodayTotalVnd,
  };
}

export function validateRuleAgainstPolicy(
  rule: Partial<ExpenseRule>,
  policy: SpendingPolicy
): { valid: boolean; reason?: string } {
  const maxTx = Number(rule.maxPerExpenseVnd || 0);
  const maxMo = Number(rule.maxPerMonthVnd || 0);
  const cat = String(rule.category || '');

  if (maxTx <= 0 || maxMo <= 0) {
    return { valid: false, reason: 'Hạn mức mỗi lần và tổng tháng phải lớn hơn 0đ.' };
  }
  if (maxTx > policy.autoApproveMaxPerTxVnd) {
    return {
      valid: false,
      reason: `Vượt trần chính sách CEO: tối đa mỗi lần là ${formatVnd(policy.autoApproveMaxPerTxVnd)}.`,
    };
  }
  if (maxTx >= policy.mandatoryCeoThresholdVnd) {
    return {
      valid: false,
      reason: `Ngưỡng ${formatVnd(policy.mandatoryCeoThresholdVnd)} trở lên bắt buộc CEO duyệt, không được tạo quy tắc tự duyệt.`,
    };
  }
  if (maxMo > policy.autoApproveMaxPerMonthVnd) {
    return {
      valid: false,
      reason: `Tổng hạn mức tháng vượt trần chính sách CEO (${formatVnd(policy.autoApproveMaxPerMonthVnd)}).`,
    };
  }
  if (cat !== '*' && policy.blockedAutoCategories.includes(cat)) {
    return {
      valid: false,
      reason: `Hạng mục "${cat}" nằm trong danh sách bị CEO cấm tự duyệt.`,
    };
  }
  return { valid: true };
}

export interface AutoRuleMatchResult {
  matchedRule?: ExpenseRule;
  targetStatus: 'pending_accountant' | 'pending_ceo' | 'approved';
  reason: string;
  fallbackToNormalReason?: string;
}

export function evaluateAutoApprovalRule(
  expense: Pick<
    ExpenseItem,
    'department' | 'category' | 'vendor' | 'amountVnd' | 'requesterId' | 'attachmentName' | 'attachmentDataUrl'
  >,
  rules: ExpenseRule[],
  policy: SpendingPolicy,
  risk: RiskAnalysisResult
): AutoRuleMatchResult {
  const now = Date.now();
  const mk = currentMonthKey(now);

  // Hard security ceilings first
  if (expense.amountVnd >= policy.mandatoryCeoThresholdVnd) {
    return {
      targetStatus: 'pending_accountant',
      reason: `Khoản chi ≥ ${formatVnd(policy.mandatoryCeoThresholdVnd)} bắt buộc qua Kế toán + CEO duyệt.`,
    };
  }

  if (policy.blockedAutoCategories.includes(expense.category)) {
    return {
      targetStatus: 'pending_accountant',
      reason: `Hạng mục "${expense.category}" thuộc danh mục cấm tự duyệt theo Chính sách CEO.`,
    };
  }

  if (risk.isDuplicate || risk.isAnomaly || risk.isSplitTransactionRisk || (risk.isOverBudget100 && policy.blockBudgetAt100Percent)) {
    return {
      targetStatus: 'pending_accountant',
      reason: 'Có cờ rủi ro (trùng/bất thường/tách nhỏ/vượt ngân sách), chuyển về quy trình duyệt 2 tầng chuẩn.',
      fallbackToNormalReason: risk.flags.join('; '),
    };
  }

  const vendorLower = foldVietnamese(expense.vendor);
  const hasAtt = Boolean(expense.attachmentName?.trim() || expense.attachmentDataUrl?.trim());

  for (const rule of rules) {
    if (!rule.enabled || rule.revokedByCeo) continue;
    if (rule.expiresAt && rule.expiresAt < now) continue;
    if (policy.requireOneTimeCeoRuleConfirm && rule.ruleType === 'full_auto' && !rule.ceoConfirmedOnce) {
      continue;
    }

    if (rule.category !== '*' && rule.category !== expense.category) continue;
    if (rule.department !== 'all' && rule.department !== expense.department) continue;
    if (rule.requesterId !== 'all' && rule.requesterId !== expense.requesterId) continue;

    if (rule.vendorPattern && rule.vendorPattern.trim() !== '*') {
      const pat = foldVietnamese(rule.vendorPattern);
      if (!vendorLower.includes(pat)) continue;
    }

    if (rule.requiresAttachment && !hasAtt) {
      return {
        targetStatus: 'pending_accountant',
        reason: `Khớp ${rule.ruleCode} nhưng thiếu chứng từ đính kèm bắt buộc.`,
        fallbackToNormalReason: `Quy tắc ${rule.ruleCode} yêu cầu hóa đơn/chứng từ.`,
      };
    }

    if (expense.amountVnd > rule.maxPerExpenseVnd || expense.amountVnd > policy.autoApproveMaxPerTxVnd) {
      continue;
    }

    const usedCount = rule.usageMonthKey === mk ? rule.usedCountMonth : 0;
    const usedAmt = rule.usageMonthKey === mk ? rule.usedAmountMonthVnd : 0;

    if (usedCount + 1 > rule.maxCountPerMonth) {
      return {
        targetStatus: 'pending_accountant',
        reason: `Quy tắc ${rule.ruleCode} đã hết lượt tự duyệt tháng (${usedCount}/${rule.maxCountPerMonth}).`,
        fallbackToNormalReason: `Đã dùng hết số lượt trong tháng của ${rule.ruleCode}.`,
      };
    }

    if (usedAmt + expense.amountVnd > Math.min(rule.maxPerMonthVnd, policy.autoApproveMaxPerMonthVnd)) {
      return {
        targetStatus: 'pending_accountant',
        reason: `Quy tắc ${rule.ruleCode} sắp vượt hạn mức tháng (${formatVnd(usedAmt + expense.amountVnd)} / ${formatVnd(rule.maxPerMonthVnd)}).`,
        fallbackToNormalReason: `Vượt hạn mức tháng của quy tắc ${rule.ruleCode}.`,
      };
    }

    return {
      matchedRule: rule,
      targetStatus: 'approved',
      reason:
        rule.ruleType === 'full_auto'
          ? `Tự động duyệt hoàn toàn theo ${rule.ruleCode} (${rule.name})`
          : `Kế toán tự duyệt trong hạn mức ${rule.ruleCode} (${rule.name})`,
    };
  }

  return {
    targetStatus: 'pending_accountant',
    reason: 'Không khớp quy tắc tự duyệt đang hiệu lực — gửi Kế toán thẩm định tầng 1.',
  };
}

export function computeFinancialAnalytics(params: {
  expenses: ExpenseItem[];
  leads: LeadItem[];
  ads: AdCampaignItem[];
  channels: MarketingChannelRecord[];
  budgets: ExpenseBudget[];
  departments: DepartmentConfig[];
}) {
  const { expenses, leads, ads, budgets, departments } = params;
  const mk = currentMonthKey();

  const validMonthExpenses = expenses.filter(
    (e) => e.status !== 'rejected' && e.status !== 'draft' && currentMonthKey(e.createdAt) === mk
  );
  const committedOrPaid = validMonthExpenses.filter((e) =>
    ['approved', 'paid', 'reconciled'].includes(e.status)
  );
  const pendingTotalVnd = validMonthExpenses
    .filter((e) => e.status === 'pending_accountant' || e.status === 'pending_ceo' || e.status === 'needs_info')
    .reduce((s, e) => s + e.amountVnd, 0);

  const monthApprovedVnd = committedOrPaid.reduce((s, e) => s + e.amountVnd, 0);
  const monthPaidVnd = validMonthExpenses
    .filter((e) => e.status === 'paid' || e.status === 'reconciled')
    .reduce((s, e) => s + e.amountVnd, 0);
  const totalBudgetVnd = budgets.filter((b) => b.monthKey === mk).reduce((s, b) => s + b.limitVnd, 0);

  const wonRevenueVnd = leads
    .filter((l) => l.stage === 'won')
    .reduce((s, l) => s + (l.estimatedValueVnd || 0), 0);

  // CAC per channel from Ads + Paid marketing expenses + Leads by source
  const channelKeys: Array<{ key: string; label: string }> = [
    { key: 'facebook', label: 'Facebook / Fanpage' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'zalo_oa', label: 'Zalo OA' },
    { key: 'google_business', label: 'Google / SEO' },
  ];

  const cacByChannel = channelKeys.map((ch) => {
    const adSpend = ads
      .filter((a) => a.platform === ch.key)
      .reduce((s, a) => s + (a.spentVnd || 0), 0);
    const adLeads = ads
      .filter((a) => a.platform === ch.key)
      .reduce((s, a) => s + (a.leads || 0), 0);
    const crmLeads = leads.filter((l) => foldVietnamese(l.source).includes(ch.key.split('_')[0])).length;
    const expSpend = committedOrPaid
      .filter((e) => foldVietnamese(e.vendor + ' ' + e.title).includes(ch.key.split('_')[0]))
      .reduce((s, e) => s + e.amountVnd, 0);
    const spendVnd = Math.max(adSpend, expSpend);
    const leadsCount = Math.max(adLeads, crmLeads);
    const wonCount = leads.filter(
      (l) => l.stage === 'won' && foldVietnamese(l.source).includes(ch.key.split('_')[0])
    ).length;

    return {
      channel: ch.label,
      spendVnd,
      leadsCount,
      wonCount,
      cplVnd: leadsCount > 0 ? Math.round(spendVnd / leadsCount) : 0,
      cacVnd: wonCount > 0 ? Math.round(spendVnd / wonCount) : spendVnd,
    };
  });

  // Spend by department
  const spendByDepartment = departments.map((d) => {
    const spent = committedOrPaid
      .filter((e) => e.department === d.id)
      .reduce((s, e) => s + e.amountVnd, 0);
    const budget = budgets
      .filter((b) => b.monthKey === mk && b.department === d.id)
      .reduce((s, b) => s + b.limitVnd, 0);
    return {
      departmentId: d.id,
      name: d.shortName,
      spentVnd: spent,
      budgetVnd: budget,
    };
  }).filter((row) => row.spentVnd > 0 || row.budgetVnd > 0);

  // Spend by category
  const catMap = new Map<string, number>();
  for (const e of committedOrPaid) {
    catMap.set(e.category, (catMap.get(e.category) || 0) + e.amountVnd);
  }
  const spendByCategory = Array.from(catMap.entries()).map(([category, amountVnd]) => ({
    category,
    amountVnd,
  }));

  const missingReceiptItems = expenses.filter(
    (e) =>
      (e.status === 'paid' || e.status === 'approved') &&
      !e.attachmentName &&
      !e.attachmentDataUrl &&
      e.category !== 'Token AI'
  );

  const upcomingRecurring = expenses
    .filter((e) => e.frequency === 'recurring' && e.status !== 'rejected' && e.nextDueAt)
    .sort((a, b) => (a.nextDueAt || 0) - (b.nextDueAt || 0));

  return {
    monthKey: mk,
    monthApprovedVnd,
    monthPaidVnd,
    pendingTotalVnd,
    totalBudgetVnd,
    wonRevenueVnd,
    cacByChannel,
    spendByDepartment,
    spendByCategory,
    missingReceiptItems,
    upcomingRecurring,
  };
}

export function exportExpensesCsv(expenses: ExpenseItem[], agents: AgentProfile[]): string {
  const header = [
    'Mã phiếu',
    'Ngày tạo',
    'Người xin',
    'Phòng ban',
    'Hạng mục',
    'Tiêu đề',
    'Nhà cung cấp',
    'Số tiền (VND)',
    'Trạng thái',
    'Quy tắc tự duyệt',
    'Chứng từ',
  ];
  const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = expenses.map((e) => {
    const req = agents.find((a) => a.id === e.requesterId);
    return [
      e.expenseCode,
      new Date(e.createdAt).toLocaleString('vi-VN'),
      req?.name || e.requesterId,
      e.department,
      e.category,
      e.title,
      e.vendor,
      e.amountVnd,
      e.status,
      e.autoApprovedByRuleName || '',
      e.attachmentName || '',
    ].map(esc).join(',');
  });
  return '\uFEFF' + [header.map(esc).join(','), ...rows].join('\n');
}
