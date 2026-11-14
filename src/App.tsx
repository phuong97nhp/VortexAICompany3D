import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, RotateCcw, Trash2, WifiOff, X } from 'lucide-react';
import { AgentProfileModal } from './components/AgentProfileModal';
import { CeoSecurityModal } from './components/CeoSecurityModal';
import { LeftOrgSidebar } from './components/LeftOrgSidebar';
import { OnboardingWizardModal } from './components/OnboardingWizardModal';
import { OfficeScene3D } from './components/office3d/OfficeScene3D';
import { RightWorkspacePanel } from './components/RightWorkspacePanel';
import { TopBar } from './components/TopBar';
import { startBackgroundSchedulers } from './engine/orchestrator';
import { RightPanelTab, useCompanyStore } from './store/useCompanyStore';

export default function App() {
  const init = useCompanyStore((s) => s.init);
  const retryBoot = useCompanyStore((s) => s.retryBoot);
  const bootStatus = useCompanyStore((s) => s.bootStatus);
  const bootError = useCompanyStore((s) => s.bootError);
  const realtimeStatus = useCompanyStore((s) => s.realtimeStatus);
  const settings = useCompanyStore((s) => s.settings);
  const bannerAlert = useCompanyStore((s) => s.bannerAlert);
  const setBannerAlert = useCompanyStore((s) => s.setBannerAlert);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const toggle3dDiagnostics = useCompanyStore((s) => s.toggle3dDiagnostics);
  const instantRevertToSafeMode = useCompanyStore((s) => s.instantRevertToSafeMode);

  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  useEffect(() => {
    init().then(() => {
      if (useCompanyStore.getState().bootStatus === 'ready') {
        startBackgroundSchedulers();
      }
    });
  }, [init]);

  // Keyboard shortcuts (Alt + 1..9 to switch tabs, Alt+D for 3D diagnostics)
  useEffect(() => {
    const tabMap: RightPanelTab[] = [
      'chat',
      'tasks',
      'crm',
      'approvals',
      'affiliate',
      'legal',
      'finance',
      'health',
      'settings',
    ];
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        toggle3dDiagnostics();
        return;
      }
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tab = tabMap[Number(e.key) - 1];
        if (tab) {
          setShowRight(true);
          setActiveTab(tab);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActiveTab, toggle3dDiagnostics]);

  const handleHardResetLocalData = async () => {
    try {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('AICompany3D_DB_v1');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    } catch {
      // ignore
    }
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  if (bootStatus === 'booting') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-center space-y-2.5">
          <div className="w-9 h-9 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-semibold">Đang khởi tạo Văn phòng Ảo 3D – AI Company...</div>
          <div className="text-xs text-slate-400">Kiểm tra schema dữ liệu, phục hồi hàng đợi 24/7 & nạp 3 tầng...</div>
        </div>
      </div>
    );
  }

  if (bootStatus === 'error') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
        <div className="max-w-lg w-full rounded-2xl border border-rose-500/40 bg-slate-900 p-6 shadow-2xl space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h1 className="text-base font-bold text-white">Không thể khởi động dữ liệu Văn phòng Ảo</h1>
              <p className="text-xs text-slate-300 mt-1">
                Hệ thống đã giữ nguyên trang chờ an toàn trước khi nạp cảnh 3D. Chủ tịch có thể thử lại hoặc đặt lại dữ liệu cục bộ.
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-rose-300 break-words">
            {bootError || 'Lỗi khởi tạo IndexedDB / Store'}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                retryBoot().then(() => {
                  if (useCompanyStore.getState().bootStatus === 'ready') startBackgroundSchedulers();
                })
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Thử khởi động lại</span>
            </button>
            <button
              type="button"
              onClick={handleHardResetLocalData}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Đặt lại dữ liệu cục bộ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      <TopBar
        onToggleLeftSidebar={() => setShowLeft((v) => !v)}
        onToggleRightPanel={() => setShowRight((v) => !v)}
        onOpenSecurityModal={() => setSecurityModalOpen(true)}
      />

      {/* Slim Environment Mode Banner */}
      {settings.envMode === 'sandbox' && (
        <div className="px-4 py-1 bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-center justify-between gap-2 z-20">
          <span>
            <strong>CHẾ ĐỘ SANDBOX</strong> — Dữ liệu mô phỏng, chưa kết nối phần mềm thật (Hub.ChuyenWeb)
          </span>
          <div className="flex items-center gap-2">
            {(realtimeStatus === 'reconnecting' || realtimeStatus === 'offline') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[10px]">
                <WifiOff className="w-3 h-3" />
                {realtimeStatus === 'reconnecting' ? 'Đang nối lại luồng SSE...' : 'SSE tạm ngắt'}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setShowRight(true);
                setActiveTab('hubcw');
              }}
              className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-semibold text-[10.5px] cursor-pointer"
            >
              Kết nối phần mềm
            </button>
          </div>
        </div>
      )}
      {settings.envMode === 'read_only' && (
        <div className="px-4 py-1 bg-sky-500/15 border-b border-sky-500/30 text-sky-700 dark:text-sky-300 text-[11px] font-medium flex items-center justify-between gap-2 z-20">
          <span>
            <strong>CHẾ ĐỘ READ-ONLY</strong> — Chỉ đọc dữ liệu từ Hub.ChuyenWeb, mọi lệnh ghi bị chặn cứng
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => instantRevertToSafeMode('sandbox')}
              className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-[10.5px] cursor-pointer"
            >
              Về SANDBOX
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRight(true);
                setActiveTab('hubcw');
              }}
              className="px-2 py-0.5 rounded bg-sky-600 text-white font-semibold text-[10.5px] cursor-pointer"
            >
              Kết nối phần mềm
            </button>
          </div>
        </div>
      )}
      {settings.envMode === 'live' && (
        <div className="px-4 py-1 bg-rose-600 text-white text-[11px] font-semibold flex items-center justify-between gap-2 z-20">
          <span>
            <strong>CHẾ ĐỘ LIVE</strong> — Đang kết nối dữ liệu thật Hub.ChuyenWeb ({settings.hubcw.baseUrl})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => instantRevertToSafeMode('read_only')}
              className="px-2 py-0.5 rounded bg-white text-rose-700 font-bold text-[10.5px] cursor-pointer"
            >
              Về READ-ONLY ngay
            </button>
            <button
              type="button"
              onClick={() => instantRevertToSafeMode('sandbox')}
              className="px-2 py-0.5 rounded bg-rose-900 text-white font-semibold text-[10.5px] cursor-pointer"
            >
              Về SANDBOX
            </button>
          </div>
        </div>
      )}

      {bannerAlert && (
        <div className="px-4 py-2 bg-rose-600 text-white text-xs font-medium flex items-center justify-between gap-2 z-30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{bannerAlert}</span>
          </div>
          <button type="button" onClick={() => setBannerAlert(null)} className="p-0.5 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden relative">
        {showLeft && <LeftOrgSidebar />}

        <div className="flex-1 relative h-full overflow-hidden">
          <OfficeScene3D />
          <AgentProfileModal />
        </div>

        {showRight && <RightWorkspacePanel />}
      </main>

      <CeoSecurityModal open={securityModalOpen} onClose={() => setSecurityModalOpen(false)} />
      <OnboardingWizardModal />
    </div>
  );
}
