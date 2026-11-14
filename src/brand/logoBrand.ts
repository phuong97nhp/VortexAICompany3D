import * as THREE from 'three';
import { BrandSettings } from '../types';

/**
 * Embedded exact SVG of Chuyên Web mini logo (downloaded from https://hub.chuyenweb.com/images/logo/logo_mini.svg)
 * Colors: Orange #E9A020 + Royal Blue #1B55E3
 */
export const DEFAULT_HUBCW_LOGO_SVG = `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid meet">
<g transform="translate(0.000000,800.000000) scale(0.100000,-0.100000)" stroke="none">
<path fill="#E9A020" d="M4854 5936 c-10 -22 -21 -43 -25 -46 -3 -3 -19 -32 -35 -65 -16 -33 -33 -64 -37 -70 -10 -11 -62 -110 -98 -185 -12 -25 -26 -47 -30 -48 -5 -2 -7 -8 -3 -13 3 -5 1 -9 -4 -9 -6 0 -20 -25 -33 -55 -12 -30 -26 -55 -29 -55 -4 0 -20 -28 -35 -62 -15 -35 -31 -65 -35 -68 -3 -3 -20 -32 -36 -65 -16 -33 -32 -62 -35 -65 -3 -3 -19 -32 -35 -65 -16 -33 -33 -64 -37 -70 -11 -12 -68 -121 -99 -187 -30 -66 -48 -62 -77 17 -14 36 -28 65 -32 65 -3 0 -12 15 -20 33 -7 17 -32 74 -56 125 -24 50 -43 97 -43 102 0 6 -5 10 -11 10 -5 0 -7 5 -4 10 3 6 2 10 -4 10 -5 0 -15 17 -22 37 -7 21 -32 77 -56 124 -23 47 -43 91 -43 98 0 6 -4 11 -9 11 -4 0 -21 34 -36 75 -15 41 -31 75 -35 75 -5 0 -12 10 -16 23 -4 12 -25 63 -48 112 -23 50 -48 105 -55 123 -8 17 -16 32 -20 32 -4 0 -13 16 -20 37 l-13 36 -142 -6 c-77 -4 -344 -7 -592 -7 l-451 0 20 -42 c11 -24 26 -50 33 -58 7 -8 13 -19 15 -25 3 -19 50 -119 57 -125 4 -3 21 -36 37 -75 16 -38 32 -72 36 -75 4 -3 20 -34 35 -70 16 -36 31 -67 35 -70 4 -3 20 -34 35 -70 16 -36 34 -71 41 -78 7 -7 13 -19 13 -25 0 -6 38 -89 85 -183 47 -95 85 -177 85 -183 0 -6 4 -11 8 -11 5 0 22 -30 37 -67 16 -38 32 -70 36 -73 4 -3 20 -34 35 -70 16 -36 34 -71 41 -78 6 -6 15 -22 18 -35 7 -23 159 -341 175 -367 16 -24 60 -122 60 -131 0 -5 5 -9 11 -9 5 0 7 -4 4 -10 -3 -5 -2 -10 3 -10 5 0 20 -27 33 -60 13 -33 26 -60 30 -60 3 0 19 -30 34 -67 16 -38 33 -69 37 -71 4 -2 8 -9 8 -14 0 -11 102 -230 120 -258 15 -23 60 -121 60 -131 0 -5 5 -9 11 -9 5 0 7 -4 4 -10 -3 -5 -2 -10 3 -10 5 0 20 -27 33 -60 13 -33 27 -60 32 -60 4 0 5 -4 2 -10 -3 -5 -2 -10 3 -10 5 0 20 -27 33 -60 13 -33 27 -60 31 -60 5 0 8 -5 8 -12 0 -7 40 -93 89 -192 49 -100 92 -191 96 -203 3 -13 10 -23 14 -23 4 0 19 -27 32 -60 13 -33 27 -60 32 -60 4 0 5 -5 2 -10 -3 -6 -2 -10 3 -10 5 0 20 -27 33 -60 13 -33 27 -60 32 -60 4 0 5 -4 2 -10 -3 -5 -2 -10 3 -10 5 0 20 27 33 60 13 33 26 60 30 60 3 0 19 30 34 68 16 37 32 69 35 72 4 3 32 59 64 125 31 66 61 127 67 135 5 8 18 33 28 55 10 22 37 79 60 127 22 48 41 92 41 98 0 5 4 10 8 10 5 0 22 30 37 68 16 37 32 69 35 72 4 3 32 59 64 125 31 66 62 127 67 135 5 8 21 40 35 70 14 30 41 87 60 126 19 38 34 76 34 82 0 7 4 12 8 12 5 0 22 30 37 68 16 37 32 69 36 72 4 3 20 34 35 70 16 36 33 70 39 76 6 6 22 39 35 73 14 33 28 61 31 61 4 0 17 26 30 58 12 31 31 69 41 84 10 14 18 29 18 33 0 3 23 53 50 110 28 57 50 109 50 114 0 6 4 11 8 11 5 0 22 30 37 68 16 37 32 69 36 72 4 3 20 34 35 70 16 36 32 67 36 71 4 3 20 34 34 70 14 35 32 71 40 80 8 8 14 18 14 22 0 3 23 53 50 111 28 58 50 110 50 116 0 5 4 10 8 10 5 0 22 30 37 68 16 37 32 69 36 72 4 3 20 34 35 70 16 36 31 67 35 70 4 3 20 34 35 70 15 36 33 72 40 80 7 8 22 40 34 70 12 30 26 60 31 66 8 10 -386 21 -924 25 -70 1 -143 5 -161 9 -33 7 -35 6 -52 -34z"/>
<path fill="#E9A020" d="M6351 5910 c-6 -22 -15 -40 -20 -40 -4 0 -21 -31 -36 -70 -15 -38 -31 -70 -35 -70 -3 0 -17 -26 -30 -57 -12 -32 -29 -65 -36 -73 -7 -8 -21 -37 -32 -65 -11 -27 -31 -70 -45 -95 -13 -25 -29 -62 -36 -83 -7 -20 -16 -37 -20 -37 -4 0 -21 -31 -36 -70 -15 -38 -31 -70 -35 -70 -4 0 -20 -31 -35 -70 -15 -38 -32 -70 -36 -70 -4 0 -11 -10 -15 -22 -4 -13 -42 -95 -84 -183 -43 -88 -81 -170 -85 -182 -3 -13 -10 -23 -14 -23 -4 0 -21 -31 -36 -70 -15 -38 -31 -70 -35 -70 -4 0 -20 -31 -35 -70 -15 -38 -32 -70 -36 -70 -4 0 -11 -10 -15 -22 -3 -13 -26 -63 -49 -113 -24 -49 -46 -100 -50 -112 -3 -13 -11 -23 -16 -23 -6 0 -7 -4 -4 -10 3 -5 2 -10 -2 -10 -5 0 -19 -27 -32 -60 -13 -33 -27 -60 -31 -60 -4 0 -20 -31 -35 -70 -15 -38 -32 -70 -36 -70 -4 0 -11 -10 -15 -22 -3 -13 -28 -68 -55 -123 -27 -54 -49 -105 -49 -111 0 -16 39 -107 49 -114 4 -3 17 -30 30 -60 13 -30 28 -61 33 -67 6 -7 24 -41 40 -75 16 -35 33 -65 37 -68 4 -3 17 -30 30 -60 13 -30 29 -62 35 -70 7 -8 23 -40 36 -70 12 -30 26 -57 30 -60 4 -3 20 -33 35 -67 15 -35 31 -63 35 -63 4 0 20 -32 35 -70 15 -38 31 -70 35 -70 3 0 17 -26 30 -57 12 -32 29 -65 35 -73 7 -8 22 -36 33 -62 12 -27 25 -48 29 -48 4 1 81 150 171 333 90 183 168 339 173 347 5 8 19 35 30 60 22 47 432 880 451 915 16 29 10 16 213 430 103 209 191 387 196 395 5 8 19 35 30 60 21 46 432 879 451 915 6 10 21 39 34 62 l22 43 -592 0 -593 0 -12 -40z"/>
<path fill="#1B55E3" d="M2039 5890 c-75 -13 -198 -48 -299 -87 -386 -146 -708 -413 -919 -762 -28 -46 -51 -90 -51 -98 0 -7 -4 -13 -8 -13 -5 0 -22 -33 -38 -72 -15 -40 -32 -75 -35 -78 -4 -3 -19 -48 -34 -100 -14 -52 -30 -102 -35 -111 -20 -37 -62 -343 -62 -459 -1 -98 42 -413 62 -455 5 -11 19 -54 31 -95 37 -129 134 -327 231 -471 72 -107 207 -259 302 -340 215 -183 518 -337 791 -400 82 -19 128 -25 328 -47 37 -4 97 -4 135 0 270 30 315 38 477 89 232 73 454 197 638 354 38 33 39 35 27 69 -6 20 -16 36 -21 36 -5 0 -8 3 -7 8 1 4 -7 28 -19 54 -12 25 -24 56 -28 67 -3 12 -11 21 -16 21 -6 0 -7 5 -4 10 3 6 2 10 -2 10 -5 0 -17 25 -28 56 -11 31 -26 66 -35 78 -10 11 -25 43 -35 70 -10 26 -23 53 -29 60 -7 6 -24 44 -40 84 -15 39 -31 72 -35 72 -4 0 -15 23 -25 50 -10 28 -23 53 -30 57 -6 3 -8 3 -4 -1 3 -4 -3 -20 -15 -34 -31 -38 -168 -173 -197 -195 -52 -38 -127 -83 -170 -101 -25 -11 -63 -27 -85 -37 -23 -10 -81 -25 -130 -34 -153 -29 -473 -8 -530 34 -5 4 -38 18 -73 31 -35 13 -69 28 -75 34 -7 7 -34 25 -62 40 -66 39 -254 229 -283 288 -12 26 -26 48 -30 50 -9 4 -52 109 -52 126 0 6 -5 12 -12 12 -6 0 -8 3 -5 7 4 3 3 11 -2 17 -20 24 -41 183 -41 311 0 128 21 287 41 311 5 6 6 14 2 17 -3 4 -1 7 5 7 7 0 12 6 12 14 0 18 42 120 52 124 4 2 18 24 30 50 29 59 217 250 283 287 28 16 57 34 65 40 8 7 42 23 75 36 33 13 65 27 71 31 26 19 160 41 280 47 l132 6 -70 145 c-161 331 -198 410 -243 505 -26 55 -56 119 -67 143 -11 23 -25 41 -31 41 -7 -1 -33 -5 -58 -9z"/>
</g>
</svg>`;

export const DEFAULT_BRAND_PALETTE: BrandSettings = {
  logoDataUrl: undefined,
  logoName: 'logo_mini.svg',
  primaryColor: '#1B55E3',
  secondaryColor: '#E9A020',
  accentColor: '#0F172A',
  defaultUniformStyle: 'vest',
};

export const DEFAULT_LOGO_PUBLIC_PATH = '/brand/logo_mini.svg';

export function getLogoSvgDataUrl(): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_HUBCW_LOGO_SVG)}`;
}

// === SINGLE SHARED CACHED THREE.JS CANVAS TEXTURES ===
// Prevents GPU memory bloat across 30+ Chibi instances & Office props.
let cachedLogoKey = '';
let cachedLogoTexture: THREE.CanvasTexture | null = null;
let cachedBadgeKey = '';
let cachedBadgeTexture: THREE.CanvasTexture | null = null;

function drawFallbackCwBadge(
  ctx: CanvasRenderingContext2D,
  size: number,
  primary: string,
  secondary: string
) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88, size * 0.22);
  ctx.fill();

  ctx.strokeStyle = primary;
  ctx.lineWidth = Math.max(4, size * 0.06);
  ctx.stroke();

  ctx.fillStyle = primary;
  ctx.font = `800 ${Math.round(size * 0.42)}px Inter, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('C', size * 0.51, size * 0.54);

  ctx.fillStyle = secondary;
  ctx.textAlign = 'left';
  ctx.fillText('W', size * 0.51, size * 0.54);
}

export function getSharedLogoTexture(
  logoDataUrl?: string,
  primary = DEFAULT_BRAND_PALETTE.primaryColor,
  secondary = DEFAULT_BRAND_PALETTE.secondaryColor
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const key = `${logoDataUrl || 'default_hubcw'}::${primary}::${secondary}`;
  if (cachedLogoTexture && cachedLogoKey === key) {
    return cachedLogoTexture;
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Draw crisp immediate fallback first so first frame never flashes blank
  drawFallbackCwBadge(ctx, size, primary, secondary);

  if (cachedLogoTexture) {
    cachedLogoTexture.dispose();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  cachedLogoKey = key;
  cachedLogoTexture = texture;

  const src = logoDataUrl || getLogoSvgDataUrl();
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.clearRect(0, 0, size, size);
    // Clean white rounded circular pill backing so logo stands out cleanly on dark or bright uniforms
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.beginPath();
    ctx.roundRect(10, 10, size - 20, size - 20, 48);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,0.12)';
    ctx.lineWidth = 4;
    ctx.stroke();

    const pad = 30;
    const scale = Math.min((size - pad * 2) / img.width, (size - pad * 2) / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    ctx.drawImage(img, (size - drawW) / 2, (size - drawH) / 2, drawW, drawH);
    texture.needsUpdate = true;
  };
  img.onerror = () => {
    // Fallback to public asset if inline SVG data URL fails in edge environment
    if (!logoDataUrl && src !== DEFAULT_LOGO_PUBLIC_PATH) {
      const retry = new Image();
      retry.onload = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.beginPath();
        ctx.roundRect(10, 10, size - 20, size - 20, 48);
        ctx.fill();
        ctx.drawImage(retry, 28, 28, size - 56, size - 56);
        texture.needsUpdate = true;
      };
      retry.src = DEFAULT_LOGO_PUBLIC_PATH;
    }
  };
  img.src = src;

  return texture;
}

export function getSharedStaffBadgeTexture(
  primary = DEFAULT_BRAND_PALETTE.primaryColor,
  secondary = DEFAULT_BRAND_PALETTE.secondaryColor
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const key = `${primary}::${secondary}`;
  if (cachedBadgeTexture && cachedBadgeKey === key) {
    return cachedBadgeTexture;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 176;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(4, 4, 120, 168, 12);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Top brand header bar
  ctx.fillStyle = primary;
  ctx.fillRect(4, 4, 120, 38);
  ctx.fillStyle = secondary;
  ctx.fillRect(4, 42, 120, 7);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 18px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('STAFF', 64, 29);

  // Body placeholder bars
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(64, 86, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.fillRect(26, 118, 76, 10);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(36, 136, 56, 7);

  if (cachedBadgeTexture) cachedBadgeTexture.dispose();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  cachedBadgeKey = key;
  cachedBadgeTexture = texture;
  return texture;
}

/**
 * Extract dominant primary & secondary hex colors from an uploaded SVG/PNG logo via HTML5 Canvas.
 */
export async function extractPaletteFromImageDataUrl(dataUrl: string): Promise<{
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}> {
  if (typeof document === 'undefined') {
    return {
      primaryColor: DEFAULT_BRAND_PALETTE.primaryColor,
      secondaryColor: DEFAULT_BRAND_PALETTE.secondaryColor,
      accentColor: DEFAULT_BRAND_PALETTE.accentColor,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = 64;
        const h = 64;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            primaryColor: DEFAULT_BRAND_PALETTE.primaryColor,
            secondaryColor: DEFAULT_BRAND_PALETTE.secondaryColor,
            accentColor: DEFAULT_BRAND_PALETTE.accentColor,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        const buckets = new Map<string, { r: number; g: number; b: number; count: number; sat: number }>();

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const lum = (max + min) / 2;
          // Skip near-white and near-black pixels
          if (lum > 240 || lum < 18) continue;
          const sat = max === 0 ? 0 : (max - min) / max;
          if (sat < 0.15) continue;

          const qR = Math.round(r / 24) * 24;
          const qG = Math.round(g / 24) * 24;
          const qB = Math.round(b / 24) * 24;
          const key = `${qR},${qG},${qB}`;
          const prev = buckets.get(key);
          if (prev) {
            prev.count += 1;
          } else {
            buckets.set(key, { r: qR, g: qG, b: qB, count: 1, sat });
          }
        }

        const sorted = [...buckets.values()].sort(
          (a, b) => b.count * (0.7 + b.sat) - a.count * (0.7 + a.sat)
        );
        const toHex = (c: { r: number; g: number; b: number }) =>
          `#${[c.r, c.g, c.b]
            .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
            .join('')}`;

        const primaryColor = sorted[0] ? toHex(sorted[0]) : DEFAULT_BRAND_PALETTE.primaryColor;
        const distinctSecond = sorted.find(
          (c) =>
            sorted[0] &&
            Math.abs(c.r - sorted[0].r) + Math.abs(c.g - sorted[0].g) + Math.abs(c.b - sorted[0].b) > 95
        );
        const secondaryColor = distinctSecond
          ? toHex(distinctSecond)
          : sorted[1]
            ? toHex(sorted[1])
            : DEFAULT_BRAND_PALETTE.secondaryColor;

        resolve({
          primaryColor,
          secondaryColor,
          accentColor: '#0F172A',
        });
      } catch {
        resolve({
          primaryColor: DEFAULT_BRAND_PALETTE.primaryColor,
          secondaryColor: DEFAULT_BRAND_PALETTE.secondaryColor,
          accentColor: DEFAULT_BRAND_PALETTE.accentColor,
        });
      }
    };
    img.onerror = () =>
      resolve({
        primaryColor: DEFAULT_BRAND_PALETTE.primaryColor,
        secondaryColor: DEFAULT_BRAND_PALETTE.secondaryColor,
        accentColor: DEFAULT_BRAND_PALETTE.accentColor,
      });
    img.src = dataUrl;
  });
}
