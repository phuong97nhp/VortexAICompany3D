import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Check,
  Download,
  FileSpreadsheet,
  Smartphone,
  Sparkles,
  Ticket,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { computeCashflowForecast90Days, computeProfitAndLoss } from '../../engine/erpEngine';
import { formatVnd } from '../../engine/expenseEngine';
import { useCompanyStore } from '../../store/useCompanyStore';

export function ExecutiveDashboardPanel() {
  const settings = useCompanyStore((s) => s.settings);
  const agents = useCompanyStore((s) => s.agents);
  const runtimes = useCompanyStore((s) => s.runtimes);
  const tasks = useCompanyStore((s) => s.tasks);
  const leads = useCompanyStore((s) => s.leads);
  const customerAccounts = useCompanyStore((s) => s.customerAccounts);
  const electronicInvoices = useCompanyStore((s) => s.electronicInvoices);
  const expenses = useCompanyStore((s) => s.expenses);
  const refundRequests = useCompanyStore((s) => s.refundRequests);
  const ledgerEntries = useCompanyStore((s) => s.ledgerEntries);
  const vendorSubscriptions = useCompanyStore((s) => s.vendorSubscriptions);
  const approvals = useCompanyStore((s) => s.approvals);
  const askCeoQuestions = useCompanyStore((s) => s.askCeoQuestions);
  const supportTickets = useCompanyStore((s) => s.supportTickets);
  const okrObjectives = useCompanyStore((s) => s.okrObjectives);
  const legalRisks = useCompanyStore((s) => s.legalRisks);
  const digitalAssets = useCompanyStore((s) => s.digitalAssets);
  const managedDevices = useCompanyStore((s) => s.managedDevices);
  const weeklyReports = useCompanyStore((s) => s.weeklyReports);

  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const resolveApproval = useCompanyStore((s) => s.resolveApproval);
  const ceoResolveExpense = useCompanyStore((s) => s.ceoResolveExpense);
  const resolveRefundRequest = useCompanyStore((s) => s.resolveRefundRequest);
  const generateWeeklyBoardReport = useCompanyStore((s) => s.generateWeeklyBoardReport);
  const clearSimulatedDataAction = useCompanyStore((s) => s.clearSimulatedDataAction);
  const updateSettings = useCompanyStore((s) => s.updateSettings);

  const [notice, setNotice] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const pnl = useMemo(
    () => computeProfitAndLoss(ledgerEntries, electronicInvoices, expenses),
    [ledgerEntries, electronicInvoices, expenses]
  );

  const cashForecast = useMemo(
    () =>
      computeCashflowForecast90Days({
        startingCashVnd: Math.max(85_000_000, pnl.collectedCashVnd - pnl.totalExpensesVnd + 120_000_000),
        customers: customerAccounts,
        invoices: electronicInvoices,
        vendorSubscriptions,
      }),
    [pnl, customerAccounts, electronicInvoices, vendorSubscriptions]
  );

  const mrrTotal = useMemo(
    () => customerAccounts.filter((c) => c.status !== 'churned').reduce((s, c) => s + c.mrrVnd, 0),
    [customerAccounts]
  );

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const pendingCeoExpenses = expenses.filter((e) => e.status === 'pending_ceo');
  const pendingRefunds = refundRequests.filter((r) => r.status === 'pending_ceo');
  const pendingQuestions = askCeoQuestions.filter((q) => q.status === 'pending');
  const openTickets = supportTickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed');
  const overdueTickets = openTickets.filter((t) => Date.now() > t.slaDueAt);
  const overdueInvoices = electronicInvoices.filter((i) => i.status === 'overdue');
  const atRiskCustomers = customerAccounts.filter((c) => c.churnRiskScore >= 60);
  const expiringAssets = digitalAssets.filter((a) => a.status !== 'healthy');
  const activeWorkersCount = agents.filter((a) => a.employmentStatus === 'active').length;
  const workingNowCount = Object.values(runtimes).filter((r) => r.status !== 'idle' && r.status !== 'sleeping').length;

  const avgOkrPct = useMemo(() => {
    const krs = okrObjectives.flatMap((o) => o.keyResults);
    if (krs.length === 0) return 0;
    const sum = krs.reduce((acc, k) => acc + (k.targetValue > 0 ? Math.min(100, (k.currentValue / k.targetValue) * 100) : 0), 0);
    return Math.round(sum / krs.length);
  }, [okrObjectives]);

  const handleTestPushNotification = async () => {
    if (typeof Notification === 'undefined') {
      setNotice('Trình duyệt hiện tại không hỗ trợ Web Notification API.');
      return;
    }
    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }
    setPushStatus(perm);
    if (perm === 'granted') {
      await updateSettings({ pwaPushEnabled: true });
      new Notification('Ban Điều hành AI Company', {
        body: `Có ${pendingApprovals.length + pendingCeoExpenses.length + pendingRefunds.length} mục chờ CEO duyệt · ${openTickets.length} ticket CSKH đang mở.`,
        icon: '/pwa-192x192.png',
      });
      setNotice('Đã gửi thông báo thử nghiệm lên thiết bị (PWA Push).');
    } else {
      setNotice('Trình duyệt đang chặn quyền thông báo. Vui lòng cho phép trong cài đặt site.');
    }
  };

  const handleGenerateAndDownloadBoardReport = async () => {
    const rep = await generateWeeklyBoardReport();
    const md = [
      `# BÁO CÁO ĐIỀU HÀNH TUẦN – ${settings.companyName}`,
      `**Kỳ báo cáo:** ${rep.weekLabel}`,
      ``,
      `## 1. Tài chính & Doanh thu`,
      `- Doanh thu ghi nhận: ${formatVnd(rep.revenueVnd)}`,
      `- Chi phí đã duyệt/chi: ${formatVnd(rep.expensesVnd)}`,
      `- Lợi nhuận ròng ước tính: ${formatVnd(rep.netProfitVnd)}`,
      `- Phải thu (AR) chờ thu: ${formatVnd(pnl.arPendingVnd)}`,
      ``,
      `## 2. Khách hàng, Ticket & OKR`,
      `- MRR định kỳ: ${formatVnd(mrrTotal)}`,
      `- Ticket đang mở: ${rep.openTickets} · Tỷ lệ đạt SLA: ${rep.avgSlaCompliancePercent}%`,
      `- Tiến độ OKR trung bình: ${rep.okrProgressPercent}%`,
      ``,
      `## 3. Rủi ro Pháp chế & Vận hành nổi bật`,
      ...(rep.topRisks.length > 0 ? rep.topRisks.map((r) => `- ${r}`) : ['- Không có rủi ro mới mức độ cao.']),
      ``,
      `> *Lưu ý: Dữ liệu đánh dấu Mô phỏng là số liệu khởi tạo mẫu, CEO có thể xóa bằng 1 nút trong phần Quản trị.*`,
    ].join('\n');

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `board_report_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice(`Đã lập & tải xuống Báo cáo Ban Giám đốc (${rep.weekLabel}).`);
  };

  const handleWipeSimulated = async () => {
    const res = await clearSimulatedDataAction();
    setNotice(`Đã xóa vĩnh viễn ${res.removedCount} bản ghi dữ liệu Mô phỏng khỏi trình duyệt.`);
  };

  const simulatedCount =
    customerAccounts.filter((c) => c.source === 'simulated').length +
    electronicInvoices.filter((i) => i.source === 'simulated').length +
    supportTickets.filter((t) => t.source === 'simulated').length +
    leads.filter((l) => l.origin === 'simulated').length;

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-500" />
            <span>Bảng Điều Hành CEO (Executive Dashboard)</span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Toàn cảnh Doanh thu · Phê duyệt · CSKH SLA · Nhân sự 3 tầng ({activeWorkersCount} agent, {workingNowCount} đang xử lý)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleTestPushNotification}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium cursor-pointer"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-500" />
            <span>Push ({pushStatus})</span>
          </button>
          <button
            type="button"
            onClick={handleGenerateAndDownloadBoardReport}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Board Report Tuần</span>
          </button>
          {simulatedCount > 0 && (
            <button
              type="button"
              onClick={handleWipeSimulated}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-[11px] font-semibold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xóa dữ liệu Mô phỏng ({simulatedCount})</span>
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-xs text-sky-600 dark:text-sky-300">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Doanh thu ghi nhận</span>
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-base font-bold font-mono-num text-slate-900 dark:text-white mt-1">
            {formatVnd(pnl.recognizedRevenueVnd)}
          </div>
          <div className="text-[11px] font-mono-num text-emerald-600 dark:text-emerald-400 mt-0.5">
            MRR: {formatVnd(mrrTotal)} · Lợi nhuận: {formatVnd(pnl.netProfitVnd)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Phải thu (AR) & Hóa đơn</span>
            <Download className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base font-bold font-mono-num text-slate-900 dark:text-white mt-1">
            {formatVnd(pnl.arPendingVnd)}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-mono-num">
            {overdueInvoices.length} HĐ quá hạn · Đã thu {formatVnd(pnl.collectedCashVnd)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>CSKH & Ticket SLA</span>
            <Ticket className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="text-base font-bold font-mono-num text-slate-900 dark:text-white mt-1">
            {openTickets.length} đang mở
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono-num">
            {overdueTickets.length > 0 ? (
              <span className="text-rose-500 font-semibold">{overdueTickets.length} trễ SLA</span>
            ) : (
              <span className="text-emerald-500">Đúng hạn SLA</span>
            )}{' '}
            · {atRiskCustomers.length} KH nguy cơ rời bỏ
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>OKR & Thiết bị Vận hành</span>
            <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-base font-bold font-mono-num text-slate-900 dark:text-white mt-1">
            OKR {avgOkrPct}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono-num">
            {tasks.filter((t) => t.status === 'in_progress').length} task chạy · {managedDevices.filter((d) => d.status === 'device' || d.status === 'controlled').length}/{managedDevices.length} ĐT online
          </div>
        </div>
      </div>

      {/* Middle Split: Cashflow 90D Chart + Mobile Quick Approve Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 90-Day Cashflow Projection */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Dự báo dòng tiền 90 ngày (từ MRR + Công nợ AR − SaaS)
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className="text-[11px] text-sky-500 hover:underline cursor-pointer"
            >
              Chi tiết Tài chính →
            </button>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashForecast} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="#94a3b8"
                  tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}tr`}
                />
                <Tooltip
                  formatter={(v) => formatVnd(Number(v ?? 0))}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="projectedCashVnd"
                  name="Số dư dự kiến"
                  stroke="#0284c7"
                  fill="#0284c7"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CEO Quick Approvals (Mobile & Desktop 1-tap) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Duyệt nhanh CEO ({pendingApprovals.length + pendingCeoExpenses.length + pendingRefunds.length})
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('approvals')}
              className="text-[11px] text-sky-500 hover:underline cursor-pointer"
            >
              Mở tất cả →
            </button>
          </div>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {pendingCeoExpenses.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">
                    [Phiếu chi {exp.expenseCode}] {exp.title}
                  </div>
                  <div className="text-[11px] font-mono-num text-amber-500">
                    {formatVnd(exp.amountVnd)} · {exp.vendor}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => ceoResolveExpense({ expenseId: exp.id, decision: 'approved', via: 'web' })}
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => ceoResolveExpense({ expenseId: exp.id, decision: 'rejected', via: 'web' })}
                    className="px-2 py-1 rounded bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 text-[11px] cursor-pointer"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}

            {pendingRefunds.map((rf) => (
              <div
                key={rf.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">
                    [Hoàn tiền {rf.code}] {rf.customerName}
                  </div>
                  <div className="text-[11px] font-mono-num text-rose-400">
                    {formatVnd(rf.amountVnd)} · {rf.reason}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => resolveRefundRequest(rf.id, 'approved')}
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveRefundRequest(rf.id, 'rejected')}
                    className="px-2 py-1 rounded bg-rose-600/20 text-rose-400 text-[11px] cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ))}

            {pendingApprovals.map((ap) => (
              <div
                key={ap.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{ap.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">{ap.description}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => resolveApproval(ap.id, 'approved')}
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveApproval(ap.id, 'rejected')}
                    className="px-2 py-1 rounded bg-rose-600/20 text-rose-400 text-[11px] cursor-pointer"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}

            {pendingApprovals.length + pendingCeoExpenses.length + pendingRefunds.length === 0 && (
              <div className="text-xs text-slate-400 py-6 text-center">
                Không có đề xuất nào đang chờ CEO duyệt.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Urgent Alerts + Weekly Report Snapshots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 space-y-2">
          <h3 className="text-xs font-bold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Cảnh báo ưu tiên cần xử lý</span>
          </h3>
          <div className="space-y-1.5 text-xs">
            {pendingQuestions.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span>{pendingQuestions.length} câu hỏi khẩn từ Agent cần CEO trả lời</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('approvals')}
                  className="text-amber-500 font-semibold cursor-pointer"
                >
                  Trả lời
                </button>
              </div>
            )}
            {overdueInvoices.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
                <span>{overdueInvoices.length} hóa đơn VAT quá hạn thanh toán</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('crm')}
                  className="text-rose-500 font-semibold cursor-pointer"
                >
                  Nhắc nợ
                </button>
              </div>
            )}
            {expiringAssets.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <span>{expiringAssets.length} chứng chỉ SSL / tên miền sắp hết hạn</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('rbac')}
                  className="text-orange-500 font-semibold cursor-pointer"
                >
                  Kiểm tra
                </button>
              </div>
            )}
            {legalRisks.filter((r) => r.impact === 'high' && r.status !== 'closed').length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-sky-500/10 border border-sky-500/30">
                <span>
                  {legalRisks.filter((r) => r.impact === 'high' && r.status !== 'closed').length} rủi ro pháp chế mức Cao đang theo dõi
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('legal')}
                  className="text-sky-500 font-semibold cursor-pointer"
                >
                  Pháp chế
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 space-y-2">
          <h3 className="text-xs font-bold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>Lịch sử Báo cáo Điều hành Tuần ({weeklyReports.length})</span>
          </h3>
          {weeklyReports.length === 0 ? (
            <div className="text-xs text-slate-400 py-4 text-center">
              Nhấn “Xuất Board Report Tuần” phía trên để tạo bản tổng hợp nhanh.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {weeklyReports.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-[11px]"
                >
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{r.weekLabel}</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">{r.executiveSummary}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
