import { BookOpen, Command, MonitorCheck, Smartphone, ShieldCheck, X } from 'lucide-react';
import { useCompanyStore } from '../store/useCompanyStore';

export function HelpGuideModal() {
  const open = useCompanyStore((s) => s.helpGuideOpen);
  const setOpen = useCompanyStore((s) => s.setHelpGuideOpen);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold">Hướng dẫn Vận hành Nhanh — Văn phòng 3D AI Company</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 text-xs leading-relaxed">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
            <div className="font-bold text-sky-400 flex items-center gap-1.5">
              <Command className="w-3.5 h-3.5" /> Phím tắt nhanh
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-slate-300">
              <li><code className="text-amber-300">Ctrl+K</code> (hoặc <code className="text-amber-300">Cmd+K</code>): Mở Bảng lệnh nhanh nhảy thẳng tới bất kỳ phòng ban, nhân sự, hoặc tab ERP.</li>
              <li><code className="text-amber-300">Alt+D</code>: Bật/tắt bảng Chẩn đoán 3D (FPS, số mesh, lỗi WebGL).</li>
              <li>Click thẳng vào màn hình máy tính trong cảnh 3D hoặc nút <strong>Spot-Check</strong> để xem màn hình thật của agent.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /> Điều khiển Điện thoại Android qua USB (ADB)
            </div>
            <ol className="list-decimal pl-5 space-y-0.5 text-slate-300">
              <li>Chạy worker trên máy tính của CEO (<code className="text-amber-300">npm run dev</code> / <code className="text-amber-300">worker</code>), cắm cáp USB & bật Gỡ lỗi USB trên điện thoại.</li>
              <li>Chạm “Cho phép Gỡ lỗi USB (RSA)” trực tiếp trên màn hình điện thoại.</li>
              <li>Vào tab <strong>Thiết bị Android</strong>: mặc định luôn là <strong>Chỉ xem</strong>; mọi app Ngân hàng/Ví/2FA/Quản lý mật khẩu bị chặn cứng ở tầng chính sách.</li>
            </ol>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <MonitorCheck className="w-3.5 h-3.5" /> Dữ liệu Mô phỏng vs Dữ liệu Thật (LIVE)
            </div>
            <p className="text-slate-300">
              Ở chế độ Sandbox ban đầu, các bản ghi mẫu có nhãn <strong>Mô phỏng</strong>. Khi chuyển sang vận hành thật với HubCW, Zalo OA, hoặc Điện thoại thật, nhấn nút <strong>Xóa dữ liệu Mô phỏng</strong> trong Dashboard CEO hoặc tab Kết nối để làm sạch toàn bộ bản ghi mẫu.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
            <div className="font-bold text-indigo-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Cài đặt thành App (PWA) trên Điện thoại / Máy tính
            </div>
            <p className="text-slate-300">
              Nhấn nút <strong>Cài App</strong> trên thanh TopBar (hoặc Chọn &ldquo;Thêm vào Màn hình chính&rdquo; trên Safari iOS) để mở nhanh Dashboard CEO, nhận Push cảnh báo, và duyệt phiếu chi/hợp đồng mọi lúc.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
