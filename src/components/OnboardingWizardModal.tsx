import { useState } from 'react';
import { CheckCircle2, Circle, Sparkles, Trash2, X, ArrowRight } from 'lucide-react';
import { RightPanelTab, useCompanyStore } from '../store/useCompanyStore';
import { evaluateGoLiveChecklist } from '../engine/runtime247';

export function OnboardingWizardModal({
  forceOpen,
  onClose,
}: {
  forceOpen?: boolean;
  onClose?: () => void;
}) {
  const settings = useCompanyStore((s) => s.settings);
  const serverHealth = useCompanyStore((s) => s.serverHealth);
  const externalAccounts = useCompanyStore((s) => s.externalAccounts);
  const backupSnapshots = useCompanyStore((s) => s.backupSnapshots);
  const recordOnboardingProgress = useCompanyStore((s) => s.recordOnboardingProgress);
  const updateAffiliateSettings = useCompanyStore((s) => s.updateAffiliateSettings);
  const sendTestCeoAlert = useCompanyStore((s) => s.sendTestCeoAlert);
  const createManualBackup = useCompanyStore((s) => s.createManualBackup);
  const deleteDemoData = useCompanyStore((s) => s.deleteDemoData);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);

  const [confirmClearDemo, setConfirmClearDemo] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const onboarding = settings.onboarding || {
    completed: false,
    dismissed: false,
    currentStep: 0,
    hasDemoData: true,
    readOnlyCycleTested: false,
    testAlertSent: false,
    firstBackupCreated: false,
  };

  const isOpen = forceOpen ?? (!onboarding.completed && !onboarding.dismissed);
  if (!isOpen) return null;

  const hasAnyAiConfigured = Boolean(
    serverHealth?.hasGeminiEnvKey ||
      serverHealth?.hasDeepSeekEnvKey ||
      settings.geminiApiKey?.trim() ||
      settings.deepseekApiKey?.trim() ||
      (settings.localBaseUrl?.trim() && settings.localModel?.trim())
  );
  const linkedCount = externalAccounts.filter((a) => a.status === 'active').length;

  const checklist = evaluateGoLiveChecklist({
    settings,
    hasAnyAiProviderConfigured: hasAnyAiConfigured,
    externalAccountsCount: externalAccounts.length,
    linkedExternalAccountsCount: linkedCount,
    backupsCount: backupSnapshots.length,
  });

  const stepTabs: Record<string, RightPanelTab> = {
    chk_password: 'settings',
    chk_ai_provider: 'settings',
    chk_hubcw_url: 'hubcw',
    chk_hubcw_accounts: 'hubcw',
    chk_affiliate_id: 'settings',
    chk_legal_info: 'legal',
    chk_token_budget: 'tokens',
    chk_alert_channel: 'health',
    chk_readonly_test: 'affiliate',
    chk_backup: 'health',
  };

  const passedCount = checklist.filter((c) => c.passed).length;
  const progressPct = Math.round((passedCount / checklist.length) * 100);

  const handleClose = async () => {
    await recordOnboardingProgress({ dismissed: true });
    onClose?.();
  };

  const handleComplete = async () => {
    await recordOnboardingProgress({ completed: true, dismissed: false, currentStep: 9 });
    onClose?.();
  };

  const handleDownloadFirstBackup = async () => {
    const snap = await createManualBackup('Sao lưu khởi động đầu tiên');
    const blob = new Blob([snap.jsonPayload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aicompany-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await recordOnboardingProgress({ firstBackupCreated: true });
    setStatusMsg('Đã tạo & tải về bản sao lưu JSON đầu tiên!');
  };

  const handleClearDemo = async () => {
    await deleteDemoData();
    setConfirmClearDemo(false);
    setStatusMsg('Đã xóa sạch dữ liệu demo mô phỏng! Công ty sẵn sàng chạy dữ liệu thật.');
  };

  const nicheOptions = ['Gia dụng', 'Mẹ và Bé', 'Làm đẹp', 'Công nghệ', 'Thời trang', 'Giáo dục'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Hướng dẫn Khởi động — Checklist Sẵn sàng thực tế</h2>
              <p className="text-[11px] text-slate-400">
                Đạt {passedCount}/{checklist.length} điều kiện Go-Live ({progressPct}%)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Ẩn hướng dẫn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full h-1.5 bg-slate-800">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {statusMsg && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
              {statusMsg}
            </div>
          )}

          {/* Quick Affiliate Niche Selector */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-slate-200">Ngách Affiliate Tầng 3 ưu tiên</div>
              <div className="text-[11px] text-slate-400">2 Product Scout sẽ săn hàng theo các ngách được chọn</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {nicheOptions.map((n) => {
                const active = settings.affiliate?.priorityNiches?.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      const cur = settings.affiliate?.priorityNiches || [];
                      const next = active ? cur.filter((x) => x !== n) : [...cur, n];
                      updateAffiliateSettings({ priorityNiches: next.length ? next : ['Gia dụng'] });
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium border cursor-pointer ${
                      active
                        ? 'bg-teal-600/30 border-teal-400 text-teal-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            {checklist.map((item) => {
              const targetTab = stepTabs[item.id];
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 flex items-center justify-between gap-3 transition-colors ${
                    item.passed ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1">
                    {item.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-white">{item.label}</div>
                      <div className="text-[11px] text-slate-400">{item.detail}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.id === 'chk_alert_channel' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await sendTestCeoAlert();
                          setStatusMsg(`Đã gửi cảnh báo kiểm thử (${res.channel}).`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Test gửi
                      </button>
                    )}
                    {item.id === 'chk_readonly_test' && (
                      <button
                        type="button"
                        onClick={async () => {
                          await recordOnboardingProgress({ readOnlyCycleTested: true });
                          setStatusMsg('Đã đánh dấu hoàn tất kiểm thử chế độ chỉ đọc.');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Xác nhận đã test
                      </button>
                    )}
                    {item.id === 'chk_backup' && (
                      <button
                        type="button"
                        onClick={handleDownloadFirstBackup}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Tải Backup
                      </button>
                    )}
                    {targetTab && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab(targetTab);
                          onClose?.();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-semibold cursor-pointer"
                      >
                        <span>Mở mục</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-2">
          <div>
            {!confirmClearDemo ? (
              <button
                type="button"
                onClick={() => setConfirmClearDemo(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa dữ liệu demo (bắt đầu sạch)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-rose-300 font-medium">Xác nhận xóa lead/campaign demo?</span>
                <button
                  type="button"
                  onClick={handleClearDemo}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                >
                  Xóa ngay
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearDemo(false)}
                  className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
            >
              Hoàn tất khởi động
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
