/**
 * Optional local OCR fallback using tesseract.js (vie+eng) if installed on Worker host.
 * Fails gracefully with null if tesseract.js is not present in node_modules.
 */
export async function tryOcrImageWithTesseract(screenshotDataUrl?: string): Promise<string | null> {
  if (!screenshotDataUrl || !screenshotDataUrl.startsWith('data:image/png;base64,')) {
    return null;
  }
  try {
    const b64 = screenshotDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(b64, 'base64');
    // Dynamic runtime import so environments without tesseract.js compile and run cleanly
    const modName = 'tesseract.js';
    const tesseract = (await import(/* @vite-ignore */ modName)) as {
      createWorker?: (langs?: string) => Promise<{
        recognize: (img: Buffer) => Promise<{ data?: { text?: string } }>;
        terminate: () => Promise<void>;
      }>;
    };
    if (!tesseract?.createWorker) return null;
    const worker = await tesseract.createWorker('vie+eng');
    try {
      const result = await worker.recognize(buffer);
      const clean = String(result?.data?.text || '')
        .replace(/\s+/g, ' ')
        .trim();
      return clean || null;
    } finally {
      await worker.terminate().catch(() => {});
    }
  } catch {
    return null;
  }
}
