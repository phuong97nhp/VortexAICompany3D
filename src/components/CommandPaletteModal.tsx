import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Building2,
  CheckSquare,
  LayoutDashboard,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { RightPanelTab, useCompanyStore } from '../store/useCompanyStore';

interface PaletteItem {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  onSelect: () => void;
}

const TAB_ITEMS: Array<{ tab: RightPanelTab; title: string; subtitle: string }> = [
  { tab: 'ceo_dashboard', title: 'Dashboard CEO Toàn cảnh', subtitle: 'KPI doanh thu, công nợ AR, ticket SLA, sự cố & báo cáo HĐQT' },
  { tab: 'chat', title: 'Chat & Phòng làm việc', subtitle: 'Trao đổi trực tiếp với COO, CFO, Pháp chế và nhân sự AI' },
  { tab: 'crm', title: 'CRM · Khách hàng · Báo giá · Hóa đơn', subtitle: 'Pipeline lead, báo giá, đơn hàng, thu tiền, hoàn tiền & NPS' },
  { tab: 'helpdesk', title: 'CSKH / Helpdesk & Onboarding', subtitle: 'Ticket SLA, Leo thang kỹ thuật, Knowledge Base & Onboarding' },
  { tab: 'engineering', title: 'Kỹ thuật & Sản phẩm', subtitle: 'Roadmap, Releases, Sự cố/Post-mortem & Tài sản bảo mật' },
  { tab: 'marketing', title: 'Marketing & Growth / SEO', subtitle: 'Kênh mạng xã hội, Asset library, Case study, SEO & Sự kiện' },
  { tab: 'finance', title: 'Tài chính · Sổ cái GL · P&L · Thuế', subtitle: 'Phiếu chi, Sổ cái kế toán, P&L, Dòng tiền 90 ngày & Hỗ trợ VAT' },
  { tab: 'legal', title: 'Pháp chế · Rủi ro · PDPA NĐ 13/2023', subtitle: 'Hợp đồng 2 bên, Risk Register, Nhật ký dữ liệu & DSAR' },
  { tab: 'office_editor', title: 'Chỉnh sửa Văn phòng 3D / 2D', subtitle: 'Kéo thả phòng ban, bàn ghế, 4 preset mẫu, Undo/Redo, JSON' },
  { tab: 'devices', title: 'Thiết bị Android (USB ADB)', subtitle: 'Quản lý điện thoại USB, danh sách ứng dụng cấm & điều khiển an toàn' },
  { tab: 'hubcw', title: 'Kết nối Hub.ChuyenWeb & Webhook/BCP', subtitle: 'Đồng bộ API thật, Read-Only/Live, Webhooks, BCP/DRP & Xóa Mô phỏng' },
  { tab: 'approvals', title: 'Phê duyệt CEO & Hỏi CEO', subtitle: 'Các quyết định cần CEO ký duyệt ngay' },
  { tab: 'tasks', title: 'Bảng Công việc (Task Board)', subtitle: 'Theo dõi tiến độ & điều phối tác vụ' },
  { tab: 'affiliate', title: 'Khối Affiliate Tầng 3', subtitle: 'Săn hàng Win, đối soát hoa hồng & kênh affiliate' },
  { tab: 'strategy', title: 'OKR & Đổi mới Kiếm tiền', subtitle: 'Mục tiêu doanh thu, Brainstorm khi rảnh & đối thủ' },
  { tab: 'products_bank', title: 'Sản phẩm & Tài khoản Ngân hàng', subtitle: 'Danh mục sản phẩm, số dư & giao dịch đối soát' },
  { tab: 'collab', title: 'Chất lượng, Bàn giao & Kho kiến thức', subtitle: 'Handover tickets, QA review & bài học rút ra' },
  { tab: 'rbac', title: 'Nhân sự, Nghỉ phép & Hành chính', subtitle: 'Tuyển/cắt giảm agent, sơ đồ tầng, phép năm, đặt phòng & SaaS' },
  { tab: 'health', title: 'Sức khỏe 24/7 & Go-Live', subtitle: 'Giám sát runtime, sao lưu & phục hồi dữ liệu' },
  { tab: 'docs', title: 'Kho Tài liệu', subtitle: 'Tài liệu, báo cáo & hợp đồng đã xuất' },
  { tab: 'logs', title: 'Nhật ký Hoạt động', subtitle: 'Lịch sử thao tác & tool calls của hệ thống' },
  { tab: 'vault', title: 'Tài khoản & Vault', subtitle: 'Quản lý thông tin đăng nhập đã che dấu' },
  { tab: 'tokens', title: 'Chi phí Token & KPI', subtitle: 'Theo dõi lượng token AI & hiệu suất' },
  { tab: 'customizer', title: 'Tùy chỉnh Ngoại hình 3D', subtitle: 'Tóc, trang phục, đồng phục & logo trên nhân vật 3D' },
  { tab: 'settings', title: 'Cài đặt Hệ thống & Bản địa hóa', subtitle: 'AI Providers, Zalo, Giờ làm việc, Ngày lễ, Âm thanh & Cỡ chữ' },
];

export function CommandPaletteModal({ onOpenRightPanel }: { onOpenRightPanel: () => void }) {
  const open = useCompanyStore((s) => s.commandPaletteOpen);
  const setOpen = useCompanyStore((s) => s.setCommandPaletteOpen);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const agents = useCompanyStore((s) => s.agents);
  const departments = useCompanyStore((s) => s.departments);
  const approvals = useCompanyStore((s) => s.approvals);
  const selectAgent = useCompanyStore((s) => s.selectAgent);
  const selectRoom = useCompanyStore((s) => s.selectRoom);
  const runRandomSpotCheck = useCompanyStore((s) => s.runRandomSpotCheck);
  const setMonitorWallOpen = useCompanyStore((s) => s.setMonitorWallOpen);
  const generateWeeklyBoardReport = useCompanyStore((s) => s.generateWeeklyBoardReport);
  const setHelpGuideOpen = useCompanyStore((s) => s.setHelpGuideOpen);
  const settings = useCompanyStore((s) => s.settings);
  const updateSettings = useCompanyStore((s) => s.updateSettings);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const all: PaletteItem[] = [];

    for (const t of TAB_ITEMS) {
      all.push({
        id: `tab-${t.tab}`,
        group: 'Mở Tab Quản trị',
        title: t.title,
        subtitle: t.subtitle,
        onSelect: () => {
          onOpenRightPanel();
          setActiveTab(t.tab);
          setOpen(false);
        },
      });
    }

    all.push(
      {
        id: 'act-spotcheck',
        group: 'Tác vụ nhanh',
        title: 'Kiểm tra bất chợt 1 nhân sự đang làm việc',
        subtitle: 'Spot-Check màn hình thật ngẫu nhiên',
        onSelect: () => {
          runRandomSpotCheck('ceo');
          setOpen(false);
        },
      },
      {
        id: 'act-monitorwall',
        group: 'Tác vụ nhanh',
        title: 'Mở Tường Giám sát nhiều màn hình',
        subtitle: 'Xem đồng thời 6–9 màn hình nhân sự',
        onSelect: () => {
          setMonitorWallOpen(true);
          setOpen(false);
        },
      },
      {
        id: 'act-weekly-report',
        group: 'Tác vụ nhanh',
        title: 'Tạo Báo cáo Hội đồng Quản trị Tuần',
        subtitle: 'Tổng hợp số liệu CRM, Tài chính, Ticket & Sự cố thật',
        onSelect: () => {
          void generateWeeklyBoardReport();
          onOpenRightPanel();
          setActiveTab('ceo_dashboard');
          setOpen(false);
        },
      },
      {
        id: 'act-audio',
        group: 'Tác vụ nhanh',
        title: settings.ambientAudioEnabled ? 'Tắt âm thanh văn phòng nền' : 'Bật âm thanh văn phòng nền',
        subtitle: 'Âm thanh tổng hợp nhẹ nhàng (Web Audio API)',
        onSelect: () => {
          void updateSettings({ ambientAudioEnabled: !settings.ambientAudioEnabled });
          setOpen(false);
        },
      },
      {
        id: 'act-help',
        group: 'Tác vụ nhanh',
        title: 'Mở Hướng dẫn sử dụng nhanh',
        subtitle: 'Phím tắt, Quy trình ERP & Kết nối thiết bị',
        onSelect: () => {
          setOpen(false);
          setHelpGuideOpen(true);
        },
      }
    );

    for (const app of approvals.filter((a) => a.status === 'pending').slice(0, 8)) {
      all.push({
        id: `apr-${app.id}`,
        group: 'Phê duyệt chờ CEO',
        title: app.title,
        subtitle: `Đề xuất bởi ${app.requestedBy}${app.amountVnd ? ` · ${app.amountVnd.toLocaleString('vi-VN')}đ` : ''}`,
        onSelect: () => {
          onOpenRightPanel();
          setActiveTab('approvals');
          setOpen(false);
        },
      });
    }

    for (const ag of agents.filter((a) => a.employmentStatus !== 'archived')) {
      all.push({
        id: `ag-${ag.id}`,
        group: 'Nhân sự 3D',
        title: ag.name,
        subtitle: `${ag.title} · Tầng ${ag.floor}`,
        onSelect: () => {
          selectAgent(ag.id, true);
          setOpen(false);
        },
      });
    }

    for (const d of departments) {
      all.push({
        id: `room-${d.roomId}`,
        group: 'Phòng ban 3D',
        title: d.name,
        subtitle: `Tầng ${d.floor} · ${d.shortName}`,
        onSelect: () => {
          selectRoom(d.roomId);
          setOpen(false);
        },
      });
    }

    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, 22);
    return all
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q)
      )
      .slice(0, 25);
  }, [
    query,
    agents,
    departments,
    approvals,
    settings.ambientAudioEnabled,
    onOpenRightPanel,
    setActiveTab,
    setOpen,
    selectAgent,
    selectRoom,
    runRandomSpotCheck,
    setMonitorWallOpen,
    generateWeeklyBoardReport,
    setHelpGuideOpen,
    updateSettings,
  ]);

  if (!open) return null;

  const safeIdx = Math.min(selectedIndex, Math.max(0, items.length - 1));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-slate-950/75 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-sky-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => (items.length ? (i + 1) % items.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
              } else if (e.key === 'Enter' && items[safeIdx]) {
                e.preventDefault();
                items[safeIdx].onSelect();
              }
            }}
            placeholder="Tìm nhanh tab, nhân sự, phòng ban, việc chờ duyệt hoặc lệnh nhanh... (Esc để đóng)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Không tìm thấy mục phù hợp với &ldquo;{query}&rdquo;.
            </div>
          ) : (
            items.map((item, idx) => {
              const active = idx === safeIdx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={item.onSelect}
                  className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                    active ? 'bg-sky-600/15 dark:bg-sky-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.group.includes('Tab') ? (
                      <LayoutDashboard className="w-4 h-4 text-sky-500 shrink-0" />
                    ) : item.group.includes('Nhân sự') ? (
                      <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : item.group.includes('Phòng') ? (
                      <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    ) : item.group.includes('Phê duyệt') ? (
                      <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{item.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.subtitle}</div>
                    </div>
                  </div>
                  <span className="text-[10.5px] text-slate-400 whitespace-nowrap shrink-0">
                    {item.group}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-sky-500" />
            <span>Mẹo: Nhấn ↑ ↓ để chọn, Enter để mở nhanh</span>
          </div>
          <span className="font-mono-num">Ctrl+K / Cmd+K</span>
        </div>
      </div>
    </div>
  );
}
