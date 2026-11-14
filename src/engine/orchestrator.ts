import { getProductById, PRODUCTS } from '../config/products';
import { useCompanyStore } from '../store/useCompanyStore';
import {
  AgentProfile,
  ChatChannelId,
  TaskDeliverableLink,
  TaskItem,
  WorkflowTrace,
} from '../types';
import { formatVnd } from './expenseEngine';
import { parseQuickHireIntent } from './hrEngine';
import { getLiveAgentById, getLiveAgents, getLiveDepartmentById } from './liveRegistry';
import { getTaskGroupForAgent, llmClient, LlmChatMessage } from './llm';
import { ensureMarketingAskCeoHook, runBrandAndChannelLaunch, runMarketingAutopilotCycle } from './marketingEngine';
import { foldVietnamese } from './roleTemplates';
import { executeAgentTool, getToolsForAgent } from './tools';

let autopilotTimer: number | null = null;
let overdueTimer: number | null = null;

function sleepScaled(ms: number): Promise<void> {
  const speed = useCompanyStore.getState().settings.simulationSpeed || 1;
  return new Promise((resolve) => setTimeout(resolve, Math.max(80, Math.round(ms / speed))));
}

function isInformationalOnly(text: string): boolean {
  const f = foldVietnamese(text);
  if (text.trim().length < 18 && /^(chao|hi|hello|alo|ok|cam on)/.test(f)) return true;
  const hasActionVerb =
    /\b(tim|san|viet|soan|tao|lap|gui|dang|len lich|bao gia|chay|mua|chi|duyet|tuyen|phan tich|kiem tra|trien khai|lam|xuat)\b/.test(f);
  const isQuestion = /^(ai |co |bao nhieu|tai sao|the nao|la gi)/.test(f) && !hasActionVerb;
  return !hasActionVerb || isQuestion;
}

function resolveMentionTargets(text: string, agents: AgentProfile[]): {
  matches: AgentProfile[];
  strippedInstruction: string;
  rawToken?: string;
} {
  const mentionMatch = text.match(/@([^\s,.:;!?]+(?:\s+[^\s,.:;!?]+)?)/);
  if (!mentionMatch) return { matches: [], strippedInstruction: text };

  const active = agents.filter((a) => a.employmentStatus !== 'archived');
  const fullAfterAt = text.slice((mentionMatch.index || 0) + 1);
  const twoWordToken = fullAfterAt.split(/\s+/).slice(0, 3).join(' ').trim();
  const oneWordToken = fullAfterAt.split(/\s+/)[0]?.trim() || '';

  // 1. Exact ID or exact full name match first
  const exact = active.find((a) => {
    const fName = foldVietnamese(a.name);
    const fFull = foldVietnamese(fullAfterAt);
    return (
      foldVietnamese(oneWordToken) === foldVietnamese(a.id) ||
      fFull.startsWith(fName) ||
      (a.nickname && fFull.startsWith(foldVietnamese(a.nickname)))
    );
  });
  if (exact) {
    const fName = foldVietnamese(exact.name);
    const fAfter = foldVietnamese(fullAfterAt);
    let consumedLen = oneWordToken.length;
    if (fAfter.startsWith(fName)) {
      consumedLen = exact.name.length;
    } else if (exact.nickname && fAfter.startsWith(foldVietnamese(exact.nickname))) {
      consumedLen = exact.nickname.length;
    }
    const before = text.slice(0, mentionMatch.index || 0);
    const after = fullAfterAt.slice(consumedLen);
    return {
      matches: [exact],
      strippedInstruction: `${before} ${after}`.trim(),
      rawToken: exact.name,
    };
  }

  // 2. Fuzzy substring match on folded name / title / id (1-word or 2-word token)
  const probe2 = foldVietnamese(twoWordToken.replace(/[,.:;!?]+$/, ''));
  const probe1 = foldVietnamese(oneWordToken.replace(/[,.:;!?]+$/, ''));

  const scoreMatches = (probe: string) =>
    probe.length >= 2
      ? active.filter(
          (a) =>
            foldVietnamese(a.name).includes(probe) ||
            foldVietnamese(a.title).includes(probe) ||
            foldVietnamese(a.id).includes(probe)
        )
      : [];

  let matched = scoreMatches(probe2);
  let usedLen = twoWordToken.length;
  if (matched.length === 0) {
    matched = scoreMatches(probe1);
    usedLen = oneWordToken.length;
  }

  const before = text.slice(0, mentionMatch.index || 0);
  const after = fullAfterAt.slice(usedLen);
  return {
    matches: matched,
    strippedInstruction: `${before} ${after}`.trim(),
    rawToken: oneWordToken,
  };
}

function estimateTaskMeta(userInstruction: string): {
  etaMinutes: number;
  dod: string;
  deliverable: string;
} {
  const f = foldVietnamese(userInstruction);
  if (f.includes('tim') && (f.includes('lead') || f.includes('khach') || f.includes('trung tam'))) {
    return {
      etaMinutes: 2,
      dod: 'Tìm & lưu danh sách Lead hợp lệ (chống trùng, có SĐT/Email) vào CRM.',
      deliverable: 'Danh sách Lead mới trong CRM',
    };
  }
  if (f.includes('chi') || f.includes('phieu chi') || f.includes('ads') || f.includes('domain') || f.includes('mua')) {
    return {
      etaMinutes: 2,
      dod: 'Lập phiếu chi #CP-xxx kiểm tra ngân sách & gửi Kế toán thẩm định tầng 1.',
      deliverable: 'Phiếu chi #CP-xxx trong Chi phí & Kế toán',
    };
  }
  if (f.includes('bao gia')) {
    return {
      etaMinutes: 3,
      dod: 'Tạo báo giá chuẩn theo bảng giá lưu Kho tài liệu & trình duyệt nếu có chiết khấu.',
      deliverable: 'Báo giá Markdown trong Kho tài liệu',
    };
  }
  if (f.includes('viet') || f.includes('soan') || f.includes('ke hoach') || f.includes('seo') || f.includes('faq') || f.includes('nghien cuu')) {
    return {
      etaMinutes: 3,
      dod: 'Soạn thảo tài liệu hoàn chỉnh và lưu vào Kho tài liệu.',
      deliverable: 'Tài liệu chuyên môn trong Kho tài liệu',
    };
  }
  return {
    etaMinutes: 2,
    dod: 'Thực thi yêu cầu bằng công cụ hợp lệ và báo cáo số liệu thực tế.',
    deliverable: 'Kết quả thực thi & báo cáo chi tiết',
  };
}

/**
 * Single Agent Cognitive Loop with Honest Reporting, Task ACK, Progress Updates & Output Validation (BỔ SUNG F)
 */
export async function runSingleAgentTurn(
  agentId: string,
  userInstruction: string,
  channelId: ChatChannelId = 'all',
  opts?: { isInternalPeek?: boolean; resumeTaskId?: string }
): Promise<string> {
  const store = useCompanyStore.getState();
  const agent = getLiveAgentById(agentId);
  if (!agent) return 'Không tìm thấy nhân sự AI.';

  if (agent.employmentStatus === 'archived') {
    return `${agent.name} đã thôi việc. Vui lòng chọn nhân sự đang hoạt động khác.`;
  }
  if (agent.employmentStatus === 'suspended') {
    await store.addMessage({
      channelId,
      senderId: 'system',
      senderName: 'Quản lý Nhân sự',
      senderTitle: 'Trạng thái',
      department: agent.department,
      content: `Nhân sự **${agent.name} (${agent.title})** hiện đang **Tạm nghỉ phép**. Hãy kích hoạt lại trong tab Nhân sự & Quyền hoặc giao cho người khác.`,
      busType: 'escalation',
    });
    return `${agent.name} đang tạm nghỉ phép.`;
  }

  const actionable = !isInformationalOnly(userInstruction) && !opts?.isInternalPeek;
  const meta = estimateTaskMeta(userInstruction);
  const now = Date.now();
  let activeTask: TaskItem | null = null;

  if (actionable) {
    const existingTask = opts?.resumeTaskId ? store.tasks.find((t) => t.id === opts.resumeTaskId) : undefined;
    const taskCode = existingTask?.taskCode || `#T-${101 + store.tasks.length}`;
    activeTask = existingTask
      ? {
          ...existingTask,
          status: store.settings.killSwitchActive || store.settings.paused ? 'waiting_resume' : 'in_progress',
          startedAt: existingTask.startedAt || now,
          lastProgressAt: now,
          updatedAt: now,
        }
      : {
          id: `task_${now}_${Math.random().toString(36).slice(2, 6)}`,
          taskCode,
          title: userInstruction.slice(0, 96),
          description: userInstruction,
          definitionOfDone: meta.dod,
          expectedDeliverable: meta.deliverable,
          department: agent.department,
          assignedTo: agent.id,
          createdBy: 'ceo',
          status: store.settings.killSwitchActive || store.settings.paused ? 'waiting_resume' : 'in_progress',
          priority: 'high',
          etaMinutes: meta.etaMinutes,
          etaAt: now + meta.etaMinutes * 60_000,
          startedAt: now,
          progressPercent: 10,
          lastProgressAt: now,
          deliverables: [],
          channelId,
          createdAt: now,
          updatedAt: now,
          dueLabel: `ETA ${meta.etaMinutes} phút`,
        };
    await store.putTask(activeTask);
  }

  // Honest System Blocker if Kill Switch / Paused
  if (store.settings.killSwitchActive || store.settings.paused) {
    const reason = store.settings.killSwitchActive ? 'kill_switch' : 'paused';
    await store.addMessage({
      channelId,
      senderId: 'system',
      senderName: 'Hệ thống Điều phối',
      senderTitle: 'Chặn thực thi',
      department: 'exec',
      content: `Chưa thể chạy ngay vì **${store.settings.killSwitchActive ? 'KILL SWITCH đang bật' : 'Hệ thống đang Tạm dừng'}**.${activeTask ? ` Đã ghi nhận việc **${activeTask.taskCode}** ở trạng thái *Chờ khôi phục*.` : ''}`,
      busType: 'escalation',
      cardType: 'system_blocker',
      cardData: {
        reason,
        taskId: activeTask?.id,
        taskCode: activeTask?.taskCode,
        agentId: agent.id,
        instruction: userInstruction,
        channelId,
      },
    });
    return 'Hệ thống đang tạm dừng hoặc KILL SWITCH đang bật.';
  }

  const account = store.accounts.find((a) => a.agentId === agentId);
  if (account?.status === 'suspended') {
    return `Tài khoản ${agent.name} đang bị tạm khóa.`;
  }

  // Task ACK Card (immediate feedback within 0ms)
  if (activeTask) {
    await store.addMessage({
      channelId,
      senderId: agent.id,
      senderName: agent.name,
      senderTitle: agent.title,
      department: agent.department,
      content: `Đã nhận việc **${activeTask.taskCode}**: *${activeTask.title}*`,
      busType: 'request',
      cardType: 'task_ack',
      cardData: {
        taskId: activeTask.id,
        taskCode: activeTask.taskCode,
        assigneeName: agent.name,
        assigneeTitle: agent.title,
        dod: activeTask.definitionOfDone,
        deliverable: activeTask.expectedDeliverable,
        etaMinutes: activeTask.etaMinutes,
        etaAt: activeTask.etaAt,
      },
    });
  }

  store.setAgentStatus(agentId, 'thinking', 'Đang phân tích...', userInstruction.slice(0, 48), 25);
  if (activeTask) {
    activeTask = { ...activeTask, progressPercent: 25, lastProgressAt: Date.now(), updatedAt: Date.now() };
    await store.putTask(activeTask);
  }

  const activeRoster = getLiveAgents()
    .map((a) => `- ${a.name} (${a.id}, ${a.title}, phòng ${a.department})`)
    .join('\n');
  const mem = store.agentMemories[agentId];
  const companyCtx = store.companyMemories.map((m) => `- ${m.key}: ${m.content}`).join('\n');
  const productCtx = PRODUCTS.map(
    (p) => `[${p.code}] ${p.shortName}: ${p.tagline} (Giá từ ${p.tiers[0].priceLabel})`
  ).join('\n');

  const taskGroup = getTaskGroupForAgent(agentId);
  const route = store.settings.roleRoutes?.find((r) => r.group === taskGroup);
  const resolvedProvider =
    agent.providerOverride && agent.providerOverride !== 'company_default'
      ? agent.providerOverride
      : store.settings.primaryProvider === 'mock'
      ? 'mock'
      : route?.provider || store.settings.primaryProvider;

  let planText = '';
  if (agent.usesReasoner && resolvedProvider === 'deepseek') {
    try {
      const planRes = await llmClient.chat({
        agentId,
        department: agent.department,
        model: 'deepseek-reasoner',
        messages: [
          {
            role: 'system',
            content: `${agent.systemPrompt}\nHãy lập kế hoạch hành động ngắn gọn (3-5 bước) bằng tiếng Việt.`,
          },
          { role: 'user', content: userInstruction },
        ],
      });
      planText = planRes.content;
    } catch {
      planText = '';
    }
  }

  store.setAgentStatus(agentId, 'typing', 'Đang thực thi...', undefined, 50);

  const tools = getToolsForAgent(agent.allowedTools);
  const systemDirective = [
    agent.systemPrompt,
    ``,
    `## Quy tắc Trung thực BẮT BUỘC`,
    `- Chỉ tuyên bố đã làm được những gì bạn THỰC SỰ gọi tool và nhận ok=true.`,
    `- TUYỆT ĐỐI KHÔNG tự nói "đã hoàn tất" khi chưa tạo ra dữ liệu/tài liệu thực hoặc khi tool trả lỗi.`,
    `- Mọi hành động chi tiền (chạy Ads, mua domain, mua tool) BẮT BUỘC phải gọi request_expense trước để lấy phiếu chi #CP-... đã duyệt.`,
    ``,
    `## Nhân sự công ty hiện có:`,
    activeRoster,
    ``,
    `## Bối cảnh công ty:\n${companyCtx}`,
    `\n## Danh mục sản phẩm:\n${productCtx}`,
    `\n## Bộ nhớ của bạn:\n${mem?.longTermSummary || ''}\n${(mem?.shortTerm || []).slice(-3).join('; ')}`,
  ].join('\n');

  const messages: LlmChatMessage[] = [
    { role: 'system', content: systemDirective },
    {
      role: 'user',
      content: planText
        ? `Yêu cầu: ${userInstruction}\n\nKế hoạch sơ bộ:\n${planText}\n\nHãy gọi tool thực thi ngay và chỉ báo cáo đúng kết quả tool trả về.`
        : userInstruction,
    },
  ];

  const deliverables: TaskDeliverableLink[] = [];
  const toolLogs: Array<{ name: string; ok: boolean; error?: string }> = [];
  let finalReply = '';
  let hitStepLimit = false;
  let lastProgressMilestone = 25;

  const pushProgress = async (pct: number, stepLabel: string) => {
    if (!activeTask) return;
    activeTask = {
      ...activeTask,
      progressPercent: pct,
      lastProgressAt: Date.now(),
      updatedAt: Date.now(),
      deliverables: [...deliverables],
    };
    await store.putTask(activeTask);
    store.setAgentStatus(agentId, 'typing', stepLabel, activeTask.title, pct);
    if (pct >= lastProgressMilestone + 25 && pct < 100) {
      lastProgressMilestone = pct;
      await store.addMessage({
        channelId,
        senderId: agent.id,
        senderName: agent.name,
        senderTitle: agent.title,
        department: agent.department,
        content: `Tiến độ **${activeTask.taskCode}**: ${pct}% — ${stepLabel}`,
        busType: 'report',
        isInternalPeek: opts?.isInternalPeek,
        cardType: 'task_progress',
        cardData: {
          taskId: activeTask.id,
          taskCode: activeTask.taskCode,
          progressPercent: pct,
          stepLabel,
        },
      });
    }
  };

  try {
    const maxSteps = 4;
    for (let step = 0; step < maxSteps; step++) {
      if (useCompanyStore.getState().settings.killSwitchActive) break;

      const res = await llmClient.chat({
        agentId,
        department: agent.department,
        model: resolvedProvider === 'deepseek' && agent.usesReasoner ? 'deepseek-chat' : undefined,
        messages,
        tools,
      });

      if (res.content) {
        finalReply = res.content;
      }

      if (!res.toolCalls || res.toolCalls.length === 0) {
        break;
      }

      if (step === maxSteps - 1) {
        hitStepLimit = true;
      }

      for (const tc of res.toolCalls.slice(0, 3)) {
        const toolResult = await executeAgentTool(agentId, tc.name as never, tc.arguments, {
          onDeliverable: (d) => deliverables.push(d),
        });
        toolLogs.push({
          name: tc.name,
          ok: toolResult.ok,
          error: toolResult.ok ? undefined : String(toolResult.output.error || 'Lỗi thực thi'),
        });
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.name,
          content: JSON.stringify(toolResult),
        });
      }

      const pct = Math.min(85, 25 + (step + 1) * 25);
      await pushProgress(pct, `Đã chạy ${toolLogs.map((t) => t.name).join(', ')}`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Lỗi kết nối/xử lý AI Provider';
    store.setAgentStatus(agentId, 'error', 'Gặp sự cố xử lý', undefined, 0);
    if (activeTask) {
      await store.putTask({
        ...activeTask,
        status: 'failed',
        failureReason: errMsg,
        updatedAt: Date.now(),
      });
    }
    await store.addMessage({
      channelId,
      senderId: agent.id,
      senderName: agent.name,
      senderTitle: agent.title,
      department: agent.department,
      content: `Chưa hoàn thành được yêu cầu do lỗi thực thi: **${errMsg}**.\nĐề xuất: kiểm tra API key / model trong **Cài đặt → Bộ não AI** hoặc bấm chạy lại.`,
      busType: 'escalation',
      cardType: 'system_blocker',
      cardData: {
        reason: 'provider_error',
        error: errMsg,
        taskId: activeTask?.id,
        taskCode: activeTask?.taskCode,
        agentId: agent.id,
        instruction: userInstruction,
        channelId,
      },
    });
    setTimeout(() => {
      const cur = useCompanyStore.getState().runtimes[agentId];
      if (cur && cur.status === 'error') useCompanyStore.getState().setAgentStatus(agentId, 'idle');
    }, 3200);
    return errMsg;
  }

  // Output / DoD validation (BỔ SUNG F)
  const failedTools = toolLogs.filter((t) => !t.ok);
  const succeededTools = toolLogs.filter((t) => t.ok);

  if (activeTask) {
    if (hitStepLimit && deliverables.length === 0) {
      const honestFail = `Chưa xong hoàn toàn: đã chạy ${toolLogs.length} bước (${succeededTools.map((t) => t.name).join(', ') || 'chưa tạo đầu ra'}), dừng do đạt giới hạn số bước/lượt. Đề xuất: chia nhỏ yêu cầu hoặc bấm chạy tiếp.`;
      await store.putTask({
        ...activeTask,
        status: 'failed',
        progressPercent: 60,
        failureReason: honestFail,
        deliverables,
        updatedAt: Date.now(),
      });
      await store.addMessage({
        channelId,
        senderId: agent.id,
        senderName: agent.name,
        senderTitle: agent.title,
        department: agent.department,
        content: honestFail,
        busType: 'report',
      });
      store.setAgentStatus(agentId, 'idle', undefined, undefined, 0);
      return honestFail;
    }

    if (failedTools.length > 0 && succeededTools.length === 0) {
      const errText = failedTools.map((f) => `${f.name}: ${f.error}`).join('; ');
      await store.putTask({
        ...activeTask,
        status: 'failed',
        progressPercent: 40,
        failureReason: errText,
        updatedAt: Date.now(),
      });
      await store.addMessage({
        channelId,
        senderId: agent.id,
        senderName: agent.name,
        senderTitle: agent.title,
        department: agent.department,
        content: `**${activeTask.taskCode} chưa thể hoàn thành:** ${errText}`,
        busType: 'escalation',
      });
      store.setAgentStatus(agentId, 'blocked', 'Bị chặn thực thi', activeTask.title, 40);
      return errText;
    }

    const finalStatus = deliverables.length > 0 ? 'review' : succeededTools.length > 0 ? 'review' : 'done';
    const doneTask: TaskItem = {
      ...activeTask,
      status: finalStatus,
      progressPercent: 100,
      completedAt: finalStatus === 'done' ? Date.now() : undefined,
      lastProgressAt: Date.now(),
      updatedAt: Date.now(),
      deliverables,
      dueLabel: deliverables.length > 0 ? 'Chờ CEO nghiệm thu' : 'Đã phản hồi',
    };
    await store.putTask(doneTask);
    store.setAgentDelayed(agentId, false);

    if (deliverables.length > 0 || succeededTools.length > 0) {
      const summary =
        finalReply ||
        `Đã thực thi xong ${succeededTools.length} thao tác (${succeededTools.map((t) => t.name).join(', ')})${failedTools.length ? `, có ${failedTools.length} bước bị chặn: ${failedTools.map((f) => f.error).join('; ')}` : ''}.`;

      await store.addMessage({
        channelId,
        senderId: agent.id,
        senderName: agent.name,
        senderTitle: agent.title,
        department: agent.department,
        content: summary,
        busType: 'report',
        isInternalPeek: opts?.isInternalPeek,
        cardType: 'task_report',
        cardData: {
          taskId: doneTask.id,
          taskCode: doneTask.taskCode,
          summary,
          deliverables,
          metricsLine: `${succeededTools.length} công cụ thành công · ${deliverables.length} đầu ra lưu DB`,
          nextStep: failedTools.length
            ? `Xử lý phần chưa xong: ${failedTools[0].error}`
            : 'Chủ tịch kiểm tra đầu ra và bấm Chấp nhận hoặc Yêu cầu sửa.',
        },
      });
      await store.appendAgentMemory(agentId, `Hoàn tất ${doneTask.taskCode}: ${doneTask.title.slice(0, 60)}`);

      store.setAgentStatus(agentId, 'done', `Xong ${doneTask.taskCode}`, undefined, 100);
      setTimeout(() => {
        const after = useCompanyStore.getState().runtimes[agentId];
        if (after && after.status === 'done') {
          useCompanyStore.getState().setAgentStatus(agentId, 'idle', undefined, undefined, 0);
        }
      }, 2600);
      return summary;
    }
  }

  // Informational reply fallback (never fake work)
  const replyOut =
    finalReply ||
    `(${agent.name}): Không có đầu ra mới được tạo từ hệ thống cho yêu cầu này. Anh vui lòng nêu rõ hành động cụ thể (vd: tìm lead, viết tài liệu, tạo phiếu chi).`;

  store.setAgentStatus(agentId, 'talking', replyOut.slice(0, 42) + '...', undefined, 88);
  await store.addMessage({
    channelId,
    senderId: agentId,
    senderName: agent.name,
    senderTitle: agent.title,
    department: agent.department,
    content: replyOut,
    busType: 'chat',
    isInternalPeek: opts?.isInternalPeek,
  });
  await store.appendAgentMemory(agentId, `Trao đổi: ${userInstruction.slice(0, 60)}`);

  setTimeout(() => {
    const cur = useCompanyStore.getState().runtimes[agentId];
    if (cur && cur.status !== 'blocked') {
      useCompanyStore.getState().setAgentStatus(agentId, 'done', undefined, undefined, 100);
      setTimeout(() => {
        const after = useCompanyStore.getState().runtimes[agentId];
        if (after && after.status === 'done') {
          useCompanyStore.getState().setAgentStatus(agentId, 'idle', undefined, undefined, 0);
        }
      }, 2400);
    }
  }, 1400);

  return replyOut;
}

/**
 * Inter-department Meeting Simulation in Room Meeting (Floor 1)
 */
export async function runDepartmentMeeting(
  topic: string,
  participantIds?: string[]
): Promise<void> {
  const store = useCompanyStore.getState();
  if (store.settings.killSwitchActive) return;

  const activeAgents = getLiveAgents();
  const resolvedParticipants =
    participantIds?.filter((id) => activeAgents.some((a) => a.id === id)) ||
    activeAgents
      .filter((a) => ['Exec', 'Dept Head'].includes(a.role))
      .slice(0, 8)
      .map((a) => a.id);

  if (resolvedParticipants.length === 0 && activeAgents[0]) {
    resolvedParticipants.push(activeAgents[0].id);
  }

  const host = getLiveAgentById('secretary') || activeAgents[0];

  store.selectRoom('room-meeting');
  await store.addMessage({
    channelId: 'meeting',
    senderId: host?.id || 'system',
    senderName: host?.name || 'Điều phối',
    senderTitle: host?.title || 'Điều phối',
    department: host?.department || 'exec',
    content: `**Triệu tập cuộc họp liên phòng ban tại Phòng Họp Lớn (Tầng 1)**\nChủ đề: *${topic}*\nThành phần: ${resolvedParticipants
      .map((id) => getLiveAgentById(id)?.name)
      .filter(Boolean)
      .join(', ')}`,
    busType: 'request',
  });

  resolvedParticipants.forEach((id, idx) => {
    store.walkAgentToMeetingSeat(id, idx);
  });

  await sleepScaled(2600);
  if (useCompanyStore.getState().settings.killSwitchActive) return;

  const minutesLines: string[] = [
    `# BIÊN BẢN HỌP LIÊN PHÒNG BAN`,
    `**Chủ đề:** ${topic}`,
    `**Thời gian:** ${new Date().toLocaleString('vi-VN')}`,
    ``,
    `## Ý kiến các phòng ban`,
  ];

  const turnStatements: Record<string, string> = {
    secretary: `Thống nhất mục tiêu theo chỉ đạo Chủ tịch: tập trung chuyển đổi nhanh cho ${topic}, báo cáo tiến độ hằng ngày.`,
    cmo: `Marketing sẽ triển khai bộ landing page, từ khóa SEO và nội dung Social (trình CEO duyệt trước khi đăng công khai).`,
    sales_director: `Phòng Sales cam kết 30 lead mới/ngày, ưu tiên Trung tâm Ngoại ngữ & trường học, SDR chạy đúng khung 8h–20h.`,
    pm: `Product đã chuẩn bị sẵn tài khoản demo sandbox dữ liệu mẫu để AE trình diễn 1-1 cho khách ngay.`,
    support_lead: `CSKH đã hoàn tất bộ FAQ 15 câu hỏi thường gặp và quy trình nhập Excel trong 24h cho khách mới.`,
    cfo: `Kế toán & Tài chính kiểm soát ngân sách tháng, thẩm định 100% phiếu chi trước khi xuất ngân sách chiến dịch.`,
    data_analyst: `Hệ thống Data đã gắn tracking phễu chuyển đổi & CAC từng kênh hiển thị trực tiếp trên màn hình KPI.`,
  };

  for (const id of resolvedParticipants) {
    if (useCompanyStore.getState().settings.killSwitchActive) break;
    const agent = getLiveAgentById(id);
    if (!agent) continue;
    const line = turnStatements[id] || `${agent.name} (${agent.title}) xác nhận phối hợp theo phân công.`;
    store.setAgentStatus(id, 'in_meeting', line.slice(0, 38) + '...', `Họp: ${topic.slice(0, 26)}`, 60);
    await store.addMessage({
      channelId: 'meeting',
      senderId: id,
      senderName: agent.name,
      senderTitle: agent.title,
      department: agent.department,
      content: line,
      busType: 'chat',
    });
    minutesLines.push(`- **${agent.name} (${agent.title}):** ${line}`);
    await sleepScaled(850);
  }

  const candidateAssignees = [
    { id: 'market_research', title: `Nghiên cứu đối thủ & insight cho: ${topic}` },
    { id: 'lead_hunter_edu', title: `Tìm 15 lead trung tâm ngoại ngữ cho: ${topic}` },
    { id: 'support_lead', title: `Cập nhật bộ FAQ hỗ trợ triển khai cho: ${topic}` },
  ].filter((item) => activeAgents.some((a) => a.id === item.id));

  minutesLines.push('', '## Action Items (Đã tự động tạo Task)');
  for (const item of candidateAssignees) {
    await executeAgentTool(host?.id || item.id, 'create_task', {
      title: item.title,
      assignedTo: item.id,
      priority: 'high',
    });
    const ag = getLiveAgentById(item.id);
    minutesLines.push(`- [ ] **${ag?.name}**: ${item.title}`);
  }

  const minutesDocId = `doc_meeting_${Date.now()}`;
  await store.putDocument({
    id: minutesDocId,
    title: `Biên bản họp: ${topic}`,
    category: 'meeting_minutes',
    authorId: host?.id || 'secretary',
    department: host?.department || 'exec',
    content: minutesLines.join('\n'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  await store.addMessage({
    channelId: 'meeting',
    senderId: host?.id || 'secretary',
    senderName: host?.name || 'Thư ký CEO',
    senderTitle: host?.title || 'Thư ký CEO',
    department: host?.department || 'exec',
    content: `Đã tổng hợp **Biên bản họp** và tạo tự động ${candidateAssignees.length} nhiệm vụ lên Task Board.`,
    busType: 'report',
    cardType: 'meeting_minutes',
    cardData: { documentId: minutesDocId, topic, actionItems: candidateAssignees },
  });

  await sleepScaled(1200);
  resolvedParticipants.forEach((id) => store.returnAgentToDesk(id));
}

/**
 * Full 30-day Campaign Demo Scenario ("Chạy demo")
 */
export async function runCampaignDemoScenario(productId: string): Promise<void> {
  const store = useCompanyStore.getState();
  if (store.settings.killSwitchActive) {
    store.setBannerAlert('Hãy tắt KILL SWITCH trước khi chạy kịch bản Demo.');
    return;
  }
  const product = getProductById(productId);
  const wfId = `wf_demo_${Date.now()}`;

  const stepSpecs = [
    { agentId: 'secretary', fallbackName: 'Thư ký CEO', label: 'Tiếp nhận & Kickoff' },
    { agentId: 'market_research', fallbackName: 'Nghiên cứu TT', label: 'Nghiên cứu thị trường' },
    { agentId: 'cmo', fallbackName: 'CMO', label: 'Chiến lược Marketing' },
    { agentId: 'content_writer', fallbackName: 'Content/SEO', label: 'Content / SEO / Social / Ads' },
    { agentId: 'sales_director', fallbackName: 'Sales Director', label: 'Lead & Kịch bản chốt Sales' },
    { agentId: 'pm', fallbackName: 'PM', label: 'Chuẩn hóa bản Demo Product' },
    { agentId: 'cfo', fallbackName: 'Kế toán/CFO', label: 'Dự toán & Phiếu chi 2 tầng' },
    { agentId: 'support_lead', fallbackName: 'CSKH', label: 'Bộ FAQ CSKH' },
    { agentId: 'data_analyst', fallbackName: 'Data Analyst', label: 'Tổng hợp KPI & Báo cáo CEO' },
  ];

  const steps: WorkflowTrace['steps'] = stepSpecs.map((s, idx) => ({
    agentId: s.agentId,
    agentName: getLiveAgentById(s.agentId)?.name || s.fallbackName,
    label: s.label,
    status: idx === 0 ? 'running' : 'pending',
    timestamp: Date.now(),
  }));

  const updateWf = async (idx: number, status: 'running' | 'done') => {
    steps[idx].status = status;
    steps[idx].timestamp = Date.now();
    if (status === 'done' && idx + 1 < steps.length) {
      steps[idx + 1].status = 'running';
    }
    await store.putWorkflow({ id: wfId, title: `Chiến dịch 30 ngày: ${product.shortName}`, steps: [...steps], createdAt: Date.now() });
  };

  await store.putWorkflow({ id: wfId, title: `Chiến dịch 30 ngày: ${product.shortName}`, steps: [...steps], createdAt: Date.now() });

  await store.addMessage({
    channelId: 'all',
    senderId: 'ceo',
    senderName: 'Chủ tịch (CEO)',
    senderTitle: 'CEO',
    department: 'ceo',
    content: `Ra mắt chiến dịch bán **${product.name}** trong 30 ngày. Toàn công ty phối hợp triển khai và báo cáo lại cho tôi.`,
    busType: 'request',
  });

  await store.addMessage({
    channelId: 'all',
    senderId: 'secretary',
    senderName: getLiveAgentById('secretary')?.name || 'Thư ký CEO',
    senderTitle: 'Thư ký CEO',
    department: 'exec',
    content: `Đang khởi chạy chuỗi điều phối đa phòng ban cho chiến dịch **${product.shortName}** (30 ngày).`,
    busType: 'report',
    cardType: 'timeline',
    cardData: { workflowId: wfId },
  });

  store.setAgentStatus('secretary', 'thinking', 'Lập kế hoạch kickoff...', product.shortName, 40);
  await sleepScaled(800);
  await updateWf(0, 'done');
  await runDepartmentMeeting(`Kickoff chiến dịch 30 ngày: ${product.shortName}`);
  if (useCompanyStore.getState().settings.killSwitchActive) return;

  store.setAgentStatus('market_research', 'typing', 'Phân tích thị trường...', 'Nghiên cứu đối thủ', 65);
  await executeAgentTool('market_research', 'write_document', {
    title: `Báo cáo Nghiên cứu Thị trường – ${product.shortName}`,
    category: 'research',
    productId: product.id,
    content: `# Nghiên cứu Thị trường: ${product.name}\n\n## Khách hàng mục tiêu\n${product.targetAudience.map((a) => `- ${a}`).join('\n')}\n\n## Nỗi đau chính (Pain Points)\n1. Quản lý thủ công bằng Excel dễ sai sót, mất 10–15 giờ/tuần.\n2. Khó theo dõi chuyển đổi khách hàng và nhắc lịch tự động.\n\n## Điểm mạnh khác biệt\n${product.strengths.map((s) => `- ${s}`).join('\n')}`,
  });
  await sleepScaled(750);
  store.setAgentStatus('market_research', 'done');
  await updateWf(1, 'done');

  await runSingleAgentTurn(
    'cmo',
    `Viết chiến lược Marketing 30 ngày cho sản phẩm ${product.name} hướng đến ${product.targetAudience[0]}.`,
    'marketing'
  );
  await updateWf(2, 'done');
  if (useCompanyStore.getState().settings.killSwitchActive) return;

  await executeAgentTool('content_writer', 'write_document', {
    title: `Bộ Content & Landing Copy 30 ngày – ${product.shortName}`,
    category: 'content',
    productId: product.id,
    content: `# Bộ Nội dung Chuyển đổi – ${product.shortName}\n\n**Headline:** ${product.tagline}\n\n## 3 Gói Giá Chuẩn\n${product.tiers.map((t) => `- **${t.name}**: ${t.priceLabel} (${t.targetCustomer})`).join('\n')}\n\n## Kêu gọi hành động (CTA)\nĐăng ký dùng thử 14 ngày & Demo 1-1 miễn phí ngay hôm nay.`,
  });

  await executeAgentTool('social_media', 'schedule_social_post', {
    platform: 'facebook',
    dayNumber: 4,
    title: `Ra mắt ${product.shortName}: Giải pháp vận hành tự động`,
    content: `${product.tagline}\nĐăng ký trải nghiệm miễn phí 14 ngày cùng đội ngũ tư vấn.`,
    hasPricingOrClaim: false,
  });

  await sleepScaled(850);
  ['content_writer', 'seo_specialist', 'social_media', 'ads_specialist'].forEach((id) =>
    store.setAgentStatus(id, 'done')
  );
  await updateWf(3, 'done');

  store.setAgentStatus('sales_director', 'talking', 'Điều phối đội Sales...', 'Pipeline 30 ngày', 80);
  store.setAgentStatus('lead_hunter_edu', 'typing', 'Săn Lead mới...', 'Tìm khách mục tiêu', 75);
  const leadRes = await executeAgentTool('lead_hunter_edu', 'find_leads', { productId: product.id, count: 5 });
  await executeAgentTool('account_executive', 'write_document', {
    title: `Kịch bản Demo & Chốt Sale – ${product.shortName}`,
    category: 'strategy',
    productId: product.id,
    content: `# Kịch bản Tư vấn & Chốt Deal: ${product.shortName}\n\n1. **Mở đầu (3 phút):** Xác định quy mô cơ sở và điểm nghẽn hiện tại.\n2. **Demo trực tiếp (12 phút):** Trình diễn 3 điểm mạnh nhất của ${product.shortName}.\n3. **Xử lý từ chối & Báo giá:** Đưa gói ${product.tiers[1].name} (${product.tiers[1].priceLabel}) làm lựa chọn tối ưu.`,
  });
  await sleepScaled(800);
  store.setAgentStatus('sales_director', 'done');
  store.setAgentStatus('lead_hunter_edu', 'done');
  await updateWf(4, 'done');

  store.setAgentStatus('pm', 'typing', 'Chuẩn bị sandbox Demo...', 'Sandbox', 75);
  store.setAgentStatus('qa_engineer', 'typing', 'Kiểm thử bản Demo...', 'QA Test', 75);
  await sleepScaled(650);
  store.setAgentStatus('pm', 'done');
  store.setAgentStatus('qa_engineer', 'done');
  await updateWf(5, 'done');

  // Create real Expense Request following 2-tier accounting process
  store.setAgentStatus('cfo', 'typing', 'Lập phiếu chi ngân sách...', 'Dự toán 30 ngày', 80);
  await executeAgentTool('ads_specialist', 'request_expense', {
    title: `Ngân sách chạy Ads chiến dịch 30 ngày (${product.shortName})`,
    category: 'Quảng cáo',
    amountVnd: 12_000_000,
    vendor: 'Meta & TikTok Ads Vietnam',
    justification: `Phân bổ Lead Ads 30 ngày cho ${product.shortName}.`,
    expectedRoi: 'Mục tiêu 150 Lead → 12 Demo → 4 Hợp đồng mới.',
    projectOrCampaign: `Chiến dịch 30 ngày ${product.shortName}`,
  });
  await sleepScaled(700);
  store.setAgentStatus('cfo', 'done');
  await updateWf(6, 'done');

  store.setAgentStatus('support_lead', 'typing', 'Soạn bộ FAQ CSKH...', 'FAQ Triển khai', 80);
  await executeAgentTool('support_lead', 'write_document', {
    title: `Bộ FAQ Chăm sóc Khách hàng – ${product.shortName}`,
    category: 'faq',
    productId: product.id,
    content: `# Câu hỏi Thường gặp (FAQ) – ${product.shortName}\n\n${product.faqs
      .map((f, i) => `### ${i + 1}. ${f.question}\n${f.answer}`)
      .join('\n\n')}`,
  });
  await sleepScaled(650);
  store.setAgentStatus('support_lead', 'done');
  await updateWf(7, 'done');

  store.setAgentStatus('data_analyst', 'typing', 'Cập nhật KPI...', 'Dashboard KPI', 90);
  const kpi = await executeAgentTool('data_analyst', 'get_kpis', {});
  await updateWf(8, 'done');
  store.setAgentStatus('data_analyst', 'done');

  await store.addMessage({
    channelId: 'all',
    senderId: 'secretary',
    senderName: getLiveAgentById('secretary')?.name || 'Thư ký CEO',
    senderTitle: 'Thư ký CEO',
    department: 'exec',
    content: `**Hoàn tất khởi động Chiến dịch 30 ngày: ${product.shortName}**\n- Đã họp Kickoff & tạo Action Items.\n- Đã lưu 4 tài liệu thực vào **Kho tài liệu** (Nghiên cứu, Content, Kịch bản Sale, FAQ).\n- Lead Hunter tìm thêm **${(leadRes.output.foundCount as number) || 0} Lead** mới vào CRM.\n- Đã lập phiếu chi ngân sách quảng cáo chờ Kế toán & Chủ tịch phê duyệt trong tab **Chi phí & Kế toán**.`,
    busType: 'report',
    cardType: 'kpi',
    cardData: kpi.output,
  });

  setTimeout(() => {
    getLiveAgents().forEach((a) => {
      const st = useCompanyStore.getState().runtimes[a.id]?.status;
      if (st === 'done') useCompanyStore.getState().setAgentStatus(a.id, 'idle', undefined, undefined, 0);
    });
  }, 2600);
}

/**
 * Autonomous Sales Autopilot Cycle
 */
export async function runAutopilotCycle(): Promise<void> {
  const store = useCompanyStore.getState();
  if (store.settings.killSwitchActive || store.settings.paused) return;

  const product = getProductById(store.settings.priorityProductId);
  store.setAgentStatus('sales_director', 'thinking', 'Rà soát phễu Autopilot...', 'Autopilot Sales', 35);

  await store.addMessage({
    channelId: 'sales',
    senderId: 'sales_director',
    senderName: getLiveAgentById('sales_director')?.name || 'Sales Director',
    senderTitle: 'Giám đốc Kinh doanh',
    department: 'sales',
    content: `**Chu kỳ Sales Autopilot bắt đầu** (Mục tiêu: ${store.settings.autopilotDailyLeadTarget} lead/ngày · Ưu tiên #1: **${product.shortName}** · Chế độ: ${store.settings.dryRun ? 'Mô phỏng DRY_RUN' : 'LIVE'}).`,
    busType: 'report',
  });

  await sleepScaled(800);
  if (useCompanyStore.getState().settings.killSwitchActive) return;

  store.setAgentStatus('lead_hunter_edu', 'typing', 'Tìm trung tâm ngoại ngữ...', 'Săn Lead mới', 60);
  const foundRes = await executeAgentTool('lead_hunter_edu', 'find_leads', {
    productId: product.id,
    count: 3,
  });
  const foundLeads = (foundRes.output.leads as Array<{ id: string; name: string; score: number; province: string }>) || [];

  if (foundLeads.length > 0) {
    await store.addMessage({
      channelId: 'sales',
      senderId: 'lead_hunter_edu',
      senderName: getLiveAgentById('lead_hunter_edu')?.name || 'Lead Hunter',
      senderTitle: 'Lead Hunter Giáo dục',
      department: 'sales',
      content: `Đã bổ sung **${foundLeads.length} Lead mới** từ nguồn công khai vào CRM:`,
      busType: 'report',
      cardType: 'lead',
      cardData: { leadId: foundLeads[0].id },
    });
  }
  store.setAgentStatus('lead_hunter_edu', 'done');
  await sleepScaled(750);

  const pendingAsk = store.askCeoQuestions.filter((q) => q.status === 'pending').length;
  store.setAgentStatus('account_provisioning', 'typing', 'Kiểm tra kênh gửi...', 'Kiểm tra Playbook', 65);
  const triggerCaptchaDemo = pendingAsk === 0 && store.outreachLogs.length <= 2;
  await executeAgentTool('account_provisioning', 'create_account', {
    platform: 'Facebook Page Business',
    simulateCaptcha: triggerCaptchaDemo,
  });
  if (!triggerCaptchaDemo) {
    store.setAgentStatus('account_provisioning', 'done');
  }
  await sleepScaled(750);

  const freshLead = useCompanyStore.getState().leads.find((l) => l.stage === 'new' && !l.blacklisted);
  if (freshLead) {
    const sdrId = freshLead.recommendedProductId === 'edu-center' || freshLead.recommendedProductId === 'preschool-care' ? 'sdr_1' : 'sdr_2';
    const sdrAgent = getLiveAgentById(sdrId) || getLiveAgents().find((a) => a.department === 'sales');
    if (sdrAgent) {
      store.setAgentStatus(sdrAgent.id, 'typing', `Soạn tin cho ${freshLead.name.slice(0, 18)}...`, 'Gửi Outreach', 75);
      const personalizedMsg = `Chào anh/chị quản lý ${freshLead.name},\n\nEm là ${sdrAgent.name} từ ${store.settings.companyName}. Qua tìm hiểu, trung tâm mình tại ${freshLead.province} đang phát triển rất tốt. Bên em có giải pháp ${getProductById(freshLead.recommendedProductId).shortName} giúp tự động xếp lịch, điểm danh & nhắc học phí qua Zalo OA.\n\nAnh/chị có muốn xem bản demo 15 phút trong tuần này không ạ?`;

      const outRes = await executeAgentTool(sdrAgent.id, 'send_outreach', {
        leadId: freshLead.id,
        channel: freshLead.zalo ? 'Zalo OA' : 'Email',
        message: personalizedMsg,
      });
      if (outRes.ok) {
        await store.addMessage({
          channelId: 'sales',
          senderId: sdrAgent.id,
          senderName: sdrAgent.name,
          senderTitle: sdrAgent.title,
          department: 'sales',
          content: `Đã gửi tin cá nhân hóa (${store.settings.dryRun ? 'Mô phỏng' : 'LIVE'}) cho **${freshLead.name}** qua **${outRes.output.channel}**.`,
          busType: 'report',
        });
      }
      store.setAgentStatus(sdrAgent.id, 'done');
    }
  }

  const repliedLead = useCompanyStore.getState().leads.find((l) => l.stage === 'replied');
  if (repliedLead) {
    store.setAgentStatus('pricing_proposal', 'typing', 'Tạo báo giá nháp...', 'Lập báo giá', 80);
    await executeAgentTool('pricing_proposal', 'create_quote', {
      leadId: repliedLead.id,
      productId: repliedLead.recommendedProductId,
      tierIndex: 1,
      discountPercent: 0,
    });
    store.setAgentStatus('pricing_proposal', 'done');
  }

  store.setAgentStatus('sales_director', 'done');
  setTimeout(() => {
    ['sales_director', 'lead_hunter_edu', 'sdr_1', 'sdr_2', 'pricing_proposal'].forEach((id) => {
      const st = useCompanyStore.getState().runtimes[id]?.status;
      if (st === 'done') useCompanyStore.getState().setAgentStatus(id, 'idle', undefined, undefined, 0);
    });
  }, 2400);
}

/**
 * Handle CEO Chat Input: Progress Queries, Slash Commands, Quick Hire, Exact @Mentions, or Dept Lead Routing (BỔ SUNG F)
 */
export async function handleCeoChatCommand(rawText: string, activeChannel: ChatChannelId): Promise<void> {
  const text = rawText.trim();
  if (!text) return;
  const store = useCompanyStore.getState();

  await store.addMessage({
    channelId: activeChannel,
    senderId: 'ceo',
    senderName: 'Chủ tịch (CEO)',
    senderTitle: 'CEO',
    department: 'ceo',
    content: text,
    busType: 'chat',
  });

  const lowerFold = foldVietnamese(text);

  // 1. Live Progress & ETA Queries (/tiendo, "bao lâu", "xong chưa", "tiến độ")
  if (
    lowerFold.startsWith('/tiendo') ||
    lowerFold.startsWith('/tien-do') ||
    /\b(bao lau|xong chua|tien do|den dau roi|tinh hinh viec)\b/.test(lowerFold)
  ) {
    const activeTasks = store.tasks.filter((t) => ['todo', 'in_progress', 'review', 'waiting_approval', 'waiting_resume'].includes(t.status));
    const now = Date.now();
    const lines = activeTasks.slice(0, 8).map((t) => {
      const ag = getLiveAgentById(t.assignedTo);
      const minsLeft = Math.round((t.etaAt - now) / 60_000);
      const etaLabel = minsLeft < 0 ? `Trễ ${Math.abs(minsLeft)} phút` : `Còn ~${Math.max(1, minsLeft)} phút`;
      return `- **${t.taskCode}** · ${t.title.slice(0, 50)} — **${ag?.name || t.assignedTo}** · \`${t.progressPercent}%\` (${t.status}) · ${etaLabel}`;
    });
    const delayedCount = activeTasks.filter((t) => t.etaAt && now > t.etaAt).length;

    await store.addMessage({
      channelId: activeChannel,
      senderId: 'secretary',
      senderName: getLiveAgentById('secretary')?.name || 'Thư ký CEO',
      senderTitle: 'Thư ký CEO',
      department: 'exec',
      content: activeTasks.length
        ? `**Tiến độ công việc thời gian thực từ DB** (${activeTasks.length} việc đang mở · ${delayedCount} việc trễ ETA):\n${lines.join('\n')}`
        : 'Hiện tại không có công việc nào đang dang dở trên Task Board. Toàn bộ task trước đó đã đóng.',
      busType: 'report',
    });
    return;
  }

  // 2. Live Report (/baocao, /bao-cao)
  if (text.startsWith('/bao-cao') || text.startsWith('/baocao')) {
    const kpi = await executeAgentTool('data_analyst', 'get_kpis', {});
    const pendingExp = store.expenses.filter((e) => e.status === 'pending_ceo' || e.status === 'pending_accountant').length;
    await store.addMessage({
      channelId: activeChannel,
      senderId: 'data_analyst',
      senderName: getLiveAgentById('data_analyst')?.name || 'Data Analyst',
      senderTitle: 'Data Analyst',
      department: 'data',
      content: `**Báo cáo Điều hành Thời gian thực:** (${pendingExp} phiếu chi đang chờ duyệt)`,
      busType: 'report',
      cardType: 'kpi',
      cardData: kpi.output,
    });
    return;
  }

  // 3. Natural-language HR Hiring in Chat (BỔ SUNG D)
  const hrIntent = parseQuickHireIntent(text, store.departments);
  if (hrIntent.isHireRequest && hrIntent.specs.length > 0 && !store.settings.killSwitchActive) {
    if (store.settings.hrAutoDecide) {
      const hired = await store.hireBatchTeam(
        hrIntent.specs.map((s) => ({
          name: s.name,
          title: s.title,
          department: s.department,
          role: 'Specialist',
          personalityNote: s.personalityNote,
          templateId: s.templateId,
          existingAgents: store.agents,
          departments: store.departments,
        })),
        'CEO (Chat nhanh)'
      );
      await store.addMessage({
        channelId: activeChannel,
        senderId: 'hr',
        senderName: getLiveAgentById('hr')?.name || 'Phòng Nhân sự',
        senderTitle: 'HR Manager',
        department: 'backoffice',
        content: `Đã tuyển xong **${hired.length} nhân sự**: ${hired.map((a) => `**${a.name}** (${a.title})`).join(', ')}. Nhân vật 3D đang đi từ sảnh Lễ tân vào bàn làm việc!`,
        busType: 'report',
      });
    } else {
      const aprId = `apr_hr_${Date.now()}`;
      await store.putApproval({
        id: aprId,
        type: 'hr_hire',
        title: `Đề xuất tuyển ${hrIntent.specs.length} nhân sự: ${hrIntent.summary}`,
        description: `Phòng ban: ${hrIntent.specs.map((s) => s.department).join(', ')} · Dự kiến ~${formatVnd(hrIntent.specs.length * 180_000)}/tháng tiền Token AI.`,
        requestedBy: 'hr',
        department: 'backoffice',
        payload: { specs: hrIntent.specs },
        status: 'pending',
        createdAt: Date.now(),
      });
      await store.addMessage({
        channelId: activeChannel,
        senderId: 'hr',
        senderName: getLiveAgentById('hr')?.name || 'Phòng Nhân sự',
        senderTitle: 'HR Manager',
        department: 'backoffice',
        content: `Em đã lên **Phiếu đề xuất tuyển dụng ${hrIntent.specs.length} nhân sự**: ${hrIntent.summary}. Mời Chủ tịch xem trước & bấm duyệt tuyển ngay:`,
        busType: 'approval_needed',
        cardType: 'hr_proposal',
        cardData: { approvalId: aprId, specs: hrIntent.specs },
      });
    }
    return;
  }

  // 4. Exact @Mention Routing (Strictly to mentioned agent, NO fallback to Secretary!)
  const mentionRes = resolveMentionTargets(text, store.agents);
  if (mentionRes.matches.length > 1) {
    await store.addMessage({
      channelId: activeChannel,
      senderId: 'system',
      senderName: 'Bộ định tuyến @Mention',
      senderTitle: 'Chọn nhân sự',
      department: 'exec',
      content: `Có **${mentionRes.matches.length} nhân sự** khớp với \`@${mentionRes.rawToken}\`. Chủ tịch muốn giao cho ai ạ?`,
      busType: 'question',
      cardType: 'text',
      cardData: {
        disambiguationAgents: mentionRes.matches.map((m) => ({ id: m.id, name: m.name, title: m.title, department: m.department })),
        originalText: mentionRes.strippedInstruction || text,
      },
    });
    return;
  }

  if (mentionRes.matches.length === 1) {
    const target = mentionRes.matches[0];
    if (!mentionRes.strippedInstruction) {
      store.setActiveChannel(`dm:${target.id}`);
      await store.addMessage({
        channelId: `dm:${target.id}`,
        senderId: target.id,
        senderName: target.name,
        senderTitle: target.title,
        department: target.department,
        content: `Dạ em **${target.name} (${target.title})** đây ạ. Chủ tịch cần em xử lý đầu việc gì ngay bây giờ?`,
        busType: 'chat',
      });
      return;
    }
    await runSingleAgentTurn(target.id, mentionRes.strippedInstruction, activeChannel);
    return;
  }

  // 5. System Blockers check before running slash / routing commands
  if (store.settings.killSwitchActive || store.settings.paused) {
    const firstFallbackAgent = getLiveAgents()[0];
    await runSingleAgentTurn(firstFallbackAgent?.id || 'secretary', text, activeChannel);
    return;
  }

  if (text.startsWith('/autopilot')) {
    const turnOn = !text.includes('off') && !text.includes('tắt');
    await store.updateSettings({ autopilotEnabled: turnOn });
    if (turnOn) await runAutopilotCycle();
    return;
  }

  if (text.startsWith('/dung-kenh')) {
    await runBrandAndChannelLaunch();
    return;
  }

  if (text.startsWith('/hop')) {
    const topic = text.replace(/^\/hop\s*/i, '').trim() || 'Giao ban điều hành tiến độ bán hàng & sản phẩm';
    await runDepartmentMeeting(topic);
    return;
  }

  if (text.startsWith('/tim-khach')) {
    const query = text.replace(/^\/tim-khach\s*/i, '').trim() || 'trung tâm ngoại ngữ';
    await runSingleAgentTurn('lead_hunter_edu', `Tìm 5 khách hàng tiềm năng cho: ${query}`, activeChannel);
    return;
  }

  if (text.startsWith('/giao-viec')) {
    const taskTitle = text.replace(/^\/giao-viec\s*/i, '').trim() || 'Triển khai nhiệm vụ mới từ CEO';
    await runSingleAgentTurn('secretary', `Phân công và tạo task trên Task Board cho: ${taskTitle}`, activeChannel);
    return;
  }

  // 6. Direct Message Channel
  if (activeChannel.startsWith('dm:')) {
    const targetId = activeChannel.replace('dm:', '');
    await runSingleAgentTurn(targetId, text, activeChannel);
    return;
  }

  // 7. Channel Lead Routing using live agents
  const activeAgents = getLiveAgents();
  const deptLeadMap: Record<string, string> = {
    all: 'secretary',
    exec: 'secretary',
    marketing: 'cmo',
    sales: 'sales_director',
    cs: 'support_lead',
    product: 'pm',
    data: 'data_analyst',
    backoffice: 'cfo',
    ask_ceo: 'secretary',
    meeting: 'secretary',
  };

  let handlerId = deptLeadMap[activeChannel];
  if (!handlerId || !activeAgents.some((a) => a.id === handlerId)) {
    const deptMatch = activeAgents.find((a) => a.department === activeChannel && a.role === 'Dept Head') ||
      activeAgents.find((a) => a.department === activeChannel) ||
      activeAgents.find((a) => a.id === 'secretary') ||
      activeAgents[0];
    handlerId = deptMatch?.id || 'secretary';
  }

  await runSingleAgentTurn(handlerId, text, activeChannel);
}

export function startBackgroundSchedulers() {
  ensureMarketingAskCeoHook();
  if (autopilotTimer) window.clearInterval(autopilotTimer);
  if (overdueTimer) window.clearInterval(overdueTimer);

  let lastAutopilotRun = 0;
  let lastMarketingRun = 0;
  let lastDigestKey = '';

  autopilotTimer = window.setInterval(() => {
    const s = useCompanyStore.getState().settings;
    if (s.paused || s.killSwitchActive) return;
    const intervalMs = (Math.max(1, s.autopilotIntervalMinutes) * 60_000) / s.simulationSpeed;
    if (s.autopilotEnabled && Date.now() - lastAutopilotRun >= intervalMs) {
      lastAutopilotRun = Date.now();
      runAutopilotCycle();
    }
    if (s.marketingAutopilotEnabled && Date.now() - lastMarketingRun >= intervalMs) {
      lastMarketingRun = Date.now();
      runMarketingAutopilotCycle();
    }
  }, 15000);

  // Watchdog Timer (BỔ SUNG F): ETA +20% delay alerts, 15m stall escalation, Sleep-idle, Daily Digest
  overdueTimer = window.setInterval(() => {
    const store = useCompanyStore.getState();
    const now = Date.now();

    // 1. Overdue AskCeo
    const overdueMs = (store.settings.zaloOverdueHours || 2) * 3600_000;
    for (const q of store.askCeoQuestions) {
      if (q.status === 'pending' && now - q.createdAt > overdueMs) {
        store.putAskCeoQuestion({ ...q, status: 'reminded', remindedAt: now });
        store.pushZaloSimMessage('in', `[NHẮC LẦN 1 - Quá hạn ${store.settings.zaloOverdueHours}h] Câu hỏi #${q.id} đang chờ Chủ tịch trả lời.`);
        store.setAgentStatus(q.agentId, 'idle', 'Chuyển việc khác khi chờ CEO');
      }
    }

    if (store.settings.paused || store.settings.killSwitchActive) return;

    // 2. Watchdog for delayed / stalled tasks
    for (const t of store.tasks) {
      if (t.status !== 'in_progress' && t.status !== 'todo') continue;

      const graceMs = (t.etaMinutes || 10) * 60_000 * 0.2;
      if (t.etaAt && now > t.etaAt + graceMs && !t.delayNotified) {
        store.putTask({ ...t, delayNotified: true, updatedAt: now });
        store.setAgentDelayed(t.assignedTo, true);
        const ag = getLiveAgentById(t.assignedTo);
        store.addMessage({
          channelId: t.channelId || t.department,
          senderId: 'system',
          senderName: 'Watchdog Tiến độ',
          senderTitle: 'Cảnh báo trễ ETA',
          department: t.department,
          content: `Việc **${t.taskCode}** (*${t.title}*) do **${ag?.name || t.assignedTo}** phụ trách đã **vượt quá ETA 20%** (${t.progressPercent}%).`,
          busType: 'escalation',
        });
      }

      // Stall >= 15 minutes escalation
      const stallMs = 15 * 60_000;
      if (t.status === 'in_progress' && now - (t.lastProgressAt || t.updatedAt) >= stallMs) {
        const level = t.escalatedLevel || 0;
        if (level < 2) {
          const nextLevel = level + 1;
          store.putTask({ ...t, escalatedLevel: nextLevel, updatedAt: now });
          store.setAgentDelayed(t.assignedTo, true);
          const ag = getLiveAgentById(t.assignedTo);
          store.addMessage({
            channelId: nextLevel === 1 ? t.department : 'all',
            senderId: 'system',
            senderName: 'Watchdog Leo thang',
            senderTitle: nextLevel === 1 ? 'Báo Trưởng phòng' : 'Báo CEO',
            department: t.department,
            content:
              nextLevel === 1
                ? `Cảnh báo kẹt tiến độ >15 phút tại **${t.taskCode}** (${ag?.name || t.assignedTo}). Đã báo Trưởng phòng ${t.department} kiểm tra.`
                : `Leo thang lên CEO: **${t.taskCode}** (*${t.title}*) bị treo >15 phút chưa có bước mới.`,
            busType: 'escalation',
          });
        }
      }
    }

    // 3. Auto-sleep idle agents (BỔ SUNG D cost guardrail)
    if (store.settings.sleepIdleAgents) {
      for (const ag of getLiveAgents()) {
        if (ag.employmentStatus !== 'active') continue;
        const rt = store.runtimes[ag.id];
        if (rt && rt.status === 'idle' && now - rt.lastHeartbeatAt > 90_000) {
          store.setAgentStatus(ag.id, 'sleeping', undefined, undefined, 0);
        }
      }
    }

    // 4. Daily Digest (once per day when enabled)
    if (store.settings.dailyDigestEnabled) {
      const todayKey = new Date(now).toISOString().slice(0, 10);
      if (lastDigestKey !== todayKey && store.initialized) {
        lastDigestKey = todayKey;
        const openCount = store.tasks.filter((t) => t.status === 'in_progress' || t.status === 'todo').length;
        const delayedCount = store.tasks.filter((t) => t.delayNotified && t.status !== 'done').length;
        const pendingExpCount = store.expenses.filter((e) => e.status === 'pending_ceo' || e.status === 'pending_accountant').length;
        if (openCount > 0 || delayedCount > 0 || pendingExpCount > 0) {
          store.pushZaloSimMessage(
            'in',
            `[Digest ${todayKey}] Việc đang mở: ${openCount} · Trễ hạn: ${delayedCount} · Phiếu chi chờ duyệt: ${pendingExpCount}.`
          );
        }
      }
    }
  }, 20000);
}

export const getDepartmentName = (id: string) => getLiveDepartmentById(id)?.name || id;
