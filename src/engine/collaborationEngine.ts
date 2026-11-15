import {
  AffiliateCommission,
  CompetitorWatchTarget,
  CrossDeptHandoverTicket,
  DepartmentId,
  DeptInteractionRule,
  ExperienceMemoryItem,
  GitRepoEvaluationReport,
  LeadItem,
  MoneyIdeaCard,
  PlaybookSkill,
  SystemHealthLog,
  TaskItem,
  UpgradeProposal,
} from '../types';

export function buildSeedInteractionRules(): DeptInteractionRule[] {
  return [
    {
      id: 'rule_lead_to_contract',
      flowName: 'Lead nóng → Demo → Báo giá → Pháp chế → Hợp đồng',
      fromDepartment: 'sales',
      toDepartment: 'legal',
      triggerCondition: 'Lead đạt giai đoạn Proposal & đồng ý dự thảo hợp đồng',
      requiredInput: 'Thông tin Bên B (Tên pháp nhân, MST, Gói SP, Giá chốt)',
      expectedOutput: 'Dự thảo Hợp đồng + Báo cáo Pháp lý trình CEO ký',
      slaMinutes: 30,
      raci: { responsible: 'sales_director', accountable: 'coo', consulted: 'legal', informed: 'cfo' },
    },
    {
      id: 'rule_content_to_publish',
      flowName: 'Sáng tạo nội dung → Pháp chế/Tuân thủ → Xuất bản Kênh',
      fromDepartment: 'marketing',
      toDepartment: 'legal',
      triggerCondition: 'Bài viết / Ads / Affiliate có nhắc giá, cam kết hiệu quả hoặc ưu đãi',
      requiredInput: 'Bản nháp nội dung + Sản phẩm liên kết + Link tracking',
      expectedOutput: 'Xác nhận Đạt chuẩn Quảng cáo & Minh bạch trước khi lên lịch đăng',
      slaMinutes: 20,
      raci: { responsible: 'cmo', accountable: 'cmo', consulted: 'compliance_reviewer', informed: 'aff_manager' },
    },
    {
      id: 'rule_cs_to_product',
      flowName: 'CSKH nhận lỗi kỹ thuật → Product & Engineering xử lý',
      fromDepartment: 'cs',
      toDepartment: 'product',
      triggerCondition: 'Khách hàng báo lỗi vận hành hoặc yêu cầu API tích hợp mới',
      requiredInput: 'Mô tả lỗi, mức độ ưu tiên, ảnh/video tái hiện (đã che PII)',
      expectedOutput: 'Ticket Product + ETA khắc phục để CSKH phản hồi khách',
      slaMinutes: 25,
      raci: { responsible: 'support_lead', accountable: 'pm', consulted: 'tech_lead', informed: 'secretary' },
    },
    {
      id: 'rule_expense_to_pay',
      flowName: 'Đề xuất chi → Kế toán Tầng 1 → CEO Tầng 2 → Thanh toán & Đối soát',
      fromDepartment: 'marketing',
      toDepartment: 'backoffice',
      triggerCondition: 'Mọi đề xuất chi Ads, domain, tool, hợp tác CTV',
      requiredInput: 'Khoản mục, nhà cung cấp, ROI kỳ vọng, chứng từ/báo giá',
      expectedOutput: 'Phiếu chi #CP-xxx thẩm định ngân sách & lịch sử đối soát',
      slaMinutes: 15,
      raci: { responsible: 'cfo', accountable: 'ceo', consulted: 'cfo', informed: 'coo' },
    },
  ];
}

export function buildSeedCompetitorWatches(): CompetitorWatchTarget[] {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: 'comp_1',
      name: 'EasyEdu / CenterOnline (Nhóm Quản lý Trung tâm)',
      publicUrl: 'https://vn.search.yahoo.com',
      niche: 'Phần mềm quản lý trung tâm ngoại ngữ',
      lastPriceNote: 'Công khai từ ~800k–2.5tr/tháng tùy số cơ sở',
      lastFeaturesNote: 'Điểm danh QR, nhắc học phí tự động, app phụ huynh',
      strengths: 'Thương hiệu lâu năm, nhiều trung tâm lớn dùng',
      weaknesses: 'Chưa có AI tự động chăm sóc Zalo OA & hợp đồng điện tử kèm pháp chế VN',
      lastCheckedAt: now,
      recentChanges: [
        { date: today, summary: 'Theo dõi định kỳ nguồn công khai: chưa ghi nhận thay đổi bảng giá mới.', severity: 'info' },
      ],
    },
    {
      id: 'comp_2',
      name: 'KidsOnline / LittleLives (Nhóm Mầm non)',
      publicUrl: 'https://moet.gov.vn',
      niche: 'Phần mềm mầm non',
      lastPriceNote: 'Tính theo đầu học sinh (~10k–18k/bé/tháng)',
      lastFeaturesNote: 'Sổ liên lạc điện tử, thực đơn dinh dưỡng',
      strengths: 'Hệ sinh thái giáo viên mầm non quen dùng',
      weaknesses: 'Chi phí theo từng bé tăng cao với trường >300 học sinh; thiếu CRM tuyển sinh',
      lastCheckedAt: now,
      recentChanges: [
        { date: today, summary: 'Đang theo dõi chính sách bảo vệ dữ liệu trẻ em trên trang công khai.', severity: 'info' },
      ],
    },
  ];
}

export function buildSeedPlaybooks(): PlaybookSkill[] {
  const now = Date.now();
  return [
    {
      id: 'pb_lead_educenter',
      name: 'Playbook Săn & Chấm điểm Lead Trung tâm Ngoại ngữ',
      department: 'sales',
      triggerIntent: 'tìm lead trung tâm ngoại ngữ',
      version: 2,
      steps: [
        '1. Gọi find_leads lọc trung tâm ngoại ngữ tại TP.HCM/Hà Nội từ nguồn công khai.',
        '2. Chạy score_lead kiểm tra quy mô cơ sở và kênh liên hệ hợp lệ.',
        '3. Gán nhãn productId=edu-center & lưu CRM chống trùng.',
      ],
      promptTemplate: 'Luôn kiểm tra SĐT/Email hợp lệ, tránh trùng CRM, phân loại nóng/ấm/lạnh theo số chi nhánh.',
      checklist: ['Không lưu khách hàng trùng lặp', 'Có nguồn công khai hợp pháp', 'Gắn đúng ProductId'],
      exampleOutput: 'Đã lọc 8 trung tâm ngoại ngữ (3 nóng, 5 ấm), gắn productId=edu-center, không trùng CRM.',
      successCount: 14,
      failureCount: 1,
      reworkCount: 1,
      avgQualityScore: 91,
      baselineQualityScore: 85,
      avgDurationMs: 2600,
      avgTokens: 1450,
      allowFastTrack: true,
      dirtyNeedsReview: false,
      updatedAt: now,
    },
    {
      id: 'pb_affiliate_compliance',
      name: 'Playbook Kiểm duyệt & Xuất bản bài Affiliate Minh bạch',
      department: 'aff_analytics',
      triggerIntent: 'duyệt bài affiliate',
      version: 1,
      steps: [
        '1. Xác minh link tracking có Aff ID chính chủ & sub_id rõ ràng.',
        '2. Chạy affiliate_compliance_check bắt buộc nhãn tiếp thị & cấm bịa trải nghiệm.',
        '3. Lưu lịch đăng & gửi duyệt nếu là bài đầu tiên hoặc chạy Ads.',
      ],
      promptTemplate: 'Bắt buộc gắn nhãn [Link tiếp thị liên kết], không cam kết quá công dụng thật.',
      checklist: ['Có sub_id tracking', 'Không bịa trải nghiệm cá nhân', 'Đạt affiliate_compliance_check'],
      exampleOutput: 'Bài viết đạt 100/100 tuân thủ, đã gắn sub_id=aff_yt_01 và nhãn tiếp thị minh bạch.',
      successCount: 9,
      failureCount: 0,
      reworkCount: 0,
      avgQualityScore: 95,
      baselineQualityScore: 88,
      avgDurationMs: 2100,
      avgTokens: 1200,
      allowFastTrack: true,
      dirtyNeedsReview: false,
      updatedAt: now,
    },
    {
      id: 'pb_expense_audit',
      name: 'Playbook Thẩm định Chi phí Tầng 1 (Kế toán)',
      department: 'backoffice',
      triggerIntent: 'thẩm định phiếu chi',
      version: 1,
      steps: [
        '1. So khớp vendor/số tiền chống trùng lặp trong 7 ngày.',
        '2. Kiểm tra ngưỡng bất thường >30% so với trung bình cùng loại.',
        '3. Đối chiếu ngân sách tháng và chuyển CEO nếu vượt ngưỡng.',
      ],
      promptTemplate: 'Tài chính rủi ro cao — tuyệt đối không bỏ qua bước kiểm tra trùng hóa đơn & ngân sách.',
      checklist: ['So khớp trùng 7 ngày', 'Kiểm tra vượt 30%', 'Cần #CP đã duyệt trước khi chi'],
      exampleOutput: 'Phiếu #CP-102 hợp lệ trong hạn mức ngân sách tháng, đã trình CEO duyệt Tầng 2.',
      successCount: 11,
      failureCount: 0,
      reworkCount: 0,
      avgQualityScore: 94,
      baselineQualityScore: 88,
      avgDurationMs: 3200,
      avgTokens: 1780,
      allowFastTrack: false,
      dirtyNeedsReview: false,
      updatedAt: now,
    },
  ];
}

export function buildSeedUpgradeProposals(): UpgradeProposal[] {
  const now = Date.now();
  return [
    {
      id: 'upg_seed_1',
      code: '#NC-01',
      title: 'Tự động tái sử dụng Playbook đã kiểm chứng cho quy trình lọc Lead & Affiliate',
      proposedBy: 'tech_lead',
      bottleneckEvidence: 'Phát hiện 35% token suy luận lặp lại ở các tác vụ chuẩn đã có quy trình ổn định.',
      solutionSummary: 'Áp dụng Playbook Cache khi điểm chất lượng >= 88, vẫn giữ Verifier kiểm tra đầu ra.',
      expectedRoi: 'Tiết kiệm ~28% chi phí token, tăng tốc hoàn thành 1.6x.',
      estimatedCostVnd: 0,
      risksAndRollback: 'Nếu KPI chất lượng giảm >8%, tự động rollback về quy trình đầy đủ.',
      testPlan: 'Chạy A/B 10 tác vụ lọc Lead & duyệt Affiliate trên Sandbox trước khi Pilot.',
      patchOrPrNote: 'Chỉ điều chỉnh cấu hình Playbook Fast-Track trong DB (không chạm mã nguồn live).',
      rolloutStage: 'sandbox_test',
      beforeMetric: '4.2s / bước, 2.400 token/tác vụ',
      ceoApproved: false,
      createdAt: now - 3600_000,
      updatedAt: now - 3600_000,
    },
  ];
}

export function buildSeedExperienceMemories(): ExperienceMemoryItem[] {
  const now = Date.now();
  return [
    {
      id: 'exp_1',
      department: 'sales',
      tags: ['giá', 'chiết khấu', 'bảng giá'],
      lesson: 'Mọi ưu đãi vượt 10% đều phải trình Pricing + CEO duyệt, không hứa trước qua chat.',
      source: 'accepted_deliverable',
      createdAt: now - 86400_000,
    },
    {
      id: 'exp_2',
      department: 'legal',
      tags: ['hợp đồng', 'trẻ em', 'NĐ 13/2023'],
      lesson: 'Khách hàng Mầm non luôn cần bổ sung điều khoản đồng ý xử lý dữ liệu trẻ em từ phụ huynh.',
      source: 'critic_feedback',
      createdAt: now - 43200_000,
    },
    {
      id: 'exp_3',
      department: 'marketing',
      tags: ['giọng văn', 'ceo_feedback', 'tiêu chuẩn'],
      lesson: 'CEO ưu tiên báo cáo ngắn gọn, tách bạch số Thực tế vs Dự báo, không viết dài dòng lý thuyết.',
      source: 'ceo_feedback',
      createdAt: now - 21600_000,
    },
  ];
}

export function evaluateHandoverSlaMetrics(tickets: CrossDeptHandoverTicket[], now = Date.now()) {
  const total = tickets.length;
  const completed = tickets.filter((t) => t.status === 'completed');
  const rejected = tickets.filter((t) => t.status === 'rejected');
  const overdue = tickets.filter(
    (t) =>
      t.status === 'escalated_overdue' ||
      ((t.status === 'pending_accept' || t.status === 'accepted') && now > t.dueAt)
  );
  const completedDurationsMin = completed.map((t) => Math.max(1, Math.round((t.updatedAt - t.createdAt) / 60_000)));
  const avgWaitMinutes =
    completedDurationsMin.length > 0
      ? Math.round(completedDurationsMin.reduce((s, v) => s + v, 0) / completedDurationsMin.length)
      : 0;
  const onTimeRate = total > 0 ? Math.round(((total - overdue.length) / total) * 100) : 100;
  const bounceRate = total > 0 ? Math.round((rejected.length / total) * 100) : 0;
  const escalatedCount = tickets.reduce((s, t) => s + (t.escalatedCount || 0), 0);

  const deptLoad = new Map<string, number>();
  for (const t of tickets) {
    if (t.status !== 'completed') {
      deptLoad.set(t.toDepartment, (deptLoad.get(t.toDepartment) || 0) + 1);
    }
  }
  let bottleneckDept: string | null = null;
  let maxPending = 0;
  for (const [d, cnt] of deptLoad.entries()) {
    if (cnt > maxPending) {
      maxPending = cnt;
      bottleneckDept = d;
    }
  }

  return {
    total,
    completedCount: completed.length,
    rejectedCount: rejected.length,
    overdueCount: overdue.length,
    avgWaitMinutes,
    escalatedCount,
    bottleneckDept,
    bottleneckPendingCount: maxPending,
    onTimeRate,
    bounceRate,
  };
}

export function buildDeptBlockerMatrix(tickets: CrossDeptHandoverTicket[], now = Date.now()) {
  return tickets
    .filter((t) => t.status !== 'completed')
    .map((t) => {
      const waitMinutes = Math.max(1, Math.round((now - t.createdAt) / 60_000));
      const isOverdue = t.status === 'escalated_overdue' || now > t.dueAt;
      return {
        ticketId: t.id,
        code: t.code,
        waitingDept: t.fromDepartment,
        blockingDept: t.toDepartment,
        title: t.title,
        waitMinutes,
        slaMinutes: t.slaMinutes,
        isOverdue,
        status: t.status,
      };
    });
}

// =====================================================================
// BỔ SUNG T: ĐỐI THỦ & BRAINSTORM KIẾM TIỀN KHI RẢNH
// =====================================================================

export function generateCompetitorPeriodReport(watches: CompetitorWatchTarget[]) {
  const today = new Date().toISOString().slice(0, 10);
  const majorAlerts = watches.flatMap((w) =>
    w.recentChanges
      .filter((c) => c.severity === 'major')
      .map((c) => ({ competitorName: w.name, date: c.date, summary: c.summary }))
  );
  const matrixRows = watches.map((w) => ({
    id: w.id,
    name: w.name,
    niche: w.niche,
    price: w.lastPriceNote,
    features: w.lastFeaturesNote,
    strengths: w.strengths || 'Chưa cập nhật điểm mạnh',
    weaknesses: w.weaknesses || 'Chưa cập nhật điểm yếu',
    lastAlert: w.recentChanges[0]?.summary || 'Chưa có biến động',
    severity: w.recentChanges[0]?.severity || 'info',
  }));
  const executiveSummary =
    majorAlerts.length > 0
      ? `Báo cáo đối thủ (${today}): Theo dõi ${watches.length} đối thủ — CẢNH BÁO ${majorAlerts.length} biến động lớn cần CEO xem xét.`
      : `Báo cáo đối thủ (${today}): Theo dõi ${watches.length} đối thủ trên nguồn công khai hợp pháp — mặt bằng giá ổn định, cơ hội khác biệt nằm ở AI + Zalo OA + Pháp chế tự động.`;
  return {
    periodLabel: today,
    totalCompetitors: watches.length,
    majorAlerts,
    matrixRows,
    executiveSummary,
  };
}

export function buildIdleMoneyPlan(params: {
  title: string;
  proposedBy: string;
  department: DepartmentId;
  evidence: string;
  sources: string[];
  costVnd: number;
  lowVnd: number;
  midVnd: number;
  highVnd: number;
  resourcedAgents?: string[];
  kpis?: string[];
  rolloutSteps?: string[];
  competitorDiff?: string;
}): MoneyIdeaCard {
  const now = Date.now();
  return {
    id: `idea_${now.toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    title: params.title,
    proposedBy: params.proposedBy,
    department: params.department,
    stage: 'waiting_ceo',
    problemAndEvidence: params.evidence,
    sources: params.sources,
    tamSamAssumptions:
      'Ước tính thị trường mục tiêu dựa trên tệp SME/Giáo dục VN ~3.500 cơ sở tiềm năng, mục tiêu tiếp cận 0.5–1% (GIẢ ĐỊNH — cần kiểm chứng qua test vi mô).',
    icpAndChannels: 'Chủ cơ sở đào tạo & Doanh nghiệp vừa qua Zalo OA / TikTok / SEO / Affiliate.',
    competitorDiff:
      params.competitorDiff || 'Tích hợp sẵn CRM + Zalo OA + Pháp chế tự động trong 1 gói, triển khai nhanh trong 24h.',
    revenueModel: 'Thuê bao SaaS định kỳ hoặc Hoa hồng giới thiệu trả theo tháng.',
    rolloutSteps: params.rolloutSteps || [
      'Bước 1: Marketing & Content chuẩn bị bộ landing + 5 bài nội dung (0đ ngân sách Ads).',
      'Bước 2: Pháp chế rà soát cam kết bán hàng & điều khoản bảo mật.',
      'Bước 3: Sales thử nghiệm chốt 5–10 khách đầu tiên trong 7 ngày để kiểm chứng tỷ lệ chuyển đổi.',
    ],
    resourcedAgents: params.resourcedAgents || ['cmo', 'sales_director', 'legal', 'cfo'],
    kpis: params.kpis || ['>= 15 lead quan tâm trong 7 ngày', '>= 2 đơn thử nghiệm có thu tiền hoặc ký HĐ', 'ROI > 2.5x'],
    scenarios: {
      lowVndMonth: params.lowVnd,
      midVndMonth: params.midVnd,
      highVndMonth: params.highVnd,
    },
    estimatedCostVnd: params.costVnd,
    stopLossRule: 'Dừng ngay sau 14 ngày nếu chi phí thử nghiệm vượt ngưỡng hoặc < 2% tỷ lệ phản hồi.',
    microExperimentPlan: 'Chạy trang đích + 5 bài nội dung thử nghiệm 0đ/ngân sách tối thiểu trong 7 ngày.',
    councilScore: 84,
    legalSignoff: 'pending',
    ceoApproved: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildCrossDeptIdleBrainstormDossier(params: {
  leads: LeadItem[];
  commissions: AffiliateCommission[];
  watches: CompetitorWatchTarget[];
  tasks: TaskItem[];
  existingTitles: string[];
  proposedBy: string;
  department: DepartmentId;
}): MoneyIdeaCard {
  const realLeadCount = params.leads.length;
  const realWonCount = params.leads.filter((l) => l.stage === 'won').length;
  const realAffVnd = params.commissions.reduce((s, c) => s + (c.commissionVnd || 0), 0);
  const compGap =
    params.watches.map((w) => `${w.name}: thiếu ${w.weaknesses || 'tự động hóa Zalo + Pháp chế'}`).slice(0, 2).join('; ') ||
    'Đối thủ chưa tích hợp CRM + Zalo + Pháp chế.';
  const today = new Date().toISOString().slice(0, 10);

  const candidates = [
    {
      title: 'Gói Combo Website + Chatbot Zalo OA trọn gói cho Trung tâm Ngoại ngữ vừa và nhỏ',
      costVnd: 0,
      lowVnd: 12_000_000,
      midVnd: 28_000_000,
      highVnd: 55_000_000,
    },
    {
      title: 'Kênh Affiliate review thiết bị học tập & phần mềm giáo dục kèm mã giảm giá độc quyền',
      costVnd: 0,
      lowVnd: 8_000_000,
      midVnd: 19_000_000,
      highVnd: 38_000_000,
    },
    {
      title: 'Dịch vụ Thiết lập Quy trình Chăm sóc Phụ huynh Tự động cho Chuỗi Mầm non Tư thục',
      costVnd: 0,
      lowVnd: 15_000_000,
      midVnd: 32_000_000,
      highVnd: 65_000_000,
    },
    {
      title: 'Gói Audit & Chuẩn hóa Hợp đồng Điện tử + Bảo vệ Dữ liệu (NĐ 13) cho SME Giáo dục',
      costVnd: 0,
      lowVnd: 10_000_000,
      midVnd: 24_000_000,
      highVnd: 45_000_000,
    },
  ];

  const picked =
    candidates.find((c) => !params.existingTitles.some((t) => t.toLowerCase() === c.title.toLowerCase())) ||
    candidates[params.existingTitles.length % candidates.length];

  const evidence = `[Số liệu thực tế ngày ${today}] CRM hiện có ${realLeadCount} lead (${realWonCount} đơn chốt), Hoa hồng Affiliate thực ghi nhận: ${realAffVnd.toLocaleString('vi-VN')}đ, ${params.tasks.filter((t) => t.status === 'done').length} việc hoàn tất. [Khoảng trống đối thủ]: ${compGap}. Các kịch bản doanh thu bên dưới là DỰ BÁO (Giả định, cần thử nghiệm vi mô 0đ trước).`;

  return buildIdleMoneyPlan({
    title: picked.title,
    proposedBy: params.proposedBy,
    department: params.department,
    evidence,
    sources: [`Dữ liệu CRM thật (${today})`, `Theo dõi đối thủ công khai (${params.watches.length} đơn vị)`, 'Bộ dữ liệu Affiliate nội bộ'],
    costVnd: picked.costVnd,
    lowVnd: picked.lowVnd,
    midVnd: picked.midVnd,
    highVnd: picked.highVnd,
    competitorDiff: `Khắc phục trực tiếp điểm yếu đối thủ: ${compGap}`,
  });
}

// =====================================================================
// BỔ SUNG U: PHÂN TÍCH NÚT THẮT & RÀO CHẮN NÂNG CẤP AN TOÀN
// =====================================================================

export function isUnsafeSelfUpgradeProposal(text: string): { unsafe: boolean; reason?: string } {
  const lower = text.toLowerCase();
  if (/(tự sửa mã nguồn|sửa code gốc|bypass ceo|tự nâng quyền|auto approve|chuyển tiền tự động|tắt kill.?switch)/.test(lower)) {
    return {
      unsafe: true,
      reason: 'Vi phạm rào chắn an toàn (U): cấm AI tự nâng quyền, tự sửa mã nguồn đang chạy hoặc vượt mặt CEO.',
    };
  }
  return { unsafe: false };
}

export function analyzeCompanyBottlenecks(params: {
  tasks: TaskItem[];
  handoverTickets: CrossDeptHandoverTicket[];
  upgradeProposals: UpgradeProposal[];
  healthLogs: SystemHealthLog[];
}): Array<Omit<UpgradeProposal, 'id' | 'code' | 'rolloutStage' | 'ceoApproved' | 'createdAt' | 'updatedAt'>> {
  const candidates: Array<Omit<UpgradeProposal, 'id' | 'code' | 'rolloutStage' | 'ceoApproved' | 'createdAt' | 'updatedAt'>> = [];
  const existingTitles = new Set(params.upgradeProposals.map((u) => u.title.toLowerCase()));

  const sla = evaluateHandoverSlaMetrics(params.handoverTickets);
  if (sla.overdueCount > 0 || sla.bounceRate > 20) {
    const title = `Chuẩn hóa mẫu đầu vào Bàn giao Liên phòng ban${sla.bottleneckDept ? ` (Ưu tiên ${sla.bottleneckDept})` : ''}`;
    if (!existingTitles.has(title.toLowerCase())) {
      candidates.push({
        title,
        proposedBy: 'coo',
        bottleneckEvidence: `Đo thực tế: ${sla.overdueCount} phiếu #BG quá hạn SLA, tỷ lệ trả lại ${sla.bounceRate}%, điểm nghẽn tại phòng ${sla.bottleneckDept || 'điều phối'}.`,
        solutionSummary: 'Bổ sung checklist đầu vào bắt buộc theo RACI trước khi tạo phiếu #BG và cảnh báo trước hạn 10 phút.',
        expectedRoi: 'Giảm 40% số phiếu bị trả lại và rút ngắn thời gian chờ bàn giao.',
        estimatedCostVnd: 0,
        risksAndRollback: 'Chỉ cập nhật quy trình bàn giao & prompt nhắc nhở; hoàn tác về mẫu cũ bằng 1 nút.',
        testPlan: 'Thử nghiệm 5 phiếu #BG mới trên Sandbox trước khi Pilot 1 tuần.',
        patchOrPrNote: 'Cập nhật template quy tắc trong interactionRules (không sửa source code app).',
        beforeMetric: `Đúng SLA ${sla.onTimeRate}%, Trả lại ${sla.bounceRate}%`,
      });
    }
  }

  const failedTasks = params.tasks.filter((t) => t.status === 'failed' || t.delayNotified);
  const errorLogs = params.healthLogs.filter((l) => l.level === 'error' || l.level === 'warn');
  if (failedTasks.length > 0 || errorLogs.length >= 2) {
    const title = 'Tối ưu Retry có ngữ cảnh & Rút gọn Prompt cho tác vụ hay lỗi/trễ hạn';
    if (!existingTitles.has(title.toLowerCase())) {
      candidates.push({
        title,
        proposedBy: 'tech_lead',
        bottleneckEvidence: `Ghi nhận ${failedTasks.length} tác vụ lỗi/trễ ETA và ${errorLogs.length} cảnh báo hệ thống.`,
        solutionSummary: 'Chia nhỏ bước thực thi tối đa 3 công cụ/lượt & gắn Playbook kiểm chứng sẵn trước khi chạy.',
        expectedRoi: 'Giảm 30% tỷ lệ chạy lại và tiết kiệm token suy luận dư thừa.',
        estimatedCostVnd: 0,
        risksAndRollback: 'Không đổi quyền hạn tool; có thể rollback về cấu hình mặc định ngay lập tức.',
        testPlan: 'Chạy regression trên 3 tác vụ mẫu trong Sandbox trước khi trình CEO duyệt Pilot.',
        patchOrPrNote: 'Đề xuất cấu hình orchestrator qua Config/Playbook, tách biệt PR kỹ thuật nếu cần.',
        beforeMetric: `${failedTasks.length} tác vụ lỗi/trễ · ${errorLogs.length} cảnh báo log`,
      });
    }
  }

  if (candidates.length === 0) {
    const title = 'Tăng cường Bộ nhớ Kinh nghiệm & Mẫu Checklist đầu ra chuẩn CEO';
    if (!existingTitles.has(title.toLowerCase())) {
      candidates.push({
        title,
        proposedBy: 'data_analyst',
        bottleneckEvidence: 'Hệ thống đang ổn định; đề xuất chuẩn hóa mẫu tóm tắt ngắn gọn để giảm thời gian duyệt của CEO.',
        solutionSummary: 'Gắn khuôn mẫu 3 dòng (Thực tế / Kết quả / Đề xuất) vào Playbook đầu ra mặc định.',
        expectedRoi: 'Rút ngắn ~25% thời gian đọc báo cáo của Chủ tịch.',
        estimatedCostVnd: 0,
        risksAndRollback: 'Chỉ áp dụng cho Playbook chưa gắn cờ rủi ro cao; rollback 1 nút.',
        testPlan: 'Thử Sandbox 3 bản nháp báo cáo và đối chiếu điểm Critic.',
        patchOrPrNote: 'Cập nhật promptTemplate của Playbook trong DB.',
        beforeMetric: 'Thời gian đọc/duyệt báo cáo trung bình ~2–3 phút/phiếu',
      });
    }
  }

  return candidates;
}

// =====================================================================
// BỔ SUNG W: PLAYBOOK, EXPERIENCE MEMORY & REGRESSION SUITE
// =====================================================================

const HIGH_RISK_KEYWORDS = [
  'chi tiền',
  'thanh toán',
  'phiếu chi',
  'chuyển khoản',
  'ngân hàng',
  'stk',
  'hợp đồng',
  'pháp lý',
  'gửi thật',
  '2fa',
  'otp',
  'xóa dữ liệu',
  'live',
];

export function isHighRiskInstruction(instruction: string): boolean {
  const lower = instruction.toLowerCase();
  return HIGH_RISK_KEYWORDS.some((kw) => lower.includes(kw));
}

function tokenizeVi(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

export function findMatchingPlaybook(
  instruction: string,
  department: DepartmentId,
  playbooks: PlaybookSkill[]
): PlaybookSkill | null {
  const tokens = new Set(tokenizeVi(instruction));
  let best: { pb: PlaybookSkill; score: number } | null = null;

  for (const pb of playbooks) {
    const intentTokens = tokenizeVi(`${pb.triggerIntent} ${pb.name}`);
    let overlap = 0;
    for (const t of intentTokens) {
      if (tokens.has(t)) overlap += 1;
    }
    if (instruction.toLowerCase().includes(pb.triggerIntent.toLowerCase())) {
      overlap += 3;
    }
    if (pb.department === department) {
      overlap += 1;
    }
    if (overlap >= 2 && (!best || overlap > best.score)) {
      best = { pb, score: overlap };
    }
  }
  return best?.pb || null;
}

export function matchExperienceMemories(
  instruction: string,
  department: DepartmentId,
  memories: ExperienceMemoryItem[],
  limit = 4
): ExperienceMemoryItem[] {
  const tokens = new Set(tokenizeVi(instruction));
  const scored = memories.map((m) => {
    let score = m.department === department ? 2 : 0;
    if (m.source === 'ceo_feedback') score += 2; // Prioritize explicit CEO preferences
    for (const tag of m.tags) {
      const tagTokens = tokenizeVi(tag);
      if (tagTokens.some((t) => tokens.has(t))) score += 2;
    }
    const lessonTokens = tokenizeVi(m.lesson);
    for (const lt of lessonTokens) {
      if (tokens.has(lt)) score += 0.5;
    }
    return { item: m, score };
  });

  return scored
    .filter((s) => s.score >= 2)
    .sort((a, b) => b.score - a.score || b.item.createdAt - a.item.createdAt)
    .slice(0, limit)
    .map((s) => s.item);
}

/**
 * Evaluates whether a fast-track Playbook shortcut is strictly safe (BỔ SUNG W).
 * NEVER bypasses Verifier / WriteGate / Legal Approvals or high-risk inputs.
 */
export function canUsePlaybookFastTrack(params: {
  playbook: PlaybookSkill;
  isHighRiskTask: boolean;
}): { allowed: boolean; reason: string } {
  const { playbook, isHighRiskTask } = params;
  if (isHighRiskTask) {
    return { allowed: false, reason: 'Tác vụ rủi ro cao (tài chính/hợp đồng/gửi thật) — bắt buộc chạy đủ vòng kiểm chứng.' };
  }
  if (playbook.dirtyNeedsReview) {
    return { allowed: false, reason: `Playbook đang gắn cờ cần rà soát lại (${playbook.dirtyReason || 'Luật/SP mới cập nhật'}).` };
  }
  if (!playbook.allowFastTrack || playbook.avgQualityScore < 85 || playbook.successCount < 3) {
    return { allowed: false, reason: 'Chưa đủ ngưỡng lịch sử chất lượng (>=85 điểm & >=3 lần thành công).' };
  }
  return { allowed: true, reason: `Đủ điều kiện tăng tốc v${playbook.version} (vẫn giữ Verifier cuối bước).` };
}

export function buildPlaybookRuntimeContext(params: {
  playbook: PlaybookSkill | null;
  memories: ExperienceMemoryItem[];
  isHighRisk: boolean;
}): string {
  const parts: string[] = [];
  if (params.playbook) {
    const check = canUsePlaybookFastTrack({ playbook: params.playbook, isHighRiskTask: params.isHighRisk });
    parts.push(
      `## Playbook Đã Học (${params.playbook.name} v${params.playbook.version} · Chất lượng TB ${params.playbook.avgQualityScore}/100)`,
      `- Chế độ thực thi: ${check.allowed ? `TĂNG TỐC CÓ KIỂM SOÁT — ${check.reason}` : `KIỂM CHỨNG ĐẦY ĐỦ — ${check.reason}`}`,
      `- Các bước chuẩn:\n${params.playbook.steps.map((s) => `  ${s}`).join('\n')}`,
      params.playbook.checklist?.length ? `- Checklist bắt buộc: ${params.playbook.checklist.join(' | ')}` : '',
      `- LƯU Ý BẮT BUỘC: Không bao giờ bỏ qua Verifier / WriteGate / Duyệt #CP / Duyệt CEO.`
    );
  }
  if (params.memories.length > 0) {
    parts.push(
      `## Kinh nghiệm & Ý muốn CEO cần tuân thủ:`,
      ...params.memories.map((m) => `- [${m.source === 'ceo_feedback' ? 'Ý MUỐN CEO' : m.department}] ${m.lesson}`)
    );
  }
  return parts.filter(Boolean).join('\n');
}

/**
 * Records a playbook quality observation and auto-rolls back if quality regresses > 10 points.
 */
export function recordPlaybookOutcome(
  playbook: PlaybookSkill,
  qualityScore: number,
  metrics?: { durationMs?: number; tokensUsed?: number; reworked?: boolean }
): PlaybookSkill {
  const total = playbook.successCount + playbook.failureCount + 1;
  const nextAvg = Math.round((playbook.avgQualityScore * (total - 1) + qualityScore) / total);
  const regressed = nextAvg < playbook.baselineQualityScore - 10;

  const prevDur = playbook.avgDurationMs ?? 3000;
  const nextDur =
    metrics?.durationMs !== undefined ? Math.round((prevDur * (total - 1) + metrics.durationMs) / total) : playbook.avgDurationMs;

  const prevTok = playbook.avgTokens ?? 1600;
  const nextTok =
    metrics?.tokensUsed !== undefined ? Math.round((prevTok * (total - 1) + metrics.tokensUsed) / total) : playbook.avgTokens;

  return {
    ...playbook,
    version: regressed ? playbook.version + 1 : playbook.version,
    successCount: qualityScore >= 75 ? playbook.successCount + 1 : playbook.successCount,
    failureCount: qualityScore < 75 ? playbook.failureCount + 1 : playbook.failureCount,
    reworkCount: (playbook.reworkCount || 0) + (metrics?.reworked ? 1 : 0),
    avgQualityScore: nextAvg,
    avgDurationMs: nextDur,
    avgTokens: nextTok,
    allowFastTrack: !regressed && playbook.allowFastTrack,
    dirtyNeedsReview: regressed ? true : playbook.dirtyNeedsReview,
    dirtyReason: regressed
      ? `Tự động rollback chất lượng: điểm TB tụt từ ${playbook.baselineQualityScore} xuống ${nextAvg}`
      : playbook.dirtyReason,
    rolledBackFromVersion: regressed ? playbook.version : playbook.rolledBackFromVersion,
    updatedAt: Date.now(),
  };
}

export function runPlaybookRegressionSuite(playbooks: PlaybookSkill[]) {
  const sample = playbooks[0] || buildSeedPlaybooks()[0];
  const results: Array<{ id: string; title: string; passed: boolean; detail: string }> = [];

  // Case 1: Qualified normal task uses controlled fast-track
  const qualified: PlaybookSkill = {
    ...sample,
    avgQualityScore: 90,
    baselineQualityScore: 88,
    successCount: 3,
    failureCount: 0,
    allowFastTrack: true,
    dirtyNeedsReview: false,
  };
  const c1 = canUsePlaybookFastTrack({ playbook: qualified, isHighRiskTask: false });
  results.push({
    id: 'reg_1_fasttrack_normal',
    title: 'Tác vụ lặp thông thường được tăng tốc (vẫn giữ Verifier)',
    passed: c1.allowed && c1.reason.includes('Verifier'),
    detail: c1.reason,
  });

  // Case 2: High-risk input NEVER skips full verification
  const c2 = canUsePlaybookFastTrack({ playbook: qualified, isHighRiskTask: true });
  results.push({
    id: 'reg_2_highrisk_block',
    title: 'Tác vụ rủi ro cao/tài chính/hợp đồng bị chặn Fast-Track',
    passed: !c2.allowed,
    detail: c2.reason,
  });

  // Case 3: Dirty playbook invalidated on SOP/Law/Product change forces full review
  const dirtyPb: PlaybookSkill = { ...qualified, dirtyNeedsReview: true, dirtyReason: 'SOP mới cập nhật' };
  const c3 = canUsePlaybookFastTrack({ playbook: dirtyPb, isHighRiskTask: false });
  results.push({
    id: 'reg_3_dirty_invalidation',
    title: 'Playbook dính cờ SOP/Luật/SP mới bắt buộc chạy lại đầy đủ',
    passed: !c3.allowed,
    detail: c3.reason,
  });

  // Case 4: Quality drop > 10 pts auto-rolls back & disables fast-track
  const rolled = recordPlaybookOutcome(qualified, 10, { durationMs: 4200, tokensUsed: 2100, reworked: true });
  results.push({
    id: 'reg_4_auto_rollback',
    title: 'Tụt điểm chất lượng >10 tự động Rollback & tắt Fast-Track',
    passed: rolled.dirtyNeedsReview && !rolled.allowFastTrack && rolled.rolledBackFromVersion === qualified.version,
    detail: rolled.dirtyReason || 'OK',
  });

  return {
    passedCount: results.filter((r) => r.passed).length,
    totalCount: results.length,
    allPassed: results.every((r) => r.passed),
    results,
  };
}

/**
 * Static safety & license analyzer for on-demand Git Repo Scout reports (BỔ SUNG V).
 */
export function evaluateGitRepoMetadata(params: {
  query: string;
  repoFullName: string;
  repoUrl: string;
  commitSha?: string;
  purpose?: string;
  stars: number;
  lastUpdated: string;
  license: string;
  packageJsonContent?: string;
}): GitRepoEvaluationReport {
  const safeLicenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'ISC'];
  const legalLicenseOk = safeLicenses.some((l) => params.license.toUpperCase().includes(l.toUpperCase()));
  const securityFlags: string[] = [];

  if (!legalLicenseOk) {
    securityFlags.push(`Giấy phép "${params.license || 'Không rõ'}" cần Pháp chế kiểm tra bản quyền thương mại.`);
  }
  if (params.stars < 30) {
    securityFlags.push('Kho lưu trữ có ít sao (<30) — cần kiểm tra kỹ mã nguồn trước khi thử nghiệm.');
  }
  if (params.packageJsonContent && /(eval\(|curl\s+http|rm\s+-rf|child_process)/i.test(params.packageJsonContent)) {
    securityFlags.push('Phát hiện lệnh hệ thống/shell script nhạy cảm trong manifest.');
  }

  const blocked = securityFlags.length > 1;
  const recommendedAction: GitRepoEvaluationReport['recommendedAction'] = blocked
    ? 'do_not_use'
    : securityFlags.length === 0 && legalLicenseOk
      ? 'use'
      : 'watch';

  return {
    id: `repo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    requestedQuery: params.query,
    repoFullName: params.repoFullName,
    repoUrl: params.repoUrl,
    commitSha: params.commitSha || 'HEAD (Mới nhất trên nhánh chính)',
    purpose: params.purpose || `Thư viện công khai phục vụ yêu cầu: "${params.query}"`,
    stars: params.stars,
    lastUpdated: params.lastUpdated,
    license: params.license || 'Unknown',
    legalLicenseOk,
    legalReviewed: legalLicenseOk && securityFlags.length === 0,
    securityFlags,
    sandboxStatus: blocked ? 'blocked_danger' : 'static_only_unverified',
    verificationLabel: 'CHƯA KIỂM CHỨNG',
    stdoutExcerpt: 'Mới phân tích metadata & quét tĩnh công khai. Chưa thực thi trong Docker Sandbox (/worker).',
    performanceNote: 'Chưa đo RAM/CPU thực tế do chưa chạy Docker Sandbox.',
    integrationEffort: legalLicenseOk && securityFlags.length === 0 ? 'Thấp–Trung bình (1–2 ngày qua #NC nếu Sandbox Đạt)' : 'Cần rà soát bảo mật/license trước',
    recommendedAction,
    recommendation:
      securityFlags.length === 0 && legalLicenseOk
        ? 'Đủ điều kiện đưa vào Docker Sandbox (/worker --network none) để chạy thử test trước khi đề xuất Nâng cấp (#NC).'
        : 'Cần Pháp chế xem lại License/Cảnh báo bảo mật trước khi thử nghiệm.',
    createdAt: Date.now(),
  };
}
