import { useState, useEffect, useRef } from 'react';

// Canvas-based dominant color extraction from a cover image URL.
// Returns a palette object used to theme the immersive public view.
// Results are cached per URL so repeated mounts don't re-sample.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, any>();

/** @param {[number, number, number]} rgb */
function luminance([r, g, b]: number[]) {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** @param {[number, number, number]} rgb @param {number} amount */
function darken([r, g, b]: number[], amount: number) {
  const f = Math.max(0, 1 - amount);
  return [Math.round(r * f), Math.round(g * f), Math.round(b * f)];
}

function saturate([r, g, b]: number[], factor: number) {
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return [
    Math.min(255, Math.round(gray + (r - gray) * factor)),
    Math.min(255, Math.round(gray + (g - gray) * factor)),
    Math.min(255, Math.round(gray + (b - gray) * factor)),
  ];
}

function colorDist([r1, g1, b1]: number[], [r2, g2, b2]: number[]) {
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
}

function kMeans(pixels: number[][], k: number, iterations = 12) {
  if (!pixels.length) return Array.from({ length: k }, () => ({ color: [20, 20, 20], count: 0 }));
  const n = pixels.length;
  let centroids = Array.from({ length: k }, (_, i) => [...pixels[Math.floor((i * n) / k)]]);

  for (let iter = 0; iter < iterations; iter++) {
    const clusters = Array.from({ length: k }, () => ({ sum: [0, 0, 0], count: 0 }));
    for (const p of pixels) {
      let best = 0, bestD = Infinity;
      for (let j = 0; j < k; j++) {
        const d = colorDist(p, centroids[j]);
        if (d < bestD) { bestD = d; best = j; }
      }
      clusters[best].sum[0] += p[0];
      clusters[best].sum[1] += p[1];
      clusters[best].sum[2] += p[2];
      clusters[best].count++;
    }
    centroids = clusters.map((c, i) =>
      c.count > 0
        ? [c.sum[0] / c.count, c.sum[1] / c.count, c.sum[2] / c.count]
        : centroids[i],
    );
  }

  const counts = new Array(k).fill(0);
  for (const p of pixels) {
    let best = 0, bestD = Infinity;
    for (let j = 0; j < k; j++) {
      const d = colorDist(p, centroids[j]);
      if (d < bestD) { bestD = d; best = j; }
    }
    counts[best]++;
  }

  return centroids.map((c, i) => ({
    color: [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])],
    count: counts[i],
  }));
}

function buildPalette(clusters: { color: number[]; count: number }[]) {
  const sorted = [...clusters].sort((a, b) => b.count - a.count);
  const dominant = sorted[0].color;
  const secondary = sorted[1]?.color ?? dominant;

  const lum = luminance(dominant);
  const isDark = lum < 0.25;

  const bg = darken(dominant, isDark ? 0.1 : 0.55);
  const bgDeep = darken(dominant, isDark ? 0.35 : 0.75);
  const accent = saturate(secondary, 1.4);
  const fgArr = isDark ? [235, 235, 235] : [20, 20, 20];

  const rgb = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;
  const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  return {
    bg: rgb(bg),
    bgDeep: rgb(bgDeep),
    bgGradient: `linear-gradient(160deg, ${rgb(bg)} 0%, ${rgb(bgDeep)} 100%)`,
    topFade: `linear-gradient(to bottom, ${rgb(bgDeep)}, transparent)`,
    bottomFade: `linear-gradient(to top, ${rgb(bgDeep)}, transparent)`,
    fg: rgb(fgArr),
    accent: rgb(accent),
    faded: rgba(fgArr, 0.35),
    nearer: rgba(fgArr, 0.65),
    isDark,
  };
}

function extractFromImage(imageUrl: string) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, 64, 64);

        const data = ctx.getImageData(0, 0, 64, 64).data;
        const pixels: number[][] = [];
        for (let i = 0; i < data.length; i += 16) {
          const a = data[i + 3];
          if (a > 128) pixels.push([data[i], data[i + 1], data[i + 2]]);
        }

        const clusters = kMeans(pixels, 4);
        resolve(buildPalette(clusters));
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

export function useColorPalette(imageUrl?: string | null) {
  // Tracks the URL for which we have an async result (avoids stale state on fast navigation).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [asyncResult, setAsyncResult] = useState<{ url: string; palette: any } | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    // Synchronous reads come from the module-level cache — no setState needed.
    if (!imageUrl || cache.has(imageUrl)) return;

    cancelRef.current = false;
    extractFromImage(imageUrl).then((p) => {
      if (cancelRef.current) return;
      if (p) cache.set(imageUrl, p);
      setAsyncResult({ url: imageUrl, palette: p });
    });

    return () => { cancelRef.current = true; };
  }, [imageUrl]);

  if (!imageUrl) return null;
  if (cache.has(imageUrl)) return cache.get(imageUrl);
  if (asyncResult?.url === imageUrl) return asyncResult.palette;
  return null;
}
