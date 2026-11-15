import {
  CompetitorWatchTarget,
  CrossDeptHandoverTicket,
  DepartmentId,
  DeptInteractionRule,
  ExperienceMemoryItem,
  GitRepoEvaluationReport,
  MoneyIdeaCard,
  PlaybookSkill,
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
      successCount: 14,
      failureCount: 1,
      avgQualityScore: 91,
      baselineQualityScore: 85,
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
      successCount: 9,
      failureCount: 0,
      avgQualityScore: 95,
      baselineQualityScore: 88,
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
      successCount: 11,
      failureCount: 0,
      avgQualityScore: 94,
      baselineQualityScore: 88,
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
  const onTimeRate = total > 0 ? Math.round(((total - overdue.length) / total) * 100) : 100;
  const bounceRate = total > 0 ? Math.round((rejected.length / total) * 100) : 0;
  return {
    total,
    completedCount: completed.length,
    rejectedCount: rejected.length,
    overdueCount: overdue.length,
    onTimeRate,
    bounceRate,
  };
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

/**
 * Records a playbook quality observation and auto-rolls back if quality regresses > 10 points.
 */
export function recordPlaybookOutcome(playbook: PlaybookSkill, qualityScore: number): PlaybookSkill {
  const total = playbook.successCount + playbook.failureCount + 1;
  const nextAvg = Math.round(((playbook.avgQualityScore * (total - 1)) + qualityScore) / total);
  const regressed = nextAvg < playbook.baselineQualityScore - 10;

  return {
    ...playbook,
    version: regressed ? playbook.version + 1 : playbook.version,
    successCount: qualityScore >= 75 ? playbook.successCount + 1 : playbook.successCount,
    failureCount: qualityScore < 75 ? playbook.failureCount + 1 : playbook.failureCount,
    avgQualityScore: nextAvg,
    allowFastTrack: !regressed && playbook.allowFastTrack,
    dirtyNeedsReview: regressed ? true : playbook.dirtyNeedsReview,
    dirtyReason: regressed
      ? `Tự động rollback chất lượng: điểm TB tụt từ ${playbook.baselineQualityScore} xuống ${nextAvg}`
      : playbook.dirtyReason,
    rolledBackFromVersion: regressed ? playbook.version : playbook.rolledBackFromVersion,
    updatedAt: Date.now(),
  };
}

/**
 * Static safety & license analyzer for on-demand Git Repo Scout reports (BỔ SUNG V).
 */
export function evaluateGitRepoMetadata(params: {
  query: string;
  repoFullName: string;
  repoUrl: string;
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

  return {
    id: `repo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    requestedQuery: params.query,
    repoFullName: params.repoFullName,
    repoUrl: params.repoUrl,
    stars: params.stars,
    lastUpdated: params.lastUpdated,
    license: params.license || 'Unknown',
    legalLicenseOk,
    securityFlags,
    sandboxStatus: securityFlags.length > 1 ? 'blocked_danger' : 'static_only_unverified',
    verificationLabel: 'CHƯA KIỂM CHỨNG',
    stdoutExcerpt: 'Mới phân tích metadata & quét tĩnh công khai. Chưa thực thi trong Docker Sandbox (/worker).',
    recommendation:
      securityFlags.length === 0 && legalLicenseOk
        ? 'Đủ điều kiện đưa vào Docker Sandbox (/worker --network none) để chạy thử test trước khi đề xuất Nâng cấp (U).'
        : 'Cần Pháp chế xem lại License/Cảnh báo bảo mật trước khi thử nghiệm.',
    createdAt: Date.now(),
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
    tamSamAssumptions: 'Ước tính thị trường mục tiêu dựa trên tệp SME/Giáo dục VN (giả định, cần test vi mô).',
    icpAndChannels: 'Chủ cơ sở đào tạo & Doanh nghiệp vừa qua Zalo OA / TikTok / SEO.',
    competitorDiff: 'Tích hợp sẵn CRM + Zalo OA + Pháp chế tự động trong 1 gói.',
    revenueModel: 'Thuê bao SaaS hoặc Hoa hồng giới thiệu trả theo tháng.',
    scenarios: {
      lowVndMonth: params.lowVnd,
      midVndMonth: params.midVnd,
      highVndMonth: params.highVnd,
    },
    estimatedCostVnd: params.costVnd,
    stopLossRule: 'Dừng ngay sau 14 ngày nếu chi phí thử nghiệm vượt ngưỡng hoặc 0 chuyển đổi.',
    microExperimentPlan: 'Chạy trang đích + 5 bài nội dung thử nghiệm 0đ/ngân sách tối thiểu trong 7 ngày.',
    councilScore: 84,
    legalSignoff: 'pending',
    ceoApproved: false,
    createdAt: now,
    updatedAt: now,
  };
}
