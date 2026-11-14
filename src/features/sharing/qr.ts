/**
 * QR code data and PNG export for the share sheet. The code carries the app logo in its
 * centre, so it uses the highest error correction (level H survives ~30% damage; the logo
 * covers about 5% of the area).
 */

/** The brand mark in fixed dark-theme colours: the favicon switches palette with the OS theme, a QR tile must not. */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="12" fill="#232136"/>
<g transform="translate(5 5) scale(0.84375)">
<g fill="#c4a7e7"><rect x="4" y="13" width="24" height="5.5" rx="2.75"/><rect x="7" y="21" width="21" height="5.5" rx="2.75"/><rect x="12" y="29" width="16" height="5.5" rx="2.75"/></g>
<g fill="none" stroke="#c4a7e7" stroke-width="1.8"><rect x="36.9" y="13.9" width="22.2" height="3.7" rx="1.85"/><rect x="36.9" y="21.9" width="14.2" height="3.7" rx="1.85"/><rect x="36.9" y="29.9" width="7.2" height="3.7" rx="1.85"/></g>
<g fill="#f6c177"><circle cx="32" cy="7" r="4.5"/><rect x="30.25" y="12" width="3.5" height="24.5" rx="1.75"/><circle cx="32" cy="40.5" r="2"/><circle cx="32" cy="46.5" r="1.8"/><circle cx="32" cy="52" r="1.6"/><circle cx="32" cy="57" r="1.4"/><circle cx="32" cy="61.5" r="1.2"/></g>
</g>
</svg>`;

export const LOGO_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG)}`;

/** Modules of margin around the code (the QR spec asks for 4; scanners cope with 2 on a light tile). */
export const QR_QUIET = 2;
/** Logo tile width as a share of the code's width, quiet zone excluded. */
export const QR_LOGO_RATIO = 0.22;
/** White padding around the logo, in the same unit. */
const LOGO_PAD = 0.025;

export interface QrModules {
  size: number;
  dark: boolean[];
}

export async function qrModules(value: string): Promise<QrModules> {
  const { create } = await import('qrcode');
  const qr = create(value, { errorCorrectionLevel: 'H' });
  const size = qr.modules.size;
  const dark = Array.from({ length: size * size }, (_, i) => qr.modules.get(i % size, Math.floor(i / size)) === 1);
  return { size, dark };
}

/** Where the logo tile sits, in module units (origin at the first module). */
export function logoBox(size: number): { x: number; y: number; side: number; pad: number } {
  const side = size * QR_LOGO_RATIO;
  return { x: (size - side) / 2, y: (size - side) / 2, side, pad: size * LOGO_PAD };
}

/** The code as a PNG: black on white, logo in the centre, scaled to a whole number of pixels per module. */
export async function renderQrPng(value: string, targetPx = 1024): Promise<Blob> {
  const { size, dark } = await qrModules(value);
  const scale = Math.max(1, Math.floor(targetPx / (size + QR_QUIET * 2)));
  const px = scale * (size + QR_QUIET * 2);
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = '#000000';
  const origin = QR_QUIET * scale;
  dark.forEach((on, i) => {
    if (on) ctx.fillRect(origin + (i % size) * scale, origin + Math.floor(i / size) * scale, scale, scale);
  });

  const { x, y, side, pad } = logoBox(size);
  const img = new Image();
  img.src = LOGO_DATA_URL;
  await img.decode();
  ctx.fillStyle = '#ffffff';
  const tile = (side + pad * 2) * scale;
  ctx.beginPath();
  ctx.roundRect(origin + (x - pad) * scale, origin + (y - pad) * scale, tile, tile, tile * 0.18);
  ctx.fill();
  ctx.drawImage(img, origin + x * scale, origin + y * scale, side * scale, side * scale);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the QR code'))), 'image/png');
  });
}

/** Whether the browser can hand an image file to the system share sheet. */
export function canShareQrFile(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function' || typeof File === 'undefined') return false;
  try {
    return navigator.canShare({ files: [new File([], 'qr.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}
