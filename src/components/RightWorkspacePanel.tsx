import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Briefcase,
  CheckSquare,
  ChevronDown,
  FileText,
  GitBranch,
  Key,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  Megaphone,
  MessageSquare,
  Palette,
  Plug,
  Receipt,
  Scale,
  ScrollText,
  Settings,
  Shield,
  Smartphone,
  Target,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { RightPanelTab, useCompanyStore } from '../store/useCompanyStore';
import { ChatPanel } from './panels/ChatPanel';
import { ExecutiveDashboardPanel } from './panels/ExecutiveDashboardPanel';
import { HelpdeskPanel } from './panels/HelpdeskPanel';
import { EngineeringOpsPanel } from './panels/EngineeringOpsPanel';
import { OfficeEditorPanel } from './panels/OfficeEditorPanel';
import { MarketingChannelsPanel } from './panels/MarketingChannelsPanel';
import { AffiliatePanel } from './panels/AffiliatePanel';
import { LegalPanel } from './panels/LegalPanel';
import { TaskBoardPanel } from './panels/TaskBoardPanel';
import { CrmPanel } from './panels/CrmPanel';
import { LogsPanel } from './panels/LogsPanel';
import { DocsPanel } from './panels/DocsPanel';
import { ApprovalsPanel } from './panels/ApprovalsPanel';
import { FinanceAccountingPanel } from './panels/FinanceAccountingPanel';
import { HubCwConnectorPanel } from './panels/HubCwConnectorPanel';
import { SystemHealthPanel } from './panels/SystemHealthPanel';
import { HrManagementPanel } from './panels/HrManagementPanel';
import { VaultPanel } from './panels/VaultPanel';
import { TokenKpiPanel } from './panels/TokenKpiPanel';
import { CharacterCustomizerPanel } from './panels/CharacterCustomizerPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { OkrStrategyPanel } from './panels/OkrStrategyPanel';
import { ProductBankPanel } from './panels/ProductBankPanel';
import { CollabOpsPanel } from './panels/CollabOpsPanel';
import { DeviceFarmPanel } from './panels/DeviceFarmPanel';

interface TabDef {
  id: RightPanelTab;
  label: string;
  shortLabel: string;
  icon: typeof MessageSquare;
}

const PRIMARY_TABS: TabDef[] = [
  { id: 'ceo_dashboard', label: 'Dashboard CEO', shortLabel: 'Dashboard', icon: LayoutDashboard },
  { id: 'chat', label: 'Chat', shortLabel: 'Chat', icon: MessageSquare },
  { id: 'crm', label: 'CRM & Hóa đơn', shortLabel: 'CRM', icon: Briefcase },
  { id: 'helpdesk', label: 'CSKH & Ticket', shortLabel: 'CSKH', icon: LifeBuoy },
  { id: 'engineering', label: 'Kỹ thuật & SP', shortLabel: 'Kỹ thuật', icon: Wrench },
  { id: 'marketing', label: 'Marketing & SEO', shortLabel: 'Marketing', icon: Megaphone },
  { id: 'finance', label: 'Kế toán & Thuế', shortLabel: 'Kế toán', icon: Receipt },
  { id: 'approvals', label: 'Phê duyệt', shortLabel: 'Duyệt', icon: CheckSquare },
  { id: 'office_editor', label: 'Sửa VP 3D/2D', shortLabel: 'Sửa VP', icon: LayoutGrid },
  { id: 'settings', label: 'Cài đặt', shortLabel: 'Cài đặt', icon: Settings },
];

const OVERFLOW_GROUPS: Array<{ groupLabel: string; tabs: TabDef[] }> = [
  {
    groupLabel: 'Tăng trưởng & Bán hàng',
    tabs: [
      { id: 'affiliate', label: 'Affiliate Tầng 3', shortLabel: 'Affiliate', icon: TrendingUp },
      { id: 'products_bank', label: 'Sản phẩm & Ngân hàng', shortLabel: 'SP & NH', icon: Landmark },
    ],
  },
  {
    groupLabel: 'Điều hành & Nhân sự',
    tabs: [
      { id: 'tasks', label: 'Task Board', shortLabel: 'Task', icon: ListChecks },
      { id: 'strategy', label: 'OKR & Chiến lược', shortLabel: 'OKR', icon: Target },
      { id: 'collab', label: 'Chất lượng, Bàn giao & Kho', shortLabel: 'Chất lượng', icon: GitBranch },
      { id: 'rbac', label: 'Nhân sự & Hành chính', shortLabel: 'Nhân sự', icon: Shield },
    ],
  },
  {
    groupLabel: 'Pháp chế & Kết nối',
    tabs: [
      { id: 'legal', label: 'Pháp chế, Rủi ro & PDPA', shortLabel: 'Pháp chế', icon: Scale },
      { id: 'hubcw', label: 'HubCW, Webhooks & BCP', shortLabel: 'HubCW', icon: Plug },
      { id: 'devices', label: 'Thiết bị Android (USB)', shortLabel: 'Thiết bị', icon: Smartphone },
    ],
  },
  {
    groupLabel: 'Hệ thống & Dữ liệu',
    tabs: [
      { id: 'health', label: 'Sức khỏe 24/7 & Go-Live', shortLabel: 'Hệ thống', icon: Activity },
      { id: 'docs', label: 'Kho tài liệu', shortLabel: 'Tài liệu', icon: FileText },
      { id: 'logs', label: 'Nhật ký hoạt động', shortLabel: 'Nhật ký', icon: ScrollText },
      { id: 'vault', label: 'Tài khoản & Vault', shortLabel: 'Vault', icon: Key },
      { id: 'tokens', label: 'Chi phí token', shortLabel: 'Token', icon: BarChart3 },
      { id: 'customizer', label: 'Tùy chỉnh 3D nhân vật', shortLabel: '3D Chibi', icon: Palette },
    ],
  },
];

const ALL_OVERFLOW_TABS = OVERFLOW_GROUPS.flatMap((g) => g.tabs);

export function RightWorkspacePanel() {
  const activeTab = useCompanyStore((s) => s.activeTab);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const approvals = useCompanyStore((s) => s.approvals);
  const askCeoQuestions = useCompanyStore((s) => s.askCeoQuestions);
  const marketingChannels = useCompanyStore((s) => s.marketingChannels);
  const expenses = useCompanyStore((s) => s.expenses);
  const supportTickets = useCompanyStore((s) => s.supportTickets);
  const engineeringIncidents = useCompanyStore((s) => s.engineeringIncidents);

  const [width, setWidth] = useState(580);
  const [moreOpen, setMoreOpen] = useState(false);
  const dragging = useRef(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const waitingOtpCount = marketingChannels.filter((c) => c.status === 'waiting_ceo_otp').length;
  const pendingApprovals =
    approvals.filter((a) => a.status === 'pending').length +
    askCeoQuestions.filter((q) => q.status === 'pending' || q.status === 'reminded').length;
  const pendingExpenses = expenses.filter(
    (e) => e.status === 'pending_ceo' || e.status === 'pending_accountant'
  ).length;
  const openTickets = supportTickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;
  const openIncidents = engineeringIncidents.filter((i) => i.status !== 'resolved').length;

  const activeOverflowTab = ALL_OVERFLOW_TABS.find((t) => t.id === activeTab);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.min(920, Math.max(420, window.innerWidth - ev.clientX));
      setWidth(next);
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <aside
      style={{ width }}
      className="relative shrink-0 h-full max-w-[92vw] flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 z-20"
    >
      {/* Drag Resize Handle */}
      <div
        onMouseDown={startResize}
        title="Kéo để đổi kích thước bảng điều khiển"
        className="absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-col-resize hover:bg-sky-500/60 transition-colors z-30"
      />

      {/* Tabs Navigation */}
      <div className="px-2 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const badgeNum =
              tab.id === 'approvals'
                ? pendingApprovals
                : tab.id === 'finance'
                ? pendingExpenses
                : tab.id === 'helpdesk'
                ? openTickets
                : tab.id === 'engineering'
                ? openIncidents
                : tab.id === 'marketing'
                ? waitingOtpCount
                : 0;
            return (
              <button
                key={tab.id}
                type="button"
                title={tab.label}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMoreOpen(false);
                }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11.5px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{width >= 720 ? tab.label : tab.shortLabel}</span>
                {badgeNum > 0 && (
                  <span className="font-mono-num text-[10px] font-bold opacity-90">
                    ({badgeNum})
                  </span>
                )}
              </button>
            );
          })}

          {/* Categorized Overflow "Thêm ▾" Menu */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              title="Các module mở rộng theo nhóm"
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11.5px] font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                activeOverflowTab
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <span>{activeOverflowTab ? activeOverflowTab.shortLabel : 'Thêm'}</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            </button>

            {moreOpen && (
              <div className="absolute right-0 mt-1.5 w-64 max-h-[75vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-2 z-50 space-y-2">
                {OVERFLOW_GROUPS.map((grp) => (
                  <div key={grp.groupLabel} className="space-y-0.5">
                    <div className="px-2 py-0.5 text-[10.5px] font-semibold text-slate-400">
                      {grp.groupLabel}
                    </div>
                    {grp.tabs.map((tab) => {
                      const Icon = tab.icon;
                      const active = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.id);
                            setMoreOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-sky-600 text-white'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Tab Body */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'ceo_dashboard' && <ExecutiveDashboardPanel />}
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'marketing' && <MarketingChannelsPanel />}
        {activeTab === 'affiliate' && <AffiliatePanel />}
        {activeTab === 'legal' && <LegalPanel />}
        {activeTab === 'tasks' && <TaskBoardPanel />}
        {activeTab === 'crm' && <CrmPanel />}
        {activeTab === 'helpdesk' && <HelpdeskPanel />}
        {activeTab === 'engineering' && <EngineeringOpsPanel />}
        {activeTab === 'office_editor' && <OfficeEditorPanel />}
        {activeTab === 'logs' && <LogsPanel />}
        {activeTab === 'docs' && <DocsPanel />}
        {activeTab === 'approvals' && <ApprovalsPanel />}
        {activeTab === 'finance' && <FinanceAccountingPanel />}
        {activeTab === 'hubcw' && <HubCwConnectorPanel />}
        {activeTab === 'strategy' && <OkrStrategyPanel />}
        {activeTab === 'products_bank' && <ProductBankPanel />}
        {activeTab === 'collab' && <CollabOpsPanel />}
        {activeTab === 'devices' && <DeviceFarmPanel />}
        {activeTab === 'health' && <SystemHealthPanel />}
        {activeTab === 'rbac' && <HrManagementPanel />}
        {activeTab === 'vault' && <VaultPanel />}
        {activeTab === 'tokens' && <TokenKpiPanel />}
        {activeTab === 'customizer' && <CharacterCustomizerPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>
    </aside>
  );
}
