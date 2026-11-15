import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Bell,
  Bot,
  ChevronDown,
  Command,
  Eye,
  HelpCircle,
  LayoutDashboard,
  Monitor,
  Moon,
  OctagonAlert,
  Pause,
  Play,
  Rocket,
  ShieldAlert,
  Sun,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { PRODUCTS } from '../config/products';
import { runAutopilotCycle, runCampaignDemoScenario } from '../engine/orchestrator';
import { useCompanyStore } from '../store/useCompanyStore';
import { AutonomyLevel } from '../types';
import { PWAInstallButton } from './pwa/PWAInstallButton';

export function TopBar({
  onToggleLeftSidebar,
  onToggleRightPanel,
  onOpenSecurityModal,
}: {
  onToggleLeftSidebar: () => void;
  onToggleRightPanel: () => void;
  onOpenSecurityModal: () => void;
}) {
  const settings = useCompanyStore((s) => s.settings);
  const updateSettings = useCompanyStore((s) => s.updateSettings);
  const triggerKillSwitch = useCompanyStore((s) => s.triggerKillSwitch);
  const resumeFromKillSwitch = useCompanyStore((s) => s.resumeFromKillSwitch);
  const serverHealth = useCompanyStore((s) => s.serverHealth);
  const approvals = useCompanyStore((s) => s.approvals);
  const askCeoQuestions = useCompanyStore((s) => s.askCeoQuestions);
  const expenses = useCompanyStore((s) => s.expenses);
  const supportTickets = useCompanyStore((s) => s.supportTickets);
  const engineeringIncidents = useCompanyStore((s) => s.engineeringIncidents);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const clearNotifications = useCompanyStore((s) => s.clearNotifications);
  const runRandomSpotCheck = useCompanyStore((s) => s.runRandomSpotCheck);
  const setMonitorWallOpen = useCompanyStore((s) => s.setMonitorWallOpen);
  const setCommandPaletteOpen = useCompanyStore((s) => s.setCommandPaletteOpen);
  const setHelpGuideOpen = useCompanyStore((s) => s.setHelpGuideOpen);

  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;
  const pendingQuestions = askCeoQuestions.filter((q) => q.status === 'pending' || q.status === 'reminded').length;
  const pendingCeoExpenses = expenses.filter((e) => e.status === 'pending_ceo').length;
  const openTickets = supportTickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length;
  const openIncidents = engineeringIncidents.filter((i) => i.status !== 'resolved').length;
  const totalAlerts = pendingApprovals + pendingQuestions + pendingCeoExpenses + openIncidents;

  const geminiReady = Boolean(serverHealth?.hasGeminiEnvKey || settings.geminiApiKey?.trim());
  const deepseekReady = Boolean(serverHealth?.hasDeepSeekEnvKey || settings.deepseekApiKey?.trim());
  const localReady = Boolean(settings.localBaseUrl?.trim() && settings.localModel?.trim());

  const activeBrainLabel =
    settings.primaryProvider === 'gemini' && geminiReady
      ? 'Gemini AI'
      : settings.primaryProvider === 'deepseek' && deepseekReady
      ? 'DeepSeek AI'
      : settings.primaryProvider === 'local' && localReady
      ? `Local (${settings.localModel})`
      : 'Chế độ Mô phỏng';

  const isLiveBrain = activeBrainLabel !== 'Chế độ Mô phỏng';

  const handleToggleAutopilot = async () => {
    if (settings.killSwitchActive) return;
    const nextVal = !settings.autopilotEnabled;
    await updateSettings({ autopilotEnabled: nextVal });
    if (nextVal) {
      runAutopilotCycle();
    }
  };

  return (
    <header className="h-13 shrink-0 z-30 flex items-center justify-between gap-2 px-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Left Zone */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleLeftSidebar}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          title="Ẩn/Hiện Sơ đồ tổ chức"
        >
          Tổ chức
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center text-white shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight whitespace-nowrap truncate">
            {settings.companyName}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`hidden 2xl:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 border cursor-pointer ${
            isLiveBrain
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
          }`}
          title="Bấm để cấu hình Bộ não AI"
        >
          {activeBrainLabel} · {settings.dryRun ? 'DRY_RUN' : 'LIVE'}
        </button>
      </div>

      {/* Center Zone */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('ceo_dashboard')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          title="Mở Dashboard CEO Toàn cảnh"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Dashboard CEO</span>
        </button>

        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
          title="Tìm nhanh (Ctrl+K)"
        >
          <Command className="w-3.5 h-3.5 text-sky-500" />
          <span className="hidden xl:inline">Tìm nhanh</span>
          <span className="text-[10px] font-mono-num text-slate-400">Ctrl+K</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setDemoMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Demo 30 ngày</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {demoMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 z-50">
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Chọn sản phẩm ra mắt chiến dịch 30 ngày
              </div>
              {PRODUCTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setDemoMenuOpen(false);
                    runCampaignDemoScenario(p.id);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {p.code} · {p.shortName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{p.tagline}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={settings.killSwitchActive}
          onClick={handleToggleAutopilot}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${
            settings.killSwitchActive
              ? 'bg-slate-200 dark:bg-slate-900 text-slate-400 border-slate-300 dark:border-slate-800 cursor-not-allowed opacity-70'
              : settings.autopilotEnabled
              ? 'bg-emerald-600 text-white border-emerald-500 cursor-pointer'
              : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer'
          }`}
          title={
            settings.killSwitchActive
              ? 'KILL SWITCH đang bật — hãy bấm Khôi phục trước khi bật Autopilot'
              : 'Tự động tìm 30 lead/ngày & chăm sóc khách hàng'
          }
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{settings.autopilotEnabled && !settings.killSwitchActive ? 'Autopilot: BẬT' : 'Autopilot: TẮT'}</span>
        </button>

        <button
          type="button"
          onClick={() => runRandomSpotCheck('ceo')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          title="Kiểm tra bất chợt màn hình làm việc 1 nhân sự ngẫu nhiên"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Soi ngẫu nhiên</span>
        </button>

        <button
          type="button"
          onClick={() => setMonitorWallOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
          title="Mở Tường Giám sát 6-9 màn hình nhân sự"
        >
          <Monitor className="w-3.5 h-3.5 text-sky-500" />
          <span className="hidden xl:inline">Tường GS</span>
        </button>

        <div className="hidden 2xl:flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-0.5">
          {([
            [1, '1 Đề xuất'],
            [2, '2 Cân bằng'],
            [3, '3 Tự chủ'],
          ] as Array<[AutonomyLevel, string]>).map(([lvl, label]) => (
            <button
              key={lvl}
              type="button"
              onClick={() => updateSettings({ autonomyLevel: lvl })}
              className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                settings.autonomyLevel === lvl
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-0.5">
          {([1, 2, 4] as const).map((sp) => (
            <button
              key={sp}
              type="button"
              onClick={() => updateSettings({ simulationSpeed: sp })}
              className={`px-2 py-1 rounded-md text-[11px] font-mono-num font-medium cursor-pointer ${
                settings.simulationSpeed === sp
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {sp}x
            </button>
          ))}
          <button
            type="button"
            onClick={() => updateSettings({ paused: !settings.paused })}
            className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1"
            title={settings.paused ? 'Tiếp tục' : 'Tạm dừng'}
          >
            {settings.paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Right Zone */}
      <div className="flex items-center gap-1.5 shrink-0">
        {settings.mustChangeDefaultPassword && (
          <button
            type="button"
            onClick={onOpenSecurityModal}
            className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
            title="Đổi mật khẩu mặc định của CEO"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Đổi MK CEO</span>
          </button>
        )}

        {settings.killSwitchActive ? (
          <button
            type="button"
            onClick={resumeFromKillSwitch}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Khôi phục</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={triggerKillSwitch}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
            title="Dừng toàn bộ AI Agent & Autopilot ngay lập tức"
          >
            <OctagonAlert className="w-3.5 h-3.5" />
            <span>KILL SWITCH</span>
          </button>
        )}

        <PWAInstallButton />

        <button
          type="button"
          onClick={() => updateSettings({ ambientAudioEnabled: !settings.ambientAudioEnabled })}
          className={`p-1.5 rounded-lg border cursor-pointer ${
            settings.ambientAudioEnabled
              ? 'border-sky-500/50 bg-sky-500/10 text-sky-500'
              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
          }`}
          title={settings.ambientAudioEnabled ? 'Tắt âm thanh văn phòng' : 'Bật âm thanh văn phòng nhẹ'}
        >
          {settings.ambientAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => updateSettings({ dayNightMode: settings.dayNightMode === 'day' ? 'night' : 'day' })}
          className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs whitespace-nowrap cursor-pointer"
          title="Chế độ Ngày / Đêm văn phòng 3D"
        >
          {settings.dayNightMode === 'day' ? 'Ngày 3D' : 'Đêm 3D'}
        </button>

        <button
          type="button"
          onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Đổi giao diện Sáng / Tối"
        >
          {settings.theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        <button
          type="button"
          onClick={() => setHelpGuideOpen(true)}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Hướng dẫn nhanh & Phím tắt"
        >
          <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-300" />
        </button>

        {/* Grouped Notification Center */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifMenuOpen((v) => !v)}
            className="relative p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Trung tâm Thông báo gộp nhóm"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded bg-rose-600 text-white text-[10px] font-bold font-mono-num flex items-center justify-center">
                {totalAlerts}
              </span>
            )}
          </button>

          {notifMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-2 z-50 space-y-1.5 text-xs">
              <div className="flex items-center justify-between px-2 py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold">Thông báo gộp nhóm</span>
                <button
                  type="button"
                  onClick={() => {
                    clearNotifications();
                    setNotifMenuOpen(false);
                  }}
                  className="text-[11px] text-sky-500 hover:underline cursor-pointer"
                >
                  Đánh dấu đã xem
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('approvals');
                  setNotifMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span>Phê duyệt & Hỏi CEO</span>
                <span className="font-mono-num font-bold text-rose-500">{pendingApprovals + pendingQuestions}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('finance');
                  setNotifMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span>Phiếu chi chờ CEO duyệt</span>
                <span className="font-mono-num font-bold text-amber-500">{pendingCeoExpenses}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('helpdesk');
                  setNotifMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span>Ticket CSKH đang mở</span>
                <span className="font-mono-num font-bold text-sky-500">{openTickets}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('engineering');
                  setNotifMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
              >
                <span>Sự cố Kỹ thuật chưa xử lý</span>
                <span className="font-mono-num font-bold text-rose-500">{openIncidents}</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap cursor-pointer ${
            settings.envMode === 'live'
              ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Mở Bảng Sức khỏe 24/7, Go-Live Checklist & Sao lưu"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">24/7</span>
        </button>

        <button
          type="button"
          onClick={onToggleRightPanel}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap cursor-pointer"
        >
          Bảng ĐK
        </button>
      </div>
    </header>
  );
}
