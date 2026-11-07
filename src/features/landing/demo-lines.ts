// Sample lyric, not UI copy. `cjk` lines have no spaces between words.
export const DEMO_LINES: { t: number; w: string[]; cjk?: boolean }[] = [
  { t: 0.4, w: ['The', 'stars', 'align', 'above', 'the', 'city', 'lights'] },
  { t: 3.6, w: ['Midnight', 'echoes', 'through', 'the', 'empty', 'halls'] },
  { t: 6.8, w: ['She', 'sang', 'a', 'melody', 'that', 'broke', 'the', 'night'] },
  { t: 10.0, w: ['And', 'disappeared', 'before', 'the', 'morning', 'calls'] },
  { t: 13.2, w: ['月明かりに', '照らされた', '道を'], cjk: true },
];

export function formatStamp(seconds: number): string {
  // Work in whole centiseconds: flooring float seconds turns 6.8 into "06.79".
  const total = Math.round(seconds * 100);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 6000))}:${pad(Math.floor(total / 100) % 60)}.${pad(total % 100)}`;
}
