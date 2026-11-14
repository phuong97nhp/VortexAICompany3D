import { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { verifyPasswordPBKDF2 } from '../engine/auth';
import { useCompanyStore } from '../store/useCompanyStore';

export function CeoSecurityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useCompanyStore((s) => s.settings);
  const changeCeoPassword = useCompanyStore((s) => s.changeCeoPassword);

  const [currentPwd, setCurrentPwd] = useState('admin123');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const ok = await verifyPasswordPBKDF2(
      currentPwd,
      settings.ceoPasswordSalt,
      settings.ceoPasswordHash
    );
    if (!ok) {
      setError('Mật khẩu hiện tại không đúng (mặc định lần đầu: admin123).');
      return;
    }
    if (newPwd.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    await changeCeoPassword(newPwd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-5 shadow-2xl space-y-3 text-slate-900 dark:text-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm">Đổi mật khẩu mặc định CEO</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Để bảo mật phiên điều hành công ty, vui lòng đổi mật khẩu mặc định (<code>admin123</code>). Mật khẩu được băm bằng WebCrypto PBKDF2 SHA-256.
        </p>

        <form onSubmit={handleSubmit} className="space-y-2.5 text-xs">
          <div>
            <label className="block mb-1 text-slate-400">Mật khẩu hiện tại</label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block mb-1 text-slate-400">Mật khẩu mới</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Tối thiểu 6 ký tự..."
              className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block mb-1 text-slate-400">Nhập lại mật khẩu mới</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className="w-full rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2"
            />
          </div>

          {error && <div className="text-rose-500 font-medium">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Để sau
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
            >
              Cập nhật mật khẩu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
