import { useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Search, UserPlus } from 'lucide-react';
import { foldVietnamese } from '../engine/roleTemplates';
import { useCompanyStore } from '../store/useCompanyStore';

export function LeftOrgSidebar() {
  const agents = useCompanyStore((s) => s.agents);
  const departments = useCompanyStore((s) => s.departments);
  const selectRoom = useCompanyStore((s) => s.selectRoom);
  const selectAgent = useCompanyStore((s) => s.selectAgent);
  const selectedAgentId = useCompanyStore((s) => s.selectedAgentId);
  const runtimes = useCompanyStore((s) => s.runtimes);
  const accounts = useCompanyStore((s) => s.accounts);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);

  const [query, setQuery] = useState('');
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});

  const activeAgents = agents.filter((a) => a.employmentStatus !== 'archived');
  const q = foldVietnamese(query.trim());

  return (
    <aside className="w-64 shrink-0 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-slate-100 z-20">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight">
            <Building2 className="w-4 h-4 text-sky-500" />
            <span>Sơ đồ Tổ chức ({activeAgents.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('rbac')}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-600/15 text-sky-500 hover:bg-sky-600 hover:text-white text-[10.5px] font-semibold transition-colors cursor-pointer"
            title="Mở trang Tuyển dụng & Quản lý Nhân sự"
          >
            <UserPlus className="w-3 h-3" />
            <span>Nhân sự</span>
          </button>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm nhân sự hoặc phòng..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Quick Room Camera Jumps (dynamic departments + rooms) */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
          Bay nhanh tới phòng
        </div>
        <div className="flex flex-wrap gap-1">
          {departments.map((dept) => (
            <button
              key={dept.roomId}
              type="button"
              onClick={() => selectRoom(dept.roomId)}
              title={`${dept.name} (${dept.description})`}
              className="max-w-[115px] truncate px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-900 hover:bg-sky-500/15 hover:text-sky-400 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            >
              T{dept.floor} · {dept.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Department & Agent Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {departments.map((dept) => {
          const members = activeAgents.filter(
            (a) =>
              a.department === dept.id &&
              (!q ||
                foldVietnamese(a.name).includes(q) ||
                foldVietnamese(a.title).includes(q) ||
                foldVietnamese(dept.name).includes(q))
          );
          if (members.length === 0 && !dept.isCustom) return null;
          if (members.length === 0 && q) return null;
          const isCollapsed = Boolean(collapsedDepts[dept.id]) && !q;

          return (
            <div key={dept.id} className="rounded-lg border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
              <button
                type="button"
                onClick={() => setCollapsedDepts((prev) => ({ ...prev, [dept.id]: !prev[dept.id] }))}
                className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-900 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                  <span className="text-xs font-semibold truncate">{dept.shortName}</span>
                  <span className="text-[10px] text-slate-400">T{dept.floor}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0 font-mono-num">
                  <span>{members.length}</span>
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {members.length === 0 && (
                    <div className="px-2.5 py-2 text-[10.5px] text-slate-400">Phòng mới chưa có nhân sự</div>
                  )}
                  {members.map((agent) => {
                    const rt = runtimes[agent.id];
                    const acc = accounts.find((a) => a.agentId === agent.id);
                    const isSelected = selectedAgentId === agent.id;
                    const status = rt?.status || 'idle';
                    const isSuspended = agent.employmentStatus === 'suspended' || acc?.status === 'suspended';
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => selectAgent(agent.id, true)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/15 text-sky-400'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-medium truncate flex items-center gap-1.5">
                            <span className="truncate">{agent.name}</span>
                            {isSuspended && (
                              <span className="text-[9px] text-amber-500 font-bold">NGHỈ</span>
                            )}
                            {rt?.isDelayed && (
                              <span className="text-[9px] text-rose-500 font-bold">TRỄ</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {agent.title}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-medium shrink-0 ${
                            status === 'blocked'
                              ? 'text-rose-500 font-bold'
                              : status === 'sleeping'
                              ? 'text-slate-400'
                              : status === 'idle'
                              ? 'text-slate-400'
                              : 'text-emerald-500'
                          }`}
                        >
                          {status === 'blocked'
                            ? 'Chờ CEO'
                            : status === 'sleeping'
                            ? 'Ngủ'
                            : status === 'idle'
                            ? 'Rảnh'
                            : 'Đang chạy'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

