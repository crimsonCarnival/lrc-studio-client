/** The participant colour for a colorIndex (--color-collab-1..8); anything out of range falls back to 1. */
export function collabColor(colorIndex: number): string {
  const n = Number.isInteger(colorIndex) && colorIndex >= 1 && colorIndex <= 8 ? colorIndex : 1
  return `var(--color-collab-${n})`
}
