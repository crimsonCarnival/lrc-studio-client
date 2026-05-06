/**
 * Formats seconds into a human-readable time string: m:ss.xx
 * @param {number} s – seconds
 * @returns {string}
 */
export function formatTime(s) {
  if (!s || isNaN(s)) return '00:00.00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor(parseFloat((s % 1).toFixed(3)) * 100);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
