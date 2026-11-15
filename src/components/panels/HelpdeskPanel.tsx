import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, Clock, Plus, Search, ShieldAlert, Ticket } from 'lucide-react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { SupportTicketRecord } from '../../types';

type HelpdeskSubTab = 'tickets' | 'kb' | 'onboarding';

export function HelpdeskPanel() {
  const tickets = useCompanyStore((s) => s.supportTickets);
  const kbArticles = useCompanyStore((s) => s.kbArticles);
  const onboardings = useCompanyStore((s) => s.customerOnboardings);
  const customerAccounts = useCompanyStore((s) => s.customerAccounts);

  const createSupportTicket = useCompanyStore((s) => s.createSupportTicket);
  const escalateSupportTicket = useCompanyStore((s) => s.escalateSupportTicket);
  const resolveSupportTicketWithKb = useCompanyStore((s) => s.resolveSupportTicketWithKb);
  const putCustomerOnboarding = useCompanyStore((s) => s.putCustomerOnboarding);

  const [subTab, setSubTab] = useState<HelpdeskSubTab>('tickets');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [channel, setChannel] = useState<SupportTicketRecord['channel']>('zalo_oa');
  const [priority, setPriority] = useState<SupportTicketRecord['priority']>('high');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const [resolvingTicket, setResolvingTicket] = useState<SupportTicketRecord | null>(null);
  const [solutionSteps, setSolutionSteps] = useState('');
  const [createKbFaq, setCreateKbFaq] = useState(true);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) =>
      !q
        ? true
        : `${t.code} ${t.customerName} ${t.subject}`.toLowerCase().includes(q)
    );
  }, [tickets, search]);

  const filteredKb = useMemo(() => {
    const q = search.trim().toLowerCase();
    return kbArticles.filter((k) =>
      !q ? true : `${k.title} ${k.category} ${k.symptoms}`.toLowerCase().includes(q)
    );
  }, [kbArticles, search]);

  const handleCreate = async () => {
    if (!customerName.trim() || !subject.trim()) return;
    await createSupportTicket({
      customerName: customerName.trim(),
      channel,
      priority,
      subject: subject.trim(),
      description: description.trim() || subject.trim(),
    });
    setCustomerName('');
    setSubject('');
    setDescription('');
    setShowNew(false);
  };

  const handleConfirmResolve = async () => {
    if (!resolvingTicket || !solutionSteps.trim()) return;
    await resolveSupportTicketWithKb({
      ticketId: resolvingTicket.id,
      solutionSteps: solutionSteps.trim(),
      createKbFaq,
    });
    setResolvingTicket(null);
    setSolutionSteps('');
  };

  const atRiskCustomers = customerAccounts.filter((c) => c.churnRiskScore >= 55);

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-hidden">
      {/* Header & Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('tickets')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
              subTab === 'tickets' ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Ticket SLA ({tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('kb')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
              subTab === 'kb' ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Kho Tri Thức FAQ ({kbArticles.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('onboarding')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
              subTab === 'onboarding' ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Onboarding & Churn ({onboardings.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm ticket hoặc FAQ..."
              className="pl-7 pr-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            />
          </div>
          {subTab === 'tickets' && (
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Ticket</span>
            </button>
          )}
        </div>
      </div>

      {showNew && subTab === 'tickets' && (
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Tên khách hàng / Trung tâm"
            className="text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as SupportTicketRecord['channel'])}
            className="text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1.5"
          >
            <option value="zalo_oa">Zalo OA</option>
            <option value="email">Email</option>
            <option value="live_chat">Live Chat</option>
            <option value="web_form">Web Form</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as SupportTicketRecord['priority'])}
            className="text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1.5"
          >
            <option value="urgent">Khẩn cấp (SLA 30p)</option>
            <option value="high">Cao (SLA 2h)</option>
            <option value="medium">Trung bình (SLA 4h)</option>
            <option value="low">Thấp (SLA 8h)</option>
          </select>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Tiêu đề vấn đề..."
            className="md:col-span-2 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5"
          />
          <button
            type="button"
            onClick={handleCreate}
            className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold cursor-pointer"
          >
            Lưu Ticket Mới
          </button>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả chi tiết lỗi hoặc yêu cầu hỗ trợ..."
            rows={2}
            className="md:col-span-3 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5"
          />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {subTab === 'tickets' &&
          filteredTickets.map((t) => {
            const minsLeft = Math.round((t.slaDueAt - Date.now()) / 60_000);
            const isOverdue = t.status !== 'resolved' && t.status !== 'closed' && minsLeft < 0;
            return (
              <div
                key={t.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono-num text-xs font-bold text-sky-500">{t.code}</span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t.subject}</span>
                      {t.source === 'simulated' && (
                        <span className="px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-[10px] font-semibold text-amber-500">
                          Mô phỏng
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      KH: <strong>{t.customerName}</strong> · Kênh: {t.channel} · Ưu tiên: {t.priority.toUpperCase()} · Trạng thái: {t.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono-num">
                    <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-500' : 'text-emerald-500'}`} />
                    <span className={isOverdue ? 'text-rose-500 font-bold' : 'text-slate-400'}>
                      {t.status === 'resolved' ? 'Đã xong' : isOverdue ? `Trễ ${Math.abs(minsLeft)}p` : `Còn ${minsLeft}p SLA`}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{t.description}</p>
                {t.status !== 'resolved' && t.status !== 'closed' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setResolvingTicket(t);
                        setSolutionSteps('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Giải quyết & Tạo FAQ
                    </button>
                    <button
                      type="button"
                      onClick={() => escalateSupportTicket(t.id, 'tech_pm')}
                      className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <ShieldAlert className="w-3 h-3" /> Leo thang Kỹ thuật
                    </button>
                  </div>
                )}
              </div>
            );
          })}

        {subTab === 'kb' &&
          filteredKb.map((k) => (
            <div
              key={k.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{k.title}</span>
                <span className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-[10px] text-slate-400">
                  {k.category}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">Triệu chứng: {k.symptoms}</div>
              <pre className="text-xs whitespace-pre-wrap font-sans bg-white dark:bg-slate-950/70 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                {k.solutionSteps}
              </pre>
            </div>
          ))}

        {subTab === 'onboarding' && (
          <div className="space-y-3">
            {atRiskCustomers.length > 0 && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 space-y-1.5">
                <div className="text-xs font-bold text-rose-500">
                  Cảnh báo nguy cơ rời bỏ (Churn Risk &gt;= 55)
                </div>
                {atRiskCustomers.map((c) => (
                  <div key={c.id} className="text-xs flex items-center justify-between">
                    <span>
                      <strong>{c.name}</strong> ({c.planName})
                    </span>
                    <span className="font-mono-num font-bold text-rose-500">Rủi ro: {c.churnRiskScore}/100</span>
                  </div>
                ))}
              </div>
            )}

            {onboardings.map((ob) => (
              <div
                key={ob.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold">{ob.customerName}</div>
                    <div className="text-[11px] text-slate-400">
                      {ob.productName} · Kickoff: {ob.kickoffDate}
                    </div>
                  </div>
                  <span className="font-mono-num text-xs font-bold text-sky-500">{ob.progressPercent}%</span>
                </div>
                <div className="space-y-1">
                  {ob.steps.map((st) => (
                    <label key={st.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={st.done}
                        onChange={() => {
                          const nextSteps = ob.steps.map((x) => (x.id === st.id ? { ...x, done: !x.done } : x));
                          putCustomerOnboarding({ ...ob, steps: nextSteps });
                        }}
                      />
                      <span className={st.done ? 'line-through text-slate-400' : ''}>{st.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Ticket Modal */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3 text-slate-100">
            <h3 className="text-sm font-bold">Đóng Ticket {resolvingTicket.code}</h3>
            <p className="text-xs text-slate-400">{resolvingTicket.subject}</p>
            <textarea
              value={solutionSteps}
              onChange={(e) => setSolutionSteps(e.target.value)}
              rows={4}
              placeholder="Nhập các bước xử lý chuẩn để lưu lịch sử và tạo bài FAQ..."
              className="w-full text-xs rounded-lg bg-slate-950 border border-slate-700 p-2.5"
            />
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={createKbFaq} onChange={(e) => setCreateKbFaq(e.target.checked)} />
              <span>Tự động tạo bài hướng dẫn FAQ trong Kho Tri Thức</span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResolvingTicket(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Xác nhận Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
