import { useMemo, useState } from 'react';
import { Monitor, RefreshCw, Shuffle, X } from 'lucide-react';
import { useCompanyStore } from '../store/useCompanyStore';
import { AgentScreenSnapshot } from '../types';

export function MonitorWallModal() {
  const open = useCompanyStore((s) => s.monitorWallOpen);
  const setMonitorWallOpen = useCompanyStore((s) => s.setMonitorWallOpen);
  const openSpotCheck = useCompanyStore((s) => s.openSpotCheck);
  const runRandomSpotCheck = useCompanyStore((s) => s.runRandomSpotCheck);
  const captureAgentScreen = useCompanyStore((s) => s.captureAgentScreen);
  const agents = useCompanyStore((s) => s.agents);
  const departments = useCompanyStore((s) => s.departments);
  const runtimes = useCompanyStore((s) => s.runtimes);

  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [refreshTick, setRefreshTick] = useState(0);

  const snapshots = useMemo(() => {
    void refreshTick;
    const candidates = agents
      .filter((a) => a.employmentStatus === 'active')
      .filter((a) => deptFilter === 'all' || a.department === deptFilter)
      .sort((a, b) => {
        const ra = runtimes[a.id]?.status === 'idle' ? 1 : 0;
        const rb = runtimes[b.id]?.status === 'idle' ? 1 : 0;
        return ra - rb;
      })
      .slice(0, 9);

    return candidates
      .map((a) => captureAgentScreen(a.id))
      .filter(Boolean) as AgentScreenSnapshot[];
  }, [open, agents, deptFilter, runtimes, refreshTick, captureAgentScreen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6">
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-sky-500" />
            <div>
              <h2 className="text-sm font-bold">Tường Giám Sát 24/7 (6–9 Màn hình Agent Trực tiếp)</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Bấm vào bất kỳ màn hình nào để phóng to Spot-Check chi tiết · Dữ liệu lấy trực tiếp từ engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
            >
              <option value="all">Tất cả phòng ban</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.shortName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setRefreshTick((t) => t + 1)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                setMonitorWallOpen(false);
                await runRandomSpotCheck('ceo');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Soi ngẫu nhiên</span>
            </button>
            <button
              type="button"
              onClick={() => setMonitorWallOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {snapshots.map((snap) => (
            <button
              key={snap.agentId}
              type="button"
              onClick={() => {
                setMonitorWallOpen(false);
                openSpotCheck(snap.agentId);
              }}
              className="text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-sky-500 p-3 flex flex-col gap-2 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{snap.agentName}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {snap.department} · {snap.simulated ? 'Mô phỏng' : 'LIVE'}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold font-mono-num shrink-0 ${
                    snap.verdict === 'đúng việc'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : snap.verdict === 'nhàn rỗi'
                      ? 'text-slate-500'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {snap.verdict} · {snap.score}đ
                </span>
              </div>

              <div className="text-xs font-medium truncate">{snap.taskInfo.title}</div>

              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-600"
                  style={{ width: `${Math.min(100, Math.max(0, snap.taskInfo.progressPercent))}%` }}
                />
              </div>

              <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-[11px] text-slate-600 dark:text-slate-300 h-16 overflow-hidden">
                {snap.recentToolLogs[0]
                  ? `[${snap.recentToolLogs[0].source}] ${snap.recentToolLogs[0].summaryMasked}`
                  : snap.activeDraft?.excerptMasked || snap.verdictReason}
              </div>

              <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-mono-num">
                <span>ETA: {snap.taskInfo.etaLabel}</span>
                <span>{snap.tokenStatsToday.totalTokens.toLocaleString('vi-VN')} tok</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
