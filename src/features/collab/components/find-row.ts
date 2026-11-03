import type { PointerState } from '../collab.types'

/** The row element for a line id, looked up among the layer's siblings (the layer itself carries no row attribute). */
export function findRow(layer: HTMLElement, lineId: string): HTMLElement | null {
  return layer.parentElement?.querySelector<HTMLElement>(`[data-line-id="${CSS.escape(lineId)}"]`) ?? null
}

/**
 * A pointer anchored to a line's element: the client position as a fraction of that element,
 * so it lands on the same spot of the same lyric whatever size the receiver's window is.
 * Undefined when the element has no box (unmounted or virtualised away): nothing to send.
 */
export function pointerOnRow(row: HTMLElement, lineId: string, clientX: number, clientY: number): PointerState | undefined {
  const r = row.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return undefined
  return {
    area: 'lines',
    lineId,
    xRatio: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
    yRatio: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
  }
}
