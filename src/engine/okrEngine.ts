import {
  AffiliateCommission,
  ExpenseItem,
  LeadItem,
  OkrObjective,
  RevenueFunnelLine,
  RevenueFunnelPlan,
} from '../types';

export function buildSeedOkrObjectives(): OkrObjective[] {
  const now = Date.now();
  return [
    {
      id: 'okr_q_default',
      periodType: 'quarter',
      periodLabel: 'Quý hiện tại',
      title: 'Mục tiêu doanh thu SaaS & Affiliate Quý hiện tại',
      targetRevenueVnd: 180_000_000,
      productId: 'edu-center',
      channel: 'Zalo OA + Email + Demo 1-1',
      ownerAgentId: 'sales_director',
      deadline: new Date(now + 75 * 86_400_000).toISOString().slice(0, 10),
      assumptions: [
        'Tập trung sản phẩm chủ lực EduCenter Pro (Gói Tăng Trưởng 12 tháng)',
        'Chưa tính đơn hàng Website custom lớn (>30tr) vào đường cơ sở',
      ],
      keyResults: [
        {
          id: 'kr_1',
          title: 'Doanh thu ký mới SaaS (VND)',
          metricUnit: 'VND',
          baselineValue: 0,
          targetValue: 180_000_000,
          currentValue: 29_880_000,
          dataSource: 'crm',
          verified: false,
        },
        {
          id: 'kr_2',
          title: 'Số buổi Demo 1-1 thực hiện thành công',
          metricUnit: 'buổi',
          baselineValue: 0,
          targetValue: 24,
          currentValue: 4,
          dataSource: 'crm',
          verified: true,
        },
        {
          id: 'kr_3',
          title: 'Hoa hồng Affiliate đã duyệt',
          metricUnit: 'VND',
          baselineValue: 0,
          targetValue: 35_000_000,
          currentValue: 0,
          dataSource: 'affiliate',
          verified: false,
        },
      ],
      status: 'on_track',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Computes reverse revenue funnel strictly from REAL CRM/Affiliate data when sample size >= 3.
 * Any missing historical conversion rate is explicitly tagged 'giả định, cần kiểm chứng' with Low/Mid/High bounds.
 */
export function calculateRevenueFunnel(params: {
  objective: OkrObjective;
  leads: LeadItem[];
  commissions: AffiliateCommission[];
  expenses: ExpenseItem[];
  elapsedRatio?: number; // 0..1 of period elapsed (default 0.35)
}): RevenueFunnelPlan {
  const { objective, leads, commissions, expenses } = params;
  const elapsedRatio = Math.min(1, Math.max(0.05, params.elapsedRatio ?? 0.35));

  const wonLeads = leads.filter((l) => l.stage === 'won');
  const demoOrMore = leads.filter((l) => ['demo', 'proposal', 'won'].includes(l.stage));
  const qualifiedOrMore = leads.filter((l) => ['replied', 'demo', 'proposal', 'won'].includes(l.stage));

  // Real AOV when >= 2 won deals have values, otherwise fallback assumption clearly flagged
  const realWonValues = wonLeads.map((l) => l.estimatedValueVnd).filter((v) => v > 0);
  const aovIsReal = realWonValues.length >= 2;
  const avgOrderValueVnd = aovIsReal
    ? Math.round(realWonValues.reduce((s, v) => s + v, 0) / realWonValues.length)
    : 22_000_000;

  // Real conversion rates (require >= 3 samples, else mark assumption)
  const winRateReal = demoOrMore.length >= 3;
  const winRate = winRateReal ? Math.max(0.08, wonLeads.length / demoOrMore.length) : 0.25;

  const demoRateReal = qualifiedOrMore.length >= 3;
  const demoRate = demoRateReal ? Math.max(0.15, demoOrMore.length / qualifiedOrMore.length) : 0.4;

  const replyRateReal = leads.length >= 5;
  const replyRate = replyRateReal ? Math.max(0.08, qualifiedOrMore.length / leads.length) : 0.18;

  const targetDeals = Math.max(1, Math.ceil(objective.targetRevenueVnd / Math.max(1_000_000, avgOrderValueVnd)));
  const targetDemos = Math.ceil(targetDeals / winRate);
  const targetQualified = Math.ceil(targetDemos / demoRate);
  const targetOutreachLeads = Math.ceil(targetQualified / replyRate);

  const steps: RevenueFunnelLine[] = [
    {
      stageLabel: '1. Tổng Lead cần tiếp cận (Outreach/Inbound)',
      value: targetOutreachLeads,
      conversionRatePercent: Math.round(replyRate * 100),
      isRealMetric: replyRateReal,
      statusTag: replyRateReal ? 'Mục tiêu' : 'giả định, cần kiểm chứng',
      lowScenario: Math.ceil(targetOutreachLeads * 1.35),
      midScenario: targetOutreachLeads,
      highScenario: Math.ceil(targetOutreachLeads * 0.78),
    },
    {
      stageLabel: '2. Lead phản hồi & đủ điều kiện (SQL)',
      value: targetQualified,
      conversionRatePercent: Math.round(demoRate * 100),
      isRealMetric: demoRateReal,
      statusTag: demoRateReal ? 'Mục tiêu' : 'giả định, cần kiểm chứng',
      lowScenario: Math.ceil(targetQualified * 1.25),
      midScenario: targetQualified,
      highScenario: Math.ceil(targetQualified * 0.85),
    },
    {
      stageLabel: '3. Buổi Demo / Tư vấn sâu',
      value: targetDemos,
      conversionRatePercent: Math.round(winRate * 100),
      isRealMetric: winRateReal,
      statusTag: winRateReal ? 'Mục tiêu' : 'giả định, cần kiểm chứng',
      lowScenario: Math.ceil(targetDemos * 1.25),
      midScenario: targetDemos,
      highScenario: Math.ceil(targetDemos * 0.85),
    },
    {
      stageLabel: '4. Hợp đồng chốt mới (Won Deals)',
      value: targetDeals,
      conversionRatePercent: 100,
      isRealMetric: aovIsReal,
      statusTag: aovIsReal ? 'Mục tiêu' : 'giả định, cần kiểm chứng',
      lowScenario: Math.max(1, targetDeals - 1),
      midScenario: targetDeals,
      highScenario: targetDeals + 2,
    },
  ];

  // Recognized vs Collected vs AR
  const approvedAffVnd = commissions
    .filter((c) => c.status === 'approved' || c.status === 'paid')
    .reduce((s, c) => s + c.commissionVnd, 0);
  const paidAffVnd = commissions
    .filter((c) => c.status === 'paid')
    .reduce((s, c) => s + c.commissionVnd, 0);

  const recognizedCrmVnd = wonLeads.reduce((s, l) => s + (l.estimatedValueVnd || 0), 0);
  const recognizedRevenueVnd = recognizedCrmVnd + approvedAffVnd;
  const collectedCashVnd = Math.round(recognizedCrmVnd * 0.7) + paidAffVnd;
  const accountsReceivableVnd = Math.max(0, recognizedRevenueVnd - collectedCashVnd);

  const expectedByNowVnd = Math.round(objective.targetRevenueVnd * elapsedRatio);
  const scheduleGapPercent =
    expectedByNowVnd > 0
      ? Math.round(((recognizedRevenueVnd - expectedByNowVnd) / expectedByNowVnd) * 100)
      : 0;
  const behindAlertTriggered = scheduleGapPercent <= -15;

  const runRateMonthlyVnd = Math.round(recognizedRevenueVnd / Math.max(0.25, elapsedRatio * 3));
  const projectedPeriodEndVnd = Math.round(recognizedRevenueVnd / elapsedRatio);

  const paidMarketingSpendVnd = expenses
    .filter((e) => (e.status === 'paid' || e.status === 'reconciled') && e.department === 'marketing')
    .reduce((s, e) => s + e.amountVnd, 0);

  const recoverySuggestions: string[] = [];
  if (behindAlertTriggered) {
    recoverySuggestions.push(
      `Đang chậm ${Math.abs(scheduleGapPercent)}% so với tiến độ kỳ — đề xuất SDR tăng follow-up các Lead ở giai đoạn Demo/Proposal (${demoOrMore.length} lead nóng).`
    );
    recoverySuggestions.push(
      'Kiểm tra tỷ lệ chuyển đổi từ Demo -> Won và mở chiến dịch Affiliate Win bổ sung doanh thu ngắn hạn.'
    );
  }
  if (!aovIsReal || !winRateReal) {
    recoverySuggestions.push(
      'Một số tỷ lệ chuyển đổi đang gắn nhãn "giả định, cần kiểm chứng" do chưa đủ dữ liệu chốt thực tế.'
    );
  }
  if (paidMarketingSpendVnd > 0 && recognizedRevenueVnd === 0) {
    recoverySuggestions.push('Đã phát sinh chi phí Marketing nhưng chưa ghi nhận doanh thu thực — cần rà soát phễu chốt đơn.');
  }

  return {
    objectiveId: objective.id,
    targetRevenueVnd: objective.targetRevenueVnd,
    avgOrderValueVnd,
    aovIsReal,
    recognizedRevenueVnd,
    collectedCashVnd,
    accountsReceivableVnd,
    runRateMonthlyVnd,
    projectedPeriodEndVnd,
    scheduleGapPercent,
    behindAlertTriggered,
    steps,
    recoverySuggestions,
    computedAt: Date.now(),
  };
}
