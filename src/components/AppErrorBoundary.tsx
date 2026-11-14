import React from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
  stack?: string;
}

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      hasError: true,
      message: err.message || 'Lỗi không xác định khi khởi tạo giao diện',
      stack: err.stack,
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary] Lỗi nghiêm trọng:', error, info);
  }

  handleResetLocalData = async () => {
    try {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('AICompany3D_DB_v1');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    } catch {
      // ignore IndexedDB cleanup errors
    }
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-2xl border border-rose-500/40 bg-slate-900 p-6 shadow-2xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">
                Ứng dụng gặp sự cố trong quá trình khởi động
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                Hệ thống đã chặn màn hình trắng để Chủ tịch kiểm tra nguyên nhân và khôi phục an toàn.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-rose-300 break-words max-h-48 overflow-y-auto">
            <div className="font-semibold">{this.state.message}</div>
            {this.state.stack && (
              <pre className="mt-2 text-[10.5px] text-slate-400 whitespace-pre-wrap">{this.state.stack}</pre>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Thử tải lại</span>
            </button>
            <button
              type="button"
              onClick={this.handleResetLocalData}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Đặt lại dữ liệu cục bộ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
