import { useState } from 'react';
import { Download, Send, ShieldBan, X } from 'lucide-react';
import { getProductById, PRODUCTS } from '../../config/products';
import { executeAgentTool } from '../../engine/tools';
import { useCompanyStore } from '../../store/useCompanyStore';
import { LeadItem, LeadStage } from '../../types';

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
  const moveLeadStage = useCompanyStore((s) => s.moveLeadStage);
  const toggleLeadBlacklist = useCompanyStore((s) => s.toggleLeadBlacklist);

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [productFilter, setProductFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-hidden relative">
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
                  <td className="p-2.5 font-medium">{l.name}</td>
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

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="absolute inset-0 z-20 bg-slate-950/75 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 space-y-3 max-h-[90%] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm">{selectedLead.name}</h4>
                <p className="text-xs text-slate-400">
                  {selectedLead.category} · {selectedLead.address}, {selectedLead.province}
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
