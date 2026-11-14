import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  Download,
  FileText,
  History,
  Lock,
  Plus,
  Receipt,
  Repeat,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  computeFinancialAnalytics,
  currentMonthKey,
  exportExpensesCsv,
  formatVnd,
  validateRuleAgainstPolicy,
} from '../../engine/expenseEngine';
import { useCompanyStore } from '../../store/useCompanyStore';
import { ExpenseItem, ExpenseRule, ExpenseRuleType, ExpenseStatus } from '../../types';

type FinSubTab = 'queue' | 'rules' | 'budgets' | 'ledger' | 'analytics' | 'policy';

const STATUS_BADGE: Record<ExpenseStatus, { label: string; cls: string }> = {
  draft: { label: 'Nháp', cls: 'text-slate-500' },
  pending_accountant: { label: 'Chờ Kế toán (T1)', cls: 'text-amber-600 dark:text-amber-400' },
  needs_info: { label: 'Cần bổ sung', cls: 'text-orange-600 dark:text-orange-400' },
  pending_ceo: { label: 'Chờ CEO (T2)', cls: 'text-sky-600 dark:text-sky-400' },
  rejected: { label: 'Từ chối', cls: 'text-rose-500' },
  approved: { label: 'Đã duyệt chi', cls: 'text-emerald-600 dark:text-emerald-400' },
  paid: { label: 'Đã thanh toán', cls: 'text-emerald-700 dark:text-emerald-300' },
  reconciled: { label: 'Đã đối soát', cls: 'text-indigo-600 dark:text-indigo-400' },
};

export function FinanceAccountingPanel() {
  const expenses = useCompanyStore((s) => s.expenses);
  const expenseRules = useCompanyStore((s) => s.expenseRules);
  const expenseBudgets = useCompanyStore((s) => s.expenseBudgets);
  const expenseCategories = useCompanyStore((s) => s.expenseCategories);
  const agents = useCompanyStore((s) => s.agents);
  const departments = useCompanyStore((s) => s.departments);
  const leads = useCompanyStore((s) => s.leads);
  const adCampaigns = useCompanyStore((s) => s.adCampaigns);
  const marketingChannels = useCompanyStore((s) => s.marketingChannels);
  const spendingPolicy = useCompanyStore((s) => s.settings.spendingPolicy);

  const createExpense = useCompanyStore((s) => s.createExpense);
  const accountantReviewExpense = useCompanyStore((s) => s.accountantReviewExpense);
  const ceoResolveExpense = useCompanyStore((s) => s.ceoResolveExpense);
  const markExpensePaid = useCompanyStore((s) => s.markExpensePaid);
  const reconcileExpense = useCompanyStore((s) => s.reconcileExpense);
  const saveExpenseRule = useCompanyStore((s) => s.saveExpenseRule);
  const toggleExpenseRule = useCompanyStore((s) => s.toggleExpenseRule);
  const revokeExpenseRule = useCompanyStore((s) => s.revokeExpenseRule);
  const deleteExpenseRule = useCompanyStore((s) => s.deleteExpenseRule);
  const putExpenseBudget = useCompanyStore((s) => s.putExpenseBudget);
  const addExpenseCategory = useCompanyStore((s) => s.addExpenseCategory);
  const updateSpendingPolicy = useCompanyStore((s) => s.updateSpendingPolicy);

  const [subTab, setSubTab] = useState<FinSubTab>('queue');
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewerId, setReviewerId] = useState<string>('cfo');
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});

  // Create Expense Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fRequesterId, setFRequesterId] = useState('ads_specialist');
  const [fCategory, setFCategory] = useState('Quảng cáo');
  const [fTitle, setFTitle] = useState('');
  const [fVendor, setFVendor] = useState('');
  const [fAmount, setFAmount] = useState('1500000');
  const [fProject, setFProject] = useState('Chiến dịch Quý hiện tại');
  const [fJustification, setFJustification] = useState('');
  const [fRoi, setFRoi] = useState('');
  const [fFrequency, setFFrequency] = useState<'once' | 'recurring'>('once');
  const [fAttachmentName, setFAttachmentName] = useState('');
  const [fAttachmentUrl, setFAttachmentUrl] = useState('');

  // Create / Edit Rule Modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [rName, setRName] = useState('');
  const [rType, setRType] = useState<ExpenseRuleType>('accountant_auto');
  const [rCategory, setRCategory] = useState('Công cụ / SaaS');
  const [rVendor, setRVendor] = useState('*');
  const [rDept, setRDept] = useState('all');
  const [rMaxTx, setRMaxTx] = useState('500000');
  const [rMaxMonth, setRMaxMonth] = useState('3000000');
  const [rMaxCount, setRMaxCount] = useState('5');
  const [rReqAtt, setRReqAtt] = useState(false);
  const [rDaysValid, setRDaysValid] = useState('90');

  // Budget Modal & Category input
  const [newCatInput, setNewCatInput] = useState('');
  const [bDept, setBDept] = useState('marketing');
  const [bCat, setBCat] = useState('Quảng cáo');
  const [bLimit, setBLimit] = useState('10000000');

  // Ledger filters & Audit modal
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStatus, setLedgerStatus] = useState<string>('all');
  const [historyItem, setHistoryItem] = useState<ExpenseItem | null>(null);

  const activeAgents = useMemo(() => agents.filter((a) => a.employmentStatus !== 'archived'), [agents]);
  const accountantReviewers = useMemo(
    () => activeAgents.filter((a) => a.id === 'cfo' || a.defaultPermissions.includes('expense:review')),
    [activeAgents]
  );

  const tier1Queue = useMemo(
    () => expenses.filter((e) => e.status === 'pending_accountant' || e.status === 'needs_info'),
    [expenses]
  );
  const tier2Queue = useMemo(() => expenses.filter((e) => e.status === 'pending_ceo'), [expenses]);

  const analytics = useMemo(
    () =>
      computeFinancialAnalytics({
        expenses,
        leads,
        ads: adCampaigns,
        channels: marketingChannels,
        budgets: expenseBudgets,
        departments,
      }),
    [expenses, leads, adCampaigns, marketingChannels, expenseBudgets, departments]
  );

  const filteredLedger = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return expenses.filter((e) => {
      if (ledgerStatus !== 'all' && e.status !== ledgerStatus) return false;
      if (q) {
        const hay = `${e.expenseCode} ${e.title} ${e.vendor} ${e.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, ledgerSearch, ledgerStatus]);

  const handleOpenRuleFromExpense = (exp: ExpenseItem) => {
    setRName(`Tự duyệt ${exp.category} – ${exp.vendor}`);
    setRCategory(exp.category);
    setRVendor(exp.vendor);
    setRDept(exp.department);
    setRMaxTx(String(Math.min(exp.amountVnd, spendingPolicy.autoApproveMaxPerTxVnd)));
    setRMaxMonth(String(Math.min(exp.amountVnd * 4, spendingPolicy.autoApproveMaxPerMonthVnd)));
    setRMaxCount('5');
    setRReqAtt(exp.amountVnd >= 1_000_000);
    setRType('accountant_auto');
    setShowRuleModal(true);
  };

  const handleCreateExpenseSubmit = async () => {
    if (!fTitle.trim() || !fVendor.trim() || Number(fAmount) <= 0) {
      setNotice('Vui lòng nhập đầy đủ Tên khoản chi, Nhà cung cấp và Số tiền > 0.');
      return;
    }
    const created = await createExpense({
      requesterId: fRequesterId,
      category: fCategory,
      title: fTitle.trim(),
      vendor: fVendor.trim(),
      amountVnd: Number(fAmount),
      projectOrCampaign: fProject.trim() || 'Vận hành',
      justification: fJustification.trim() || 'Đề xuất chi vận hành phục vụ mục tiêu tăng trưởng.',
      expectedRoi: fRoi.trim() || 'Tối ưu năng suất & chuyển đổi khách hàng.',
      frequency: fFrequency,
      attachmentName: fAttachmentName || undefined,
      attachmentDataUrl: fAttachmentUrl || undefined,
    });
    setNotice(
      `Đã tạo phiếu ${created.expenseCode} · Trạng thái: ${STATUS_BADGE[created.status]?.label || created.status}.`
    );
    setShowCreateModal(false);
    setFTitle('');
    setFVendor('');
    setFJustification('');
    setFRoi('');
    setFAttachmentName('');
    setFAttachmentUrl('');
  };

  const handleSaveRuleSubmit = async () => {
    if (!rName.trim()) {
      setNotice('Vui lòng nhập tên quy tắc.');
      return;
    }
    const draftRule: Partial<ExpenseRule> = {
      name: rName.trim(),
      ruleType: rType,
      category: rCategory,
      vendorPattern: rVendor.trim() || '*',
      department: rDept,
      requesterId: 'all',
      maxPerExpenseVnd: Number(rMaxTx),
      maxPerMonthVnd: Number(rMaxMonth),
      maxCountPerMonth: Number(rMaxCount),
      requiresAttachment: rReqAtt,
    };
    const check = validateRuleAgainstPolicy(draftRule, spendingPolicy);
    if (!check.valid) {
      setNotice(check.reason || 'Quy tắc vượt giới hạn chính sách CEO.');
      return;
    }

    const res = await saveExpenseRule({
      name: rName.trim(),
      ruleType: rType,
      category: rCategory,
      vendorPattern: rVendor.trim() || '*',
      department: rDept,
      requesterId: 'all',
      maxPerExpenseVnd: Number(rMaxTx),
      maxPerMonthVnd: Number(rMaxMonth),
      maxCountPerMonth: Number(rMaxCount),
      requiresAttachment: rReqAtt,
      expiresAt: Date.now() + Number(rDaysValid || 90) * 86400_000,
      enabled: true,
      ceoConfirmedOnce: rType === 'full_auto' ? true : true,
      createdBy: 'ceo',
    });
    if (!res.ok) {
      setNotice(res.error || 'Không lưu được quy tắc.');
      return;
    }
    setNotice(`Đã lưu quy tắc tự duyệt ${res.rule?.ruleCode || ''}.`);
    setShowRuleModal(false);
  };

  const handleExportCsv = () => {
    const csv = exportExpensesCsv(filteredLedger, agents);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `so-chi-phi-${currentMonthKey()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full p-3 gap-2.5 overflow-hidden">
      {/* Sub-navigation + Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {(
            [
              { id: 'queue', label: `Hàng duyệt (${tier1Queue.length + tier2Queue.length})` },
              { id: 'rules', label: `Quy tắc (${expenseRules.length})` },
              { id: 'budgets', label: 'Ngân sách' },
              { id: 'ledger', label: `Sổ chi phí (${expenses.length})` },
              { id: 'analytics', label: 'Báo cáo & CAC' },
              { id: 'policy', label: 'Chính sách' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                subTab === t.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo đề xuất chi</span>
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-sky-500/40 bg-sky-500/10 text-xs text-sky-700 dark:text-sky-300">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. TWO-TIER APPROVAL QUEUE */}
      {subTab === 'queue' && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Tier 2 CEO Queue */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Tầng 2 · Chờ CEO phê duyệt ({tier2Queue.length})
              </h4>
              {tier2Queue.length > 1 && (
                <button
                  type="button"
                  onClick={async () => {
                    for (const e of tier2Queue) {
                      await ceoResolveExpense({
                        expenseId: e.id,
                        decision: 'approved',
                        note: 'CEO duyệt hàng loạt',
                        via: 'web',
                      });
                    }
                    setNotice(`Đã duyệt hàng loạt ${tier2Queue.length} phiếu chi.`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                >
                  Duyệt hàng loạt ({tier2Queue.length})
                </button>
              )}
            </div>

            {tier2Queue.length === 0 ? (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                Không có phiếu chi nào đang chờ CEO duyệt.
              </div>
            ) : (
              tier2Queue.map((e) => {
                const req = agents.find((a) => a.id === e.requesterId);
                return (
                  <div
                    key={e.id}
                    className="rounded-lg border border-sky-500/40 bg-white dark:bg-slate-900 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold">
                          <span className="font-mono-num text-sky-500">{e.expenseCode}</span> · {e.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {req?.name || e.requesterId} · {e.department} · NCC: {e.vendor} · {e.category}
                        </div>
                      </div>
                      <div className="text-sm font-bold font-mono-num text-emerald-500 shrink-0">
                        {formatVnd(e.amountVnd)}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                      <div>
                        <span className="font-semibold">Lý do & ROI:</span> {e.justification} — {e.expectedRoi}
                      </div>
                      {e.accountantNote && (
                        <div className="text-indigo-500 dark:text-indigo-400">
                          <span className="font-semibold">Kế toán thẩm định:</span> {e.accountantNote}
                        </div>
                      )}
                      {e.flags.length > 0 && (
                        <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{e.flags.join(' | ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <input
                        value={actionNotes[e.id] || ''}
                        onChange={(ev) => setActionNotes((p) => ({ ...p, [e.id]: ev.target.value }))}
                        placeholder="Ghi chú CEO (tùy chọn)..."
                        className="flex-1 min-w-[140px] px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          await ceoResolveExpense({
                            expenseId: e.id,
                            decision: 'approved',
                            note: actionNotes[e.id] || 'CEO đồng ý duyệt chi.',
                            via: 'web',
                          });
                          setNotice(`Đã duyệt chi ${e.expenseCode}.`);
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Duyệt chi
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const raw = window.prompt('Nhập số tiền điều chỉnh (VND):', String(e.amountVnd));
                          const amt = Number(raw);
                          if (amt > 0) {
                            await ceoResolveExpense({
                              expenseId: e.id,
                              decision: 'edited',
                              editedAmountVnd: amt,
                              note: `CEO điều chỉnh mức duyệt xuống ${formatVnd(amt)}`,
                              via: 'web',
                            });
                            setNotice(`Đã duyệt chi ${e.expenseCode} với số tiền ${formatVnd(amt)}.`);
                          }
                        }}
                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] cursor-pointer"
                      >
                        Sửa tiền
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          ceoResolveExpense({
                            expenseId: e.id,
                            decision: 'needs_info',
                            note: actionNotes[e.id] || 'CEO yêu cầu bổ sung chứng từ/ROI.',
                            via: 'web',
                          })
                        }
                        className="px-2 py-1 rounded border border-amber-500/40 text-amber-600 dark:text-amber-400 text-[11px] cursor-pointer"
                      >
                        Hỏi lại
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          ceoResolveExpense({
                            expenseId: e.id,
                            decision: 'rejected',
                            note: actionNotes[e.id] || 'CEO không duyệt khoản chi này.',
                            via: 'web',
                          })
                        }
                        className="px-2 py-1 rounded border border-rose-500/40 text-rose-500 text-[11px] cursor-pointer"
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenRuleFromExpense(e)}
                        className="px-2 py-1 rounded border border-indigo-500/40 text-indigo-500 text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Áp dụng cho lần sau</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Tier 1 Accountant Queue */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Tầng 1 · Chờ Kế toán thẩm định ({tier1Queue.length})
              </h4>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400">Người thẩm định:</span>
                <select
                  value={reviewerId}
                  onChange={(e) => setReviewerId(e.target.value)}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]"
                >
                  {accountantReviewers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.title})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {tier1Queue.length === 0 ? (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                Hàng chờ Kế toán thẩm định tầng 1 đang trống.
              </div>
            ) : (
              tier1Queue.map((e) => {
                const req = agents.find((a) => a.id === e.requesterId);
                const samePerson = e.requesterId === reviewerId;
                return (
                  <div
                    key={e.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold">
                          <span className="font-mono-num text-amber-500">{e.expenseCode}</span> · {e.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Người xin: {req?.name || e.requesterId} · NCC: {e.vendor} · {e.category} ·{' '}
                          {e.attachmentName ? `Đính kèm: ${e.attachmentName}` : 'Chưa có file đính kèm'}
                        </div>
                      </div>
                      <div className="text-sm font-bold font-mono-num shrink-0">{formatVnd(e.amountVnd)}</div>
                    </div>

                    {e.flags.length > 0 && (
                      <div className="p-2 rounded border border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
                        {e.flags.map((fl, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{fl}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {samePerson && (
                      <div className="text-[11px] text-rose-500 font-medium">
                        Tách bạch nhiệm vụ: {req?.name} là người tạo phiếu nên không thể tự thẩm định. Chọn nhân sự kế toán khác.
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <input
                        value={actionNotes[e.id] || ''}
                        onChange={(ev) => setActionNotes((p) => ({ ...p, [e.id]: ev.target.value }))}
                        placeholder="Ghi chú thẩm định tầng 1..."
                        className="flex-1 min-w-[140px] px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px]"
                      />
                      <button
                        type="button"
                        disabled={samePerson}
                        onClick={async () => {
                          const res = await accountantReviewExpense({
                            expenseId: e.id,
                            reviewerId,
                            decision: 'to_ceo',
                            note: actionNotes[e.id] || 'Hợp lệ ngân sách & chứng từ, trình CEO.',
                          });
                          if (!res.ok) setNotice(res.error || 'Lỗi thẩm định.');
                          else setNotice(`Đã chuyển ${e.expenseCode} lên CEO duyệt (kèm thông báo Zalo).`);
                        }}
                        className="px-2.5 py-1 rounded bg-sky-600 disabled:opacity-40 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Đạt → Trình CEO
                      </button>
                      <button
                        type="button"
                        disabled={samePerson}
                        onClick={async () => {
                          const res = await accountantReviewExpense({
                            expenseId: e.id,
                            reviewerId,
                            decision: 'needs_info',
                            note: actionNotes[e.id] || 'Bổ sung báo giá / kế hoạch ROI chi tiết.',
                          });
                          if (!res.ok) setNotice(res.error || 'Lỗi.');
                        }}
                        className="px-2 py-1 rounded border border-amber-500/40 text-amber-600 dark:text-amber-400 text-[11px] cursor-pointer"
                      >
                        Hỏi lại
                      </button>
                      <button
                        type="button"
                        disabled={samePerson}
                        onClick={async () => {
                          const res = await accountantReviewExpense({
                            expenseId: e.id,
                            reviewerId,
                            decision: 'rejected',
                            note: actionNotes[e.id] || 'Không hợp lệ theo chính sách chi tiêu.',
                          });
                          if (!res.ok) setNotice(res.error || 'Lỗi.');
                        }}
                        className="px-2 py-1 rounded border border-rose-500/40 text-rose-500 text-[11px] cursor-pointer"
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. AUTO-APPROVAL RULES */}
      {subTab === 'rules' && (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Quy tắc tự duyệt luôn bị chặn nếu vượt trần chính sách CEO (≤ {formatVnd(spendingPolicy.autoApproveMaxPerTxVnd)}/lần, &lt; {formatVnd(spendingPolicy.mandatoryCeoThresholdVnd)}).
            </div>
            <button
              type="button"
              onClick={() => setShowRuleModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              + Thêm quy tắc
            </button>
          </div>

          {expenseRules.map((rule) => {
            const pct = rule.maxPerMonthVnd > 0 ? Math.min(100, Math.round((rule.usedAmountMonthVnd / rule.maxPerMonthVnd) * 100)) : 0;
            return (
              <div
                key={rule.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <span className="font-mono-num text-indigo-500">{rule.ruleCode}</span>
                      <span>{rule.name}</span>
                      {rule.revokedByCeo ? (
                        <span className="text-[10px] text-rose-500 font-semibold">CEO đã thu hồi</span>
                      ) : rule.enabled ? (
                        <span className="text-[10px] text-emerald-500 font-semibold">Đang chạy</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Tạm dừng</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {rule.ruleType === 'full_auto' ? 'Tự duyệt hoàn toàn' : 'Kế toán tự duyệt'} · Hạng mục: {rule.category} · NCC: {rule.vendorPattern} · Tối đa {formatVnd(rule.maxPerExpenseVnd)}/lần
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!rule.revokedByCeo && (
                      <button
                        type="button"
                        onClick={() => toggleExpenseRule(rule.id)}
                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] cursor-pointer"
                      >
                        {rule.enabled ? 'Tạm dừng' : 'Bật lại'}
                      </button>
                    )}
                    {!rule.revokedByCeo && (
                      <button
                        type="button"
                        onClick={() => revokeExpenseRule(rule.id)}
                        className="px-2 py-1 rounded border border-rose-500/40 text-rose-500 text-[11px] cursor-pointer"
                      >
                        Thu hồi
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteExpenseRule(rule.id)}
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono-num text-slate-500">
                    <span>
                      Đã dùng tháng này: {rule.usedCountMonth}/{rule.maxCountPerMonth} lượt
                    </span>
                    <span>
                      {formatVnd(rule.usedAmountMonthVnd)} / {formatVnd(rule.maxPerMonthVnd)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. MONTHLY BUDGETS */}
      {subTab === 'budgets' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
            <div className="text-xs font-semibold">Thiết lập ngân sách tháng ({currentMonthKey()})</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <select
                value={bDept}
                onChange={(e) => setBDept(e.target.value)}
                className="px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                <option value="all">Toàn công ty</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.shortName}
                  </option>
                ))}
              </select>
              <select
                value={bCat}
                onChange={(e) => setBCat(e.target.value)}
                className="px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={bLimit}
                onChange={(e) => setBLimit(e.target.value)}
                placeholder="Hạn mức VND"
                className="px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
              />
              <button
                type="button"
                onClick={async () => {
                  const mk = currentMonthKey();
                  await putExpenseBudget({
                    id: `${mk}::${bDept}::${bCat}`,
                    monthKey: mk,
                    department: bDept,
                    category: bCat,
                    limitVnd: Math.max(100_000, Number(bLimit) || 5_000_000),
                    proposedBy: 'ceo',
                    ceoApproved: true,
                    updatedAt: Date.now(),
                  });
                  setNotice(`Đã cập nhật ngân sách ${bCat} (${bDept}).`);
                }}
                className="px-3 py-1.5 rounded bg-sky-600 text-white font-semibold cursor-pointer"
              >
                Lưu hạn mức
              </button>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                placeholder="Thêm hạng mục chi tùy chỉnh mới..."
                className="flex-1 px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!newCatInput.trim()) return;
                  await addExpenseCategory(newCatInput.trim());
                  setNewCatInput('');
                }}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
              >
                + Hạng mục
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {expenseBudgets.map((b) => {
              const mk = b.monthKey;
              const spent = expenses
                .filter(
                  (e) =>
                    e.status !== 'rejected' &&
                    e.status !== 'draft' &&
                    currentMonthKey(e.createdAt) === mk &&
                    e.category === b.category &&
                    (b.department === 'all' || e.department === b.department)
                )
                .reduce((s, e) => s + e.amountVnd, 0);
              const pct = b.limitVnd > 0 ? Math.round((spent / b.limitVnd) * 100) : 0;
              return (
                <div
                  key={b.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold">{b.category}</span>{' '}
                      <span className="text-slate-400">· Phòng: {b.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num font-semibold">
                        {formatVnd(spent)} / {formatVnd(b.limitVnd)} ({pct}%)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          putExpenseBudget({ ...b, unlockedOverLimit: !b.unlockedOverLimit, updatedAt: Date.now() })
                        }
                        className={`px-2 py-0.5 rounded text-[10.5px] border flex items-center gap-1 cursor-pointer ${
                          b.unlockedOverLimit
                            ? 'border-amber-500/50 text-amber-500'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        {b.unlockedOverLimit ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span>{b.unlockedOverLimit ? 'Đã mở vượt trần' : 'Khóa 100%'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-sky-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. EXPENSE LEDGER */}
      {subTab === 'ledger' && (
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              placeholder="Tìm mã phiếu, tiêu đề, NCC..."
              className="flex-1 min-w-[150px] px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            />
            <select
              value={ledgerStatus}
              onChange={(e) => setLedgerStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <option value="all">Tất cả trạng thái</option>
              {(Object.keys(STATUS_BADGE) as ExpenseStatus[]).map((st) => (
                <option key={st} value={st}>
                  {STATUS_BADGE[st].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredLedger.map((e) => {
              const req = agents.find((a) => a.id === e.requesterId);
              const badge = STATUS_BADGE[e.status] || STATUS_BADGE.draft;
              return (
                <div
                  key={e.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">
                        <span className="font-mono-num text-sky-500">{e.expenseCode}</span> · {e.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {req?.name || e.requesterId} · {e.category} · {e.vendor} ·{' '}
                        <span className={badge.cls}>{badge.label}</span>
                        {e.autoApprovedByRuleName ? ` · Tự duyệt (${e.autoApprovedByRuleName})` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold font-mono-num">{formatVnd(e.amountVnd)}</div>
                      <div className="text-[10px] text-slate-400 font-mono-num">
                        {new Date(e.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-400">
                      {e.attachmentName ? (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <FileText className="w-3 h-3" /> {e.attachmentName}
                        </span>
                      ) : (
                        <span>Chưa có hóa đơn</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {e.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() =>
                            markExpensePaid({
                              expenseId: e.id,
                              actorId: reviewerId,
                              note: 'Đã thanh toán qua sổ chi phí',
                            })
                          }
                          className="px-2 py-0.5 rounded bg-emerald-600 text-white font-medium cursor-pointer"
                        >
                          Đánh dấu đã chi
                        </button>
                      )}
                      {e.status === 'paid' && (
                        <button
                          type="button"
                          onClick={() => reconcileExpense(e.id, reviewerId, 'Đối soát chứng từ hợp lệ')}
                          className="px-2 py-0.5 rounded bg-indigo-600 text-white font-medium cursor-pointer"
                        >
                          Đối soát
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setHistoryItem(e)}
                        className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        <History className="w-3 h-3" />
                        <span>Lịch sử ({e.history.length})</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. ANALYTICS & CAC */}
      {subTab === 'analytics' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-num">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
              <div className="text-[10.5px] text-slate-400">Đã duyệt tháng</div>
              <div className="text-sm font-bold text-emerald-500">{formatVnd(analytics.monthApprovedVnd)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
              <div className="text-[10.5px] text-slate-400">Đã chi thực tế</div>
              <div className="text-sm font-bold text-sky-500">{formatVnd(analytics.monthPaidVnd)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
              <div className="text-[10.5px] text-slate-400">Đang chờ duyệt</div>
              <div className="text-sm font-bold text-amber-500">{formatVnd(analytics.pendingTotalVnd)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
              <div className="text-[10.5px] text-slate-400">Doanh thu Won</div>
              <div className="text-sm font-bold text-indigo-500">{formatVnd(analytics.wonRevenueVnd)}</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-sky-500" />
              <span>Chi phí vs Ngân sách theo Phòng ban</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.spendByDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val) => formatVnd(Number(val ?? 0))} />
                  <Bar dataKey="budgetVnd" name="Ngân sách" fill="#64748B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spentVnd" name="Đã chi" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
            <div className="text-xs font-semibold">Chi phí thu hút khách hàng (CPL & CAC theo Kênh)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono-num">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-1.5">Kênh</th>
                    <th className="py-1.5 text-right">Đã chi</th>
                    <th className="py-1.5 text-right">Lead</th>
                    <th className="py-1.5 text-right">CPL</th>
                    <th className="py-1.5 text-right">CAC / Won</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {analytics.cacByChannel.map((row) => (
                    <tr key={row.channel}>
                      <td className="py-1.5 font-sans font-medium">{row.channel}</td>
                      <td className="py-1.5 text-right">{formatVnd(row.spendVnd)}</td>
                      <td className="py-1.5 text-right">{row.leadsCount}</td>
                      <td className="py-1.5 text-right text-sky-500">{formatVnd(row.cplVnd)}</td>
                      <td className="py-1.5 text-right text-emerald-500">{formatVnd(row.cacVnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                <span>Khoản chi định kỳ sắp tới ({analytics.upcomingRecurring.length})</span>
              </div>
              {analytics.upcomingRecurring.length === 0 ? (
                <div className="text-[11px] text-slate-400">Chưa có khoản chi định kỳ.</div>
              ) : (
                analytics.upcomingRecurring.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex justify-between text-[11px]">
                    <span className="truncate pr-2">{r.title}</span>
                    <span className="font-mono-num shrink-0">{formatVnd(r.amountVnd)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-500" />
                <span>Khoản đã duyệt thiếu chứng từ ({analytics.missingReceiptItems.length})</span>
              </div>
              {analytics.missingReceiptItems.length === 0 ? (
                <div className="text-[11px] text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã đầy đủ chứng từ.
                </div>
              ) : (
                analytics.missingReceiptItems.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex justify-between text-[11px] text-amber-500">
                    <span className="truncate pr-2">
                      {m.expenseCode} · {m.title}
                    </span>
                    <span className="font-mono-num shrink-0">{formatVnd(m.amountVnd)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. CEO SPENDING POLICY */}
      {subTab === 'policy' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-3">
            <div className="font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Chính sách & Trần Chi tiêu của Chủ tịch / CEO</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1">Trần tự duyệt mỗi lần (VND)</label>
                <input
                  type="number"
                  value={spendingPolicy.autoApproveMaxPerTxVnd}
                  onChange={(e) =>
                    updateSpendingPolicy({ autoApproveMaxPerTxVnd: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Trần tự duyệt mỗi tháng (VND)</label>
                <input
                  type="number"
                  value={spendingPolicy.autoApproveMaxPerMonthVnd}
                  onChange={(e) =>
                    updateSpendingPolicy({ autoApproveMaxPerMonthVnd: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Ngưỡng bắt buộc CEO duyệt (VND)</label>
                <input
                  type="number"
                  value={spendingPolicy.mandatoryCeoThresholdVnd}
                  onChange={(e) =>
                    updateSpendingPolicy({ mandatoryCeoThresholdVnd: Math.max(100_000, Number(e.target.value)) })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Ngưỡng cảnh báo bất thường (%)</label>
                <input
                  type="number"
                  value={spendingPolicy.anomalyThresholdPercent}
                  onChange={(e) =>
                    updateSpendingPolicy({ anomalyThresholdPercent: Math.max(5, Number(e.target.value)) })
                  }
                  className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spendingPolicy.requireOneTimeCeoRuleConfirm}
                  onChange={(e) => updateSpendingPolicy({ requireOneTimeCeoRuleConfirm: e.target.checked })}
                  className="accent-sky-600"
                />
                <span>Bắt buộc CEO xác nhận 1 lần trước khi quy tắc &quot;Tự duyệt hoàn toàn&quot; có hiệu lực</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spendingPolicy.blockBudgetAt100Percent}
                  onChange={(e) => updateSpendingPolicy({ blockBudgetAt100Percent: e.target.checked })}
                  className="accent-sky-600"
                />
                <span>Tự động chặn đề xuất vượt 100% ngân sách tháng (trừ khi CEO mở khóa)</span>
              </label>
            </div>

            <div>
              <div className="text-[11px] font-semibold mb-1.5">Danh mục CẤM tự duyệt (luôn qua CEO):</div>
              <div className="grid grid-cols-2 gap-1.5">
                {expenseCategories.map((cat) => {
                  const blocked = spendingPolicy.blockedAutoCategories.includes(cat.name);
                  return (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 p-1.5 rounded border border-slate-200 dark:border-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={blocked}
                        onChange={() =>
                          updateSpendingPolicy({
                            blockedAutoCategories: blocked
                              ? spendingPolicy.blockedAutoCategories.filter((x) => x !== cat.name)
                              : [...spendingPolicy.blockedAutoCategories, cat.name],
                          })
                        }
                        className="accent-rose-600"
                      />
                      <span className="truncate">{cat.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EXPENSE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Tạo đề xuất chi phí mới</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Người đề xuất</label>
                  <select
                    value={fRequesterId}
                    onChange={(e) => setFRequesterId(e.target.value)}
                    className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    {activeAgents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1">Hạng mục chi</label>
                  <select
                    value={fCategory}
                    onChange={(e) => setFCategory(e.target.value)}
                    className="w-full px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <input
                value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
                placeholder="Tên khoản chi (vd: Chạy Facebook Lead Ads Mầm non)"
                className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={fVendor}
                  onChange={(e) => setFVendor(e.target.value)}
                  placeholder="Nhà cung cấp (Meta, Google, Canva...)"
                  className="px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
                <input
                  type="number"
                  value={fAmount}
                  onChange={(e) => setFAmount(e.target.value)}
                  placeholder="Số tiền VND"
                  className="px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={fProject}
                  onChange={(e) => setFProject(e.target.value)}
                  placeholder="Dự án / Chiến dịch"
                  className="px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
                <select
                  value={fFrequency}
                  onChange={(e) => setFFrequency(e.target.value as 'once' | 'recurring')}
                  className="px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <option value="once">Chi một lần</option>
                  <option value="recurring">Định kỳ hàng tháng</option>
                </select>
              </div>
              <input
                value={fJustification}
                onChange={(e) => setFJustification(e.target.value)}
                placeholder="Lý do chi tiêu..."
                className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <input
                value={fRoi}
                onChange={(e) => setFRoi(e.target.value)}
                placeholder="Kết quả kỳ vọng (ROI / CPL)..."
                className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />

              <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer">
                <span className="truncate text-slate-400">
                  {fAttachmentName ? `Đã chọn: ${fAttachmentName}` : 'Đính kèm báo giá / hóa đơn (tùy chọn)'}
                </span>
                <Upload className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setFAttachmentName(file.name);
                    const reader = new FileReader();
                    reader.onload = () => setFAttachmentUrl(String(reader.result || ''));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateExpenseSubmit}
                className="px-4 py-1.5 rounded bg-sky-600 text-white font-semibold cursor-pointer"
              >
                Gửi phiếu chi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE AUTO RULE MODAL */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Tạo Quy tắc Tự duyệt Chi phí</span>
              </h3>
              <button type="button" onClick={() => setShowRuleModal(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <input
                value={rName}
                onChange={(e) => setRName(e.target.value)}
                placeholder="Tên quy tắc (vd: Gia hạn công cụ AI hàng tháng)"
                className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={rType}
                  onChange={(e) => setRType(e.target.value as ExpenseRuleType)}
                  className="px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <option value="accountant_auto">Kế toán tự duyệt (trong hạn mức)</option>
                  <option value="full_auto">Tự duyệt hoàn toàn (CEO xác nhận)</option>
                </select>
                <select
                  value={rCategory}
                  onChange={(e) => setRCategory(e.target.value)}
                  className="px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={rVendor}
                  onChange={(e) => setRVendor(e.target.value)}
                  placeholder="NCC (* = mọi NCC)"
                  className="px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
                <select
                  value={rDept}
                  onChange={(e) => setRDept(e.target.value)}
                  className="px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                >
                  <option value="all">Mọi phòng ban</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.shortName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Max / lần (VND)</label>
                  <input
                    type="number"
                    value={rMaxTx}
                    onChange={(e) => setRMaxTx(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Max / tháng (VND)</label>
                  <input
                    type="number"
                    value={rMaxMonth}
                    onChange={(e) => setRMaxMonth(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Lượt / tháng</label>
                  <input
                    type="number"
                    value={rMaxCount}
                    onChange={(e) => setRMaxCount(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rReqAtt}
                    onChange={(e) => setRReqAtt(e.target.checked)}
                    className="accent-sky-600"
                  />
                  <span>Bắt buộc hóa đơn/báo giá</span>
                </label>
                <div>
                  <input
                    type="number"
                    value={rDaysValid}
                    onChange={(e) => setRDaysValid(e.target.value)}
                    placeholder="Hiệu lực (ngày)"
                    className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono-num"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveRuleSubmit}
                className="flex items-center gap-1 px-4 py-1.5 rounded bg-emerald-600 text-white font-semibold cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu quy tắc</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT HISTORY MODAL */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                Lịch sử xử lý {historyItem.expenseCode}
              </h3>
              <button type="button" onClick={() => setHistoryItem(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {historyItem.history.map((h, i) => (
                <div
                  key={i}
                  className="p-2 rounded border border-slate-200 dark:border-slate-800 space-y-0.5"
                >
                  <div className="flex justify-between font-semibold">
                    <span>{h.actorName}</span>
                    <span className="font-mono-num text-[10px] text-slate-400">
                      {new Date(h.at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="text-[11px] text-sky-500">
                    {h.fromStatus} → {h.toStatus}
                  </div>
                  {h.note && <div className="text-[11px] text-slate-500 dark:text-slate-300">{h.note}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
