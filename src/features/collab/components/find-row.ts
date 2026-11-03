/** The row element for a line id, looked up among the layer's siblings (the layer itself carries no row attribute). */
export function findRow(layer: HTMLElement, lineId: string): HTMLElement | null {
  return layer.parentElement?.querySelector<HTMLElement>(`[data-line-id="${CSS.escape(lineId)}"]`) ?? null
}
