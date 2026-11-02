import { MorphIcon as MorphSvg, type MorphOptions, type SpringPreset } from 'morphicons/react';
import { ICON_SHAPES, strokeForSize } from './icon-paths';
import { MORPH_ICONS, type MorphIconName } from './morph-icons';

type MorphIconProps = {
  /** The icon to show. Changing it springs from the previous shape to this one. */
  name: MorphIconName;
  size?: number;
  /** A preset, or custom physics. Hoist a custom object to module scope. */
  spring?: SpringPreset | MorphOptions;
  className?: string;
} & (
  // An icon that carries meaning on its own (an icon-only button) must say what it
  // means. One that sits next to visible text opts out explicitly, so leaving the label
  // off is a decision rather than an oversight.
  | { label: string; decorative?: never }
  | { decorative: true; label?: never }
);

/**
 * <Icon>'s animated counterpart for icons that change state in place (play ⇄ pause).
 * Sized, stroked and classed like <Icon>, so swapping one for the other changes nothing
 * at rest. Honors prefers-reduced-motion: with it on, the change is an instant swap.
 */
export function MorphIcon({ name, size = 20, spring = 'snappy', className, label }: MorphIconProps) {
  return (
    <MorphSvg
      icon={MORPH_ICONS[name]}
      size={size}
      strokeWidth={strokeForSize(size) * (ICON_SHAPES[name]?.weight ?? 1)}
      spring={spring}
      reducedMotion="user"
      label={label}
      data-icon={name}
      className={`app-icon shrink-0 select-none${className ? ` ${className}` : ''}`}
      // morphicons sizes through width/height attributes, which any CSS rule beats (the
      // Button's "size every svg" rule among them). Inline, as <Icon> does.
      style={{ width: size, height: size, verticalAlign: 'middle' }}
    />
  );
}
