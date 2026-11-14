import { useState } from 'react';
import { PLATFORM_META } from '../../engine/marketingSeeds';
import { useCompanyStore } from '../../store/useCompanyStore';

export function LogsPanel() {
  const outreachLogs = useCompanyStore((s) => s.outreachLogs);
  const socialLogs = useCompanyStore((s) => s.socialLogs);
  const auditLogs = useCompanyStore((s) => s.auditLogs);
  const [subTab, setSubTab] = useState<'outreach' | 'social' | 'audit'>('outreach');

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSubTab('outreach')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
              subTab === 'outreach' ? 'bg-sky-600 text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Outreach Sales ({outreachLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('social')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
              subTab === 'social' ? 'bg-sky-600 text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Bài đăng & MXH ({socialLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('audit')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
              subTab === 'audit' ? 'bg-sky-600 text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Audit RBAC ({auditLogs.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {subTab === 'outreach' ? (
          outreachLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">Chưa có hành động gửi tin ra ngoài nào.</div>
          ) : (
            outreachLogs.map((o) => (
              <div
                key={o.id}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {o.agentName} → {o.leadName}
                  </span>
                  <span
                    className={`font-mono-num text-[11px] font-semibold ${
                      o.result.startsWith('blocked') ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                  >
                    {o.channel} · {o.dryRun ? 'Mô phỏng' : 'LIVE'} ({o.result})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {o.subjectOrPreview}
                </div>
                <div className="text-[10px] text-slate-400 font-mono-num">
                  {new Date(o.timestamp).toLocaleString('vi-VN')}
                </div>
              </div>
            ))
          )
        ) : subTab === 'social' ? (
          socialLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">Chưa có bài đăng hay phản hồi MXH nào.</div>
          ) : (
            socialLogs.map((s) => (
              <div
                key={s.id}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    {s.agentName} · {PLATFORM_META[s.platform]?.shortTag || s.platform}
                  </span>
                  <span
                    className={`font-mono-num text-[11px] font-semibold ${
                      s.result.startsWith('blocked') ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                  >
                    {s.simulated ? 'Mô phỏng' : 'LIVE'} ({s.result})
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">{s.preview}</div>
                <div className="text-[10px] text-slate-400 font-mono-num">
                  {new Date(s.timestamp).toLocaleString('vi-VN')}
                </div>
              </div>
            ))
          )
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">Chưa có bản ghi kiểm tra quyền RBAC nào.</div>
        ) : (
          auditLogs.map((a) => (
            <div
              key={a.id}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-semibold">
                  {a.agentName} · <span className="font-mono-num text-sky-500">{a.action}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Quyền: {a.permission || 'whitelist'} {a.reason ? `· ${a.reason}` : ''}
                </div>
                <div className="text-[10px] text-slate-500 font-mono-num">
                  {new Date(a.timestamp).toLocaleString('vi-VN')}
                </div>
              </div>
              <span
                className={`text-[11px] font-bold shrink-0 ${
                  a.result === 'allowed' ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {a.result === 'allowed' ? 'CHO PHÉP' : 'TỪ CHỐI'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
