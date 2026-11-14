import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowDown,
  Check,
  Copy,
  Eye,
  FileText,
  Paperclip,
  Reply,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { AGENTS } from '../../agents';
import { DEPARTMENTS } from '../../config/departments';
import { handleCeoChatCommand } from '../../engine/orchestrator';
import { useCompanyStore } from '../../store/useCompanyStore';
import { ChatChannelId, ChatMessage } from '../../types';

const CHANNELS: Array<{ id: ChatChannelId; label: string }> = [
  { id: 'all', label: '#Tất cả' },
  { id: 'ask_ceo', label: 'Hỏi CEO' },
  { id: 'meeting', label: '#Họp' },
  { id: 'exec', label: '#Ban-giám-đốc' },
  { id: 'sales', label: '#Sales' },
  { id: 'marketing', label: '#Marketing' },
  { id: 'cs', label: '#CSKH' },
  { id: 'product', label: '#Product' },
  { id: 'data', label: '#Data' },
  { id: 'backoffice', label: '#Tài-chính-NS' },
];

const SLASH_COMMANDS = [
  { cmd: '/dung-kenh', desc: 'Dựng Brand Launch Kit & tự thiết lập 7 kênh MXH' },
  { cmd: '/giao-viec ', desc: 'Giao nhiệm vụ mới cho phòng ban' },
  { cmd: '/tim-khach ', desc: 'Lead Hunter tìm khách hàng công khai' },
  { cmd: '/hop ', desc: 'Triệu tập họp liên phòng ban tại Phòng Họp Lớn' },
  { cmd: '/bao-cao', desc: 'Data Analyst tổng hợp KPI thực tế' },
  { cmd: '/autopilot', desc: 'Bật và chạy ngay 1 chu kỳ Sales Autopilot' },
];

export function ChatPanel() {
  const messages = useCompanyStore((s) => s.messages);
  const activeChannel = useCompanyStore((s) => s.activeChannel);
  const setActiveChannel = useCompanyStore((s) => s.setActiveChannel);
  const peekMode = useCompanyStore((s) => s.peekMode);
  const setPeekMode = useCompanyStore((s) => s.setPeekMode);
  const runtimes = useCompanyStore((s) => s.runtimes);
  const approvals = useCompanyStore((s) => s.approvals);
  const resolveApproval = useCompanyStore((s) => s.resolveApproval);
  const askCeoQuestions = useCompanyStore((s) => s.askCeoQuestions);
  const answerAskCeo = useCompanyStore((s) => s.answerAskCeo);
  const documents = useCompanyStore((s) => s.documents);
  const leads = useCompanyStore((s) => s.leads);
  const workflows = useCompanyStore((s) => s.workflows);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);

  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [replyParent, setReplyParent] = useState<ChatMessage | null>(null);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [atBottom, setAtBottom] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingAskCount = askCeoQuestions.filter((q) => q.status === 'pending' || q.status === 'reminded').length;

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (!peekMode && m.isInternalPeek) return false;
      const matchChannel =
        activeChannel === 'all'
          ? m.channelId === 'all' || peekMode
          : m.channelId === activeChannel;
      if (!matchChannel) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return m.content.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [messages, activeChannel, peekMode, searchTerm]);

  useEffect(() => {
    if (atBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages.length, atBottom]);

  const busyAgents = AGENTS.filter((a) => {
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
  const mentionCandidates = mentionMatch
    ? AGENTS.filter(
        (a) =>
          a.name.toLowerCase().includes(mentionMatch[1].toLowerCase()) ||
          a.id.toLowerCase().includes(mentionMatch[1].toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Channel Tabs & Peek Switch */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {CHANNELS.map((ch) => (
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
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
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
              <option value="">Nhắn riêng (DM) với nhân sự AI...</option>
              {AGENTS.map((a) => (
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
            Chưa có tin nhắn trong kênh này. Hãy nhắn tin cho Thư ký hoặc dùng lệnh `/giao-viec`.
          </div>
        )}

        {filteredMessages.map((msg) => {
          const isCeo = msg.senderId === 'ceo';
          const deptColor =
            msg.department === 'ceo'
              ? '#0284C7'
              : DEPARTMENTS[msg.department]?.color || '#64748B';
          const timeStr = new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          });

          // Lookup interactive card entities
          const approvalObj =
            msg.cardType === 'approval'
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

          return (
            <div key={msg.id} className={`flex flex-col ${isCeo ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 border ${
                isCeo
                  ? 'bg-sky-600/15 border-sky-500/30 text-slate-900 dark:text-slate-100'
                  : msg.isInternalPeek
                  ? 'bg-violet-500/10 border-violet-500/30 text-slate-900 dark:text-slate-100'
                  : 'bg-slate-100 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-5 h-5 rounded-md text-[10px] font-bold text-white flex items-center justify-center shrink-0"
                      style={{ backgroundColor: deptColor }}
                    >
                      {msg.senderName.split(' ').slice(-1)[0][0]}
                    </span>
                    <span className="text-xs font-bold truncate">{msg.senderName}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {msg.senderTitle} · {timeStr}
                    </span>
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
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Markdown Content */}
                <div className="markdown-body text-xs leading-relaxed break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>

                {/* Interactive Card: Approval */}
                {approvalObj && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-amber-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>{approvalObj.title}</span>
                      <span className="text-[11px] font-mono-num text-amber-500">
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
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => resolveApproval(approvalObj.id, 'approved')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          onClick={() => resolveApproval(approvalObj.id, 'edited', 'CEO điều chỉnh giảm 5% theo chính sách')}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Sửa rồi duyệt
                        </button>
                        <button
                          type="button"
                          onClick={() => resolveApproval(approvalObj.id, 'rejected', 'Chưa phù hợp giai đoạn này')}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive Card: Ask CEO / "Cần anh làm 1 bước" Human Checkpoint */}
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
                          askObj.stepType && askObj.stepType !== 'general' ? 'text-amber-500' : 'text-rose-500'
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
                      <div className="text-xs font-semibold truncate">{leadObj.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {leadObj.province} · Điểm: <span className="font-mono-num text-emerald-500 font-bold">{leadObj.score}/100</span>
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
                        {((Number(msg.cardData.revenueVnd || 0)) / 1_000_000).toFixed(1)}tr
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
            <span>
              {busyAgents.map((a) => a.name).join(', ')} đang xử lý...
            </span>
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
                onClick={() => setInput(input.replace(/@([^\s@]*)$/, `@${a.id} `))}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
              >
                <span className="font-semibold">{a.name}</span>
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
            <span className="truncate">Đang trả lời: <strong>{replyParent.senderName}</strong></span>
            <button type="button" onClick={() => setReplyParent(null)} className="text-rose-500 cursor-pointer">Hủy</button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json" onChange={handleFileUpload} className="hidden" />
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
            placeholder="Giao việc cho Thư ký, gõ @tên hoặc /giao-viec, /tim-khach, /hop..."
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
