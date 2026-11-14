import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  ArrowDown,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileText,
  Paperclip,
  Play,
  Receipt,
  Reply,
  RotateCcw,
  Search,
  Send,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react';
import { getLogoSvgDataUrl } from '../../brand/logoBrand';
import { formatVnd } from '../../engine/expenseEngine';
import { handleCeoChatCommand, runSingleAgentTurn } from '../../engine/orchestrator';
import { foldVietnamese } from '../../engine/roleTemplates';
import { RightPanelTab, useCompanyStore } from '../../store/useCompanyStore';
import { ChatChannelId, ChatMessage, TaskDeliverableLink } from '../../types';

const SLASH_COMMANDS = [
  { cmd: '/giao-viec ', desc: 'Giao nhiệm vụ mới kèm DoD & ETA' },
  { cmd: '/tiendo', desc: 'Xem tiến độ thực tế mọi việc từ DB' },
  { cmd: '/bao-cao', desc: 'Data Analyst tổng hợp KPI & phiếu chi thực tế' },
  { cmd: '/tim-khach ', desc: 'Lead Hunter tìm khách hàng công khai' },
  { cmd: '/dung-kenh', desc: 'Dựng Brand Launch Kit & tự thiết lập 7 kênh MXH' },
  { cmd: '/hop ', desc: 'Triệu tập họp liên phòng ban tại Phòng Họp Lớn' },
  { cmd: '/autopilot', desc: 'Bật và chạy ngay 1 chu kỳ Sales Autopilot' },
];

function deliverableTab(type: TaskDeliverableLink['type']): RightPanelTab {
  if (type === 'doc' || type === 'quote' || type === 'report') return 'docs';
  if (type === 'lead') return 'crm';
  if (type === 'expense') return 'finance';
  if (type === 'post') return 'marketing';
  if (type === 'agent') return 'rbac';
  return 'tasks';
}

export function ChatPanel() {
  const agents = useCompanyStore((s) => s.agents);
  const departments = useCompanyStore((s) => s.departments);
  const messages = useCompanyStore((s) => s.messages);
  const activeChannel = useCompanyStore((s) => s.activeChannel);
  const setActiveChannel = useCompanyStore((s) => s.setActiveChannel);
  const peekMode = useCompanyStore((s) => s.peekMode);
  const setPeekMode = useCompanyStore((s) => s.setPeekMode);
  const runtimes = useCompanyStore((s) => s.runtimes);
  const tasks = useCompanyStore((s) => s.tasks);
  const moveTaskStatus = useCompanyStore((s) => s.moveTaskStatus);
  const approvals = useCompanyStore((s) => s.approvals);
  const resolveApproval = useCompanyStore((s) => s.resolveApproval);
  const askCeoQuestions = useCompanyStore((s) => s.askCeoQuestions);
  const answerAskCeo = useCompanyStore((s) => s.answerAskCeo);
  const expenses = useCompanyStore((s) => s.expenses);
  const ceoResolveExpense = useCompanyStore((s) => s.ceoResolveExpense);
  const documents = useCompanyStore((s) => s.documents);
  const leads = useCompanyStore((s) => s.leads);
  const workflows = useCompanyStore((s) => s.workflows);
  const settings = useCompanyStore((s) => s.settings);
  const externalAccounts = useCompanyStore((s) => s.externalAccounts);
  const resumeFromKillSwitch = useCompanyStore((s) => s.resumeFromKillSwitch);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);

  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [replyParent, setReplyParent] = useState<ChatMessage | null>(null);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [revisionOpenId, setRevisionOpenId] = useState<string | null>(null);
  const [revisionText, setRevisionText] = useState('');
  const [atBottom, setAtBottom] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAgents = useMemo(
    () => agents.filter((a) => a.employmentStatus !== 'archived'),
    [agents]
  );

  const channels = useMemo<Array<{ id: ChatChannelId; label: string }>>(() => {
    const base: Array<{ id: ChatChannelId; label: string }> = [
      { id: 'all', label: '#Tất cả' },
      { id: 'ask_ceo', label: 'Hỏi CEO' },
      { id: 'meeting', label: '#Họp' },
    ];
    for (const d of departments) {
      if (d.id === 'reception') continue;
      base.push({ id: d.id, label: `#${d.shortName}` });
    }
    return base;
  }, [departments]);

  const pendingAskCount = askCeoQuestions.filter(
    (q) => q.status === 'pending' || q.status === 'reminded'
  ).length;

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (!peekMode && m.isInternalPeek) return false;
      const matchChannel =
        activeChannel === 'all'
          ? m.channelId === 'all' || peekMode
          : m.channelId === activeChannel;
      if (!matchChannel) return false;
      if (searchTerm.trim()) {
        const q = foldVietnamese(searchTerm);
        return (
          foldVietnamese(m.content).includes(q) ||
          foldVietnamese(m.senderName).includes(q)
        );
      }
      return true;
    });
  }, [messages, activeChannel, peekMode, searchTerm]);

  useEffect(() => {
    if (atBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages.length, atBottom]);

  const busyAgents = activeAgents.filter((a) => {
    const st = runtimes[a.id]?.status;
    return st === 'thinking' || st === 'typing' || st === 'talking';
  });

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = replyParent ? `[Trả lời ${replyParent.senderName}]: ${input}` : input;
    setInput('');
    setReplyParent(null);
    setSending(true);
    try {
      await handleCeoChatCommand(text, activeChannel);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const snippet = text.slice(0, 1200);
    setInput((prev) => `${prev}\n[Đính kèm ${file.name}]:\n\`\`\`\n${snippet}\n\`\`\``.trim());
    e.target.value = '';
  };

  const showSlashPopup = input.startsWith('/') && !input.includes(' ');
  const mentionMatch = input.match(/@([^\s@]*)$/);
  const mentionProbe = mentionMatch ? foldVietnamese(mentionMatch[1]) : '';
  const mentionCandidates = mentionMatch
    ? activeAgents
        .filter(
          (a) =>
            !mentionProbe ||
            foldVietnamese(a.name).includes(mentionProbe) ||
            foldVietnamese(a.title).includes(mentionProbe) ||
            foldVietnamese(a.id).includes(mentionProbe) ||
            (a.nickname && foldVietnamese(a.nickname).includes(mentionProbe))
        )
        .slice(0, 6)
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Channel Tabs & Peek Switch */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {channels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveChannel(ch.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                  activeChannel === ch.id
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>{ch.label}</span>
                {ch.id === 'ask_ceo' && pendingAskCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold font-mono-num">
                    {pendingAskCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setPeekMode(!peekMode)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 border cursor-pointer ${
                peekMode
                  ? 'bg-violet-600 text-white border-violet-500'
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Chế độ nhìn lén: xem các agent trao đổi nội bộ với nhau"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nhìn lén</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSearch((v) => !v)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Tìm kiếm lịch sử chat"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* DM selector + Search bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={activeChannel.startsWith('dm:') ? activeChannel : ''}
              onChange={(e) => {
                if (e.target.value) setActiveChannel(e.target.value);
              }}
              className="w-full text-xs rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 focus:outline-none"
            >
              <option value="">Nhắn riêng (DM) với nhân sự AI ({activeAgents.length})...</option>
              {activeAgents.map((a) => (
                <option key={a.id} value={`dm:${a.id}`}>
                  {a.name} — {a.title}
                </option>
              ))}
            </select>
          </div>

          {showSearch && (
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tin nhắn..."
              className="w-40 text-xs rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 focus:outline-none"
            />
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
          setAtBottom(isNearBottom);
        }}
        className="flex-1 overflow-y-auto p-3 space-y-3 relative"
      >
        {filteredMessages.length === 0 && (
          <div className="text-center py-12 text-xs text-slate-500 dark:text-slate-400">
            Chưa có tin nhắn trong kênh này. Hãy giao việc bằng `@tên`, nhắn trực tiếp hoặc dùng `/giao-viec`.
          </div>
        )}

        {filteredMessages.map((msg) => {
          const isCeo = msg.senderId === 'ceo';
          const deptObj = departments.find((d) => d.id === msg.department);
          const deptColor =
            msg.department === 'ceo' ? '#0284C7' : deptObj?.color || '#64748B';
          const timeStr = new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          });

          const approvalObj =
            msg.cardType === 'approval' || msg.cardType === 'hr_proposal'
              ? approvals.find((a) => a.id === msg.cardData?.approvalId)
              : undefined;
          const askObj =
            msg.cardType === 'ask_ceo'
              ? askCeoQuestions.find((q) => q.id === msg.cardData?.questionId)
              : undefined;
          const docObj =
            msg.cardType === 'document'
              ? documents.find((d) => d.id === msg.cardData?.documentId)
              : undefined;
          const leadObj =
            msg.cardType === 'lead'
              ? leads.find((l) => l.id === msg.cardData?.leadId)
              : undefined;
          const wfObj =
            msg.cardType === 'timeline'
              ? workflows.find((w) => w.id === msg.cardData?.workflowId)
              : undefined;
          const expenseObj =
            msg.cardType === 'expense'
              ? expenses.find((e) => e.id === msg.cardData?.expenseId)
              : undefined;

          const reportTaskId =
            msg.cardType === 'task_report' ? String(msg.cardData?.taskId || '') : '';
          const reportTaskObj = reportTaskId
            ? tasks.find((t) => t.id === reportTaskId)
            : undefined;
          const reportDeliverables = Array.isArray(msg.cardData?.deliverables)
            ? (msg.cardData?.deliverables as TaskDeliverableLink[])
            : reportTaskObj?.deliverables || [];

          const disambigList = Array.isArray(msg.cardData?.disambiguationAgents)
            ? (msg.cardData?.disambiguationAgents as Array<{
                id: string;
                name: string;
                title: string;
                department: string;
              }>)
            : [];

          return (
            <div key={msg.id} className={`flex flex-col ${isCeo ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 border ${
                  isCeo
                    ? 'bg-sky-600/15 border-sky-500/30 text-slate-900 dark:text-slate-100'
                    : msg.isInternalPeek
                    ? 'bg-violet-500/10 border-violet-500/30 text-slate-900 dark:text-slate-100'
                    : 'bg-slate-100 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {!isCeo && msg.senderId !== 'system' ? (
                      <div className="relative shrink-0">
                        <span
                          className="w-5 h-5 rounded-md text-[10px] font-bold text-white flex items-center justify-center"
                          style={{ backgroundColor: deptColor }}
                        >
                          {msg.senderName.split(' ').slice(-1)[0]?.[0] || 'A'}
                        </span>
                        <img
                          src={settings.brand?.logoDataUrl || getLogoSvgDataUrl()}
                          alt=""
                          className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-300 object-contain absolute -bottom-0.5 -right-0.5"
                        />
                      </div>
                    ) : (
                      <span
                        className="w-5 h-5 rounded-md text-[10px] font-bold text-white flex items-center justify-center shrink-0"
                        style={{ backgroundColor: deptColor }}
                      >
                        {msg.senderName.split(' ').slice(-1)[0]?.[0] || 'A'}
                      </span>
                    )}
                    <span className="text-xs font-bold truncate">{msg.senderName}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {msg.senderTitle} · {timeStr}
                    </span>
                    {!isCeo &&
                      msg.senderId !== 'system' &&
                      settings.envMode !== 'sandbox' &&
                      (() => {
                        const ext = externalAccounts.find((e) => e.agentId === msg.senderId);
                        return !ext || ext.status === 'unlinked' || ext.status === 'pending_creation';
                      })() && (
                        <span className="px-1 py-0.2 rounded bg-amber-500/15 text-amber-500 text-[9.5px] font-semibold">
                          Chưa có TK
                        </span>
                      )}
                    {msg.isInternalPeek && (
                      <span className="text-[10px] text-violet-400 font-semibold">· Nội bộ</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setReplyParent(msg)}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                      title="Trả lời theo luồng"
                    >
                      <Reply className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(msg.content);
                        setCopiedId(msg.id);
                        setTimeout(() => setCopiedId(null), 1500);
                      }}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                      title="Sao chép"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Markdown Content */}
                <div className="markdown-body text-xs leading-relaxed break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>

                {/* BỔ SUNG F: Disambiguation picker when @mention matches >1 agent */}
                {disambigList.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {disambigList.map((cand) => (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() =>
                          runSingleAgentTurn(
                            cand.id,
                            String(msg.cardData?.originalText || 'Báo cáo công việc hiện tại'),
                            activeChannel
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-950 border border-sky-500/40 hover:bg-sky-600 hover:text-white text-[11px] font-semibold cursor-pointer transition-colors"
                      >
                        Giao cho {cand.name} ({cand.title})
                      </button>
                    ))}
                  </div>
                )}

                {/* BỔ SUNG F: Task ACK Card */}
                {msg.cardType === 'task_ack' && msg.cardData && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-sky-500/30 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-num font-bold text-sky-500">
                        {String(msg.cardData.taskCode || '')} · Đã tiếp nhận
                      </span>
                      <span className="flex items-center gap-1 font-mono-num text-slate-400">
                        <Clock className="w-3 h-3" />
                        ETA ~{String(msg.cardData.etaMinutes || 2)} phút
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <strong>Đầu ra:</strong> {String(msg.cardData.deliverable || '')}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      <strong>Đạt chuẩn (DoD):</strong> {String(msg.cardData.dod || '')}
                    </div>
                  </div>
                )}

                {/* BỔ SUNG F: Task Progress Card */}
                {msg.cardType === 'task_progress' && msg.cardData && (
                  <div className="mt-2 p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-num font-semibold text-sky-500">
                        {String(msg.cardData.taskCode || '')}
                      </span>
                      <span className="font-mono-num font-bold">
                        {Number(msg.cardData.progressPercent || 0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-sky-500 transition-all"
                        style={{ width: `${Math.min(100, Number(msg.cardData.progressPercent || 0))}%` }}
                      />
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {String(msg.cardData.stepLabel || '')}
                    </div>
                  </div>
                )}

                {/* BỔ SUNG F: Task Report Card with clickable deliverables & Accept / Request Revision */}
                {msg.cardType === 'task_report' && msg.cardData && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-emerald-500/40 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-num font-bold text-emerald-500">
                        {String(msg.cardData.taskCode || '')} · Báo cáo kết quả thực tế
                      </span>
                      <span className="text-[10.5px] font-mono-num text-slate-400">
                        {String(msg.cardData.metricsLine || '')}
                      </span>
                    </div>

                    {reportDeliverables.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {reportDeliverables.map((del, idx) => (
                          <button
                            key={`${del.id}_${idx}`}
                            type="button"
                            onClick={() => setActiveTab(deliverableTab(del.type))}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-500 font-semibold cursor-pointer"
                          >
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[200px]">{del.title}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {Boolean(msg.cardData.nextStep) && (
                      <div className="text-slate-500 dark:text-slate-400">
                        {String(msg.cardData.nextStep)}
                      </div>
                    )}

                    {reportTaskObj && (
                      <div className="pt-1 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                        {reportTaskObj.status === 'done' ? (
                          <div className="flex items-center gap-1 text-emerald-500 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Chủ tịch đã nghiệm thu hoàn thành</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => moveTaskStatus(reportTaskObj.id, 'done')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                            >
                              Chấp nhận & Đóng việc
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRevisionOpenId((cur) => (cur === msg.id ? null : msg.id));
                                setRevisionText('');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 font-semibold cursor-pointer"
                            >
                              Yêu cầu sửa
                            </button>
                          </div>
                        )}

                        {revisionOpenId === msg.id && (
                          <div className="flex gap-1.5 pt-1">
                            <input
                              type="text"
                              value={revisionText}
                              onChange={(e) => setRevisionText(e.target.value)}
                              placeholder="Nhập điểm cần sửa lại..."
                              className="flex-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2 py-1"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const fb = revisionText.trim();
                                if (!fb) return;
                                setRevisionOpenId(null);
                                setRevisionText('');
                                runSingleAgentTurn(
                                  msg.senderId,
                                  `Chỉnh sửa lại ${reportTaskObj.taskCode} (${reportTaskObj.title}): ${fb}`,
                                  activeChannel,
                                  { resumeTaskId: reportTaskObj.id }
                                );
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold cursor-pointer"
                            >
                              Gửi sửa
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* BỔ SUNG F: Honest System Blocker Card */}
                {msg.cardType === 'system_blocker' && msg.cardData && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/40 space-y-2 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-rose-500">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {msg.cardData.reason === 'kill_switch'
                          ? 'Hệ thống đang khóa bởi KILL SWITCH'
                          : msg.cardData.reason === 'paused'
                          ? 'Văn phòng đang ở trạng thái Tạm dừng'
                          : 'Sự cố kết nối AI Provider'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(msg.cardData.reason === 'kill_switch' || msg.cardData.reason === 'paused') && (
                        <button
                          type="button"
                          onClick={async () => {
                            await resumeFromKillSwitch();
                            if (msg.cardData?.agentId && msg.cardData?.instruction) {
                              await runSingleAgentTurn(
                                String(msg.cardData.agentId),
                                String(msg.cardData.instruction),
                                String(msg.cardData.channelId || activeChannel),
                                {
                                  resumeTaskId: msg.cardData.taskId
                                    ? String(msg.cardData.taskId)
                                    : undefined,
                                }
                              );
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>Khôi phục & Chạy ngay</span>
                        </button>
                      )}
                      {msg.cardData.reason === 'provider_error' && Boolean(msg.cardData.agentId) && (
                        <button
                          type="button"
                          onClick={() =>
                            runSingleAgentTurn(
                              String(msg.cardData?.agentId),
                              String(msg.cardData?.instruction || ''),
                              String(msg.cardData?.channelId || activeChannel),
                              {
                                resumeTaskId: msg.cardData?.taskId
                                  ? String(msg.cardData.taskId)
                                  : undefined,
                              }
                            )
                          }
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Thử chạy lại</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                      >
                        <Settings className="w-3 h-3" />
                        <span>Mở Cài đặt AI</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Interactive Card: Approval / HR Hire Proposal */}
                {approvalObj && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-amber-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold gap-2">
                      <span className="flex items-center gap-1.5">
                        {msg.cardType === 'hr_proposal' && <UserPlus className="w-3.5 h-3.5 text-sky-500" />}
                        <span>{approvalObj.title}</span>
                      </span>
                      <span className="text-[11px] font-mono-num text-amber-500 shrink-0">
                        {approvalObj.status === 'pending'
                          ? 'Chờ duyệt'
                          : approvalObj.status === 'approved'
                          ? 'Đã duyệt'
                          : approvalObj.status === 'edited'
                          ? 'Đã sửa & duyệt'
                          : 'Từ chối'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{approvalObj.description}</p>
                    {approvalObj.status === 'pending' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => resolveApproval(approvalObj.id, 'approved')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          {msg.cardType === 'hr_proposal' ? 'Duyệt tuyển ngay' : 'Duyệt'}
                        </button>
                        {msg.cardType !== 'hr_proposal' && (
                          <button
                            type="button"
                            onClick={() =>
                              resolveApproval(approvalObj.id, 'edited', 'CEO điều chỉnh giảm 5% theo chính sách')
                            }
                            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer"
                          >
                            Sửa rồi duyệt
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            resolveApproval(approvalObj.id, 'rejected', 'Chưa phù hợp giai đoạn này')
                          }
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* BỔ SUNG E: Interactive Expense Card */}
                {expenseObj && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-amber-500/40 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-bold text-amber-500">
                        <Receipt className="w-3.5 h-3.5" />
                        <span className="font-mono-num">{expenseObj.expenseCode}</span>
                        <span>· {expenseObj.title}</span>
                      </span>
                      <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100">
                        {formatVnd(expenseObj.amountVnd)}
                      </span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Danh mục: {expenseObj.category} · NCC: {expenseObj.vendor} · Trạng thái:{' '}
                      <strong className="text-sky-500">{expenseObj.status}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {expenseObj.status === 'pending_ceo' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              ceoResolveExpense({
                                expenseId: expenseObj.id,
                                decision: 'approved',
                                note: 'Duyệt nhanh từ Chat',
                                via: 'web',
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                          >
                            CEO Duyệt chi
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              ceoResolveExpense({
                                expenseId: expenseObj.id,
                                decision: 'rejected',
                                note: 'Từ chối từ Chat',
                                via: 'web',
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab('finance')}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                      >
                        Mở Chi phí & Kế toán
                      </button>
                    </div>
                  </div>
                )}

                {msg.cardType === 'expense_rule' && (
                  <div className="mt-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-sky-500/30 flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-medium">Quy tắc tự duyệt chi phí cần CEO xem xét</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('finance')}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-semibold cursor-pointer"
                    >
                      Mở Quy tắc
                    </button>
                  </div>
                )}

                {/* Interactive Card: Ask CEO */}
                {askObj && (
                  <div
                    className={`mt-2.5 p-3 rounded-xl space-y-2 border ${
                      askObj.stepType && askObj.stepType !== 'general'
                        ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/50'
                        : 'bg-white dark:bg-slate-950 border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wide ${
                          askObj.stepType && askObj.stepType !== 'general'
                            ? 'text-amber-500'
                            : 'text-rose-500'
                        }`}
                      >
                        {askObj.stepType && askObj.stepType !== 'general'
                          ? `Cần anh làm 1 bước (${askObj.stepType.toUpperCase()}) · #${askObj.id}`
                          : `Câu hỏi #${askObj.id} · ${askObj.urgency === 'urgent' ? 'KHẨN CẤP' : 'Bình thường'}`}
                      </span>
                      {askObj.resumeAction?.channelId && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('marketing')}
                          className="text-[10.5px] font-semibold text-sky-500 hover:underline cursor-pointer"
                        >
                          Xem Kênh →
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-200">{askObj.context}</div>
                    {askObj.status === 'answered' ? (
                      <div className="text-xs text-emerald-500 font-semibold">
                        Đã xác thực ({askObj.answeredVia}): {askObj.answer} · Agent đã tiếp tục chạy!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {askObj.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => answerAskCeo(askObj.id, opt, 'web')}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-sky-600 hover:text-white hover:border-sky-500 text-[11px] font-medium cursor-pointer text-left"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={customAnswers[askObj.id] || ''}
                            onChange={(e) =>
                              setCustomAnswers((p) => ({ ...p, [askObj.id]: e.target.value }))
                            }
                            placeholder={
                              askObj.stepType === 'otp' || askObj.stepType === '2fa'
                                ? 'Nhập mã OTP / 2FA 6 số tại đây...'
                                : 'Hoặc nhập chỉ đạo tùy chỉnh...'
                            }
                            className="flex-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 font-mono-num"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = customAnswers[askObj.id]?.trim();
                              if (val) answerAskCeo(askObj.id, val, 'web');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
                          >
                            Gửi & Tiếp tục
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive Card: Document */}
                {docObj && (
                  <div className="mt-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{docObj.title}</div>
                        <div className="text-[10px] text-slate-400">{docObj.category}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('docs')}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                    >
                      Mở Kho
                    </button>
                  </div>
                )}

                {/* Interactive Card: Lead */}
                {leadObj && (
                  <div className="mt-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-emerald-500/40 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        <span className="truncate">{leadObj.name}</span>
                        {(leadObj.origin === 'simulated' || leadObj.source.toLowerCase().includes('mô phỏng')) && (
                          <span className="px-1 py-0.2 rounded bg-amber-500/15 text-amber-500 text-[9.5px] font-semibold shrink-0">
                            MÔ PHỎNG
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {leadObj.province} · Điểm:{' '}
                        <span className="font-mono-num text-emerald-500 font-bold">{leadObj.score}/100</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('crm')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                    >
                      Xem CRM
                    </button>
                  </div>
                )}

                {/* Interactive Card: Workflow Timeline */}
                {wfObj && (
                  <div className="mt-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-sky-500/30 space-y-1.5">
                    <div className="text-[11px] font-bold text-sky-500">{wfObj.title}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {wfObj.steps.map((st, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                            st.status === 'done'
                              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                              : st.status === 'running'
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/40'
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-400 border-slate-700/50'
                          }`}
                        >
                          {idx + 1}. {st.agentName.split(' ').slice(-1)[0]} ({st.label})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive Card: KPI Mini */}
                {msg.cardType === 'kpi' && msg.cardData && (
                  <div className="mt-2 grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400">Lead CRM</div>
                      <div className="text-sm font-bold font-mono-num text-sky-500">
                        {String(msg.cardData.totalLeads ?? 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Đã gửi tin</div>
                      <div className="text-sm font-bold font-mono-num text-emerald-500">
                        {String(msg.cardData.outreachSent ?? 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Doanh thu</div>
                      <div className="text-sm font-bold font-mono-num text-amber-500">
                        {(Number(msg.cardData.revenueVnd || 0) / 1_000_000).toFixed(1)}tr
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive Card: Meeting Minutes */}
                {msg.cardType === 'meeting_minutes' && (
                  <div className="mt-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-amber-500/30 flex items-center justify-between">
                    <span className="text-[11px] font-medium">Biên bản họp đã lưu vào Kho tài liệu & Task Board</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tasks')}
                      className="px-2 py-1 rounded bg-amber-600 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Mở Task
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Typing Indicator */}
        {busyAgents.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:300ms]" />
            </div>
            <span>{busyAgents.map((a) => a.name).join(', ')} đang xử lý...</span>
          </div>
        )}
      </div>

      {/* Jump to newest button */}
      {!atBottom && (
        <div className="flex justify-center -mt-9 mb-2 z-10 pointer-events-none">
          <button
            type="button"
            onClick={() => {
              setAtBottom(true);
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }}
            className="pointer-events-auto flex items-center gap-1 px-3 py-1 rounded-full bg-sky-600 text-white text-[11px] font-semibold shadow-lg cursor-pointer"
          >
            <ArrowDown className="w-3 h-3" />
            <span>Nhảy tới tin mới</span>
          </button>
        </div>
      )}

      {/* Slash Command / @mention Autocomplete Popups */}
      <div className="relative px-3 pt-1">
        {showSlashPopup && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-1 z-30">
            {SLASH_COMMANDS.filter((c) => c.cmd.startsWith(input)).map((c) => (
              <button
                key={c.cmd}
                type="button"
                onClick={() => setInput(c.cmd)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
              >
                <span className="font-mono-num font-semibold text-sky-500">{c.cmd}</span>
                <span className="text-slate-500 text-[11px]">{c.desc}</span>
              </button>
            ))}
          </div>
        )}

        {mentionCandidates.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-1 z-30">
            {mentionCandidates.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setInput(input.replace(/@([^\s@]*)$/, `@${a.name} `))}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
              >
                <span className="font-semibold">
                  {a.name}
                  {a.nickname ? ` (${a.nickname})` : ''}
                </span>
                <span className="text-slate-400 text-[11px]">{a.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Composer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80">
        {replyParent && (
          <div className="mb-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-[11px] flex items-center justify-between">
            <span className="truncate">
              Đang trả lời: <strong>{replyParent.senderName}</strong>
            </span>
            <button type="button" onClick={() => setReplyParent(null)} className="text-rose-500 cursor-pointer">
              Hủy
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
            title="Đính kèm file (.txt, .csv, .md, .json)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Giao việc @Tên, tuyển nhanh (vd: Tuyển 2 nhân viên SEO...), hỏi /tiendo hoặc /giao-viec..."
            className="flex-1 resize-none rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

