import {
  AffiliateCommission,
  AgentProfile,
  ExpenseItem,
  LeadItem,
  OkrObjective,
  ProductMasterRecord,
  RevenueFunnelLine,
  RevenueFunnelPlan,
  TaskItem,
} from '../types';

export function buildSeedOkrObjectives(): OkrObjective[] {
  const now = Date.now();
  return [
    {
      id: 'okr_y_default',
      periodType: 'year',
      periodLabel: 'Năm 2026',
      title: 'Mục tiêu Tăng trưởng Doanh thu AI Company 2026',
      targetRevenueVnd: 1_200_000_000,
      productId: '',
      channel: 'Đa kênh (SaaS + Website + Affiliate)',
      ownerAgentId: 'coo',
      deadline: '2026-12-31',
      assumptions: [
        'Phân bổ 65% doanh thu từ SaaS định kỳ & Thiết kế Website, 35% từ Khối Affiliate Tầng 3.',
      ],
      keyResults: [
        {
          id: 'kr_y_1',
          title: 'Tổng doanh thu ghi nhận cả năm (VND)',
          metricUnit: 'VND',
          baselineValue: 0,
          targetValue: 1_200_000_000,
          currentValue: 29_880_000,
          dataSource: 'crm',
          verified: false,
        },
      ],
      status: 'on_track',
      createdAt: now - 86_400_000,
      updatedAt: now - 86_400_000,
    },
    {
      id: 'okr_q_default',
      parentObjectiveId: 'okr_y_default',
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
    {
      id: 'okr_m_default',
      parentObjectiveId: 'okr_q_default',
      periodType: 'month',
      periodLabel: 'Tháng này',
      title: 'Mục tiêu 100 triệu EduCenter Pro trong tháng',
      targetRevenueVnd: 100_000_000,
      productId: 'edu-center',
      channel: 'Zalo OA + Email + Demo 1-1',
      ownerAgentId: 'sales_director',
      deadline: new Date(now + 28 * 86_400_000).toISOString().slice(0, 10),
      assumptions: [
        'Mục tiêu 100tr/tháng riêng cho EduCenter Pro; đối soát thanh toán qua HubCW & CRM.',
      ],
      keyResults: [
        {
          id: 'kr_m_1',
          title: 'Doanh thu EduCenter Pro tháng này (VND)',
          metricUnit: 'VND',
          baselineValue: 0,
          targetValue: 100_000_000,
          currentValue: 29_880_000,
          dataSource: 'crm',
          verified: false,
        },
      ],
      status: 'at_risk',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Computes reverse revenue funnel strictly from REAL CRM/HubCW/Affiliate data when sample size >= 3.
 * Any missing historical conversion rate is explicitly tagged 'giả định, cần kiểm chứng' with Low/Mid/High bounds.
 */
export function calculateRevenueFunnel(params: {
  objective: OkrObjective;
  leads: LeadItem[];
  commissions: AffiliateCommission[];
  expenses: ExpenseItem[];
  products?: ProductMasterRecord[];
  elapsedRatio?: number; // 0..1 of period elapsed
}): RevenueFunnelPlan {
  const { objective, leads, commissions, expenses, products } = params;
  const elapsedRatio = Math.min(1, Math.max(0.05, params.elapsedRatio ?? 0.35));

  const scopedLeads = objective.productId
    ? leads.filter((l) => l.recommendedProductId === objective.productId)
    : leads;
  const effectiveLeads = scopedLeads.length > 0 ? scopedLeads : leads;

  const wonLeads = effectiveLeads.filter((l) => l.stage === 'won');
  const demoOrMore = effectiveLeads.filter((l) => ['demo', 'proposal', 'won'].includes(l.stage));
  const qualifiedOrMore = effectiveLeads.filter((l) => ['replied', 'demo', 'proposal', 'won'].includes(l.stage));

  // Real AOV when >= 2 won deals have values, otherwise fallback to product mid-tier or assumption
  const matchedProd = objective.productId ? products?.find((p) => p.id === objective.productId) : undefined;
  const prodDefaultPrice = matchedProd?.tiers?.[1]?.priceVnd || matchedProd?.tiers?.[0]?.priceVnd || 22_000_000;
  const realWonValues = wonLeads.map((l) => l.estimatedValueVnd).filter((v) => v > 0);
  const aovIsReal = realWonValues.length >= 2;
  const avgOrderValueVnd = aovIsReal
    ? Math.round(realWonValues.reduce((s, v) => s + v, 0) / realWonValues.length)
    : prodDefaultPrice;

  // Real conversion rates (require >= 3 samples, else mark assumption)
  const winRateReal = demoOrMore.length >= 3;
  const winRate = winRateReal ? Math.max(0.08, wonLeads.length / demoOrMore.length) : 0.25;

  const demoRateReal = qualifiedOrMore.length >= 3;
  const demoRate = demoRateReal ? Math.max(0.15, demoOrMore.length / qualifiedOrMore.length) : 0.4;

  const replyRateReal = effectiveLeads.length >= 5;
  const replyRate = replyRateReal ? Math.max(0.08, qualifiedOrMore.length / effectiveLeads.length) : 0.18;

  const targetDeals = Math.max(1, Math.ceil(objective.targetRevenueVnd / Math.max(1_000_000, avgOrderValueVnd)));
  const targetDemos = Math.ceil(targetDeals / winRate);
  const targetQualified = Math.ceil(targetDemos / demoRate);
  const targetOutreachLeads = Math.ceil(targetQualified / replyRate);
  const targetTouchesAndPosts = Math.ceil(targetOutreachLeads * 2.5);

  const steps: RevenueFunnelLine[] = [
    {
      stageLabel: '0. Lượt tiếp cận / Tin nhắn & Bài nội dung cần chạy',
      value: targetTouchesAndPosts,
      conversionRatePercent: 40,
      isRealMetric: false,
      statusTag: 'giả định, cần kiểm chứng',
      sourceLabel: 'Ước lượng kênh Zalo OA + Email + Nội dung (chưa đủ lịch sử CTR)',
      confidence: 'low',
      lowScenario: Math.ceil(targetTouchesAndPosts * 1.4),
      midScenario: targetTouchesAndPosts,
      highScenario: Math.ceil(targetTouchesAndPosts * 0.75),
    },
    {
      stageLabel: '1. Tổng Lead cần tiếp cận (Outreach/Inbound)',
      value: targetOutreachLeads,
      conversionRatePercent: Math.round(replyRate * 100),
      isRealMetric: replyRateReal,
      statusTag: replyRateReal ? 'Mục tiêu' : 'giả định, cần kiểm chứng',
      sourceLabel: replyRateReal ? `CRM (${effectiveLeads.length} lead thực tế)` : 'Giả định ngành (thiếu >= 5 lead)',
      confidence: replyRateReal ? 'high' : 'low',
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
      sourceLabel: demoRateReal ? `CRM (${qualifiedOrMore.length} SQL thực tế)` : 'Giả định B2B (thiếu >= 3 SQL)',
      confidence: demoRateReal ? 'medium' : 'low',
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
      sourceLabel: winRateReal ? `CRM (${demoOrMore.length} Demo thực tế)` : 'Giả định tỷ lệ chốt 25% (thiếu >= 3 Demo)',
      confidence: winRateReal ? 'medium' : 'low',
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
      sourceLabel: aovIsReal ? `CRM / HubCW (${realWonValues.length} đơn chốt)` : `Bảng giá SP (${matchedProd?.shortName || 'Mặc định'})`,
      confidence: aovIsReal ? 'high' : 'medium',
      lowScenario: Math.max(1, targetDeals - 1),
      midScenario: targetDeals,
      highScenario: targetDeals + 2,
    },
  ];

  // Recognized vs Collected vs AR
  const approvedAffVnd = objective.productId
    ? 0
    : commissions.filter((c) => c.status === 'approved' || c.status === 'paid').reduce((s, c) => s + c.commissionVnd, 0);
  const paidAffVnd = objective.productId
    ? 0
    : commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.commissionVnd, 0);

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

  const periodMonths =
    objective.periodType === 'year'
      ? 12
      : objective.periodType === 'quarter'
      ? 3
      : objective.periodType === 'month'
      ? 1
      : 0.25;
  const runRateMonthlyVnd = Math.round(recognizedRevenueVnd / Math.max(0.25, elapsedRatio * periodMonths));
  const projectedPeriodEndVnd = Math.round(recognizedRevenueVnd / elapsedRatio);

  const paidMarketingSpendVnd = expenses
    .filter((e) => (e.status === 'paid' || e.status === 'reconciled') && e.department === 'marketing')
    .reduce((s, e) => s + e.amountVnd, 0);

  const gapVnd = Math.max(0, objective.targetRevenueVnd - recognizedRevenueVnd);
  const recoverySuggestions: string[] = [];
  if (behindAlertTriggered) {
    recoverySuggestions.push(
      `Đang chậm ${Math.abs(scheduleGapPercent)}% (thiếu ${gapVnd.toLocaleString('vi-VN')}đ so với mục tiêu kỳ) — đề xuất SDR tăng follow-up các Lead Demo/Proposal (${demoOrMore.length} cơ hội nóng).`
    );
    recoverySuggestions.push(
      `Để bù ${gapVnd.toLocaleString('vi-VN')}đ: cần thêm ~${Math.ceil(gapVnd / Math.max(1_000_000, avgOrderValueVnd))} đơn chốt hoặc tối ưu tỷ lệ Demo→Won thêm +8%.`
    );
  }
  if (!aovIsReal || !winRateReal) {
    recoverySuggestions.push(
      'Một số tỷ lệ chuyển đổi đang gắn nhãn "giả định, cần kiểm chứng" do chưa đủ mẫu chốt thực tế trên CRM/HubCW.'
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

export function buildRevenueBreakdownDashboard(params: {
  leads: LeadItem[];
  commissions: AffiliateCommission[];
  products: ProductMasterRecord[];
  agents: AgentProfile[];
  tasks: TaskItem[];
}) {
  const { leads, commissions, products, agents, tasks } = params;
  const wonLeads = leads.filter((l) => l.stage === 'won');

  const byProduct = products.map((p) => {
    const pLeads = leads.filter((l) => l.recommendedProductId === p.id);
    const pWon = pLeads.filter((l) => l.stage === 'won');
    const actualVnd = pWon.reduce((s, l) => s + (l.estimatedValueVnd || 0), 0);
    const pipelineVnd = pLeads.filter((l) => l.stage !== 'lost' && l.stage !== 'won').reduce((s, l) => s + (l.estimatedValueVnd || 0), 0);
    return {
      productId: p.id,
      name: p.shortName,
      actualVnd,
      pipelineForecastVnd: actualVnd + Math.round(pipelineVnd * 0.25),
      wonCount: pWon.length,
      leadCount: pLeads.length,
    };
  });

  const affApprovedVnd = commissions
    .filter((c) => c.status === 'approved' || c.status === 'paid')
    .reduce((s, c) => s + c.commissionVnd, 0);

  const byChannel = [
    {
      channel: 'Zalo OA / Email / Sales 1-1',
      actualVnd: wonLeads.reduce((s, l) => s + (l.estimatedValueVnd || 0), 0),
      dealsOrOrders: wonLeads.length,
    },
    {
      channel: 'Affiliate Tầng 3',
      actualVnd: affApprovedVnd,
      dealsOrOrders: commissions.filter((c) => c.status === 'approved' || c.status === 'paid').length,
    },
  ];

  const agentKpiRows = agents
    .filter((a) => a.employmentStatus !== 'archived' && ['sales', 'marketing', 'aff_exec', 'aff_channel', 'cs'].includes(a.department))
    .slice(0, 12)
    .map((ag) => {
      const agTasks = tasks.filter((t) => t.assignedTo === ag.id);
      const doneTasks = agTasks.filter((t) => t.status === 'done').length;
      const delayedTasks = agTasks.filter((t) => t.delayNotified && t.status !== 'done').length;
      const agWon = wonLeads.filter((l) => l.assignedAgentId === ag.id);
      const revenueVnd = agWon.reduce((s, l) => s + (l.estimatedValueVnd || 0), 0);
      const perfScore = ag.performanceScore ?? Math.max(45, Math.min(99, 78 + doneTasks * 4 + agWon.length * 6 - delayedTasks * 10));
      return {
        agentId: ag.id,
        name: ag.name,
        department: ag.department,
        doneTasks,
        delayedTasks,
        revenueVnd,
        performanceScore: perfScore,
      };
    });

  return {
    byProduct,
    byChannel,
    agentKpiRows,
  };
}

