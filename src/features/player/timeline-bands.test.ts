import { describe, expect, it } from 'vitest';
import { computeSectionBands } from './timeline-bands';

const section = (label: string, timestamp?: number) => ({ type: 'section', label, timestamp });
const line = (timestamp?: number | null) => ({ text: 'la', timestamp });

describe('computeSectionBands', () => {
  it('runs each section from its first timed line to the next section, the last to the end', () => {
    const bands = computeSectionBands([
      section('Intro'), line(0),
      section('Verse 1'), line(16.4), line(19.1),
      section('Chorus'), line(45),
    ], 160);

    expect(bands).toEqual([
      { label: 'Intro', start: 0, end: 16.4, tone: 'foam' },
      { label: 'Verse 1', start: 16.4, end: 45, tone: 'iris' },
      { label: 'Chorus', start: 45, end: 160, tone: 'gold' },
    ]);
  });

  it('prefers the section marker\'s own timestamp over its first line', () => {
    const bands = computeSectionBands([section('Verse', 10), line(12)], 60);
    expect(bands[0]).toMatchObject({ start: 10, end: 60 });
  });

  it('skips a section with nothing timed, and the one before it runs through', () => {
    const bands = computeSectionBands([
      section('Verse'), line(5),
      section('Bridge'), line(null), line(),
      section('Outro'), line(40),
    ], 60);

    expect(bands.map((b) => [b.label, b.start, b.end])).toEqual([['Verse', 5, 40], ['Outro', 40, 60]]);
  });

  it('ignores lines before the first section marker', () => {
    expect(computeSectionBands([line(1), line(2), section('Verse'), line(8)], 30)).toEqual([
      { label: 'Verse', start: 8, end: 30, tone: 'iris' },
    ]);
  });

  it('matches numbered labels to their kind and falls back to the cool tone for custom ones', () => {
    const bands = computeSectionBands([
      section('Pre-Chorus 2'), line(1),
      section('Chorus II'), line(2),
      section('Guitar solo'), line(3),
    ], 10);

    expect(bands.map((b) => b.tone)).toEqual(['gold', 'gold', 'foam']);
  });

  it('drops sections that start at or after the end of the track, and returns nothing without a duration', () => {
    expect(computeSectionBands([section('Verse'), line(5), section('Outro'), line(90)], 60).map((b) => b.label)).toEqual(['Verse']);
    expect(computeSectionBands([section('Verse'), line(5)], 0)).toEqual([]);
  });

  it('orders sections by time even when the document order disagrees', () => {
    const bands = computeSectionBands([section('Chorus'), line(30), section('Verse'), line(10)], 60);
    expect(bands.map((b) => [b.label, b.start, b.end])).toEqual([['Verse', 10, 30], ['Chorus', 30, 60]]);
  });
});
