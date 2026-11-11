/** `m:ss.mmm`, or `h:mm:ss.mmm` from one hour up. Rounded to whole milliseconds. */
export function formatClock(seconds: number): string {
  const ms = Math.max(0, Math.round((Number.isFinite(seconds) ? seconds : 0) * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const frac = String(ms % 1000).padStart(3, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}.${frac}` : `${m}:${ss}.${frac}`;
}

/**
 * Reads what a person types into a time field: `62`, `62.5`, `1:02.5` or `1:02:03.5`.
 * Returns seconds, or null when it is not a time (empty, negative, minutes or seconds
 * of 60 or more after the first group, or stray characters).
 */
export function parseClock(input: string): number | null {
  const text = input.trim().replace(',', '.');
  if (!text) return null;
  const groups = text.split(':');
  if (groups.length > 3) return null;
  if (!groups.every((g, i) => (i === groups.length - 1 ? /^\d+(\.\d+)?$/.test(g) : /^\d+$/.test(g)))) return null;
  const nums = groups.map(Number);
  const seconds = nums[nums.length - 1];
  const minutes = nums.length > 1 ? nums[nums.length - 2] : 0;
  const hours = nums.length > 2 ? nums[0] : 0;
  // Only the leading group may exceed 59: "90" is fine, "1:75" is not.
  if (nums.length > 1 && seconds >= 60) return null;
  if (nums.length > 2 && minutes >= 60) return null;
  return hours * 3600 + minutes * 60 + seconds;
}
