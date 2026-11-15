import {
  AgentProfile,
  AgentRuntimeState,
  AgentScreenSnapshot,
  AgentTimelineEvent,
  AuditLogEntry,
  ChatMessage,
  DocumentItem,
  HubCwApiLog,
  SpotCheckRecord,
  SpotCheckVerdict,
  SystemEnvMode,
  TaskItem,
  TokenUsageRecord,
} from '../types';

/**
 * Automatically redacts passwords, OTPs, API keys, Vault tokens, and long bank/account digits
 * before any screen snapshot or timeline log is displayed or saved.
 */
export function maskSensitiveContent(raw: string | undefined | null): string {
  if (!raw) return '';
  return String(raw)
    .replace(/(password|mat\s*khau|secret|token|apiKey|api_key|bearer)\s*[:=]\s*['"]?([^\s'",}]+)/gi, '$1=[ĐÃ CHE]')
    .replace(/\b(sk-[a-zA-Z0-9_-]{8,}|AIza[a-zA-Z0-9_-]{12,}|eyJ[a-zA-Z0-9_.-]{16,})\b/g, '[API_KEY_ĐÃ_CHE]')
    .replace(/\b(?:OTP|mã\s*xác\s*thực)\s*[:\-]?\s*(\d{4,8})\b/gi, 'OTP:[ĐÃ_CHE]')
    .replace(/\b\d{4}[\s.-]\d{4}[\s.-]\d{2,6}(?:[\s.-](\d{2,4}))?\b/g, (m, g1) => `****${g1 || m.slice(-4)}`)
    .replace(/\b(\d{6,16})\b/g, (m) => (m.length >= 9 ? `****${m.slice(-4)}` : m));
}

export function buildHonestAgentScreenSnapshot(params: {
  agent: AgentProfile;
  runtime?: AgentRuntimeState;
  tasks: TaskItem[];
  documents: DocumentItem[];
  auditLogs: AuditLogEntry[];
  hubcwLogs: HubCwApiLog[];
  messages: ChatMessage[];
  tokenUsage: TokenUsageRecord[];
  envMode: SystemEnvMode;
  timelineEvents: AgentTimelineEvent[];
  liveBrowserFrame?: { url?: string; screenshotDataUrl?: string; active: boolean } | null;
}): AgentScreenSnapshot {
  const {
    agent,
    runtime,
    tasks,
    documents,
    auditLogs,
    hubcwLogs,
    messages,
    tokenUsage,
    envMode,
    timelineEvents,
    liveBrowserFrame,
  } = params;

  const now = Date.now();
  const activeTask =
    tasks.find((t) => t.assignedTo === agent.id && (t.status === 'in_progress' || t.status === 'review' || t.status === 'waiting_approval')) ||
    tasks.find((t) => t.assignedTo === agent.id && t.status === 'todo') ||
    tasks.find((t) => t.assignedTo === agent.id);

  const etaMinutesLeft = activeTask?.etaAt ? Math.max(0, Math.round((activeTask.etaAt - now) / 60000)) : null;

  const recentDoc = documents.find((d) => d.authorId === agent.id);

  const combinedLogs = [
    ...auditLogs
      .filter((l) => l.agentId === agent.id)
      .slice(0, 6)
      .map((l) => ({
        id: l.id,
        source: 'rbac' as const,
        summaryMasked: maskSensitiveContent(`${l.action}${l.reason ? ` (${l.reason})` : ''}`),
        result: l.result,
        timestamp: l.timestamp,
      })),
    ...hubcwLogs
      .filter((h) => h.agentId === agent.id)
      .slice(0, 6)
      .map((h) => ({
        id: h.id,
        source: 'hubcw' as const,
        summaryMasked: maskSensitiveContent(`${h.method} ${h.module}:${h.operation}`),
        result: h.result,
        timestamp: h.timestamp,
      })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  const liveDialogue = messages
    .filter((m) => m.senderId === agent.id || (m.mentions || []).includes(agent.id) || m.channelId === `dm:${agent.id}`)
    .slice(-5)
    .map((m) => ({
      id: m.id,
      senderName: m.senderName,
      excerptMasked: maskSensitiveContent(m.content.slice(0, 180)),
      timestamp: m.timestamp,
    }));

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTokens = tokenUsage.filter((t) => t.agentId === agent.id && t.dateKey === todayKey);
  const totalTokens = todayTokens.reduce((s, t) => s + t.totalTokens, 0);
  const costUsd = Number(todayTokens.reduce((s, t) => s + t.costUsd, 0).toFixed(4));

  const recentEvents = timelineEvents.filter((e) => e.agentId === agent.id).slice(-6);
  const planSummary: Array<{ step: string; status: 'done' | 'running' | 'pending' }> =
    recentEvents.length > 0
      ? recentEvents.map((e, idx) => ({
          step: maskSensitiveContent(e.stepLabel),
          status: idx === recentEvents.length - 1 && (runtime?.status === 'thinking' || runtime?.status === 'typing') ? 'running' : 'done',
        }))
      : activeTask
      ? [
          { step: `Nhận việc: ${activeTask.title}`, status: 'done' },
          { step: activeTask.expectedDeliverable || 'Thực thi bằng công cụ được cấp phép', status: activeTask.status === 'done' ? 'done' : 'running' },
          { step: 'Kiểm tra & bàn giao', status: activeTask.status === 'done' ? 'done' : 'pending' },
        ]
      : [{ step: 'Chưa có kế hoạch tác vụ mới', status: 'pending' }];

  const preliminary: Omit<AgentScreenSnapshot, 'verdict' | 'score' | 'verdictReason'> = {
    agentId: agent.id,
    agentName: agent.name,
    department: agent.department,
    capturedAt: now,
    envMode,
    simulated: envMode === 'sandbox',
    taskInfo: activeTask
      ? {
          taskId: activeTask.id,
          taskCode: activeTask.taskCode,
          title: activeTask.title,
          progressPercent: activeTask.progressPercent,
          etaLabel:
            activeTask.status === 'done'
              ? 'Đã xong'
              : etaMinutesLeft !== null
              ? etaMinutesLeft === 0
                ? 'Đến hạn / kiểm tra ETA'
                : `Còn ~${etaMinutesLeft} phút`
              : activeTask.dueLabel || 'Chưa đặt ETA',
          status: activeTask.status,
        }
      : {
          title: runtime?.currentTaskTitle || 'Chưa nhận tác vụ nào',
          progressPercent: 0,
          etaLabel: 'Không có',
          status: runtime?.status || 'idle',
        },
    browserSession: liveBrowserFrame?.active
      ? {
          active: true,
          url: maskSensitiveContent(liveBrowserFrame.url),
          screenshotDataUrl: liveBrowserFrame.screenshotDataUrl,
          note: 'Ảnh chụp luồng thật từ Playwright (/worker)',
        }
      : {
          active: false,
          note:
            envMode === 'sandbox'
              ? 'Mô phỏng (Chưa kết nối /worker Playwright — không dựng ảnh trình duyệt giả)'
              : 'Agent hiện không mở phiên trình duyệt Playwright',
        },
    activeDraft: recentDoc
      ? {
          docId: recentDoc.id,
          title: recentDoc.title,
          category: recentDoc.category,
          excerptMasked: maskSensitiveContent(recentDoc.content.slice(0, 320)),
        }
      : null,
    recentToolLogs: combinedLogs,
    liveDialogue,
    planSummary,
    tokenStatsToday: { totalTokens, costUsd },
  };

  const evalResult = evaluateSpotCheckMatch(preliminary, runtime, timelineEvents);
  return {
    ...preliminary,
    ...evalResult,
  };
}

export function evaluateSpotCheckMatch(
  screen: Omit<AgentScreenSnapshot, 'verdict' | 'score' | 'verdictReason'>,
  runtime?: AgentRuntimeState,
  timelineEvents: AgentTimelineEvent[] = []
): { verdict: SpotCheckVerdict; score: number; verdictReason: string } {
  const status = runtime?.status || 'idle';
  const agentEvents = timelineEvents.filter((e) => e.agentId === screen.agentId).slice(-6);

  // Detect repetition loop
  if (agentEvents.length >= 4) {
    const last4 = agentEvents.slice(-4).map((e) => e.stepLabel);
    if (new Set(last4).size === 1) {
      return {
        verdict: 'lặp',
        score: 42,
        verdictReason: `Lặp cùng 1 bước "${last4[0]}" liên tiếp 4 lần — cần COO/CEO kiểm tra hoặc đổi hướng.`,
      };
    }
  }

  if (status === 'blocked' || status === 'error' || runtime?.isDelayed) {
    return {
      verdict: 'kẹt',
      score: 52,
      verdictReason:
        status === 'blocked'
          ? 'Đang chờ CEO giải đáp / xác nhận OTP hoặc duyệt vượt ngưỡng.'
          : status === 'error'
          ? 'Gặp lỗi khi thực thi công cụ — cần xử lý.'
          : 'Tác vụ đã quá ETA dự kiến.',
    };
  }

  if (screen.taskInfo.status === 'idle' && (status === 'idle' || status === 'sleeping' || status === 'done')) {
    return {
      verdict: 'nhàn rỗi',
      score: 72,
      verdictReason: 'Hiện không có tác vụ dang dở trên hàng đợi — sẵn sàng nhận việc hoặc brainstorm ý tưởng.',
    };
  }

  // Check alignment between active task and recent tool logs / draft
  const taskWords = screen.taskInfo.title.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  const contextText = [
    screen.activeDraft?.title || '',
    ...screen.recentToolLogs.map((l) => l.summaryMasked),
    ...screen.liveDialogue.map((d) => d.excerptMasked),
  ]
    .join(' ')
    .toLowerCase();

  const anyOverlap =
    screen.recentToolLogs.length === 0 ||
    taskWords.some((w) => contextText.includes(w)) ||
    status === 'typing' ||
    status === 'thinking' ||
    status === 'in_meeting';

  if (!anyOverlap) {
    return {
      verdict: 'lệch việc',
      score: 48,
      verdictReason: 'Hoạt động công cụ/hội thoại gần nhất chưa khớp rõ với tác vụ đang giao.',
    };
  }

  const baseScore = screen.taskInfo.progressPercent >= 50 ? 92 : 86;
  return {
    verdict: 'đúng việc',
    score: baseScore,
    verdictReason: `Đang thực thi đúng tác vụ "${screen.taskInfo.title}" (${screen.taskInfo.progressPercent}%).`,
  };
}

export function createSpotCheckRecord(
  snapshot: AgentScreenSnapshot,
  inspector: 'ceo' | 'coo' = 'ceo'
): SpotCheckRecord {
  const now = Date.now();
  return {
    id: `sc_${now.toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    agentId: snapshot.agentId,
    agentName: snapshot.agentName,
    inspector,
    verdict: snapshot.verdict,
    score: snapshot.score,
    verdictReason: snapshot.verdictReason,
    snapshot,
    createdAt: now,
  };
}

export function pickRandomActiveAgent(
  agents: AgentProfile[],
  runtimes: Record<string, AgentRuntimeState>
): AgentProfile | null {
  const active = agents.filter((a) => !a.employmentStatus || a.employmentStatus === 'active');
  if (active.length === 0) return null;
  const working = active.filter((a) => {
    const st = runtimes[a.id]?.status;
    return st === 'typing' || st === 'thinking' || st === 'talking' || st === 'blocked' || st === 'error' || st === 'in_meeting';
  });
  const pool = working.length > 0 ? working : active;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

export function pruneSpotCheckSnapshots(records: SpotCheckRecord[], retentionDays: number, now = Date.now()): SpotCheckRecord[] {
  const clampedDays = Math.min(30, Math.max(7, retentionDays || 14));
  const cutoff = now - clampedDays * 86_400_000;
  return records.filter((r) => r.createdAt >= cutoff);
}

export const pruneExpiredSpotChecks = pruneSpotCheckSnapshots;

export function filterRecentTenMinTimeline(events: AgentTimelineEvent[], agentId: string, now = Date.now()): AgentTimelineEvent[] {
  const cutoff = now - 10 * 60_000;
  return events.filter((e) => e.agentId === agentId && e.timestamp >= cutoff).sort((a, b) => a.timestamp - b.timestamp);
}
