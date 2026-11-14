import { useState } from 'react';
import { KeyRound, Lock, ShieldCheck, Unlock } from 'lucide-react';
import { getAgentById } from '../../agents';
import { ALL_PERMISSIONS, ROLE_LABELS } from '../../engine/rbac';
import { executeAgentTool } from '../../engine/tools';
import { useCompanyStore } from '../../store/useCompanyStore';
import { RoleType } from '../../types';

export function RbacPanel() {
  const accounts = useCompanyStore((s) => s.accounts);
  const auditLogs = useCompanyStore((s) => s.auditLogs);
  const updateAccountRole = useCompanyStore((s) => s.updateAccountRole);
  const toggleAccountPermission = useCompanyStore((s) => s.toggleAccountPermission);
  const toggleAccountSuspended = useCompanyStore((s) => s.toggleAccountSuspended);
  const resetAgentToken = useCompanyStore((s) => s.resetAgentToken);

  const [selectedId, setSelectedId] = useState<string>('lead_hunter_edu');
  const [tokenNotice, setTokenNotice] = useState<string | null>(null);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  const selectedAcc = accounts.find((a) => a.agentId === selectedId) || accounts[0];
  const agent = selectedAcc ? getAgentById(selectedAcc.agentId) : undefined;
  const agentAudits = auditLogs.filter((l) => l.agentId === selectedAcc?.agentId).slice(0, 8);

  const handleTestDenied = async () => {
    // Test Lead Hunter calling send_outreach (which requires outreach:send)
    const res = await executeAgentTool('lead_hunter_edu', 'send_outreach', {
      leadId: 'lead_1',
      channel: 'Email',
      message: 'Kiểm thử RBAC',
    });
    setTestNotice(
      res.ok
        ? 'Trịnh Gia Huy đã được cấp quyền outreach:send.'
        : `Đã chặn đúng RBAC: ${String(res.output.error || 'Thiếu quyền')}`
    );
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-slate-400">
          Mỗi nhân sự AI có tài khoản & token băm SHA-256 riêng (không dùng chung admin).
        </div>
        <button
          type="button"
          onClick={handleTestDenied}
          className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
        >
          Kiểm thử RBAC
        </button>
      </div>

      {testNotice && (
        <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-amber-500/40 text-xs">
          {testNotice}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 overflow-hidden">
        {/* Agent Accounts List */}
        <div className="md:col-span-5 overflow-y-auto space-y-1.5 pr-1">
          {accounts.map((acc) => {
            const ag = getAgentById(acc.agentId);
            const isSel = selectedAcc?.agentId === acc.agentId;
            return (
              <button
                key={acc.agentId}
                type="button"
                onClick={() => {
                  setSelectedId(acc.agentId);
                  setTokenNotice(null);
                }}
                className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  isSel
                    ? 'bg-sky-600/15 border-sky-500/50'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold truncate">{ag?.name || acc.username}</span>
                  <span
                    className={`text-[10px] font-bold ${
                      acc.status === 'active' ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {acc.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {ag?.title} · Role: {acc.role} · {acc.permissions.length} quyền
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Account Permission Editor */}
        {selectedAcc && (
          <div className="md:col-span-7 overflow-y-auto rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold">{agent?.name}</h4>
                <div className="text-[11px] text-slate-400 font-mono-num">
                  {selectedAcc.internalEmail} · Hash: {selectedAcc.tokenHash.slice(0, 14)}…
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    const preview = await resetAgentToken(selectedAcc.agentId);
                    setTokenNotice(`Token nội bộ mới (chỉ hiện 1 lần, lưu dạng băm SHA-256): ${preview}`);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-medium cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Reset Token</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleAccountSuspended(selectedAcc.agentId)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                    selectedAcc.status === 'active'
                      ? 'bg-rose-600/15 text-rose-500 border border-rose-500/30'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {selectedAcc.status === 'active' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{selectedAcc.status === 'active' ? 'Tạm khóa' : 'Mở khóa'}</span>
                </button>
              </div>
            </div>

            {tokenNotice && (
              <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono-num text-emerald-400">
                {tokenNotice}
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold">Vai trò (Role):</label>
              <select
                value={selectedAcc.role}
                onChange={(e) => updateAccountRole(selectedAcc.agentId, e.target.value as RoleType)}
                className="text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1"
              >
                {(Object.keys(ROLE_LABELS) as RoleType[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                <span>Phân quyền chi tiết (resource:action)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ALL_PERMISSIONS.map((perm) => {
                  const enabled = selectedAcc.permissions.includes(perm.key);
                  return (
                    <label
                      key={perm.key}
                      className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-[11px] cursor-pointer ${
                        enabled
                          ? 'bg-sky-600/10 border-sky-500/40'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-70'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-mono-num font-semibold truncate">{perm.key}</div>
                        <div className="text-[10px] text-slate-400 truncate">{perm.label}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleAccountPermission(selectedAcc.agentId, perm.key)}
                        className="accent-sky-600 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold mb-1">Lịch sử kiểm tra quyền tài khoản này</div>
              <div className="space-y-1">
                {agentAudits.length === 0 ? (
                  <div className="text-[11px] text-slate-400">Chưa phát sinh audit log cho tài khoản này.</div>
                ) : (
                  agentAudits.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between text-[11px] p-1.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                    >
                      <span className="truncate">
                        {l.action} ({l.permission || '—'})
                      </span>
                      <span className={l.result === 'allowed' ? 'text-emerald-500' : 'text-rose-500 font-semibold'}>
                        {l.result === 'allowed' ? 'Hợp lệ' : 'Từ chối'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
