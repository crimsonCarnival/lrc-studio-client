// Shared by the Guide demos. Text lives in guide.sample.lines.<n>: an original
// extension of the "Midnight Echoes" sample used on the landing page.
export type SampleLine = { key: string; time: number; end: number };

const STARTS = [2, 6, 10, 14, 18, 22];
const TAIL = 26;

export const SAMPLE_LINES: SampleLine[] = STARTS.map((time, i) => ({
  key: `guide.sample.lines.${i + 1}`,
  time,
  end: STARTS[i + 1] ?? TAIL,
}));

export const SAMPLE_DURATION = TAIL;
