import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

/**
 * Synchronous QR / barcode rendering to an offscreen canvas. Rendering is sync so the editor preview
 * and the export loop can both call it inline. Results are cached (bounded) because the same value
 * is redrawn on every editor update.
 */

const CACHE_LIMIT = 300;
const cache = new Map<string, HTMLCanvasElement | null>();

const remember = (key: string, value: HTMLCanvasElement | null) => {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
};

const renderQR = (text: string, color: string, targetPx: number): HTMLCanvasElement | null => {
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    const quiet = 1;
    const total = n + quiet * 2;
    const cell = Math.max(2, Math.ceil(targetPx / total));
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = total * cell;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.modules.get(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
      }
    }
    return canvas;
  } catch {
    // Text too long for a QR code.
    return null;
  }
};

const renderBarcode = (text: string, color: string): HTMLCanvasElement | null => {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      lineColor: color,
      background: '#ffffff',
      width: 3,
      height: 110,
      margin: 10,
      displayValue: true,
      fontSize: 22,
    });
    return canvas;
  } catch {
    // CODE128 can't encode some characters (e.g. non-Latin text).
    return null;
  }
};

/** A canvas holding the code for `text`, or null when empty / unencodable. */
export const getCodeCanvas = (
  kind: 'qr' | 'barcode',
  text: string,
  color: string,
  targetPx: number
): HTMLCanvasElement | null => {
  if (text === '') return null;
  // Bucket sizes so dragging a resize handle doesn't re-render a QR on every pixel.
  const bucket = Math.max(128, Math.ceil(targetPx / 128) * 128);
  const key = `${kind}|${color}|${kind === 'qr' ? bucket : 0}|${text}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  return remember(key, kind === 'qr' ? renderQR(text, color, bucket) : renderBarcode(text, color));
};
