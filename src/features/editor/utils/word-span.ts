type TimedWord = { time?: number | null }

const FALLBACK_SPAN = 1

/**
 * Where word `index` is sung: from its own time to the next stamped word's time.
 * The last word has no successor, so it borrows the line's typical word length
 * (mean gap between stamped words), or one second when there is nothing to average.
 * Returns null for an unstamped word.
 */
export function wordSpan(words: readonly TimedWord[], index: number): { start: number; end: number } | null {
  const start = words[index]?.time
  if (start == null) return null

  const later = words.slice(index + 1).find((w) => w.time != null && w.time > start)
  if (later?.time != null) return { start, end: later.time }

  const times = words.flatMap((w) => (w.time != null ? [w.time] : []))
  const gaps = times.slice(1).map((t, i) => t - times[i]).filter((gap) => gap > 0)
  const typical = gaps.length ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : FALLBACK_SPAN
  return { start, end: start + typical }
}
