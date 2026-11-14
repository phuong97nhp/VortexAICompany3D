import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onResetQuality?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class CanvasErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Lỗi khởi tạo WebGL / React Three Fiber.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[3D Canvas ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-100 p-6">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-rose-500/50 p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Không thể hiển thị khung cảnh 3D WebGL</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Trình duyệt hoặc GPU gặp sự cố khi render cảnh 3D. Chi tiết lỗi:
            </p>
            <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap">
              {this.state.errorMessage}
            </pre>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  this.props.onResetQuality?.();
                  this.setState({ hasError: false, errorMessage: '' });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử dựng lại (Chất lượng Thấp)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
