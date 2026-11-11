import { describe, expect, it } from 'vitest';
import { activeCues, buildCues, constrainCueEdit, MIN_EDIT_LENGTH, validateCues, YOUTUBE_RULES } from './subtitle-cues';
import { formatClock, parseClock } from './subtitle-clock';
import { clearCueEnd, clearCueTimes, firstUntimedLine, markEnd, markStart, mergeCueWithNext, removeCueLine, splitCueLine, splitText } from './subtitle-edits';
import { serializeCues } from './subtitle-formats';
import type { EditorLine } from '@/features/editor/editor.types';
import type { Cue } from './subtitles.types';

const line = (text: string, timestamp: number | null, extra: Partial<EditorLine> = {}): EditorLine => ({ text, timestamp, ...extra });
const cue = (start: number, end: number, text = 'x'): Cue => ({ start, end, text, lineIndex: 0 });
const codes = (cues: Cue[], duration?: number) => validateCues(cues, YOUTUBE_RULES, duration).map((i) => `${i.cue}:${i.code}`);

describe('buildCues', () => {
  it('skips section markers and untimed lines', () => {
    const cues = buildCues([
      { type: 'section', label: 'Verse', timestamp: 1 },
      line('a', 1, { endTime: 2 }),
      line('untimed', null),
      line('b', 3, { endTime: 4 }),
    ]);
    expect(cues.map((c) => c.text)).toEqual(['a', 'b']);
    expect(cues.map((c) => c.lineIndex)).toEqual([1, 3]);
  });

  it('infers a missing end from the next main line, then from duration', () => {
    const cues = buildCues([line('a', 1), line('b', 4)], { duration: 6 });
    expect(cues[0].end).toBeCloseTo(3.95);
    expect(cues[1].end).toBe(6); // min(4 + 5, 6)
  });

  it('caps a cue that outlasts the media, but not one that starts after it', () => {
    const cues = buildCues([line('a', 58, { endTime: 65 }), line('b', 70, { endTime: 75 })], { duration: 60 });
    expect(cues.map((c) => c.end)).toEqual([60, 75]);
  });

  it('does not let a counterpart cut its main line short', () => {
    const cues = buildCues([
      line('main', 10),
      line('ad-lib', 10, { adLibOf: 10 }),
      line('next', 20),
    ]);
    expect(cues.find((c) => c.text === 'main')?.end).toBeCloseTo(19.95);
  });

  it('sorts by start time and keeps line order for equal starts', () => {
    const cues = buildCues([line('late', 5, { endTime: 6 }), line('early', 1, { endTime: 2 }), line('tie', 5, { endTime: 6 })]);
    expect(cues.map((c) => c.text)).toEqual(['early', 'late', 'tie']);
  });

  it('removes blank lines and control characters, which would end a cue early', () => {
    const [c] = buildCues([line('one\n\n  \ntwo\u0007', 1, { endTime: 2 })]);
    expect(c.text).toBe('one\ntwo');
  });

  it('drops cues with no text', () => {
    expect(buildCues([line('   ', 1, { endTime: 2 })])).toEqual([]);
  });

  it('appends secondary text and the chosen translation when asked', () => {
    const l = line('hola', 1, { endTime: 2, secondary: 'roma', translations: [{ text: 'hi' }, { text: 'hello' }] });
    expect(buildCues([l])[0].text).toBe('hola');
    expect(buildCues([l], { includeSecondary: true, includeTranslations: true, translationIndex: 1 })[0].text).toBe('hola\nroma\nhello');
  });
});

describe('validateCues', () => {
  it('flags a cue that ends at or before it starts as an error', () => {
    const issues = validateCues([cue(2, 2)]);
    expect(issues).toEqual([{ cue: 0, code: 'invalid_range', severity: 'error' }]);
  });

  it('flags short and long cues as warnings', () => {
    expect(codes([cue(0, 0.2), cue(10, 20)])).toEqual(['0:too_short', '1:too_long']);
  });

  it('flags overlap against the latest end, not just the previous cue', () => {
    expect(codes([cue(0, 10), cue(1, 2), cue(5, 6)])).toEqual(['0:too_long', '1:overlap', '2:overlap']);
  });

  it('does not call back-to-back cues overlapping', () => {
    expect(codes([cue(0, 2), cue(2, 4)])).toEqual([]);
  });

  it('checks line count and line length by characters, not UTF-16 units', () => {
    const long = '字'.repeat(43);
    const emoji = '😀'.repeat(42);
    expect(codes([cue(0, 2, long)])).toEqual(['0:line_too_long']);
    expect(codes([cue(0, 2, emoji)])).toEqual([]);
    expect(codes([cue(0, 2, 'a\nb\nc')])).toEqual(['0:too_many_lines']);
  });

  it('flags a cue that starts after the media ends, since it could never show', () => {
    expect(codes([cue(60, 62)], 60)).toEqual(['0:starts_after_video']);
    expect(codes([cue(58, 60)], 60)).toEqual([]);
  });
});

describe('activeCues', () => {
  it('includes the start, excludes the end, and returns every overlapping cue', () => {
    const cues = [cue(1, 3, 'a'), cue(2, 4, 'b')];
    expect(activeCues(cues, 1).map((c) => c.text)).toEqual(['a']);
    expect(activeCues(cues, 2.5).map((c) => c.text)).toEqual(['a', 'b']);
    expect(activeCues(cues, 3).map((c) => c.text)).toEqual(['b']);
    expect(activeCues(cues, 4)).toEqual([]);
  });
});

describe('constrainCueEdit', () => {
  const cues = [cue(0, 2), cue(3, 5), cue(6, 8)];

  it('stops a dragged edge at the neighbouring cue', () => {
    expect(constrainCueEdit(cues, 1, { start: 1 })).toEqual({ start: 2, end: 5 });
    expect(constrainCueEdit(cues, 1, { end: 7 })).toEqual({ start: 3, end: 6 });
  });

  it('keeps a minimum length when an edge is dragged past the other', () => {
    expect(constrainCueEdit(cues, 1, { start: 9 })).toEqual({ start: 5 - MIN_EDIT_LENGTH, end: 5 });
    expect(constrainCueEdit(cues, 1, { end: 0 })).toEqual({ start: 3, end: 3 + MIN_EDIT_LENGTH });
  });

  it('moves a cue with its length intact and stops against a neighbour', () => {
    expect(constrainCueEdit(cues, 1, { start: 3.5, end: 5.5 })).toEqual({ start: 3.5, end: 5.5 });
    expect(constrainCueEdit(cues, 1, { start: 5, end: 7 })).toEqual({ start: 4, end: 6 });
    expect(constrainCueEdit(cues, 1, { start: 0, end: 2 })).toEqual({ start: 2, end: 4 });
  });

  it('keeps the first and last cue inside the media', () => {
    expect(constrainCueEdit(cues, 0, { start: -4 })).toEqual({ start: 0, end: 2 });
    expect(constrainCueEdit(cues, 2, { end: 99 }, 10)).toEqual({ start: 6, end: 10 });
    expect(constrainCueEdit(cues, 2, { end: 99 })).toEqual({ start: 6, end: 99 });
  });

  it('does not let a counterpart that starts with its line pin that line', () => {
    const withAdLib = [
      { ...cue(10, 12, 'main'), lineIndex: 0 },
      { ...cue(10, 11.5, 'ad-lib'), lineIndex: 1, counterpart: true },
      { ...cue(13, 15, 'next'), lineIndex: 2 },
    ];
    expect(constrainCueEdit(withAdLib, 0, { start: 10.5, end: 12.5 })).toEqual({ start: 10.5, end: 12.5 });
    expect(constrainCueEdit(withAdLib, 0, { end: 13.5 })).toEqual({ start: 10, end: 13 });
  });

  it('does not let a main line pull a counterpart back to its line end', () => {
    const withAdLib = [
      { ...cue(10, 12, 'main'), lineIndex: 0 },
      { ...cue(10, 11.5, 'ad-lib'), lineIndex: 1, counterpart: true },
    ];
    expect(constrainCueEdit(withAdLib, 1, { start: 9, end: 10.5 })).toEqual({ start: 9, end: 10.5 });
  });
});

describe('splitText', () => {
  it('splits at the space nearest the ratio', () => {
    expect(splitText('one two three four', 0.5)).toEqual(['one two', 'three four']);
    expect(splitText('one two three four', 0.1)).toEqual(['one', 'two three four']);
  });
  it('leaves nothing for the second half when there is no space', () => {
    expect(splitText('word', 0.5)).toEqual(['word', '']);
    expect(splitText('   ', 0.5)).toEqual(['', '']);
  });
});

describe('cue line edits', () => {
  const base: EditorLine[] = [
    { type: 'section', label: 'Verse' },
    { id: 'a', text: 'one two three four', timestamp: 2, endTime: 6, words: [{ word: 'one', time: 2 }], secondary: 'x', singers: ['A'] },
    { id: 'b', text: 'five six', timestamp: 7, endTime: 9 },
  ];
  const cues = buildCues(base);

  it('splits a line in two at the playhead, with text and times divided', () => {
    const out = splitCueLine(base, cues[0], 4, () => 'new')!;
    expect(out).toHaveLength(4);
    expect(out[1]).toMatchObject({ id: 'a', text: 'one two', timestamp: 2, endTime: 4, secondary: 'x', source: 'manual' });
    expect(out[1].words).toBeUndefined();
    expect(out[2]).toEqual({ singers: ['A'], id: 'new', text: 'three four', timestamp: 4, endTime: 6, source: 'manual' });
    expect(out[3].id).toBe('b');
  });

  it('refuses a split too close to an edge or with nothing to put on the second line', () => {
    expect(splitCueLine(base, cues[0], 2.05)).toBeNull();
    expect(splitCueLine(base, cues[0], 5.95)).toBeNull();
    expect(splitCueLine([{ text: 'word', timestamp: 0, endTime: 4 }], buildCues([{ text: 'word', timestamp: 0, endTime: 4 }])[0], 2)).toBeNull();
  });

  it('merges a cue with the next one into a single line spanning both', () => {
    const out = mergeCueWithNext(base, cues, 0)!;
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ id: 'a', text: 'one two three four five six', timestamp: 2, endTime: 9 });
    expect(out[1].words).toBeUndefined();
    expect(mergeCueWithNext(base, cues, 1)).toBeNull();
  });

  it('refuses a merge that would drop the second line’s secondary or translation text', () => {
    const withTranslation: EditorLine[] = [
      { id: 'a', text: 'one', timestamp: 2, endTime: 4 },
      { id: 'b', text: 'two', timestamp: 5, endTime: 7, translations: [{ text: 'dos' }] },
    ];
    expect(mergeCueWithNext(withTranslation, buildCues(withTranslation), 0)).toBeNull();
    const withSecondary: EditorLine[] = [
      { id: 'a', text: 'one', timestamp: 2, endTime: 4 },
      { id: 'b', text: 'two', timestamp: 5, endTime: 7, secondary: 'tu' },
    ];
    expect(mergeCueWithNext(withSecondary, buildCues(withSecondary), 0)).toBeNull();
  });

  it('does not merge a counterpart into its main line, which would delete it', () => {
    const withAdLib: EditorLine[] = [
      { id: 'a', text: 'main', timestamp: 2, endTime: 6 },
      { id: 'c', text: 'yeah', timestamp: 3, endTime: 4, adLibOf: 2 },
    ];
    expect(mergeCueWithNext(withAdLib, buildCues(withAdLib), 0)).toBeNull();
  });

  it('removes only the cue line', () => {
    expect(removeCueLine(base, cues[1]).map((l) => l.id)).toEqual([undefined, 'a']);
  });
});

describe('marking', () => {
  const lines: EditorLine[] = [
    { type: 'section', label: 'Verse' },
    { text: 'timed', timestamp: 1, endTime: 2 },
    { text: '   ' },
    { text: 'untimed one' },
    { text: 'untimed two', timestamp: null },
  ];

  it('finds the first line that has text but no time', () => {
    expect(firstUntimedLine(lines)).toBe(3);
    expect(firstUntimedLine([{ type: 'section' }, { text: 'a', timestamp: 0 }])).toBe(-1);
  });

  it('marks a start with no end, then an end at the playhead', () => {
    const started = markStart(lines, 3, 10.0004);
    expect(started[3]).toMatchObject({ timestamp: 10, endTime: null, source: 'manual' });
    const ended = markEnd(started, 3, 13, buildCues(started))!;
    expect(ended[3]).toMatchObject({ timestamp: 10, endTime: 13 });
  });

  it('stops an end before the next cue and inside the media', () => {
    const started = markStart(lines, 3, 10);
    const later = buildCues([...started.slice(0, 4), { text: 'later', timestamp: 12, endTime: 14 }]);
    expect(markEnd(started, 3, 20, later)![3].endTime).toBeCloseTo(11.95);
    expect(markEnd(started, 3, 20, [], { duration: 15 })![3].endTime).toBe(15);
  });

  it('never ends a line before it has run the minimum, and needs a start first', () => {
    const started = markStart(lines, 3, 10);
    expect(markEnd(started, 3, 9, [])![3].endTime).toBeCloseTo(10 + MIN_EDIT_LENGTH);
    expect(markEnd(lines, 3, 12, [])).toBeNull();
  });

  it('clears an end, or both times, keeping the text', () => {
    const cue = buildCues(lines)[0];
    expect(clearCueEnd(lines, cue)[1]).toMatchObject({ text: 'timed', timestamp: 1, endTime: null });
    expect(clearCueTimes(lines, cue)[1]).toMatchObject({ text: 'timed', timestamp: null, endTime: null, source: null });
  });
});

describe('clock', () => {
  it('formats with minutes, adding hours only when needed', () => {
    expect(formatClock(0)).toBe('0:00.000');
    expect(formatClock(62.5)).toBe('1:02.500');
    expect(formatClock(3661.0005)).toBe('1:01:01.001');
    expect(formatClock(59.9996)).toBe('1:00.000');
  });

  it('parses seconds, m:ss and h:mm:ss', () => {
    expect(parseClock('62')).toBe(62);
    expect(parseClock(' 62,5 ')).toBe(62.5);
    expect(parseClock('1:02.5')).toBe(62.5);
    expect(parseClock('1:01:01.25')).toBe(3661.25);
  });

  it('rejects what is not a time', () => {
    for (const bad of ['', 'abc', '-1', '1:75', '1:60:00', '1:2:3:4', '1:', ':5', '1.5:00']) {
      expect(parseClock(bad)).toBeNull();
    }
  });

  it('round-trips what it formats', () => {
    for (const t of [0, 1.005, 59.999, 61.25, 3725.5]) expect(parseClock(formatClock(t))).toBeCloseTo(t, 3);
  });
});

describe('serializeCues', () => {
  const cues = [cue(1.005, 3.5, 'Hello'), cue(3661.0005, 3662, 'Late')];

  it('writes SRT with numbered cues and comma milliseconds', () => {
    expect(serializeCues(cues, 'srt')).toBe(
      '1\n00:00:01,005 --> 00:00:03,500\nHello\n\n2\n01:01:01,001 --> 01:01:02,000\nLate\n',
    );
  });

  it('writes WebVTT with a header and dot milliseconds', () => {
    expect(serializeCues(cues, 'vtt')).toBe(
      'WEBVTT\n\n00:00:01.005 --> 00:00:03.500\nHello\n\n01:01:01.001 --> 01:01:02.000\nLate\n',
    );
  });

  it('writes SBV with unpadded hours and a comma between the times', () => {
    expect(serializeCues(cues, 'sbv')).toBe(
      '0:00:01.005,0:00:03.500\nHello\n\n1:01:01.001,1:01:02.000\nLate\n',
    );
  });

  it('rounds to the nearest millisecond, carrying into the next second', () => {
    expect(serializeCues([cue(59.9996, 61, 'x')], 'srt')).toContain('00:01:00,000 -->');
  });

  it('clamps a cue that would end at or before its start so the file stays parseable', () => {
    expect(serializeCues([cue(2, 1, 'x')], 'srt')).toContain('00:00:02,000 --> 00:00:02,001');
  });

  it('escapes markup in WebVTT only, and defuses --> everywhere', () => {
    const c = [cue(0, 1, 'a & b <i> --> c')];
    expect(serializeCues(c, 'vtt')).toContain('a &amp; b &lt;i&gt; --&gt; c');
    expect(serializeCues(c, 'srt')).toContain('a & b <i> -> c');
    expect(serializeCues(c, 'sbv')).toContain('a & b <i> -> c');
  });

  it('uses CRLF throughout when asked', () => {
    const out = serializeCues(cues, 'srt', { lineEndings: 'crlf' });
    expect(out).not.toMatch(/(?<!\r)\n/);
    expect(out.split('\r\n').length).toBeGreaterThan(5);
  });

  it('returns an empty string when there is nothing to write', () => {
    expect(serializeCues([], 'srt')).toBe('');
    expect(serializeCues([], 'vtt')).toBe('');
  });

  it('can be read back by a strict SRT block parser', () => {
    const lines = [line('one', 1, { endTime: 2.5 }), line('two\nlines', 3, { endTime: 4.25 })];
    const out = serializeCues(buildCues(lines), 'srt');
    const blocks = out.trim().split('\n\n').map((b) => b.split('\n'));
    expect(blocks).toHaveLength(2);
    for (const [i, b] of blocks.entries()) {
      expect(b[0]).toBe(String(i + 1));
      expect(b[1]).toMatch(/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/);
      expect(b.slice(2).join('\n').length).toBeGreaterThan(0);
    }
    expect(blocks[1].slice(2)).toEqual(['two', 'lines']);
  });
});
