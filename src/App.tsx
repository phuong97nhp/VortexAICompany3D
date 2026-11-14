import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { AgentProfileModal } from './components/AgentProfileModal';
import { CeoSecurityModal } from './components/CeoSecurityModal';
import { LeftOrgSidebar } from './components/LeftOrgSidebar';
import { OfficeScene3D } from './components/office3d/OfficeScene3D';
import { RightWorkspacePanel } from './components/RightWorkspacePanel';
import { TopBar } from './components/TopBar';
import { startBackgroundSchedulers } from './engine/orchestrator';
import { RightPanelTab, useCompanyStore } from './store/useCompanyStore';

export default function App() {
  const init = useCompanyStore((s) => s.init);
  const loading = useCompanyStore((s) => s.loading);
  const bannerAlert = useCompanyStore((s) => s.bannerAlert);
  const setBannerAlert = useCompanyStore((s) => s.setBannerAlert);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const toggle3dDiagnostics = useCompanyStore((s) => s.toggle3dDiagnostics);

  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  useEffect(() => {
    init().then(() => {
      startBackgroundSchedulers();
    });
  }, [init]);

  // Keyboard shortcuts (Alt + 1..9 to switch tabs)
  useEffect(() => {
    const tabMap: RightPanelTab[] = [
      'chat',
      'tasks',
      'crm',
      'approvals',
      'finance',
      'docs',
      'rbac',
      'vault',
      'tokens',
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

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-semibold">Đang khởi tạo Văn phòng Ảo 3D – AI Company...</div>
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
    </div>
  );
}
