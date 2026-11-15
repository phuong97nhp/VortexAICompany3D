import { useState } from 'react';
import { AlertOctagon, Cpu, GitBranch, Plus, ShieldCheck } from 'lucide-react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { EngineeringRoadmapItem, SoftwareReleaseRecord } from '../../types';

type EngTab = 'roadmap' | 'releases' | 'incidents' | 'security';

export function EngineeringOpsPanel() {
  const roadmapItems = useCompanyStore((s) => s.roadmapItems);
  const softwareReleases = useCompanyStore((s) => s.softwareReleases);
  const engineeringIncidents = useCompanyStore((s) => s.engineeringIncidents);
  const securityAssets = useCompanyStore((s) => s.securityAssets);

  const putRoadmapItem = useCompanyStore((s) => s.putRoadmapItem);
  const putSoftwareRelease = useCompanyStore((s) => s.putSoftwareRelease);
  const putEngineeringIncident = useCompanyStore((s) => s.putEngineeringIncident);
  const putSecurityAsset = useCompanyStore((s) => s.putSecurityAsset);

  const [tab, setTab] = useState<EngTab>('roadmap');
  const [newFeatTitle, setNewFeatTitle] = useState('');
  const [newRelVer, setNewRelVer] = useState('');
  const [newRelLog, setNewRelLog] = useState('');

  const handleAddFeature = async () => {
    if (!newFeatTitle.trim()) return;
    await putRoadmapItem({
      id: `rm_${Date.now().toString(36)}`,
      code: `#FEAT-${String(roadmapItems.length + 1).padStart(2, '0')}`,
      title: newFeatTitle.trim(),
      quarter: 'Q2-2026',
      status: 'planned',
      priority: 'p1',
      ownerAgentId: 'tech_pm',
      productId: 'edu-center',
      source: 'manual',
      updatedAt: Date.now(),
    });
    setNewFeatTitle('');
  };

  const handleCreateRelease = async (environment: SoftwareReleaseRecord['environment']) => {
    if (!newRelVer.trim()) return;
    await putSoftwareRelease({
      id: `rel_${Date.now().toString(36)}`,
      version: newRelVer.trim(),
      environment,
      changelog: newRelLog.trim() || 'Cập nhật tối ưu hiệu năng và sửa lỗi.',
      qaPassRatePercent: 98,
      uptimePercent: 99.95,
      releasedBy: 'tech_pm',
      status: environment === 'production' ? 'deployed' : 'staging_ready',
      releasedAt: Date.now(),
    });
    setNewRelVer('');
    setNewRelLog('');
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-hidden">
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setTab('roadmap')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
            tab === 'roadmap' ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Roadmap ({roadmapItems.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('releases')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
            tab === 'releases' ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Phát hành & Uptime ({softwareReleases.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('incidents')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
            tab === 'incidents' ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Sự cố & Postmortem ({engineeringIncidents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('security')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
            tab === 'security' ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>An ninh & Sao lưu ({securityAssets.length})</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {tab === 'roadmap' && (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFeatTitle}
                onChange={(e) => setNewFeatTitle(e.target.value)}
                placeholder="Thêm tính năng vào Backlog / Roadmap..."
                className="flex-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm
              </button>
            </div>
            {roadmapItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num text-xs font-bold text-sky-500">{item.code}</span>
                    <span className="text-xs font-semibold">{item.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {item.quarter} · Ưu tiên {item.priority.toUpperCase()} · {item.releaseVersion || 'Chưa gán version'}
                  </div>
                </div>
                <select
                  value={item.status}
                  onChange={(e) =>
                    putRoadmapItem({ ...item, status: e.target.value as EngineeringRoadmapItem['status'] })
                  }
                  className="text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2 py-1"
                >
                  <option value="backlog">Backlog</option>
                  <option value="planned">Kế hoạch</option>
                  <option value="in_progress">Đang code</option>
                  <option value="qa">Đang QA</option>
                  <option value="released">Đã phát hành</option>
                </select>
              </div>
            ))}
          </>
        )}

        {tab === 'releases' && (
          <>
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap gap-2">
              <input
                type="text"
                value={newRelVer}
                onChange={(e) => setNewRelVer(e.target.value)}
                placeholder="Phiên bản (vd: v2.4.2)"
                className="w-36 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5"
              />
              <input
                type="text"
                value={newRelLog}
                onChange={(e) => setNewRelLog(e.target.value)}
                placeholder="Ghi chú thay đổi (Changelog)..."
                className="flex-1 min-w-[180px] text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5"
              />
              <button
                type="button"
                onClick={() => handleCreateRelease('staging')}
                className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold cursor-pointer"
              >
                Đẩy Staging
              </button>
              <button
                type="button"
                onClick={() => handleCreateRelease('production')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Release Production
              </button>
            </div>
            {softwareReleases.map((rel) => (
              <div
                key={rel.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num text-xs font-bold text-emerald-500">{rel.version}</span>
                    <span className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-[10px] uppercase">
                      {rel.environment}
                    </span>
                    <span className="text-[11px] font-mono-num text-slate-400">
                      QA {rel.qaPassRatePercent}% · Uptime {rel.uptimePercent}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{rel.changelog}</p>
                </div>
                {rel.status !== 'rolled_back' && (
                  <button
                    type="button"
                    onClick={() => putSoftwareRelease({ ...rel, status: 'rolled_back' })}
                    className="px-2 py-1 rounded border border-rose-500/40 text-rose-500 text-[11px] cursor-pointer"
                  >
                    Rollback
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {tab === 'incidents' &&
          engineeringIncidents.map((inc) => (
            <div
              key={inc.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono-num text-xs font-bold text-rose-500">{inc.code}</span>
                  <span className="text-xs font-bold">{inc.title}</span>
                </div>
                {inc.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() => putEngineeringIncident({ ...inc, status: 'resolved', resolvedAt: Date.now() })}
                    className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] cursor-pointer"
                  >
                    Đánh dấu Đã xử lý
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                Service: {inc.serviceName} · {inc.severity.toUpperCase()} · Trạng thái: {inc.status}
              </div>
              <div className="text-xs">Nguyên nhân gốc: {inc.rootCause}</div>
              <div className="text-xs text-emerald-500">Hành động phòng ngừa: {inc.postmortemActions}</div>
            </div>
          ))}

        {tab === 'security' &&
          securityAssets.map((sec) => (
            <div
              key={sec.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 flex items-center justify-between gap-2"
            >
              <div>
                <div className="text-xs font-bold">{sec.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  [{sec.kind}] {sec.environment} · Mức độ: {sec.severity.toUpperCase()} · {sec.notes}
                </div>
              </div>
              <button
                type="button"
                onClick={() => putSecurityAsset({ ...sec, status: 'verified', lastCheckedAt: Date.now() })}
                className="px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 text-[11px] font-semibold cursor-pointer shrink-0"
              >
                {sec.status === 'verified' || sec.status === 'patched' ? 'Đã kiểm tra' : 'Xác minh'}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
