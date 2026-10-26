import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSectionLabel } from '@features/editor/constants/section-types';
import { computeSectionBands } from '../timeline-bands';
import type { BandTone } from '../timeline-bands';

type TimelineLine = {
  type?: string;
  label?: string;
  timestamp?: number | null;
};

const BAND_TONE: Record<BandTone, string> = {
  foam: 'bg-foam-soft',
  iris: 'bg-primary-soft',
  gold: 'bg-gold-soft',
};

/**
 * The song's sections as bands along the timeline (redesign sheet 14), so the bar shows
 * where you are in the song and not only how far in. Renders nothing until a section
 * has a timed line.
 */
export const SectionBands = memo(function SectionBands({ lines, duration, reserveSpace = false }: {
  lines: readonly TimelineLine[];
  duration: number;
  /** Keep the row's height even with no bands, for a layout that draws into it (the playhead's time bubble). */
  reserveSpace?: boolean;
}) {
  const { t } = useTranslation();
  const bands = useMemo(() => computeSectionBands(lines, duration), [lines, duration]);
  if (bands.length === 0) return reserveSpace ? <div aria-hidden className="h-[22px]" /> : null;

  return (
    <div aria-hidden className="relative h-[22px] w-full select-none">
      {bands.map((band) => (
        <span
          key={`${band.start}-${band.label}`}
          className={`absolute top-0 h-[22px] overflow-hidden rounded-md px-2 font-mono text-[11px] leading-[22px] font-semibold tracking-[0.1em] whitespace-nowrap text-subtle uppercase ${BAND_TONE[band.tone]}`}
          style={{
            left: `${(band.start / duration) * 100}%`,
            // 4px narrower than its span so neighbouring bands read as separate blocks.
            width: `max(0px, calc(${((band.end - band.start) / duration) * 100}% - 4px))`,
          }}
        >
          {formatSectionLabel(band.label, t)}
        </span>
      ))}
    </div>
  );
});

/** One tick per timed line, under the bar: where the lyrics fall along the track. */
export const LineMarkers = memo(function LineMarkers({ lines, duration }: { lines: readonly TimelineLine[]; duration: number }) {
  const marks = useMemo(() => {
    if (!(duration > 0)) return [];
    const out: number[] = [];
    for (const line of lines) {
      if (line.type !== 'section' && line.timestamp != null && line.timestamp <= duration) out.push(line.timestamp);
    }
    return out;
  }, [lines, duration]);
  if (marks.length === 0) return null;

  return (
    <div aria-hidden className="relative h-2.5 w-full">
      {marks.map((time, i) => (
        <span
          key={`${time}-${i}`}
          className="absolute top-0 h-2 w-0.5 -translate-x-1/2 rounded-[1px] bg-iris opacity-70"
          style={{ left: `${(time / duration) * 100}%` }}
        />
      ))}
    </div>
  );
});
