import { Key, Play, ShieldAlert } from 'lucide-react';
import { executeAgentTool } from '../../engine/tools';
import { useCompanyStore } from '../../store/useCompanyStore';
import { VaultAccountStatus } from '../../types';

const STATUS_BADGE: Record<VaultAccountStatus['status'], { label: string; cls: string }> = {
  connected: { label: 'Đã kết nối (/worker)', cls: 'text-emerald-500' },
  dry_run_ready: { label: 'Mô phỏng (DRY_RUN)', cls: 'text-sky-500' },
  needs_verification: { label: 'Cần xác minh 2FA/OTP', cls: 'text-amber-500' },
  not_created: { label: 'Chưa khởi tạo', cls: 'text-slate-400' },
};

export function VaultPanel() {
  const vaultStatuses = useCompanyStore((s) => s.vaultStatuses);
  const putVaultStatus = useCompanyStore((s) => s.putVaultStatus);
  const dryRun = useCompanyStore((s) => s.settings.dryRun);

  const handleRunPlaybook = async (v: VaultAccountStatus, withCaptcha = false) => {
    const res = await executeAgentTool('account_provisioning', 'create_account', {
      platform: v.platform,
      simulateCaptcha: withCaptcha,
    });
    if (res.ok && !withCaptcha) {
      await putVaultStatus({
        ...v,
        status: dryRun ? 'dry_run_ready' : 'connected',
        lastCheckedAt: Date.now(),
        note: `Đã chạy ${v.playbook} (${dryRun ? 'Mô phỏng DRY_RUN' : 'Worker Local'}).`,
      });
    } else if (withCaptcha) {
      await putVaultStatus({
        ...v,
        status: 'needs_verification',
        lastCheckedAt: Date.now(),
        note: 'Dừng tại CAPTCHA/OTP — Đã gửi câu hỏi tới CEO.',
      });
    }
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
        <div className="font-bold flex items-center gap-1.5">
          <Key className="w-4 h-4 text-sky-500" />
          <span>Trạng thái Tài khoản & Credential Vault (Chỉ hiển thị trạng thái)</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Mật khẩu, cookie và token thật được mã hóa AES-256-GCM trong gói <code>/worker</code> (khóa từ{' '}
          <code>VAULT_SECRET</code>), không bao giờ lưu trên trình duyệt hay đưa vào prompt LLM. Chỉ{' '}
          <strong>Lương Thế Vinh (Account Provisioning)</strong> có quyền <code>account:create</code> +{' '}
          <code>vault:use</code>.
        </p>
      </div>

      <div className="space-y-2">
        {vaultStatuses.map((v) => {
          const st = STATUS_BADGE[v.status];
          return (
            <div
              key={v.id}
              className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{v.platform}</span>
                  <span className={`text-[11px] font-semibold ${st.cls}`}>· {st.label}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Handle: <span className="font-mono-num text-slate-300">{v.handle}</span> · Playbook:{' '}
                  <span className="font-mono-num">{v.playbook}</span>
                </div>
                <div className="text-[11px] text-slate-500">{v.note || v.purpose}</div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRunPlaybook(v, false)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  <span>Chạy Playbook</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRunPlaybook(v, true)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-amber-500/40 text-amber-500 text-[11px] font-medium cursor-pointer"
                  title="Thử kịch bản gặp CAPTCHA/OTP -> dừng & Hỏi CEO"
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>Test OTP</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
