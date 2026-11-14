import { useMemo, useState } from 'react';
import {
  Activity,
  BellRing,
  CheckCircle2,
  Circle,
  Cpu,
  Download,
  HeartPulse,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import { circuitBreakers } from '../../engine/resilience';
import { evaluateGoLiveChecklist, getMemoryHeapUsageMb } from '../../engine/runtime247';
import { useCompanyStore } from '../../store/useCompanyStore';
import { OnboardingWizardModal } from '../OnboardingWizardModal';

export function SystemHealthPanel() {
  const settings = useCompanyStore((s) => s.settings);
  const serverHealth = useCompanyStore((s) => s.serverHealth);
  const realtimeStatus = useCompanyStore((s) => s.realtimeStatus);
  const scene3dStats = useCompanyStore((s) => s.scene3dStats);
  const durableJobs = useCompanyStore((s) => s.durableJobs);
  const systemHealthLogs = useCompanyStore((s) => s.systemHealthLogs);
  const backupSnapshots = useCompanyStore((s) => s.backupSnapshots);
  const externalAccounts = useCompanyStore((s) => s.externalAccounts);
  const tokenUsage = useCompanyStore((s) => s.tokenUsage);

  const enqueueJob = useCompanyStore((s) => s.enqueueJob);
  const runPendingDurableJobs = useCompanyStore((s) => s.runPendingDurableJobs);
  const sendTestCeoAlert = useCompanyStore((s) => s.sendTestCeoAlert);
  const createManualBackup = useCompanyStore((s) => s.createManualBackup);
  const restoreFromBackupJson = useCompanyStore((s) => s.restoreFromBackupJson);
  const switchEnvModeWithPreflight = useCompanyStore((s) => s.switchEnvModeWithPreflight);

  const [logLevel, setLogLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [traceSearch, setTraceSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmLiveModal, setConfirmLiveModal] = useState(false);
  const [livePhrase, setLivePhrase] = useState('');
  const [livePwd, setLivePwd] = useState('');
  const [circuitTick, setCircuitTick] = useState(0);

  const circuits = useMemo(() => {
    void circuitTick;
    return circuitBreakers.getAll();
  }, [circuitTick]);

  const heapMb = getMemoryHeapUsageMb();
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTokens = tokenUsage.filter((t) => t.dateKey === todayKey).reduce((s, t) => s + t.totalTokens, 0);
  const tokenRatio = settings.dailyTokenBudget > 0 ? Math.round((todayTokens / settings.dailyTokenBudget) * 100) : 0;

  const hasAnyAiConfigured = Boolean(
    serverHealth?.hasGeminiEnvKey ||
      serverHealth?.hasDeepSeekEnvKey ||
      settings.geminiApiKey?.trim() ||
      settings.deepseekApiKey?.trim() ||
      (settings.localBaseUrl?.trim() && settings.localModel?.trim())
  );
  const linkedExternal = externalAccounts.filter((a) => a.status === 'active').length;

  const checklist = evaluateGoLiveChecklist({
    settings,
    hasAnyAiProviderConfigured: hasAnyAiConfigured,
    externalAccountsCount: externalAccounts.length,
    linkedExternalAccountsCount: linkedExternal,
    backupsCount: backupSnapshots.length,
  });
  const allGoLivePassed = checklist.every((c) => c.passed);

  const filteredLogs = useMemo(() => {
    const q = traceSearch.trim().toLowerCase();
    return systemHealthLogs
      .filter((l) => (logLevel === 'all' ? true : l.level === logLevel))
      .filter(
        (l) =>
          !q ||
          (l.traceId || '').toLowerCase().includes(q) ||
          l.component.toLowerCase().includes(q) ||
          l.message.toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [systemHealthLogs, logLevel, traceSearch]);

  const handleDownloadBackup = async () => {
    const snap = await createManualBackup('Sao lưu thủ công từ Hệ thống 24/7');
    const blob = new Blob([snap.jsonPayload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aicompany-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback(`Đã tạo & tải bản sao lưu (${Math.round(snap.sizeBytes / 1024)} KB).`);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await restoreFromBackupJson(text);
    setFeedback(
      res.ok
        ? `Khôi phục thành công ${res.restoredCount || 0} bản ghi từ file "${file.name}".`
        : res.error || 'File backup không hợp lệ.'
    );
    e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden text-xs">
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-emerald-500" />
            <span>Sức khỏe Hệ thống & Vận hành 24/7</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Schema v{settings.schemaVersion} · SSE: {realtimeStatus} · FPS: {scene3dStats?.fps ?? '—'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Wizard 9 bước</span>
        </button>
      </div>

      {feedback && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-700 dark:text-sky-300 text-[11px] font-medium">
          {feedback}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Metrics Strip */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900">
            <div className="text-[10px] text-slate-400">FPS Cảnh 3D</div>
            <div className="text-base font-bold font-mono-num text-emerald-500">{scene3dStats?.fps ?? '—'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900">
            <div className="text-[10px] text-slate-400">JS Heap MB</div>
            <div className="text-base font-bold font-mono-num">{heapMb !== null ? `${heapMb} MB` : '—'}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900">
            <div className="text-[10px] text-slate-400">Token hôm nay</div>
            <div className={`text-base font-bold font-mono-num ${tokenRatio >= 90 ? 'text-rose-500' : 'text-sky-500'}`}>
              {tokenRatio}%
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-white dark:bg-slate-900">
            <div className="text-[10px] text-slate-400">Hàng đợi 24/7</div>
            <div className="text-base font-bold font-mono-num">
              {durableJobs.filter((j) => j.status === 'queued' || j.status === 'leased').length} chờ
            </div>
          </div>
        </div>

        {/* 10-Item Go-Live Checklist */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Checklist 10 mục trước khi bật LIVE</span>
            </div>
            <button
              type="button"
              onClick={() => setConfirmLiveModal(true)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                allGoLivePassed
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {allGoLivePassed ? 'Đạt 10/10 · Bật LIVE' : `${checklist.filter((c) => c.passed).length}/10 Đạt`}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {checklist.map((c) => (
              <div key={c.id} className="flex items-start gap-2 text-[11px]">
                {c.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <span className={c.passed ? 'text-slate-700 dark:text-slate-200' : 'text-amber-600 dark:text-amber-300 font-semibold'}>
                    {c.label}
                  </span>
                  <span className="text-slate-400 ml-1.5">— {c.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {confirmLiveModal && (
            <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 space-y-2">
              <div className="font-bold text-rose-500">Xác nhận chuyển sang chế độ LIVE thật</div>
              <input
                type="text"
                value={livePhrase}
                onChange={(e) => setLivePhrase(e.target.value)}
                placeholder='Gõ chính xác: XÁC NHẬN CHẠY THẬT'
                className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <input
                type="password"
                value={livePwd}
                onChange={(e) => setLivePwd(e.target.value)}
                placeholder="Mật khẩu CEO"
                className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await switchEnvModeWithPreflight('live', {
                      confirmPhrase: livePhrase,
                      ceoPassword: livePwd,
                    });
                    setFeedback(res.message);
                    if (res.ok) setConfirmLiveModal(false);
                  }}
                  className="px-3 py-1 rounded bg-rose-600 text-white font-bold cursor-pointer"
                >
                  Kích hoạt LIVE
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmLiveModal(false)}
                  className="px-2.5 py-1 rounded bg-slate-700 text-white cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Circuit Breakers */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-sky-500" />
              <span>Circuit Breakers (AI & Tích hợp ngoài)</span>
            </div>
            <button
              type="button"
              onClick={() => {
                circuits.forEach((cb) => circuitBreakers.reset(cb.key));
                setCircuitTick((t) => t + 1);
                setFeedback('Đã reset toàn bộ Circuit Breaker về trạng thái CLOSED.');
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-white text-[10.5px] cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
          {circuits.length === 0 ? (
            <div className="text-[11px] text-slate-400">Chưa có cầu dao nào kích hoạt lỗi — mọi kết nối đang CLOSED bình thường.</div>
          ) : (
            <div className="space-y-1">
              {circuits.map((cb) => (
                <div key={cb.key} className="flex items-center justify-between text-[11px] py-1 border-t border-slate-100 dark:border-slate-800">
                  <span>{cb.label}</span>
                  <span
                    className={`font-bold uppercase ${
                      cb.status === 'closed' ? 'text-emerald-500' : cb.status === 'half_open' ? 'text-amber-500' : 'text-rose-500'
                    }`}
                  >
                    {cb.status} ({cb.failureCount} lỗi · {cb.avgLatencyMs}ms)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Durable Jobs Queue */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-violet-500" />
              <span>Hàng đợi Công việc Bền bỉ (Durable Queue)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={async () => {
                  await enqueueJob({
                    type: 'health_check_ping',
                    agentId: 'secretary',
                    department: 'exec',
                    payload: { source: 'SystemHealthPanel' },
                  });
                  setFeedback('Đã xếp 1 job kiểm tra vào Durable Queue.');
                }}
                className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10.5px] font-semibold cursor-pointer"
              >
                + Job thử
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ran = await runPendingDurableJobs();
                  setFeedback(`Đã xử lý ${ran} job trong hàng đợi bền bỉ.`);
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10.5px] font-semibold cursor-pointer"
              >
                <Play className="w-3 h-3" />
                <span>Chạy ngay</span>
              </button>
            </div>
          </div>
          {durableJobs.slice(0, 6).map((j) => (
            <div key={j.id} className="flex items-center justify-between text-[11px] py-1 border-t border-slate-100 dark:border-slate-800">
              <span className="truncate pr-2">
                <strong>{j.type}</strong> · {j.agentId} ({j.progressStep}/{j.totalSteps})
              </span>
              <span className="font-mono text-[10px] uppercase text-sky-500">{j.status}</span>
            </div>
          ))}
        </div>

        {/* Backup, Restore & Alerts */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2">
          <div className="font-bold text-slate-900 dark:text-white">Sao lưu, Khôi phục & Cảnh báo CEO</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Backup JSON ({backupSnapshots.length})</span>
            </button>
            <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Khôi phục từ JSON</span>
              <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
            </label>
            <button
              type="button"
              onClick={async () => {
                const res = await sendTestCeoAlert();
                setFeedback(`Đã gửi cảnh báo kiểm thử qua ${res.channel}.`);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Test cảnh báo CEO</span>
            </button>
          </div>
        </div>

        {/* Traceable System Health Logs */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-slate-900 dark:text-white">Nhật ký kỹ thuật có TraceId</span>
            <div className="flex items-center gap-1.5">
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value as typeof logLevel)}
                className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent text-[11px]"
              >
                <option value="all">Tất cả mức</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
              <input
                type="text"
                value={traceSearch}
                onChange={(e) => setTraceSearch(e.target.value)}
                placeholder="Lọc traceId / component..."
                className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-transparent text-[11px]"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[10.5px]">
            {filteredLogs.map((l) => (
              <div key={l.id} className="py-1 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span
                    className={`font-bold uppercase mr-1.5 ${
                      l.level === 'error' ? 'text-rose-500' : l.level === 'warn' ? 'text-amber-500' : 'text-emerald-500'
                    }`}
                  >
                    [{l.level}]
                  </span>
                  <span className="text-sky-500 mr-1.5">[{l.component}]</span>
                  <span>{l.message}</span>
                </div>
                {l.traceId && <span className="text-slate-400 shrink-0">{l.traceId}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <OnboardingWizardModal forceOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
