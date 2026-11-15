import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Database,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react';
import { HUBCW_MODULES, HUBCW_UNCLEAR_MODULES } from '../../integrations/hubcw/hubcw.config';
import { useCompanyStore } from '../../store/useCompanyStore';
import { HubCwConnectionMode, HubCwModuleId, SystemEnvMode } from '../../types';

const ENV_BADGE: Record<SystemEnvMode, { label: string; cls: string }> = {
  sandbox: {
    label: 'SANDBOX (Mô phỏng)',
    cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  read_only: {
    label: 'READ-ONLY (Chỉ đọc)',
    cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  },
  live: {
    label: 'LIVE (Dữ liệu thật)',
    cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  },
};

export function HubCwConnectorPanel() {
  const settings = useCompanyStore((s) => s.settings);
  const externalAccounts = useCompanyStore((s) => s.externalAccounts);
  const hubcwApiLogs = useCompanyStore((s) => s.hubcwApiLogs);
  const hubcwSyncQueue = useCompanyStore((s) => s.hubcwSyncQueue);
  const hubcwUndoSnapshots = useCompanyStore((s) => s.hubcwUndoSnapshots);
  const hubcwReconciliations = useCompanyStore((s) => s.hubcwReconciliations);

  const updateHubCwSettings = useCompanyStore((s) => s.updateHubCwSettings);
  const checkHubCwModuleHealth = useCompanyStore((s) => s.checkHubCwModuleHealth);
  const processHubCwSyncQueue = useCompanyStore((s) => s.processHubCwSyncQueue);
  const revertHubCwWriteAction = useCompanyStore((s) => s.revertHubCwWriteAction);
  const runReconciliationNow = useCompanyStore((s) => s.runReconciliationNow);
  const switchEnvModeWithPreflight = useCompanyStore((s) => s.switchEnvModeWithPreflight);
  const instantRevertToSafeMode = useCompanyStore((s) => s.instantRevertToSafeMode);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const bcpPlans = useCompanyStore((s) => s.bcpPlans);
  const webhookEndpoints = useCompanyStore((s) => s.webhookEndpoints);
  const runBcpDrill = useCompanyStore((s) => s.runBcpDrill);
  const putWebhookEndpoint = useCompanyStore((s) => s.putWebhookEndpoint);
  const testWebhookEndpoint = useCompanyStore((s) => s.testWebhookEndpoint);
  const deleteWebhookEndpoint = useCompanyStore((s) => s.deleteWebhookEndpoint);
  const clearSimulatedDataAction = useCompanyStore((s) => s.clearSimulatedDataAction);

  const [checkingHealth, setCheckingHealth] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reconLoading, setReconLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // LIVE Pre-flight modal state
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [ceoPassword, setCeoPassword] = useState('');
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [preflightSubmitting, setPreflightSubmitting] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'modules' | 'sync' | 'undo' | 'logs' | 'webhooks_bcp'>('modules');
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('');

  const latestRecon = hubcwReconciliations[0];
  const linkedActiveCount = useMemo(
    () => externalAccounts.filter((a) => a.status === 'active').length,
    [externalAccounts]
  );
  const unlinkedCount = useMemo(
    () => externalAccounts.filter((a) => a.status === 'unlinked' || a.status === 'pending_creation').length,
    [externalAccounts]
  );

  const queuedSyncCount = useMemo(
    () => hubcwSyncQueue.filter((q) => q.status === 'queued').length,
    [hubcwSyncQueue]
  );
  const simQueueLeakCount = useMemo(
    () => hubcwSyncQueue.filter((q) => q.status === 'queued' && q.provenance?.origin === 'simulated').length,
    [hubcwSyncQueue]
  );

  const moduleHealthValues = Object.values(settings.hubcw.moduleHealth || {});
  const hasHealthyCheck = moduleHealthValues.some((h) => h.status === 'ok');

  const preflightChecks = [
    {
      label: '1. Ít nhất 1 nhân viên đã liên kết tài khoản Hub.ChuyenWeb hoạt động',
      ok: linkedActiveCount > 0,
      detail: `${linkedActiveCount} đang hoạt động / ${unlinkedCount} chưa liên kết`,
    },
    {
      label: '2. Chế độ kết nối thật (API / Browser) & đã kiểm tra kết nối',
      ok:
        settings.hubcw.connectionMode !== 'sandbox' &&
        (hasHealthyCheck || Boolean(settings.hubcw.lastHealthCheckAt)),
      detail: `Mode: ${settings.hubcw.connectionMode}`,
    },
    {
      label: '3. Ba module chưa xác nhận nghiệp vụ (Heo vàng, Tự động, Tài nguyên) khóa ghi mặc định',
      ok: true,
      detail: 'Khóa an toàn bởi Write Gate',
    },
    {
      label: '4. Không có bản ghi MÔ PHỎNG nào chờ đẩy sang Hub.ChuyenWeb',
      ok: simQueueLeakCount === 0,
      detail: simQueueLeakCount === 0 ? 'Sạch (0 hàng đợi mô phỏng)' : `${simQueueLeakCount} bản ghi mô phỏng`,
    },
  ];

  const handleHealthCheck = async () => {
    setCheckingHealth(true);
    setStatusMessage(null);
    try {
      await checkHubCwModuleHealth();
      setStatusMessage({ ok: true, text: 'Đã kiểm tra xong trạng thái 19 module Hub.ChuyenWeb.' });
    } catch (err) {
      setStatusMessage({
        ok: false,
        text: err instanceof Error ? err.message : 'Lỗi kiểm tra kết nối.',
      });
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setStatusMessage(null);
    try {
      const res = await processHubCwSyncQueue();
      setStatusMessage({
        ok: res.blocked === 0,
        text: `Đã xử lý đồng bộ: ${res.processed} thành công, ${res.blocked} bị Cổng Write Gate chặn.`,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleReconcile = async () => {
    setReconLoading(true);
    try {
      const report = await runReconciliationNow();
      setStatusMessage({
        ok: true,
        text: `Đối soát xong: ${report.validProvenancePercent}% nguồn dữ liệu hợp lệ, ${report.discrepancies.length} sai lệch.`,
      });
    } finally {
      setReconLoading(false);
    }
  };

  const handleRevert = async (snapshotId: string) => {
    const res = await revertHubCwWriteAction(snapshotId);
    setStatusMessage({ ok: res.ok, text: res.message });
  };

  const handleSwitchEnv = async (target: SystemEnvMode) => {
    if (target === 'live') {
      setPreflightError(null);
      setConfirmPhrase('');
      setCeoPassword('');
      setPreflightOpen(true);
      return;
    }
    const res = await switchEnvModeWithPreflight(target);
    setStatusMessage({ ok: res.ok, text: res.message });
  };

  const handleConfirmLive = async () => {
    setPreflightSubmitting(true);
    setPreflightError(null);
    try {
      const res = await switchEnvModeWithPreflight('live', {
        confirmPhrase,
        ceoPassword,
      });
      if (!res.ok) {
        setPreflightError(res.message);
        return;
      }
      setPreflightOpen(false);
      setStatusMessage({ ok: true, text: res.message });
    } finally {
      setPreflightSubmitting(false);
    }
  };

  const envMeta = ENV_BADGE[settings.envMode];

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto text-xs">
      {/* Header & Environment Selector */}
      <section className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Database className="w-4 h-4 text-sky-500" />
            <span>Kết nối Phần mềm Thật (Hub.ChuyenWeb)</span>
          </div>
          <span className={`px-2 py-0.5 rounded-md border text-[10.5px] font-bold ${envMeta.cls}`}>
            {envMeta.label}
          </span>
        </div>

        {/* Mode Buttons */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleSwitchEnv('sandbox')}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
              settings.envMode === 'sandbox'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            SANDBOX (An toàn)
          </button>
          <button
            type="button"
            onClick={() => handleSwitchEnv('read_only')}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
              settings.envMode === 'read_only'
                ? 'bg-sky-600 text-white border-sky-500'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            READ-ONLY (Chỉ đọc)
          </button>
          <button
            type="button"
            onClick={() => handleSwitchEnv('live')}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
              settings.envMode === 'live'
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-white dark:bg-slate-950 border-rose-500/40 text-rose-500 hover:bg-rose-500/10'
            }`}
          >
            Mở khóa LIVE
          </button>
        </div>

        {settings.envMode === 'live' && (
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2">
            <span className="text-[11px] text-rose-500 font-semibold">
              Đang bật ghi dữ liệu thật vào {settings.hubcw.baseUrl}. Mọi lệnh ghi đi qua Write Gate.
            </span>
            <button
              type="button"
              onClick={() => instantRevertToSafeMode('read_only')}
              className="px-2 py-1 rounded bg-rose-600 text-white text-[10.5px] font-bold shrink-0 cursor-pointer"
            >
              Ngắt LIVE ngay
            </button>
          </div>
        )}

        {/* Base URL, Connection Mode & Hourly Limit */}
        <div className="grid grid-cols-12 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
          <div className="col-span-6">
            <label className="block text-[10.5px] text-slate-400 mb-0.5">
              Base URL (khuyên thử staging trước khi LIVE)
            </label>
            <input
              type="text"
              value={settings.hubcw.baseUrl}
              onChange={(e) => updateHubCwSettings({ baseUrl: e.target.value })}
              placeholder="https://hub.chuyenweb.com"
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono-num"
            />
          </div>
          <div className="col-span-4">
            <label className="block text-[10.5px] text-slate-400 mb-0.5">Chế độ kết nối</label>
            <select
              value={settings.hubcw.connectionMode}
              onChange={(e) =>
                updateHubCwSettings({ connectionMode: e.target.value as HubCwConnectionMode })
              }
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1"
            >
              <option value="sandbox">Sandbox nội bộ</option>
              <option value="api">REST API (Ưu tiên)</option>
              <option value="browser">Playwright Browser</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[10.5px] text-slate-400 mb-0.5">Ghi/giờ</label>
            <input
              type="number"
              min={1}
              max={500}
              value={settings.hubcw.hourlyWriteLimit}
              onChange={(e) =>
                updateHubCwSettings({ hourlyWriteLimit: Math.max(1, Number(e.target.value) || 40) })
              }
              className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 font-mono-num"
            />
          </div>
        </div>

        {/* Account Summary + Actions */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <div className="text-[11px] text-slate-400">
            Tài khoản HubCW:{' '}
            <strong className="text-emerald-500 font-mono-num">{linkedActiveCount} hoạt động</strong>
            {' · '}
            <button
              type="button"
              onClick={() => setActiveTab('rbac')}
              className="underline text-sky-500 hover:text-sky-400 cursor-pointer"
            >
              {unlinkedCount} nhân sự chưa gắn TK → Quản lý Nhân sự
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={checkingHealth}
              onClick={handleHealthCheck}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
              <span>{checkingHealth ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
            </button>
            <button
              type="button"
              disabled={reconLoading}
              onClick={handleReconcile}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Đối soát ngay</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-2 rounded-lg border text-[11px] font-medium ${
              statusMessage.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
            }`}
          >
            {statusMessage.text}
          </div>
        )}
      </section>

      {/* Data Trust & Reconciliation Snapshot */}
      <section className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-2">
        <div>
          <div className="text-[10px] text-slate-400">Độ tin cậy dữ liệu</div>
          <div className="text-sm font-bold font-mono-num text-emerald-500">
            {latestRecon ? `${latestRecon.validProvenancePercent}%` : '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400">Bản ghi mô phỏng</div>
          <div className="text-sm font-bold font-mono-num text-amber-500">
            {latestRecon ? latestRecon.simulatedRecordCount : '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400">Lệnh ghi bị chặn</div>
          <div className="text-sm font-bold font-mono-num text-rose-500">
            {latestRecon ? latestRecon.blockedWriteCount : hubcwApiLogs.filter((l) => l.result.startsWith('blocked')).length}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400">Hàng đợi đồng bộ</div>
          <div className="text-sm font-bold font-mono-num text-sky-500">{queuedSyncCount}</div>
        </div>
      </section>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-1.5">
        {(
          [
            { id: 'modules', label: '19 Module & Khóa an toàn' },
            { id: 'sync', label: `Đồng bộ & Đối soát (${queuedSyncCount})` },
            { id: 'undo', label: `Hoàn tác (${hubcwUndoSnapshots.length})` },
            { id: 'logs', label: `API Logs (${hubcwApiLogs.length})` },
            { id: 'webhooks_bcp', label: `Webhooks & BCP (${webhookEndpoints.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-sky-600 text-white'
                : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab 1: 19 Modules Health + Unclear Locks */}
      {activeSubTab === 'modules' && (
        <div className="space-y-2">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-500">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>3 Module nghiệp vụ chưa xác nhận (Mặc định KHÓA GHI)</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {HUBCW_UNCLEAR_MODULES.map((modId) => {
                const mod = HUBCW_MODULES.find((m) => m.id === modId)!;
                const unlocked = Boolean(
                  settings.hubcw.unclearWriteUnlocked?.[
                    modId as 'golden_pig' | 'automation' | 'resources'
                  ]
                );
                return (
                  <div
                    key={modId}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold flex items-center gap-1.5">
                        <span>{mod.label}</span>
                        <span className="text-[10px] font-mono-num text-slate-400">({mod.readPath})</span>
                      </div>
                      <div className="text-[10.5px] text-slate-400">{mod.unclearNote}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateHubCwSettings({
                          unclearWriteUnlocked: {
                            ...settings.hubcw.unclearWriteUnlocked,
                            [modId]: !unlocked,
                          },
                        })
                      }
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-semibold shrink-0 cursor-pointer ${
                        unlocked
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {unlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>{unlocked ? 'Đã mở khóa ghi' : 'Đang khóa ghi'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-1.5 px-2">Module (19 mục)</th>
                  <th className="py-1.5 px-2">Endpoint đọc</th>
                  <th className="py-1.5 px-2">Quyền ghi</th>
                  <th className="py-1.5 px-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {HUBCW_MODULES.map((m) => {
                  const health = settings.hubcw.moduleHealth?.[m.id];
                  const status = health?.status || 'untested';
                  const statusBadge =
                    status === 'ok'
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : status === 'error'
                        ? 'bg-rose-500/15 text-rose-500'
                        : status === 'unsupported'
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-slate-500/15 text-slate-400';
                  const statusLabel =
                    status === 'ok'
                      ? `OK (${health?.latencyMs ?? 0}ms)`
                      : status === 'error'
                        ? 'Lỗi'
                        : status === 'unsupported'
                          ? 'Chưa hỗ trợ'
                          : 'Chưa test';
                  return (
                    <tr
                      key={m.id}
                      className="border-b last:border-b-0 border-slate-200 dark:border-slate-800/80"
                    >
                      <td className="py-1.5 px-2 font-medium">
                        {m.label}
                        {m.isCriticalAdmin && (
                          <span className="ml-1 text-[9.5px] px-1 py-0.5 rounded bg-rose-500/15 text-rose-500">
                            CEO
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 font-mono-num text-[10px] text-slate-400">
                        {m.readPath}
                      </td>
                      <td className="py-1.5 px-2 text-[10.5px]">
                        {!m.supportsWrite ? (
                          <span className="text-slate-400">Chỉ đọc</span>
                        ) : m.isUnclear &&
                          !settings.hubcw.unclearWriteUnlocked?.[
                            m.id as 'golden_pig' | 'automation' | 'resources'
                          ] ? (
                          <span className="text-amber-500">Khóa ghi</span>
                        ) : m.isFinancial ? (
                          <span className="text-sky-500">Cần #CP-xxx</span>
                        ) : (
                          <span className="text-emerald-500">Cho phép (Qua Gate)</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusBadge}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Two-Way Sync Queue & Reconciliation */}
      {activeSubTab === 'sync' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-sky-500" />
              <span>Hàng đợi đồng bộ 2 chiều</span>
            </div>
            <button
              type="button"
              disabled={syncing || queuedSyncCount === 0}
              onClick={handleSyncNow}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 disabled:opacity-40 text-white font-semibold cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>{syncing ? 'Đang chạy...' : `Chạy đồng bộ (${queuedSyncCount})`}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {hubcwSyncQueue.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-center">
                Chưa có bản ghi nào trong hàng đợi đồng bộ Hub.ChuyenWeb.
              </div>
            ) : (
              hubcwSyncQueue.slice(0, 30).map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-1.5">
                      <span>{item.direction === 'push_to_hubcw' ? 'Đẩy lên HubCW' : 'Kéo từ HubCW'}</span>
                      <span className="font-mono-num text-sky-500">{item.module}</span>
                      {item.provenance?.origin === 'simulated' && (
                        <span className="px-1 py-0.5 rounded bg-amber-500/15 text-amber-500 text-[9.5px]">
                          MÔ PHỎNG
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] text-slate-400 truncate">
                      Agent: {item.agentId} {item.externalId ? `· Hub ID: ${item.externalId}` : ''}
                      {item.errorMessage ? ` · ${item.errorMessage}` : ''}
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                      item.status === 'synced'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : item.status === 'blocked' || item.status === 'failed'
                          ? 'bg-rose-500/15 text-rose-500'
                          : 'bg-sky-500/15 text-sky-500'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>

          {latestRecon && (
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-semibold">
                Báo cáo Đối soát gần nhất ({new Date(latestRecon.createdAt).toLocaleString('vi-VN')})
              </div>
              {latestRecon.topBlockedReasons.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10.5px] text-slate-400">Lý do Write Gate chặn nhiều nhất:</div>
                  {latestRecon.topBlockedReasons.map((r, i) => (
                    <div key={i} className="text-[10.5px] text-rose-400 flex justify-between gap-2">
                      <span className="truncate">{r.reason}</span>
                      <span className="font-mono-num font-bold">{r.count}</span>
                    </div>
                  ))}
                </div>
              )}
              {latestRecon.discrepancies.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10.5px] text-slate-400">Sai lệch dữ liệu phát hiện:</div>
                  {latestRecon.discrepancies.slice(0, 8).map((d) => (
                    <div
                      key={d.id}
                      className="p-1.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10.5px]"
                    >
                      <span className="font-semibold text-amber-500">[{d.module}]</span> {d.note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: Undo Snapshots */}
      {activeSubTab === 'undo' && (
        <div className="space-y-2">
          {hubcwUndoSnapshots.length === 0 ? (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-center">
              Chưa có thao tác ghi nào cần hoàn tác.
            </div>
          ) : (
            hubcwUndoSnapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span className="uppercase text-sky-500 font-mono-num">{snap.operation}</span>
                    <span>{snap.module}</span>
                    <span className="font-mono-num text-[10.5px] text-slate-400">#{snap.externalRecordId}</span>
                  </div>
                  <div className="text-[10.5px] text-slate-400">
                    Bởi {snap.agentName} · {new Date(snap.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                {snap.reverted ? (
                  <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-400 text-[10.5px] font-semibold">
                    Đã hoàn tác
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRevert(snap.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-semibold shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Hoàn tác</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Sub-tab 4: Masked API Logs */}
      {activeSubTab === 'logs' && (
        <div className="space-y-1.5">
          {hubcwApiLogs.length === 0 ? (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-center">
              Chưa có nhật ký gọi API Hub.ChuyenWeb.
            </div>
          ) : (
            hubcwApiLogs.slice(0, 60).map((log) => (
              <div
                key={log.id}
                className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-0.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-sky-500" />
                    <span className="font-mono-num text-[10.5px]">{log.method}</span>
                    <span>{log.module}</span>
                    <span className="text-[10px] text-slate-400 font-mono-num">{log.endpoint}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      log.result === 'ok'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-rose-500/15 text-rose-500'
                    }`}
                  >
                    {log.result}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between gap-2">
                  <span className="truncate">
                    Agent: {log.agentName} · Mode: {log.envMode}
                    {log.externalRecordId ? ` · ID: ${log.externalRecordId}` : ''}
                    {log.reason ? ` · ${log.reason}` : ''}
                  </span>
                  <span className="font-mono-num shrink-0">{log.durationMs}ms</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sub-tab 5: Webhooks, BCP/DRP Drills & Clear Simulated Data (Z.8-Z.10) */}
      {activeSubTab === 'webhooks_bcp' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white">
              Outbound Webhook Endpoints ({webhookEndpoints.length})
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={whName}
                onChange={(e) => setWhName(e.target.value)}
                placeholder="Tên webhook (vd: CRM Sync)"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <input
                type="url"
                value={whUrl}
                onChange={(e) => setWhUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!whName.trim() || !whUrl.trim()) return;
                await putWebhookEndpoint({
                  id: `wh-${Date.now()}`,
                  name: whName.trim(),
                  targetUrl: whUrl.trim(),
                  events: ['invoice.paid', 'ticket.escalated', 'approval.granted'],
                  enabled: true,
                });
                setWhName('');
                setWhUrl('');
                setStatusMessage({ ok: true, text: 'Đã thêm Outbound Webhook endpoint.' });
              }}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
            >
              + Thêm Webhook
            </button>
            <div className="space-y-1.5">
              {webhookEndpoints.map((wh) => (
                <div
                  key={wh.id}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{wh.name}</div>
                    <div className="text-[10.5px] text-slate-400 font-mono-num truncate">
                      {wh.targetUrl} · Events: {wh.events.join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await testWebhookEndpoint(wh.id);
                        setStatusMessage({
                          ok: res.ok,
                          text: res.ok ? `Webhook ${wh.name}: HTTP ${res.status}` : `Webhook test lỗi HTTP ${res.status}`,
                        });
                      }}
                      className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] font-semibold cursor-pointer"
                    >
                      Test Ping
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteWebhookEndpoint(wh.id)}
                      className="px-2 py-1 rounded border border-rose-500/40 text-rose-500 text-[10.5px] cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/70 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white">
              Kế hoạch Dự phòng & Diễn tập Khôi phục (BCP / DRP · {bcpPlans.length})
            </div>
            {bcpPlans.map((bp) => (
              <div
                key={bp.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]"
              >
                <div className="min-w-0">
                  <div className="font-semibold">{bp.scenario}</div>
                  <div className="text-[10.5px] text-slate-400 font-mono-num">
                    RPO: {bp.rpoMinutes}p · RTO: {bp.rtoMinutes}p · Trạng thái: {bp.drillResult || 'Chưa diễn tập'}
                    {bp.lastDrillAt ? ` · Diễn tập: ${new Date(bp.lastDrillAt).toLocaleDateString('vi-VN')}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await runBcpDrill(bp.id);
                    setStatusMessage({ ok: true, text: `Đã hoàn tất diễn tập BCP: ${bp.scenario}` });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold cursor-pointer shrink-0"
                >
                  Chạy diễn tập
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-rose-500/40 p-3 bg-rose-500/5 space-y-2">
            <div className="font-bold text-rose-600 dark:text-rose-400">
              Dọn sạch toàn bộ Dữ liệu Mô phỏng (Simulated Clean Reset)
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Xóa toàn bộ bản ghi gắn nhãn <span className="font-mono-num">source=&quot;simulated&quot;</span> trên ERP, CRM, Kế toán, Pháp chế & Nhân sự để chuẩn bị vận hành dữ liệu công ty thật.
            </p>
            <button
              type="button"
              onClick={async () => {
                const res = await clearSimulatedDataAction();
                setStatusMessage({ ok: true, text: `Đã xóa ${res.removedCount} bản ghi dữ liệu mô phỏng.` });
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
            >
              Xóa toàn bộ dữ liệu Mô phỏng
            </button>
          </div>
        </div>
      )}

      {/* LIVE Pre-flight Confirmation Modal */}
      {preflightOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/50 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-500">
                <ShieldAlert className="w-5 h-5" />
                <span>XÁC NHẬN CHUYỂN SANG CHẾ ĐỘ LIVE (HUB.CHUYENWEB)</span>
              </div>
              <button
                type="button"
                onClick={() => setPreflightOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {preflightChecks.map((chk, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border flex items-start justify-between gap-2 text-[11px] ${
                    chk.ok
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    {chk.ok ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{chk.label}</span>
                  </div>
                  <span className="font-mono-num text-[10px] shrink-0">{chk.detail}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Gõ chính xác cụm từ: <strong className="text-rose-500">XÁC NHẬN CHẠY THẬT</strong>
                </label>
                <input
                  type="text"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder="XÁC NHẬN CHẠY THẬT"
                  className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Mật khẩu CEO (PBKDF2)</label>
                <input
                  type="password"
                  value={ceoPassword}
                  onChange={(e) => setCeoPassword(e.target.value)}
                  placeholder="Nhập mật khẩu CEO..."
                  className="w-full rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
                />
              </div>
            </div>

            {preflightError && (
              <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-500 text-[11px]">
                {preflightError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPreflightOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={preflightSubmitting}
                onClick={handleConfirmLive}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
              >
                {preflightSubmitting ? 'Đang xác thực...' : 'Kích hoạt LIVE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
