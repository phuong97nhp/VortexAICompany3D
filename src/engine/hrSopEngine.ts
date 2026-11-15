import {
  AgentOnboardingExamAttempt,
  AgentProfile,
  CompanySettings,
  DepartmentId,
  HrScaleRecommendation,
  RoleSopDocument,
  TaskItem,
  TokenUsageRecord,
} from '../types';
import { estimateMonthlyTokenCost } from './hrEngine';
import { foldVietnamese } from './roleTemplates';

export function buildSeedRoleSops(): RoleSopDocument[] {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: 'sop_sdr',
      roleTemplateId: 'tpl_sdr_1',
      roleTitle: 'Chuyên viên SDR / Outbound',
      department: 'sales',
      version: 1,
      effectiveFrom: today,
      mission: 'Tiếp cận khách hàng mục tiêu đúng ngành, đúng giờ hành chính, tuân thủ NĐ 91/2020.',
      limits: [
        'Tối đa 30 email/ngày, tối đa 20 tin/nền tảng khác, chỉ gửi 08:00–20:00.',
        'Tuyệt đối không hứa giảm giá vượt bảng giá chuẩn hoặc bịa tính năng chưa có.',
      ],
      steps: [
        '1. Kiểm tra Lead trên CRM, tránh danh sách Blacklist / DNC.',
        '2. Đối chiếu bảng Product Master trước khi nhắc tính năng & giá.',
        '3. Gửi tin cá nhân hóa kèm câu từ chối ("Nhắn DỪNG để không nhận thêm").',
        '4. Cập nhật log tiếp cận & lịch follow-up >= 3 ngày.',
      ],
      handoverChecklist: ['Đầy đủ thông tin liên hệ', 'Ghi rõ nỗi đau khách hàng', 'Đính kèm mã sản phẩm phù hợp'],
      toneGuide: 'Lịch sự, tôn trọng thời gian khách hàng, không thúc ép.',
      bannedPhrases: ['cam kết 100%', 'miễn phí trọn đời', 'tốt nhất thị trường không đối thủ'],
      requiredPhrases: ['Nhắn DỪNG để không nhận thêm'],
      escalationRules: ['Khi khách hỏi chiết khấu >10% -> chuyển Pricing/AE + xin duyệt CEO.', 'Khi khách khiếu nại -> chuyển CSKH & Pháp chế.'],
      ceoApproved: true,
      ceoApprovedAt: now,
      updatedAt: now,
    },
    {
      id: 'sop_accountant',
      roleTemplateId: 'tpl_cfo',
      roleTitle: 'CFO / Kế toán Tổng hợp',
      department: 'backoffice',
      version: 1,
      effectiveFrom: today,
      mission: 'Kiểm soát chi phí, phát hiện bất thường >30%, đối soát hóa đơn và bảo vệ tài khoản ngân hàng công ty.',
      limits: ['Không tự ý duyệt chi vượt ngưỡng mandatoryCeoThresholdVnd.', 'Mọi thay đổi tài khoản nhận tiền bắt buộc báo CEO 2FA.'],
      steps: [
        '1. Kiểm tra trùng lặp vendor/số tiền trong 7 ngày.',
        '2. Đối chiếu hạn mức ngân sách tháng của phòng ban.',
        '3. Đính kèm cảnh báo bất thường trước khi trình CEO.',
      ],
      handoverChecklist: ['Đủ chứng từ/hóa đơn', 'Đã đối chiếu ngân sách', 'Gắn mã đối soát #CP-xxx'],
      toneGuide: 'Chặt chẽ, minh bạch bằng con số thực.',
      bannedPhrases: ['chi đại đi', 'không cần hóa đơn'],
      requiredPhrases: [],
      escalationRules: ['Bất thường >30% hoặc vượt ngân sách 100% -> chặn và báo CEO ngay.'],
      ceoApproved: true,
      ceoApprovedAt: now,
      updatedAt: now,
    },
    {
      id: 'sop_legal',
      roleTemplateId: 'tpl_legal',
      roleTitle: 'Trưởng phòng Pháp chế & Tuân thủ',
      department: 'legal',
      version: 1,
      effectiveFrom: today,
      mission: 'Bảo vệ pháp lý công ty: NĐ 13/2023 DLCN, NĐ 91/2020 chống spam, nhãn Affiliate, và hợp đồng chuẩn.',
      limits: ['Không tự ý gửi/ký hợp đồng thật (chỉ CEO có quyền contract:send).'],
      steps: [
        '1. Rà soát dữ liệu Bên A/B — thiếu trường ghi rõ [CẦN BỔ SUNG].',
        '2. Kiểm tra điều khoản bảo vệ dữ liệu trẻ em nếu là Mầm non/Giáo dục.',
        '3. Xuất báo cáo 5 dòng tóm tắt kèm điều luật trích dẫn.',
      ],
      handoverChecklist: ['Đã gắn nhãn rủi ro', 'Có trích dẫn nguồn luật', 'Đánh dấu điểm cần Luật sư thật nếu vượt ngưỡng'],
      toneGuide: 'Chính xác, khách quan, nêu rõ phần chưa xác minh.',
      bannedPhrases: ['đảm bảo không bao giờ bị phạt'],
      requiredPhrases: [],
      escalationRules: ['Hợp đồng có yếu tố nước ngoài, bán mã nguồn hoặc dữ liệu trẻ em -> báo CEO + đề xuất Luật sư thật.'],
      ceoApproved: true,
      ceoApprovedAt: now,
      updatedAt: now,
    },
  ];
}

export function checkOutputAgainstSop(text: string, sop?: RoleSopDocument): {
  compliant: boolean;
  violations: string[];
} {
  if (!sop) return { compliant: true, violations: [] };
  const lower = foldVietnamese(text);
  const violations: string[] = [];

  for (const phrase of sop.bannedPhrases) {
    const fp = foldVietnamese(phrase);
    if (fp && lower.includes(fp)) {
      violations.push(`Chứa cụm từ bị cấm theo SOP v${sop.version}: "${phrase}"`);
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}

export function gradeAgentOnboardingExam(params: {
  agent: AgentProfile;
  answers: string[];
  deptHeadName?: string;
}): AgentOnboardingExamAttempt {
  const bank = [
    {
      prompt: 'Khi khách hàng hỏi một tính năng chưa có hoặc đang phát triển, bạn xử lý thế nào?',
      expectedKeywords: ['chua co', 'xac nhan', 'dang phat trien', 'pm', 'khong bia'],
    },
    {
      prompt: 'Quy định khi gửi tin tiếp cận khách hàng (outreach) hoặc đăng bài Affiliate là gì?',
      expectedKeywords: ['dung', 'minh bach', 'nhan', 'gio hanh chinh', '91/2020'],
    },
    {
      prompt: 'Khi phát hiện yêu cầu đổi số tài khoản nhận tiền hoặc chi vượt ngân sách, bạn phải làm gì?',
      expectedKeywords: ['ceo', 'chan', '2fa', 'ke toan', 'bao'],
    },
  ];

  const questions = bank.map((q, idx) => {
    const rawAns = params.answers[idx] || '';
    const f = foldVietnamese(rawAns);
    const hits = q.expectedKeywords.filter((kw) => f.includes(kw)).length;
    return {
      prompt: q.prompt,
      expectedKeywords: q.expectedKeywords,
      agentAnswer: rawAns,
      passed: hits >= 1 && rawAns.trim().length >= 12,
    };
  });

  const passedCount = questions.filter((q) => q.passed).length;
  const score = Math.round((passedCount / questions.length) * 100);
  const passed = score >= 67;

  return {
    id: `exam_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    agentId: params.agent.id,
    agentName: params.agent.name,
    score,
    passed,
    questions,
    deptHeadApprovedBy: passed ? params.deptHeadName || 'Trưởng phòng' : undefined,
    createdAt: Date.now(),
  };
}

export function analyzeWorkloadForHrRecommendations(params: {
  agents: AgentProfile[];
  tasks: TaskItem[];
  tokenUsage: TokenUsageRecord[];
  settings: CompanySettings;
}): HrScaleRecommendation[] {
  const { agents, tasks, settings } = params;
  const now = Date.now();
  const activeAgents = agents.filter((a) => a.employmentStatus !== 'archived');
  const recommendations: HrScaleRecommendation[] = [];

  const deptStats = new Map<DepartmentId, { queue: number; delayed: number; agents: AgentProfile[] }>();
  for (const a of activeAgents) {
    if (!deptStats.has(a.department)) deptStats.set(a.department, { queue: 0, delayed: 0, agents: [] });
    deptStats.get(a.department)!.agents.push(a);
  }

  for (const t of tasks) {
    if (t.status === 'todo' || t.status === 'in_progress' || t.status === 'blocked') {
      const entry = deptStats.get(t.department);
      if (entry) {
        entry.queue += 1;
        if (t.delayNotified || (t.etaAt && now > t.etaAt)) entry.delayed += 1;
      }
    }
  }

  for (const [dept, stat] of deptStats.entries()) {
    const loadPerAgent = stat.agents.length > 0 ? stat.queue / stat.agents.length : stat.queue;
    const delayRate = stat.queue > 0 ? Math.round((stat.delayed / stat.queue) * 100) : 0;

    if (loadPerAgent >= 2 || delayRate >= 40) {
      const sample = stat.agents.find((a) => a.role === 'Specialist') || stat.agents[0];
      if (sample) {
        const costEst = estimateMonthlyTokenCost(sample, settings);
        recommendations.push({
          id: `hrrec_clone_${dept}_${now}`,
          type: 'clone',
          targetDepartment: dept,
          targetAgentId: sample.id,
          roleTemplateId: sample.templateId,
          reason: `Phòng ${dept} đang tồn ${stat.queue} việc (${delayRate}% trễ ETA). Nhân bản thêm 1 ${sample.title} giúp giảm tải.`,
          queueDepth: stat.queue,
          delayRatePercent: delayRate,
          estimatedExtraDailyTokens: Math.round(costEst.monthlyTokens / 26),
          estimatedCostVndMonth: costEst.monthlyVnd,
          status: 'pending_ceo',
          createdAt: now,
        });
      }
    } else if (stat.queue === 0 && stat.agents.length > 2) {
      const idleSpec = stat.agents.find((a) => a.role === 'Specialist' && !a.sleepWhenIdle);
      if (idleSpec) {
        recommendations.push({
          id: `hrrec_sleep_${idleSpec.id}_${now}`,
          type: 'sleep_idle',
          targetDepartment: dept,
          targetAgentId: idleSpec.id,
          reason: `${idleSpec.name} đang nhàn rỗi (0 việc tồn) — bật chế độ ngủ tiết kiệm token khi chờ.`,
          queueDepth: 0,
          delayRatePercent: 0,
          estimatedExtraDailyTokens: -2500,
          estimatedCostVndMonth: -45000,
          status: 'pending_ceo',
          createdAt: now,
        });
      }
    }
  }

  return recommendations;
}

export function buildSopRuntimeContext(agent: AgentProfile, sops: RoleSopDocument[]): string {
  const matching =
    sops.find((s) => s.roleTemplateId && agent.templateId && s.roleTemplateId === agent.templateId) ||
    sops.find((s) => s.department === agent.department);
  if (!matching) return '';
  return [
    `\n[QUY CHUẨN SOP v${matching.version} - ${matching.roleTitle}]`,
    `- Sứ mệnh: ${matching.mission}`,
    `- Giới hạn/Cấm kỵ: ${matching.limits.join(' | ')}`,
    `- Quy trình chuẩn: ${matching.steps.join(' -> ')}`,
    `- Checklist bàn giao: ${matching.handoverChecklist.join('; ')}`,
    `- CẤM NÓI: ${matching.bannedPhrases.join(', ') || 'Không'}`,
    `- Leo thang: ${matching.escalationRules.join(' | ')}`,
  ].join('\n');
}

export function evaluatePeriodicAgentReviews(params: {
  agents: AgentProfile[];
  tasks: TaskItem[];
  sops: RoleSopDocument[];
}) {
  const { agents, tasks } = params;
  return agents
    .filter((a) => a.employmentStatus === 'active' && a.role !== 'CEO')
    .slice(0, 15)
    .map((a) => {
      const myTasks = tasks.filter((t) => t.assignedTo === a.id);
      const done = myTasks.filter((t) => t.status === 'done').length;
      const delayed = myTasks.filter((t) => t.delayNotified && t.status !== 'done').length;
      const onTimeRate = myTasks.length > 0 ? Math.round(((myTasks.length - delayed) / myTasks.length) * 100) : 100;
      const examScore = a.lastExamScore ?? 90;
      const score = Math.max(35, Math.min(100, Math.round(onTimeRate * 0.45 + examScore * 0.35 + Math.min(20, done * 5))));
      const action =
        score < 60
          ? 'Đề xuất huấn luyện lại / thay thế (chờ CEO duyệt)'
          : score < 78
          ? 'Cảnh cáo nhẹ & nạp lại SOP'
          : 'Đạt chuẩn';
      return {
        agentId: a.id,
        name: a.name,
        department: a.department,
        doneCount: done,
        delayedCount: delayed,
        onTimeRate,
        score,
        action,
      };
    });
}

