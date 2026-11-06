export type Hsv = { h: number; s: number; v: number }; // h 0-360, s/v 0-1

const HEX6 = /^#[0-9a-f]{6}$/i;

export function isHex6(value: string): boolean {
  return HEX6.test(value);
}

/** Parses `#rrggbb`. Anything else yields mid grey so a bad stored value never throws in the UI. */
export function hexToHsv(hex: string): Hsv {
  if (!isHex6(hex)) return { h: 0, s: 0, v: 0.53 };
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(5))}${to(f(3))}${to(f(1))}`;
}
