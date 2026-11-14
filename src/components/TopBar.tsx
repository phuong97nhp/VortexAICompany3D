import { useState } from 'react';
import {
  Bell,
  Bot,
  ChevronDown,
  Moon,
  OctagonAlert,
  Pause,
  Play,
  Rocket,
  ShieldAlert,
  Sun,
  Zap,
} from 'lucide-react';
import { PRODUCTS } from '../config/products';
import { runAutopilotCycle, runCampaignDemoScenario } from '../engine/orchestrator';
import { useCompanyStore } from '../store/useCompanyStore';
import { AutonomyLevel } from '../types';

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
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const clearNotifications = useCompanyStore((s) => s.clearNotifications);

  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;
  const pendingQuestions = askCeoQuestions.filter((q) => q.status === 'pending' || q.status === 'reminded').length;
  const totalAlerts = pendingApprovals + pendingQuestions;

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
    <header className="h-13 shrink-0 z-30 flex items-center justify-between gap-3 px-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-slate-100">
      {/* Left Zone */}
      <div className="flex items-center gap-2.5 min-w-0">
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
          className={`hidden xl:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 border cursor-pointer ${
            isLiveBrain
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
          }`}
          title="Bấm để cấu hình Bộ não AI"
        >
          {activeBrainLabel}
          {settings.dryRun ? ' · DRY_RUN' : ' · LIVE OUTBOUND'}
        </button>
      </div>

      {/* Center Zone */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <div className="relative">
          <button
            type="button"
            onClick={() => setDemoMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Chạy demo 30 ngày</span>
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors ${
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

        <div className="hidden lg:flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-0.5">
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

        <div className="hidden md:flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-0.5">
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
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
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
          onClick={() => {
            clearNotifications();
            setActiveTab('approvals');
          }}
          className="relative p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          title="Phê duyệt & Câu hỏi Hỏi CEO"
        >
          <Bell className="w-4 h-4" />
          {totalAlerts > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
              {totalAlerts}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleRightPanel}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap cursor-pointer"
        >
          Bảng điều khiển
        </button>
      </div>
    </header>
  );
}
