import { ICON_SHAPES, strokeForSize } from './icon-paths';
import { ICON_CODEPOINTS } from './icon-codepoints';

interface IconProps {
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
}

/**
 * An icon by name. Names in LRC Studio's own set (see icon-paths.ts) are drawn as SVG;
 * the rest fall back to the Material Symbols font. Both carry the `app-icon` class, which
 * is what other components style and hide icons by.
 */
export function Icon({ name, size = 20, filled = false, className }: IconProps) {
  const shape = ICON_SHAPES[name];

  if (shape) {
    const solid = shape.solid || (filled && shape.fillable);
    return (
      <svg
        viewBox="0 0 24 24"
        fill={solid ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={strokeForSize(size) * (shape.weight ?? 1)}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        data-icon={name}
        className={`app-icon shrink-0 select-none${className ? ` ${className}` : ''}`}
        // Inline, so a parent's "size every svg" rule cannot override the size asked for here.
        style={{
          width: size,
          height: size,
          verticalAlign: 'middle',
          transform: shape.rotate ? `rotate(${shape.rotate}deg)` : undefined,
        }}
      >
        {typeof shape.d === 'string' ? <path d={shape.d} /> : shape.d.map((d) => <path key={d} d={d} />)}
      </svg>
    );
  }

  // The font is subset by codepoint (see scripts/subset-icons.mjs), which drops the
  // ligature table, so the glyph is addressed by its codepoint rather than by typing its
  // name. A name missing from the map is a name that does not exist in the font — the
  // build fails on those, so reaching this fallback means an icon added at runtime.
  // Render nothing rather than the raw name: a stray "folder_search" in 64px type is a
  // worse failure than a blank square, and that is exactly the bug this replaced.
  const codepoint = ICON_CODEPOINTS[name];
  if (!codepoint) {
    if (import.meta.env.DEV) console.warn(`[Icon] unknown icon name: ${name}`);
    return <span className={`app-icon inline-block${className ? ` ${className}` : ''}`} style={{ width: size, height: size }} aria-hidden="true" />;
  }

  return (
    <span
      className={`app-icon material-symbols-outlined leading-none select-none${className ? ` ${className}` : ''}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        verticalAlign: 'middle',
      }}
      data-icon={name}
    >
      {codepoint}
    </span>
  );
}
