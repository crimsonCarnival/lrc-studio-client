import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { KeyboardEvent, PointerEvent } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover';
import { cn } from '@/shared/utils/utils';
import { hexToHsv, hsvToHex, isHex6 } from '@/shared/utils/color';
import type { Hsv } from '@/shared/utils/color';

type ColorPickerProps = {
  /** `#rrggbb` */
  value: string;
  onChange: (hex: string) => void;
  'aria-label': string;
  className?: string;
};

/** Pointer-driven 0-1 position inside an element; keeps tracking while the pointer is captured. */
function usePointerDrag(onMove: (x: number, y: number) => void) {
  const dragging = useRef(false);
  const apply = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onMove(
      Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    );
  };
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      apply(e);
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => { if (dragging.current) apply(e); },
    onPointerUp: () => { dragging.current = false; },
  };
}

/**
 * Swatch button that opens a saturation/brightness square, a hue slider and a hex field.
 * Replaces <input type="color">, whose popup is the OS dialog and ignores the app theme.
 */
export function ColorPicker({ value, onChange, 'aria-label': ariaLabel, className }: ColorPickerProps) {
  const { t } = useTranslation();
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);

  // Resync when the value changes from outside (reset, other field), but not for our own echo:
  // re-deriving HSV from the emitted hex would lose the hue whenever saturation hits 0.
  if (seen !== value) {
    setSeen(value);
    if (value.toLowerCase() !== hsvToHex(hsv)) setHsv(hexToHsv(value));
    setText(value);
  }

  const emit = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setSeen(hex);
    setText(hex);
    onChange(hex);
  };

  const square = usePointerDrag((x, y) => emit({ ...hsv, s: x, v: 1 - y }));
  const hue = usePointerDrag((x) => emit({ ...hsv, h: x * 360 }));

  const nudge = (e: KeyboardEvent, apply: (step: number) => Hsv, keys: [string, string]) => {
    const dir = e.key === keys[0] ? -1 : e.key === keys[1] ? 1 : 0;
    if (!dir) return;
    e.preventDefault();
    emit(apply(dir * (e.shiftKey ? 10 : 1)));
  };

  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${ariaLabel}: ${value}`}
          className={cn('size-8 shrink-0 rounded-lg inset-ring inset-ring-hl outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-primary', className)}
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 border-0 bg-popover p-3 text-popover-foreground ring-1 ring-foreground/10 lg:min-w-0">
        <div
          {...square}
          role="slider"
          tabIndex={0}
          aria-label={`${ariaLabel}: ${t('common.colorPicker.area')}`}
          aria-valuetext={`${Math.round(hsv.s * 100)}% / ${Math.round(hsv.v * 100)}%`}
          aria-valuenow={Math.round(hsv.s * 100)}
          onKeyDown={(e) => {
            const step = (e.shiftKey ? 0.1 : 0.01);
            const move: Record<string, Partial<Hsv> | undefined> = {
              ArrowLeft: { s: clamp01(hsv.s - step) },
              ArrowRight: { s: clamp01(hsv.s + step) },
              ArrowUp: { v: clamp01(hsv.v + step) },
              ArrowDown: { v: clamp01(hsv.v - step) },
            };
            const m = move[e.key];
            if (m) { e.preventDefault(); emit({ ...hsv, ...m }); }
          }}
          className="relative h-32 w-full cursor-crosshair touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{
            backgroundColor: `hsl(${hsv.h} 100% 50%)`,
            backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
            style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: hsvToHex(hsv) }}
          />
        </div>

        <div
          {...hue}
          role="slider"
          tabIndex={0}
          aria-label={`${ariaLabel}: ${t('common.colorPicker.hue')}`}
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(hsv.h)}
          onKeyDown={(e) => nudge(e, (n) => ({ ...hsv, h: (hsv.h + n + 360) % 360 }), ['ArrowLeft', 'ArrowRight'])}
          className="relative mt-3 h-3 w-full cursor-pointer touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
          style={{ backgroundImage: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
            style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
          />
        </div>

        <input
          value={text}
          maxLength={7}
          spellCheck={false}
          aria-label={`${ariaLabel}: ${t('common.colorPicker.hex')}`}
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
            setText(v);
            if (isHex6(v)) emit(hexToHsv(v));
          }}
          className="mt-3 h-8 w-full rounded-lg bg-card px-2 font-mono text-xs text-foreground outline-none inset-ring inset-ring-hl focus-visible:inset-ring-2 focus-visible:inset-ring-primary"
        />
      </PopoverContent>
    </Popover>
  );
}
