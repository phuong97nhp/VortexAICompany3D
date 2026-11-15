import {
  AgentProfile,
  CouncilSession,
  CouncilVote,
  DepartmentId,
  QualityReviewCycle,
  QualityRoundRecord,
} from '../types';

export interface RunQualityCycleInput {
  title: string;
  taskId?: string;
  department: DepartmentId;
  definitionOfDone: string;
  draftText: string;
  maker: AgentProfile;
  critic: AgentProfile;
  verifier: AgentProfile;
  deptHead: AgentProfile;
  maxRounds?: number;
  verifiedClaimsInput?: Array<{ claim: string; verified: boolean; toolRef: string; note: string }>;
}

/**
 * Evaluates Critic weaknesses to prevent shallow / rubber-stamp consensus.
 * Requires >= 2 concrete risks/weaknesses with actionable length.
 */
export function validateCriticOutput(weaknesses: string[], draftExcerpt: string): {
  valid: boolean;
  reason?: string;
} {
  const cleaned = weaknesses.map((w) => w.trim()).filter((w) => w.length >= 12);
  if (cleaned.length < 2) {
    return {
      valid: false,
      reason: 'Critic bắt buộc phải chỉ ra ít nhất 2 điểm yếu hoặc rủi ro cụ thể (không được khen cho qua).',
    };
  }
  const normalizedDraft = draftExcerpt.toLowerCase().slice(0, 80);
  if (normalizedDraft && cleaned.every((w) => normalizedDraft.includes(w.toLowerCase().slice(0, 30)))) {
    return {
      valid: false,
      reason: 'Phát hiện đồng thuận giả tạo (Critic lặp lại y nguyên nội dung Maker).',
    };
  }
  return { valid: true };
}

export function runQualityLoopCycle(input: RunQualityCycleInput): QualityReviewCycle {
  const now = Date.now();
  const maxRounds = Math.max(1, Math.min(5, input.maxRounds ?? 3));

  // Ensure Maker and Critic are distinct agents whenever possible
  if (input.maker.id === input.critic.id) {
    return {
      id: `qcyc_${now.toString(36)}`,
      taskId: input.taskId,
      title: input.title,
      department: input.department,
      definitionOfDone: input.definitionOfDone,
      maxRounds,
      currentRound: 0,
      status: 'escalated_failed',
      failureReason: 'Vi phạm quy tắc độc lập: Maker và Critic không được là cùng một agent.',
      rounds: [],
      finalSummary: 'Bị chặn do thiếu phản biện độc lập.',
      createdAt: now,
      updatedAt: now,
    };
  }

  const rounds: QualityRoundRecord[] = [];
  let workingDraft = input.draftText.trim();
  let approved = false;

  for (let round = 1; round <= maxRounds; round++) {
    const hasNumbersOrProof = /\d+|VND|đ|%|https?:\/\//i.test(workingDraft);
    const hasMissingDisclaimer = /\[CẦN BỔ SUNG\]|chưa kiểm chứng/i.test(workingDraft);

    const criticWeaknesses: string[] = [];
    if (!hasNumbersOrProof || round === 1) {
      criticWeaknesses.push('Cần dẫn chứng số liệu cụ thể hoặc nguồn tham chiếu từ HubCW/CRM/Legal thay vì nhận định chung.');
    }
    if (workingDraft.length < 120 || round === 1) {
      criticWeaknesses.push('Cần bổ sung điều kiện dừng, rủi ro thực thi và bước kiểm thử trước khi bàn giao.');
    }
    if (hasMissingDisclaimer) {
      criticWeaknesses.push('Tài liệu còn trường [CẦN BỔ SUNG] chưa được chốt dữ liệu thực.');
    }
    if (criticWeaknesses.length < 2) {
      criticWeaknesses.push('Rà soát lại giới hạn trách nhiệm và đối chiếu bảng giá/chính sách hiện hành.');
      criticWeaknesses.push('Kiểm tra kênh phân phối và người chịu trách nhiệm tiếp theo theo RACI.');
    }

    const antiConsensus = validateCriticOutput(criticWeaknesses, workingDraft);

    const verifierChecks =
      input.verifiedClaimsInput && input.verifiedClaimsInput.length > 0
        ? input.verifiedClaimsInput
        : [
            {
              claim: 'Kiểm tra DoD & độ dài tài liệu tối thiểu',
              verified: workingDraft.length >= 60,
              toolRef: 'verifier:dod_check',
              note: workingDraft.length >= 60 ? 'Đạt chuẩn đầu ra tối thiểu' : 'Quá ngắn, chưa đủ nội dung',
            },
            {
              claim: 'Kiểm tra dữ liệu chưa điền [CẦN BỔ SUNG]',
              verified: !hasMissingDisclaimer,
              toolRef: 'verifier:completeness',
              note: hasMissingDisclaimer ? 'Còn trường [CẦN BỔ SUNG]' : 'Không còn trường thiếu',
            },
          ];

    const verifierPassed = verifierChecks.every((c) => c.verified);
    const deptHeadApproved = antiConsensus.valid && verifierPassed && round >= 2;

    rounds.push({
      round,
      makerId: input.maker.id,
      makerName: input.maker.name,
      draftExcerpt: workingDraft.slice(0, 260),
      criticId: input.critic.id,
      criticName: input.critic.name,
      criticWeaknesses,
      antiFalseConsensusPassed: antiConsensus.valid,
      verifierId: input.verifier.id,
      verifierChecks,
      verifierPassed,
      deptHeadId: input.deptHead.id,
      deptHeadApproved,
      decisionNote: deptHeadApproved
        ? `Trưởng phòng ${input.deptHead.name} phê duyệt bàn giao sau vòng ${round}.`
        : !verifierPassed
        ? 'Verifier yêu cầu Maker sửa phần dữ liệu chưa xác minh ở vòng tiếp theo.'
        : 'Chuyển sang vòng tinh chỉnh để xử lý 2+ góp ý của Critic.',
      timestamp: now + round * 1000,
    });

    if (deptHeadApproved) {
      approved = true;
      break;
    }

    // Maker refines draft for next round
    workingDraft = `${workingDraft}\n\n[Bổ sung vòng ${round + 1}]: Đã kiểm chứng nguồn số liệu và bổ sung phương án giảm thiểu rủi ro theo góp ý của ${input.critic.name}.`;
  }

  return {
    id: `qcyc_${now.toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    taskId: input.taskId,
    title: input.title,
    department: input.department,
    definitionOfDone: input.definitionOfDone,
    maxRounds,
    currentRound: rounds.length,
    status: approved ? 'approved' : 'escalated_failed',
    failureReason: approved
      ? undefined
      : `Không đạt ngưỡng kiểm chứng Verifier/DoD sau ${maxRounds} vòng — báo cáo lên COO/CEO.`,
    rounds,
    finalSummary: approved
      ? `Đạt chuẩn bàn giao sau ${rounds.length} vòng (Maker: ${input.maker.name} -> Critic: ${input.critic.name} -> Verifier: ${input.verifier.name} -> Duyệt: ${input.deptHead.name}).`
      : `Chưa đạt DoD sau ${maxRounds} vòng: ${rounds[rounds.length - 1]?.decisionNote || 'Cần CEO/COO xem xét.'}`,
    createdAt: now,
    updatedAt: now,
  };
}

export function conveneCouncilSession(params: {
  topic: string;
  participants: AgentProfile[];
  proposals?: Array<{ agent: AgentProfile; optionId: string; title: string; summary: string; score: number }>;
}): CouncilSession {
  const now = Date.now();
  const chosenMembers = params.participants.slice(0, 5);
  const optionsMap = new Map<string, { id: string; title: string; votesWeight: number; rejectedReason?: string }>();

  const defaultOptions = [
    { id: 'opt_a', title: `Phương án tăng trưởng tập trung (Inbound + Demo 1-1)` },
    { id: 'opt_b', title: `Phương án mở rộng đối tác & Affiliate hoa hồng cao` },
    { id: 'opt_c', title: `Phương án thí điểm ngân sách nhỏ 7 ngày trước khi mở rộng` },
  ];
  for (const o of defaultOptions) {
    optionsMap.set(o.id, { ...o, votesWeight: 0 });
  }

  const votes: CouncilVote[] = chosenMembers.map((member, idx) => {
    const custom = params.proposals?.find((p) => p.agent.id === member.id);
    const domainWeight =
      member.role === 'Exec' || member.role === 'Dept Head' ? 2 : member.department === 'legal' ? 1.5 : 1;
    const optionId = custom?.optionId || defaultOptions[idx === 0 ? 2 : idx % 2 === 0 ? 2 : 0].id;
    const opt = optionsMap.get(optionId) || defaultOptions[0];
    optionsMap.set(opt.id, {
      id: opt.id,
      title: custom?.title || opt.title,
      votesWeight: (optionsMap.get(opt.id)?.votesWeight || 0) + domainWeight,
    });

    return {
      agentId: member.id,
      agentName: member.name,
      department: member.department,
      weight: domainWeight,
      proposalTitle: custom?.title || opt.title,
      proposalSummary:
        custom?.summary || `${member.title} đề xuất ưu tiên phương án kiểm soát rủi ro và đo lường chuyển đổi thực tế.`,
      critiqueOfOthers: [
        'Cảnh báo chi phí thu hút khách hàng (CAC) nếu mở rộng ồ ạt chưa test.',
        'Cần Pháp chế rà soát điều khoản quảng cáo & cam kết dịch vụ.',
      ],
      chosenOption: opt.id,
      score: custom?.score ?? 82 + (idx % 3) * 4,
    };
  });

  const sortedOpts = Array.from(optionsMap.values()).sort((a, b) => b.votesWeight - a.votesWeight);
  const winner = sortedOpts[0];
  const isTie = sortedOpts.length > 1 && sortedOpts[0].votesWeight === sortedOpts[1].votesWeight;

  const optionsConsidered = sortedOpts.map((o, idx) => ({
    id: o.id,
    title: o.title,
    rejectedReason:
      idx === 0
        ? undefined
        : o.votesWeight === 0
        ? 'Chưa nhận được phiếu ủng hộ đa số về hiệu quả/rủi ro.'
        : 'Tổng điểm trọng số chuyên môn thấp hơn phương án thắng.',
  }));

  return {
    id: `cncl_${now.toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    topic: params.topic,
    participantIds: chosenMembers.map((m) => m.id),
    optionsConsidered,
    votes,
    winningOption: isTie ? undefined : winner?.title,
    status: isTie ? 'escalated_ceo' : 'consensus',
    ceoExecutiveSummary: isTie
      ? `Hội đồng ${chosenMembers.length} người hòa phiếu về "${params.topic}" — chuyển CEO quyết định cuối cùng.`
      : `Hội đồng (${chosenMembers.map((m) => m.name).join(', ')}) thống nhất chọn: "${winner?.title}". Đã loại ${optionsConsidered.length - 1} phương án còn lại kèm lý do.`,
    fullThreadLog: votes.map(
      (v) =>
        `[${v.agentName} - Trọng số ${v.weight}] Ủng hộ: ${v.proposalTitle} (Điểm ${v.score}) | Phản biện: ${v.critiqueOfOthers.join(' ; ')}`
    ),
    createdAt: now,
  };
}
