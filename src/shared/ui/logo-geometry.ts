/*
 * Brand mark geometry on a 64-unit square, shared by LogoMark and DragonflyLoader so the loaders
 * animate the exact logo. public/logo-mark.svg, the lockup SVGs and the QR tile in
 * src/features/sharing/qr.ts repeat these numbers: change them together.
 */
/** Height of a wing bar. */
export const WING_H = 5.5;
/** Stroke of the outlined (upcoming) wings, drawn inside the bar's box. */
export const WING_STROKE = 1.8;
/** Synced lines: the filled left wing, stepped so the three bars read as one wing. */
export const LEFT_WINGS = [
  { x: 4, y: 13, w: 24 },
  { x: 7, y: 21, w: 21 },
  { x: 12, y: 29, w: 16 },
] as const;
/** Upcoming lines: the outlined right wing. */
export const RIGHT_WINGS = [
  { x: 36, y: 13, w: 24 },
  { x: 36, y: 21, w: 16 },
  { x: 36, y: 29, w: 9 },
] as const;
/** The playhead: head, body bar, then a tail of timestamps trailing off. */
export const HEAD = { cx: 32, cy: 7, r: 4.5 } as const;
export const BODY = { x: 30.25, y: 12, w: 3.5, h: 24.5 } as const;
export const TAIL_DOTS = [
  { cy: 40.5, r: 2 },
  { cy: 46.5, r: 1.8 },
  { cy: 52, r: 1.6 },
  { cy: 57, r: 1.4 },
  { cy: 61.5, r: 1.2 },
] as const;

/** An outlined wing bar: the stroke sits inside the same box a filled bar would cover. */
export function outlinedWing({ x, y, w }: { x: number; y: number; w: number }) {
  const inset = WING_STROKE / 2;
  return {
    x: x + inset,
    y: y + inset,
    width: w - WING_STROKE,
    height: WING_H - WING_STROKE,
    rx: (WING_H - WING_STROKE) / 2,
  };
}
