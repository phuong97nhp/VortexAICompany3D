import { MessageSquare, Shield, X } from 'lucide-react';
import { getAgentById } from '../agents';
import { DEPARTMENTS } from '../config/departments';
import { useCompanyStore } from '../store/useCompanyStore';

export function AgentProfileModal() {
  const selectedAgentId = useCompanyStore((s) => s.selectedAgentId);
  const selectAgent = useCompanyStore((s) => s.selectAgent);
  const accounts = useCompanyStore((s) => s.accounts);
  const runtimes = useCompanyStore((s) => s.runtimes);
  const agentMemories = useCompanyStore((s) => s.agentMemories);
  const auditLogs = useCompanyStore((s) => s.auditLogs);
  const setActiveTab = useCompanyStore((s) => s.setActiveTab);
  const setActiveChannel = useCompanyStore((s) => s.setActiveChannel);

  if (!selectedAgentId) return null;
  const agent = getAgentById(selectedAgentId);
  if (!agent) return null;

  const account = accounts.find((a) => a.agentId === agent.id);
  const runtime = runtimes[agent.id];
  const memory = agentMemories[agent.id];
  const dept = DEPARTMENTS[agent.department];
  const agentLogs = auditLogs.filter((l) => l.agentId === agent.id).slice(0, 6);

  return (
    <div className="fixed bottom-4 left-72 z-30 w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-700 shadow-2xl p-4 text-slate-900 dark:text-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: agent.avatarColor }}
          >
            {agent.name.split(' ').slice(-1)[0][0]}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm truncate">{agent.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {agent.title} · {dept.shortName} (Tầng {agent.floor})
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => selectAgent(null, false)}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{agent.bio}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] text-slate-500">Trạng thái & Tác vụ</div>
          <div className="font-semibold mt-0.5 truncate">{runtime?.status || 'idle'}</div>
          <div className="text-[10px] text-slate-400 truncate">{runtime?.currentTaskTitle || 'Đang trực tại bàn'}</div>
        </div>
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[10px] text-slate-500">Tài khoản RBAC</div>
          <div className="font-semibold mt-0.5 flex items-center gap-1">
            <Shield className="w-3 h-3 text-sky-500" />
            <span>{account?.role || agent.role}</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate">{account?.internalEmail}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
          Quyền hạn ({account?.permissions.length || 0}) & Tool được phép ({agent.allowedTools.length})
        </div>
        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto text-[10px]">
          {(account?.permissions || []).map((p) => (
            <span key={p} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono-num">
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Bộ nhớ gần nhất</div>
        <div className="text-[11px] p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-20 overflow-y-auto space-y-0.5">
          {(memory?.shortTerm || []).slice(-3).map((m, idx) => (
            <div key={idx} className="truncate">• {m}</div>
          ))}
          {memory?.longTermSummary && (
            <div className="text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
              {memory.longTermSummary}
            </div>
          )}
        </div>
      </div>

      {agentLogs.length > 0 && (
        <div className="mt-2.5">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Nhật ký gần đây</div>
          <div className="space-y-1 max-h-16 overflow-y-auto text-[10px]">
            {agentLogs.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="truncate">{l.action}</span>
                <span className={l.result === 'allowed' ? 'text-emerald-500' : 'text-rose-500'}>
                  {l.result === 'allowed' ? 'Hợp lệ' : 'Từ chối'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveChannel(`dm:${agent.id}`);
            setActiveTab('chat');
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat riêng với {agent.name.split(' ').slice(-2).join(' ')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('customizer')}
          className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
        >
          Tùy chỉnh 3D
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rbac')}
          className="py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
        >
          Quyền
        </button>
      </div>
    </div>
  );
}
