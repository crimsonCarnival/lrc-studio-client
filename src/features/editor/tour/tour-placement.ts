export type Box = { top: number; left: number; width: number; height: number };

const GAP = 16;
const CARD_WIDTH = 320;

/**
 * Positions the tour card next to the spotlight without covering it: below if it fits,
 * else above, else on the roomier side clamped to the viewport.
 */
export function placeCard(
  spot: Box,
  cardHeight: number,
  viewport: { width: number; height: number },
  narrow: boolean,
): { top: number; left: number; width: number } {
  const width = narrow ? viewport.width - GAP * 2 : CARD_WIDTH;
  const left = narrow ? GAP : Math.min(Math.max(spot.left, GAP), Math.max(GAP, viewport.width - width - GAP));

  const spotBottom = spot.top + spot.height;
  const roomBelow = viewport.height - spotBottom;
  const roomAbove = spot.top;
  const need = cardHeight + GAP;

  let top: number;
  if (roomBelow >= need) top = spotBottom + GAP;
  else if (roomAbove >= need) top = spot.top - GAP - cardHeight;
  else top = roomBelow >= roomAbove ? spotBottom + GAP : spot.top - GAP - cardHeight;

  top = Math.min(Math.max(top, GAP), Math.max(GAP, viewport.height - cardHeight - GAP));
  return { top, left, width };
}
