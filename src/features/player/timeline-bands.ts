export type BandTone = 'foam' | 'iris' | 'gold';

export type SectionBand = {
  label: string;
  start: number;
  end: number;
  tone: BandTone;
};

type BandLine = {
  type?: string;
  label?: string;
  timestamp?: number | null;
};

// The hook of the song gets the warm band, the storytelling parts the accent, and the
// edges (intro, outro, interlude, anything custom) the cool one.
const TONE_BY_KIND: Record<string, BandTone> = {
  chorus: 'gold',
  'pre-chorus': 'gold',
  verse: 'iris',
  bridge: 'iris',
};

function toneFor(label: string): BandTone {
  // "Verse 2" and "Chorus II" are the same kind as "Verse" and "Chorus".
  const kind = label.trim().toLowerCase().replace(/\s+(i{1,3}|iv|v|vi{0,3}|ix|x{1,2}|\d+)$/, '');
  return TONE_BY_KIND[kind] ?? 'foam';
}

/**
 * Where each section sits in the song, for the band row above the timeline.
 * A section starts at its own timestamp, or failing that at its first timed line, and
 * runs until the next section starts. Sections with nothing timed yet are left out, as
 * is anything that would start at or after the end of the track.
 */
export function computeSectionBands(lines: readonly BandLine[], duration: number): SectionBand[] {
  if (!(duration > 0)) return [];

  const starts: { label: string; start: number }[] = [];
  let open: { label: string; start: number | null } | null = null;
  const close = () => {
    if (open && open.start != null) starts.push({ label: open.label, start: open.start });
  };
  for (const line of lines) {
    if (line.type === 'section') {
      close();
      open = { label: line.label ?? '', start: line.timestamp ?? null };
    } else if (open && open.start == null && line.timestamp != null) {
      open.start = line.timestamp;
    }
  }
  close();

  const ordered = starts.filter((s) => s.start < duration).sort((a, b) => a.start - b.start);
  return ordered.map((s, i) => ({
    label: s.label,
    start: Math.max(0, s.start),
    end: Math.min(duration, ordered[i + 1]?.start ?? duration),
    tone: toneFor(s.label),
  })).filter((band) => band.end > band.start);
}
