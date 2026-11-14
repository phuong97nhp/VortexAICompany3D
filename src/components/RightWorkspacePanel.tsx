import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Briefcase,
  CheckSquare,
  ChevronDown,
  FileText,
  Key,
  ListChecks,
  Megaphone,
  MessageSquare,
  Palette,
  ScrollText,
  Settings,
  Shield,
} from 'lucide-react';
import { RightPanelTab, useCompanyStore } from '../store/useCompanyStore';
import { ChatPanel } from './panels/ChatPanel';
import { MarketingChannelsPanel } from './panels/MarketingChannelsPanel';
import { TaskBoardPanel } from './panels/TaskBoardPanel';
import { CrmPanel } from './panels/CrmPanel';
import { LogsPanel } from './panels/LogsPanel';
import { DocsPanel } from './panels/DocsPanel';
import { ApprovalsPanel } from './panels/ApprovalsPanel';
import { RbacPanel } from './panels/RbacPanel';
import { VaultPanel } from './panels/VaultPanel';
import { TokenKpiPanel } from './panels/TokenKpiPanel';
import { CharacterCustomizerPanel } from './panels/CharacterCustomizerPanel';
import { SettingsPanel } from './panels/SettingsPanel';

interface TabDef {
  id: RightPanelTab;
  label: string;
  shortLabel: string;
  icon: typeof MessageSquare;
}

const PRIMARY_TABS: TabDef[] = [
  { id: 'chat', label: 'Chat', shortLabel: 'Chat', icon: MessageSquare },
  { id: 'marketing', label: 'Kênh & Marketing', shortLabel: 'Marketing', icon: Megaphone },
  { id: 'tasks', label: 'Task Board', shortLabel: 'Task Board', icon: ListChecks },
  { id: 'crm', label: 'CRM & Pipeline', shortLabel: 'CRM', icon: Briefcase },
  { id: 'approvals', label: 'Phê duyệt', shortLabel: 'Phê duyệt', icon: CheckSquare },
  { id: 'settings', label: 'Cài đặt', shortLabel: 'Cài đặt', icon: Settings },
];

const OVERFLOW_TABS: TabDef[] = [
  { id: 'logs', label: 'Nhật ký hoạt động', shortLabel: 'Nhật ký', icon: ScrollText },
  { id: 'docs', label: 'Kho tài liệu', shortLabel: 'Tài liệu', icon: FileText },
  { id: 'rbac', label: 'Nhân sự & Quyền', shortLabel: 'Nhân sự', icon: Shield },
  { id: 'vault', label: 'Tài khoản & Vault', shortLabel: 'Vault', icon: Key },
  { id: 'tokens', label: 'Chi phí token', shortLabel: 'Token KPI', icon: BarChart3 },
  { id: 'customizer', label: 'Tùy chỉnh 3D', shortLabel: '3D Chibi', icon: Palette },
];

export function RightWorkspacePanel() {
  const activeTab = useCompanyStore((s) => s.activeTab);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const approvals = useCompanyStore((s) => s.approvals);
  const askCeoQuestions = useCompanyStore((s) => s.askCeoQuestions);
  const marketingChannels = useCompanyStore((s) => s.marketingChannels);

  const [width, setWidth] = useState(520);
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

  const activeOverflowTab = OVERFLOW_TABS.find((t) => t.id === activeTab);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.min(820, Math.max(380, window.innerWidth - ev.clientX));
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
      className="relative shrink-0 h-full max-w-[92vw] flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-slate-100 z-20"
    >
      {/* Drag Resize Handle */}
      <div
        onMouseDown={startResize}
        title="Kéo để đổi kích thước bảng điều khiển"
        className="absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-col-resize hover:bg-sky-500/60 transition-colors z-30"
      />

      {/* Tabs Navigation: Primary Tabs + Overflow "Thêm ▾" Dropdown (zero clipping) */}
      <div className="px-2 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
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
                <span>{width >= 580 ? tab.label : tab.shortLabel}</span>
                {tab.id === 'approvals' && pendingApprovals > 0 && (
                  <span className="px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                    {pendingApprovals}
                  </span>
                )}
                {tab.id === 'marketing' && waitingOtpCount > 0 && (
                  <span className="px-1.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                    {waitingOtpCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* Overflow "Thêm ▾" Menu */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              title="Các tab quản trị khác (Nhật ký, Tài liệu, Nhân sự, Vault, Token, Tùy chỉnh 3D)"
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
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 z-50">
                {OVERFLOW_TABS.map((tab) => {
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
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
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
            )}
          </div>
        </div>
      </div>

      {/* Active Tab Body */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'marketing' && <MarketingChannelsPanel />}
        {activeTab === 'tasks' && <TaskBoardPanel />}
        {activeTab === 'crm' && <CrmPanel />}
        {activeTab === 'logs' && <LogsPanel />}
        {activeTab === 'docs' && <DocsPanel />}
        {activeTab === 'approvals' && <ApprovalsPanel />}
        {activeTab === 'rbac' && <RbacPanel />}
        {activeTab === 'vault' && <VaultPanel />}
        {activeTab === 'tokens' && <TokenKpiPanel />}
        {activeTab === 'customizer' && <CharacterCustomizerPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>
    </aside>
  );
}
