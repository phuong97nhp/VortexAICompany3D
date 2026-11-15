import { useMemo, useState } from 'react';
import { Check, Download, FileText, Plus, Send, ShieldBan, Upload, X } from 'lucide-react';
import { getProductById, PRODUCTS } from '../../config/products';
import { exportRecordsToCsv } from '../../engine/erpEngine';
import { formatVnd } from '../../engine/expenseEngine';
import { executeAgentTool } from '../../engine/tools';
import { useCompanyStore } from '../../store/useCompanyStore';
import { LeadItem, LeadStage } from '../../types';

type CrmSubTab = 'leads' | 'customers' | 'quotes_orders' | 'invoices_ar' | 'refunds_nps';

const STAGES: Array<{ id: LeadStage; label: string; color: string }> = [
  { id: 'new', label: 'Mới tìm', color: '#64748B' },
  { id: 'contacted', label: 'Đã liên hệ', color: '#0EA5E9' },
  { id: 'replied', label: 'Đã phản hồi', color: '#8B5CF6' },
  { id: 'demo', label: 'Hẹn Demo', color: '#F59E0B' },
  { id: 'proposal', label: 'Báo giá', color: '#EC4899' },
  { id: 'won', label: 'Chốt Deal', color: '#10B981' },
  { id: 'lost', label: 'Thất bại', color: '#EF4444' },
];

export function CrmPanel() {
  const leads = useCompanyStore((s) => s.leads);
  const customerAccounts = useCompanyStore((s) => s.customerAccounts);
  const salesQuotes = useCompanyStore((s) => s.salesQuotes);
  const salesOrders = useCompanyStore((s) => s.salesOrders);
  const electronicInvoices = useCompanyStore((s) => s.electronicInvoices);
  const refundRequests = useCompanyStore((s) => s.refundRequests);
  const customerSurveys = useCompanyStore((s) => s.customerSurveys);

  const moveLeadStage = useCompanyStore((s) => s.moveLeadStage);
  const toggleLeadBlacklist = useCompanyStore((s) => s.toggleLeadBlacklist);
  const putSalesQuote = useCompanyStore((s) => s.putSalesQuote);
  const convertQuoteToOrderAndInvoice = useCompanyStore((s) => s.convertQuoteToOrderAndInvoice);
  const sendInvoicePaymentReminder = useCompanyStore((s) => s.sendInvoicePaymentReminder);
  const recordInvoicePayment = useCompanyStore((s) => s.recordInvoicePayment);
  const createRefundRequest = useCompanyStore((s) => s.createRefundRequest);
  const resolveRefundRequest = useCompanyStore((s) => s.resolveRefundRequest);
  const addCustomerSurvey = useCompanyStore((s) => s.addCustomerSurvey);
  const importCustomersCsv = useCompanyStore((s) => s.importCustomersCsv);

  const [crmTab, setCrmTab] = useState<CrmSubTab>('leads');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [productFilter, setProductFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // New Quote form state
  const [qCustomerId, setQCustomerId] = useState(customerAccounts[0]?.id || '');
  const [qPlanLabel, setQPlanLabel] = useState('Gói EduCenter Pro 12 tháng');
  const [qSubtotal, setQSubtotal] = useState('18000000');

  // Survey quick form
  const [sCustId, setSCustId] = useState(customerAccounts[0]?.id || '');
  const [sScore, setSScore] = useState('9');
  const [sComment, setSComment] = useState('');

  // Refund quick form
  const [rOrderId, setROrderId] = useState(salesOrders[0]?.id || '');
  const [rAmount, setRAmount] = useState('1000000');
  const [rReason, setRReason] = useState('');

  const mrrTotal = useMemo(
    () => customerAccounts.filter((c) => c.status !== 'churned').reduce((s, c) => s + c.mrrVnd, 0),
    [customerAccounts]
  );

  const filtered = leads.filter((l) => {
    if (productFilter !== 'all' && l.recommendedProductId !== productFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.province.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCsv = () => {
    const header = ['ID', 'Tên khách hàng', 'Loại hình', 'Tỉnh/TP', 'Email', 'SĐT', 'Điểm', 'Sản phẩm', 'Trạng thái', 'Giá trị (VNĐ)'];
    const rows = filtered.map((l) => [
      l.id,
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.category}"`,
      `"${l.province}"`,
      l.email || '',
      l.phone || '',
      l.score,
      getProductById(l.recommendedProductId).shortName,
      l.stage,
      l.estimatedValueVnd,
    ]);
    const csv = '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm_leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickOutreach = async (lead: LeadItem) => {
    const sdrId =
      lead.recommendedProductId === 'edu-center' || lead.recommendedProductId === 'preschool-care'
        ? 'sdr_1'
        : 'sdr_2';
    await executeAgentTool(sdrId, 'send_outreach', {
      leadId: lead.id,
      channel: lead.zalo ? 'Zalo OA' : 'Email',
      message: `Kính gửi anh/chị quản lý ${lead.name}, bên em gửi thông tin demo phần mềm ${getProductById(lead.recommendedProductId).shortName} giúp tối ưu vận hành 30%.`,
    });
  };

  const exportCustomersCsv = () => {
    const csv = exportRecordsToCsv(
      ['code', 'name', 'taxCode', 'contactName', 'contactPhone', 'tier', 'mrrVnd', 'ltvVnd', 'status'],
      customerAccounts.map((c) => [c.code, c.name, c.taxCode || '', c.contactName, c.contactPhone, c.tier, c.mrrVnd, c.ltvVnd, c.status])
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khach_hang_crm_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await importCustomersCsv(text);
    setNotice(res.error ? res.error : `Đã nhập ${res.imported} khách hàng từ CSV.`);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-hidden relative">
      {/* Sub-tabs CRM ERP */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              ['leads', `Lead Pipeline (${leads.length})`],
              ['customers', `Khách hàng (${customerAccounts.length})`],
              ['quotes_orders', `Báo giá & Đơn hàng (${salesQuotes.length}/${salesOrders.length})`],
              ['invoices_ar', `Hóa đơn VAT & Công nợ (${electronicInvoices.length})`],
              ['refunds_nps', `Hoàn tiền & NPS (${refundRequests.length})`],
            ] as Array<[CrmSubTab, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setCrmTab(id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                crmTab === id
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-mono-num font-bold text-emerald-500">
          MRR: {formatVnd(mrrTotal)}
        </span>
      </div>

      {notice && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-xs text-sky-500">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {crmTab === 'leads' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên trung tâm, tỉnh thành..."
                className="flex-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
              />
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="text-xs rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1.5"
              >
                <option value="all">Tất cả SP ({leads.length})</option>
                {PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shortName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer ${
                    viewMode === 'kanban' ? 'bg-sky-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Kanban
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer ${
                    viewMode === 'table' ? 'bg-sky-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Bảng
                </button>
              </div>
              <button
                type="button"
                onClick={exportCsv}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất CSV</span>
              </button>
            </div>
          </div>

          {/* Pipeline View */}
          {viewMode === 'kanban' ? (
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-1">
          <div className="flex gap-2 h-full min-w-[960px]">
            {STAGES.map((st) => {
              const items = filtered.filter((l) => l.stage === st.id);
              return (
                <div
                  key={st.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragLeadId) {
                      moveLeadStage(dragLeadId, st.id);
                      setDragLeadId(null);
                    }
                  }}
                  className="flex-1 min-w-[145px] flex flex-col rounded-xl bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-2"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold" style={{ color: st.color }}>
                      {st.label}
                    </span>
                    <span className="text-[11px] font-mono-num text-slate-400">{items.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto pt-2 space-y-2">
                    {items.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDragLeadId(lead.id)}
                        onClick={() => setSelectedLead(lead)}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-sky-500/50 space-y-1"
                      >
                        <div className="text-xs font-semibold leading-snug line-clamp-2">{lead.name}</div>
                        <div className="flex flex-wrap gap-1">
                          {(lead.origin === 'simulated' || lead.source.toLowerCase().includes('mô phỏng')) && (
                            <span className="px-1 py-0.2 rounded bg-amber-500/15 text-amber-500 text-[9.5px] font-semibold">
                              MÔ PHỎNG
                            </span>
                          )}
                          {lead.externalRefId && (
                            <span className="px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-500 text-[9.5px] font-mono-num font-semibold">
                              HubCW #{lead.externalRefId}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {lead.province} · {getProductById(lead.recommendedProductId).shortName}
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[10px]">
                          <span className="font-mono-num font-bold text-emerald-500">{lead.score}/100</span>
                          <span className="font-mono-num text-slate-400">
                            {(lead.estimatedValueVnd / 1_000_000).toFixed(1)}tr
                          </span>
                        </div>
                        {lead.blacklisted && (
                          <div className="text-[10px] text-rose-500 font-bold">BLACKLIST (DỪNG)</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 sticky top-0">
              <tr>
                <th className="text-left p-2.5 font-semibold">Khách hàng</th>
                <th className="text-left p-2.5 font-semibold">Tỉnh/TP</th>
                <th className="text-left p-2.5 font-semibold">Sản phẩm</th>
                <th className="text-right p-2.5 font-semibold">Điểm</th>
                <th className="text-left p-2.5 font-semibold">Giai đoạn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setSelectedLead(l)}
                  className="hover:bg-slate-100/70 dark:hover:bg-slate-900/50 cursor-pointer"
                >
                  <td className="p-2.5 font-medium">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{l.name}</span>
                      {(l.origin === 'simulated' || l.source.toLowerCase().includes('mô phỏng')) && (
                        <span className="px-1 py-0.2 rounded bg-amber-500/15 text-amber-500 text-[9.5px] font-semibold">
                          MÔ PHỎNG
                        </span>
                      )}
                      {l.externalRefId && (
                        <span className="px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-500 text-[9.5px] font-mono-num font-semibold">
                          HubCW #{l.externalRefId}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 text-slate-400">{l.province}</td>
                  <td className="p-2.5 text-slate-400">{getProductById(l.recommendedProductId).shortName}</td>
                  <td className="p-2.5 text-right font-mono-num font-bold text-emerald-500">{l.score}</td>
                  <td className="p-2.5">{STAGES.find((s) => s.id === l.stage)?.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}

      {crmTab === 'customers' && (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold">Danh sách Tài khoản Khách hàng (MRR / LTV / Churn)</div>
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Nhập CSV</span>
                <input type="file" accept=".csv" onChange={handleImportCsvFile} className="hidden" />
              </label>
              <button
                type="button"
                onClick={exportCustomersCsv}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất CSV</span>
              </button>
            </div>
          </div>

          {customerAccounts.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-num text-xs font-bold text-sky-500">{c.code}</span>
                  <span className="text-xs font-bold">{c.name}</span>
                  {c.source === 'simulated' && (
                    <span className="px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-500 font-semibold">
                      Mô phỏng
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  MST: {c.taxCode || '—'} · Liên hệ: {c.contactName} ({c.contactPhone}) · Gói: {c.planName}
                </div>
              </div>
              <div className="text-right font-mono-num text-[11px]">
                <div className="font-bold text-emerald-500">MRR: {formatVnd(c.mrrVnd)}</div>
                <div className={c.churnRiskScore >= 60 ? 'text-rose-500 font-bold' : 'text-slate-400'}>
                  Churn Risk: {c.churnRiskScore}/100 · CSAT: {c.csatScore ?? '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {crmTab === 'quotes_orders' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 flex flex-wrap gap-2 items-center">
            <select
              value={qCustomerId}
              onChange={(e) => setQCustomerId(e.target.value)}
              className="text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1.5"
            >
              {customerAccounts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={qPlanLabel}
              onChange={(e) => setQPlanLabel(e.target.value)}
              placeholder="Tên gói báo giá"
              className="flex-1 min-w-[160px] text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5"
            />
            <input
              type="number"
              value={qSubtotal}
              onChange={(e) => setQSubtotal(e.target.value)}
              placeholder="Giá trước VAT"
              className="w-32 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1.5 font-mono-num"
            />
            <button
              type="button"
              onClick={async () => {
                const sub = Math.max(0, Number(qSubtotal) || 0);
                const cust = customerAccounts.find((c) => c.id === qCustomerId);
                await putSalesQuote({
                  id: `qt_${Date.now().toString(36)}`,
                  code: `#BG-2026-${String(salesQuotes.length + 1).padStart(2, '0')}`,
                  customerId: cust?.id,
                  customerName: cust?.name || 'Khách hàng mới',
                  productId: 'edu-center',
                  planLabel: qPlanLabel,
                  subtotalVnd: sub,
                  discountPercent: 0,
                  vatRatePercent: 8,
                  totalVnd: Math.round(sub * 1.08),
                  validUntil: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
                  status: 'sent',
                  ownerAgentId: 'pricing_proposal',
                  source: 'manual',
                  createdAt: Date.now(),
                });
                setNotice('Đã tạo Báo giá mới.');
              }}
              className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Tạo Báo giá
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold">Báo giá đang mở ({salesQuotes.length})</div>
            {salesQuotes.map((q) => (
              <div
                key={q.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-bold">
                    {q.code} · {q.customerName}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-num">
                    {q.planLabel} · Tổng sau VAT {q.vatRatePercent}%: {formatVnd(q.totalVnd)} · Trạng thái: {q.status}
                  </div>
                </div>
                {q.status !== 'accepted' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await convertQuoteToOrderAndInvoice(q.id);
                      if (res.ok) setNotice(`Đã chốt Đơn hàng ${res.order?.code} & Xuất Hóa đơn VAT ${res.invoice?.invoiceNumber}.`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Chốt Đơn & Xuất HĐ VAT
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold">Đơn hàng ({salesOrders.length})</div>
            {salesOrders.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-bold">
                    {o.code} · {o.customerName}
                  </div>
                  <div className="text-[11px] text-slate-400">{o.itemsSummary}</div>
                </div>
                <div className="text-right font-mono-num text-[11px]">
                  <div className="font-bold text-slate-900 dark:text-white">{formatVnd(o.totalVnd)}</div>
                  <div className="text-sky-500">
                    TT: {o.paymentStatus} · Cấp SP: {o.fulfillmentStatus}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {crmTab === 'invoices_ar' && (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {electronicInvoices.map((inv) => {
            const remain = Math.max(0, inv.totalVnd - inv.paidAmountVnd);
            return (
              <div
                key={inv.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-sky-500" />
                    <span className="font-mono-num text-xs font-bold">
                      {inv.series}-{inv.invoiceNumber}
                    </span>
                    <span className="text-xs font-semibold">{inv.customerName}</span>
                    {inv.source === 'simulated' && (
                      <span className="px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-500">
                        Mô phỏng
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-num mt-0.5">
                    Tổng VAT {inv.vatRatePercent}%: {formatVnd(inv.totalVnd)} · Đã thu: {formatVnd(inv.paidAmountVnd)} · Còn nợ:{' '}
                    <strong className={remain > 0 ? 'text-rose-500' : 'text-emerald-500'}>{formatVnd(remain)}</strong> · Hạn:{' '}
                    {inv.dueDate}
                  </div>
                </div>
                {remain > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => sendInvoicePaymentReminder(inv.id)}
                      className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-500 text-[11px] font-semibold cursor-pointer"
                    >
                      Nhắc nợ ({inv.reminderCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => recordInvoicePayment(inv.id, remain)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Ghi nhận đã thu đủ
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-500">ĐÃ ĐỐI SOÁT ĐỦ</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {crmTab === 'refunds_nps' && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 space-y-2">
            <div className="text-xs font-bold">Đề xuất Hoàn tiền mới (Luôn qua CEO duyệt)</div>
            <div className="flex flex-wrap gap-2">
              <select
                value={rOrderId}
                onChange={(e) => setROrderId(e.target.value)}
                className="text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1.5"
              >
                {salesOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} – {o.customerName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={rAmount}
                onChange={(e) => setRAmount(e.target.value)}
                placeholder="Số tiền hoàn"
                className="w-32 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1.5 font-mono-num"
              />
              <input
                type="text"
                value={rReason}
                onChange={(e) => setRReason(e.target.value)}
                placeholder="Lý do hoàn tiền..."
                className="flex-1 min-w-[160px] text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!rOrderId || !rReason.trim()) return;
                  await createRefundRequest({ orderId: rOrderId, amountVnd: Number(rAmount) || 0, reason: rReason.trim() });
                  setRReason('');
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
              >
                Gửi CEO duyệt
              </button>
            </div>
            {refundRequests.map((rf) => (
              <div
                key={rf.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-xs"
              >
                <div>
                  <strong>{rf.code}</strong> · {rf.customerName} · <span className="font-mono-num text-rose-500">{formatVnd(rf.amountVnd)}</span>
                  <div className="text-[11px] text-slate-400">{rf.reason} · Trạng thái: {rf.status}</div>
                </div>
                {rf.status === 'pending_ceo' && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => resolveRefundRequest(rf.id, 'refunded')}
                      className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] cursor-pointer"
                    >
                      Duyệt & Hoàn
                    </button>
                    <button
                      type="button"
                      onClick={() => resolveRefundRequest(rf.id, 'rejected')}
                      className="px-2 py-1 rounded bg-slate-700 text-white text-[11px] cursor-pointer"
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 space-y-2">
            <div className="text-xs font-bold">Ghi nhận Khảo sát NPS (0–10) & CSAT</div>
            <div className="flex flex-wrap gap-2">
              <select
                value={sCustId}
                onChange={(e) => setSCustId(e.target.value)}
                className="text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1.5"
              >
                {customerAccounts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={10}
                value={sScore}
                onChange={(e) => setSScore(e.target.value)}
                className="w-20 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1.5 font-mono-num"
              />
              <input
                type="text"
                value={sComment}
                onChange={(e) => setSComment(e.target.value)}
                placeholder="Phản hồi khách hàng..."
                className="flex-1 min-w-[160px] text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5"
              />
              <button
                type="button"
                onClick={async () => {
                  const cust = customerAccounts.find((c) => c.id === sCustId);
                  if (!cust) return;
                  await addCustomerSurvey({
                    customerId: cust.id,
                    customerName: cust.name,
                    kind: 'nps',
                    score: Math.min(10, Math.max(0, Number(sScore) || 8)),
                    comment: sComment.trim() || 'Hài lòng với chất lượng hỗ trợ.',
                    source: 'manual',
                  });
                  setSComment('');
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold cursor-pointer"
              >
                Lưu NPS
              </button>
            </div>
            {customerSurveys.map((sv) => (
              <div key={sv.id} className="text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60">
                <strong>{sv.customerName}</strong> · <span className="font-mono-num text-emerald-500">NPS {sv.score}/10</span> — {sv.comment}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="absolute inset-0 z-20 bg-slate-950/75 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 space-y-3 max-h-[90%] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm">{selectedLead.name}</h4>
                  {(selectedLead.origin === 'simulated' ||
                    selectedLead.source.toLowerCase().includes('mô phỏng')) && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 text-[10px] font-semibold">
                      MÔ PHỎNG
                    </span>
                  )}
                  {selectedLead.externalRefId && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[10px] font-mono-num font-semibold">
                      Đã đồng bộ HubCW #{selectedLead.externalRefId}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {selectedLead.category} · {selectedLead.address}, {selectedLead.province} · Nguồn: {selectedLead.source}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedLead(null)} className="p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900">
                <span className="text-slate-400">Liên hệ: </span>
                <span className="font-medium">{selectedLead.phone || selectedLead.email || 'Chưa có'}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900">
                <span className="text-slate-400">Điểm chấm: </span>
                <span className="font-mono-num font-bold text-emerald-500">{selectedLead.score}/100</span>
              </div>
            </div>

            <div className="text-xs p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900">
              <strong>Lý do chấm điểm:</strong> {selectedLead.scoreReason}
            </div>

            <div>
              <div className="text-xs font-semibold mb-1">Lịch sử tương tác ({selectedLead.interactions.length})</div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {selectedLead.interactions.length === 0 && (
                  <div className="text-[11px] text-slate-400">Chưa có tương tác nào.</div>
                )}
                {selectedLead.interactions.map((i) => (
                  <div key={i.id} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-[11px]">
                    <div className="font-semibold">
                      {i.channel} ({i.direction}) {i.dryRun ? '· DRY_RUN' : ''}
                    </div>
                    <div className="text-slate-500 dark:text-slate-300 mt-0.5">{i.content}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleQuickOutreach(selectedLead)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi tin SDR ngay</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await toggleLeadBlacklist(selectedLead.id);
                  setSelectedLead((prev) => (prev ? { ...prev, blacklisted: !prev.blacklisted } : null));
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-500/40 text-rose-500 text-xs font-semibold cursor-pointer"
              >
                <ShieldBan className="w-3.5 h-3.5" />
                <span>{selectedLead.blacklisted ? 'Bỏ Blacklist' : 'Đưa vào Blacklist'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
