import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Layers, RefreshCw, X } from 'lucide-react';

export interface HudRectBox {
  id: string;
  label: string;
  rect: { left: number; top: number; right: number; bottom: number };
}

export interface HudOverlapPair {
  aId: string;
  aLabel: string;
  bId: string;
  bLabel: string;
  overlapWidth: number;
  overlapHeight: number;
  aRect: { left: number; top: number; width: number; height: number };
  bRect: { left: number; top: number; width: number; height: number };
}

/**
 * Pure bounding-box overlap detector used both at runtime (Ctrl+Shift+L)
 * and in automated layout regression tests across 6 viewport resolutions.
 */
export function detectHudOverlaps(boxes: HudRectBox[], tolerancePx = 2): HudOverlapPair[] {
  const overlaps: HudOverlapPair[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const aw = a.rect.right - a.rect.left;
      const ah = a.rect.bottom - a.rect.top;
      const bw = b.rect.right - b.rect.left;
      const bh = b.rect.bottom - b.rect.top;
      if (aw <= 0 || ah <= 0 || bw <= 0 || bh <= 0) continue;

      const ox = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
      const oy = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
      if (ox > tolerancePx && oy > tolerancePx) {
        overlaps.push({
          aId: a.id,
          aLabel: a.label,
          bId: b.id,
          bLabel: b.label,
          overlapWidth: Math.round(ox),
          overlapHeight: Math.round(oy),
          aRect: { left: a.rect.left, top: a.rect.top, width: aw, height: ah },
          bRect: { left: b.rect.left, top: b.rect.top, width: bw, height: bh },
        });
      }
    }
  }
  return overlaps;
}

export interface ResponsiveHudMetrics {
  leftSidebarWidth: number;
  rightPanelWidth: number;
  centerWidth: number;
  voiceMode: 'full' | 'compact' | 'narrow_toggle';
  floorBarCompact: boolean;
  isDrawerSidebars: boolean;
}

/**
 * Computes guaranteed non-overlapping HUD dimensions for any screen resolution
 * (1366x768, 1536x864, 1920x1080, 2560x1440, 1024x768, 768x1024).
 */
export function computeResponsiveHudMetrics(
  viewportW: number,
  _viewportH: number,
  showLeft: boolean,
  showRight: boolean,
  requestedRightWidth = 580
): ResponsiveHudMetrics {
  const isDrawerSidebars = viewportW < 1024;
  const leftSidebarWidth = isDrawerSidebars || !showLeft ? 0 : viewportW >= 1280 ? 256 : 224;

  let rightPanelWidth = 0;
  if (!isDrawerSidebars && showRight) {
    const maxAllowedRight = Math.max(320, Math.floor(viewportW * 0.41));
    rightPanelWidth = Math.min(requestedRightWidth, maxAllowedRight);
  }

  const centerWidth = Math.max(300, viewportW - leftSidebarWidth - rightPanelWidth);

  const voiceMode: ResponsiveHudMetrics['voiceMode'] =
    viewportW >= 1500 && centerWidth >= 640
      ? 'full'
      : viewportW >= 1100 && centerWidth >= 420
      ? 'compact'
      : 'narrow_toggle';

  const floorBarCompact = viewportW < 1024 || centerWidth < 520;

  return {
    leftSidebarWidth,
    rightPanelWidth,
    centerWidth,
    voiceMode,
    floorBarCompact,
    isDrawerSidebars,
  };
}

export function HudOverlapInspector({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [overlaps, setOverlaps] = useState<HudOverlapPair[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

  const scanNow = () => {
    if (typeof document === 'undefined') return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-hud-item]'));
    const boxes: HudRectBox[] = [];
    for (const el of nodes) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      boxes.push({
        id: el.dataset.hudItem || 'hud',
        label: el.dataset.hudLabel || el.dataset.hudItem || 'HUD',
        rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      });
    }
    setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    setScannedCount(boxes.length);
    setOverlaps(detectHudOverlaps(boxes, 2));
  };

  useEffect(() => {
    if (!open) return;
    scanNow();
    const timer = window.setInterval(scanNow, 700);
    window.addEventListener('resize', scanNow);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', scanNow);
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Draw bright red bounding boxes over any overlapping HUD elements */}
      {overlaps.map((ov, idx) => (
        <div key={`${ov.aId}-${ov.bId}-${idx}`} className="pointer-events-none fixed inset-0 z-[70]">
          <div
            style={{
              position: 'fixed',
              left: ov.aRect.left,
              top: ov.aRect.top,
              width: ov.aRect.width,
              height: ov.aRect.height,
            }}
            className="border-2 border-dashed border-rose-500 bg-rose-500/10"
          />
          <div
            style={{
              position: 'fixed',
              left: ov.bRect.left,
              top: ov.bRect.top,
              width: ov.bRect.width,
              height: ov.bRect.height,
            }}
            className="border-2 border-dashed border-amber-400 bg-amber-500/10"
          />
        </div>
      ))}

      <div className="fixed top-14 right-4 z-[75] w-80 rounded-xl bg-slate-950/95 text-slate-100 border border-slate-700 shadow-2xl p-3 text-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5 font-bold text-sky-400">
            <Layers className="w-4 h-4" />
            <span>Kiểm tra chồng lấn HUD</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={scanNow}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
              title="Quét lại"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
              title="Đóng (Ctrl+Shift+L)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono-num">
          Viewport: {viewportSize.w}×{viewportSize.h}px · Đã quét {scannedCount} vùng HUD (Ctrl+Shift+L)
        </div>

        {overlaps.length === 0 ? (
          <div className="p-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>0 chồng lấn — Toàn bộ HUD tách biệt sạch sẽ</span>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {overlaps.map((ov, i) => (
              <div
                key={i}
                className="p-2 rounded-lg border border-rose-500/50 bg-rose-500/15 text-rose-200 text-[11px] flex items-start gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">
                    [{ov.aLabel}] đè [{ov.bLabel}]
                  </div>
                  <div className="text-[10px] font-mono-num text-rose-300">
                    Giao nhau: {ov.overlapWidth}×{ov.overlapHeight}px
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
