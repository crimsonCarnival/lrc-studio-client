import type { IconInput } from 'morphicons/react';
import { ICON_SHAPES, type IconShape } from './icon-paths';

/**
 * The icons <MorphIcon> may animate between. The geometry is not repeated here: each
 * entry is read from ICON_SHAPES, so a morphing icon and the static <Icon> of the same
 * name always draw the same thing.
 *
 * Only names drawn in icon-paths.ts can morph. The Material Symbols fallback is a font
 * glyph, which has no path to interpolate. Adding a pair means adding its names here.
 */
const MORPH_ICON_NAMES = ['play_arrow', 'pause', 'more_horiz', 'more_vert', 'content_copy', 'check',
  'chevron_down', 'chevron_up', 'chevron_forward', 'visibility', 'visibility_off',
  'volume_mute', 'volume_down', 'volume_up', 'volume_off', 'link', 'add', 'call_split'] as const;

export type MorphIconName = (typeof MORPH_ICON_NAMES)[number];

// A `d` string is always stroked by morphicons, so a solid shape has to arrive as an
// IconNode with a painted fill. That is what makes morphicons take the filled path
// for the pair (and lazy-load its region chunk the first time it does).
function toMorphInput(name: string, shape: IconShape): IconInput {
  // The static <Icon> rotates through CSS on the whole <svg>. A morph cannot do that
  // per endpoint, so a rotated shape would arrive here drawn the wrong way round.
  if (shape.rotate) throw new Error(`[morph-icons] "${name}" is rotated and cannot morph`);
  const d = typeof shape.d === 'string' ? shape.d : shape.d.join(' ');
  return shape.solid ? [['path', { d, fill: 'currentColor', stroke: 'none' }]] : d;
}

export const MORPH_ICONS = Object.fromEntries(
  MORPH_ICON_NAMES.map((name) => {
    const shape = ICON_SHAPES[name];
    if (!shape) throw new Error(`[morph-icons] "${name}" has no entry in icon-paths.ts`);
    return [name, toMorphInput(name, shape)];
  }),
) as Record<MorphIconName, IconInput>;
