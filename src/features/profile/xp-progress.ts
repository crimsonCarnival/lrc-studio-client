/**
 * Where a user stands inside their current level. Mirrors the server's curve: reaching
 * level n takes n² × 100 XP.
 */
export function xpProgress(level: number, xp: number) {
  const floor = level * level * 100;
  const next = (level + 1) * (level + 1) * 100;
  const pct = Math.max(0, Math.min(100, Math.round(((xp - floor) / (next - floor)) * 100)));
  return { next, needed: Math.max(0, next - xp), pct };
}
