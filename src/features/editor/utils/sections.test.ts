// @vitest-environment node
/**
 * The flat <-> nested serialization boundary.
 *
 * Every save crosses it (`flatToSections` before the wire) and every load
 * crosses it back (`sectionsToFlat`). A bug here silently reshapes the stored
 * project, so the round trip is the property worth pinning down — not the
 * individual field mappings.
 */
import { describe, it, expect } from 'vitest';
import { flatToSections, sectionsToFlat } from './sections';
import type { EditorLine } from '@/features/editor/services/editor.service';

const lyric = (text: string, extra: Partial<EditorLine> = {}): EditorLine =>
  ({ text, timestamp: null, ...extra } as EditorLine);

const marker = (label: string, extra: Record<string, unknown> = {}): EditorLine =>
  ({ type: 'section', label, depth: 1, id: `sec-${label}`, timestamp: null, text: '', ...extra } as EditorLine);

describe('flatToSections', () => {
  it('groups lines under the preceding marker', () => {
    const sections = flatToSections([
      marker('Verse'),
      lyric('one'),
      lyric('two'),
      marker('Chorus'),
      lyric('three'),
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0].label).toBe('Verse');
    expect(sections[0].lines.map((l: EditorLine) => l.text)).toEqual(['one', 'two']);
    expect(sections[1].lines.map((l: EditorLine) => l.text)).toEqual(['three']);
  });

  it('puts lines before the first marker into an anonymous section', () => {
    const sections = flatToSections([lyric('intro'), marker('Verse'), lyric('one')]);
    expect(sections).toHaveLength(2);
    expect(sections[0].label).toBeNull();
    expect(sections[0].id).toBeNull();
    expect(sections[0].lines.map((l: EditorLine) => l.text)).toEqual(['intro']);
  });

  it('keeps an empty section that has no lines', () => {
    const sections = flatToSections([marker('Verse'), marker('Chorus'), lyric('one')]);
    expect(sections).toHaveLength(2);
    expect(sections[0].lines).toEqual([]);
  });

  it('strips section-only and client-only fields from lyric lines', () => {
    const sections = flatToSections([
      marker('Verse'),
      { text: 'one', timestamp: 1, type: undefined, label: 'stale', depth: 9, furigana: { cached: true } },
    ]);
    const line = sections[0].lines[0];
    expect(line.text).toBe('one');
    expect(line).not.toHaveProperty('label');
    expect(line).not.toHaveProperty('depth');
    // `furigana` is a render cache, not persisted state — it must not reach the wire.
    expect(line).not.toHaveProperty('furigana');
  });

  it('preserves the fields that carry timing and attribution', () => {
    const sections = flatToSections([
      marker('Verse'),
      lyric('one', {
        timestamp: 12.5,
        endTime: 15,
        secondary: 'ichi',
        singers: ['A', 'B'],
        mode: 'duet',
        words: [{ word: 'one', time: 12.5, singerIndex: 0 }],
        translations: [{ text: 'uno', language: 'es' }],
      } as Partial<EditorLine>),
    ]);
    expect(sections[0].lines[0]).toMatchObject({
      timestamp: 12.5,
      endTime: 15,
      secondary: 'ichi',
      singers: ['A', 'B'],
      mode: 'duet',
      words: [{ word: 'one', time: 12.5, singerIndex: 0 }],
      translations: [{ text: 'uno', language: 'es' }],
    });
  });

  it('carries a marker timestamp through only when it is a number', () => {
    const [withTime] = flatToSections([marker('Verse', { timestamp: 4.25 })]);
    expect(withTime.timestamp).toBe(4.25);
    const [withJunk] = flatToSections([marker('Verse', { timestamp: 'nope' })]);
    expect(withJunk.timestamp).toBeNull();
  });

  it('tolerates null, undefined and non-array input', () => {
    expect(flatToSections([])).toEqual([]);
    expect(flatToSections(null as unknown as EditorLine[])).toEqual([]);
    expect(flatToSections(undefined as unknown as EditorLine[])).toEqual([]);
    expect(flatToSections([null, undefined, lyric('kept')] as unknown as EditorLine[])).toHaveLength(1);
  });
});

describe('sectionsToFlat', () => {
  it('emits no marker for an anonymous section', () => {
    const flat = sectionsToFlat([
      { label: null, depth: null, id: null, timestamp: null, lines: [lyric('intro')] },
    ]);
    expect(flat).toHaveLength(1);
    expect(flat[0].type).toBeUndefined();
  });

  it('emits a marker for a named section', () => {
    const flat = sectionsToFlat([
      { label: 'Verse', depth: 1, id: 's1', timestamp: null, lines: [lyric('one')] },
    ]);
    expect(flat[0]).toMatchObject({ type: 'section', label: 'Verse', depth: 1, id: 's1' });
    expect(flat[1].text).toBe('one');
  });

  it('emits a marker for a section identified only by its singers', () => {
    const flat = sectionsToFlat([
      { label: null, depth: null, id: null, singers: ['A'], timestamp: null, lines: [lyric('one')] },
    ]);
    expect(flat[0].type).toBe('section');
  });

  it('treats an empty singers array as anonymous, not as a section', () => {
    const flat = sectionsToFlat([
      { label: null, depth: null, id: null, singers: [], timestamp: null, lines: [lyric('one')] },
    ]);
    expect(flat).toHaveLength(1);
  });

  it('repairs the legacy depth-0 bug for a known preset label', () => {
    // A past Raw Lyrics rebuild wrote depth 0 — a structural root — for any
    // flush-left section, which made collapsing it swallow everything after it.
    const flat = sectionsToFlat([
      { label: 'Chorus', depth: 0, id: 's1', timestamp: null, lines: [] },
    ]);
    expect(flat[0].depth).toBe(1);
  });

  it('leaves a custom label at depth 0 exactly as stored', () => {
    // Indistinguishable from a deliberate promotion, so guessing would destroy
    // real structure.
    const flat = sectionsToFlat([
      { label: 'Hook', depth: 0, id: 's1', timestamp: null, lines: [] },
    ]);
    expect(flat[0].depth).toBe(0);
  });

  it('tolerates null, undefined and sections with no lines array', () => {
    expect(sectionsToFlat([])).toEqual([]);
    expect(sectionsToFlat(null as unknown as unknown[])).toEqual([]);
    expect(sectionsToFlat([{ label: 'V', depth: 1, id: 's', timestamp: null }])).toHaveLength(1);
  });
});

describe('round trip', () => {
  /**
   * Markers gain `text: ''` on the way back out, so the identity being asserted
   * is "same structure, same payload", not deep equality of the marker objects.
   */
  it('preserves a mixed project through flat -> nested -> flat', () => {
    const lines: EditorLine[] = [
      lyric('free intro'),
      marker('Verse'),
      lyric('one', { timestamp: 1 }),
      lyric('two', { timestamp: 2, endTime: 3 }),
      marker('Chorus'),
      lyric('three', { timestamp: 4, words: [{ word: 'three', time: 4 }] } as Partial<EditorLine>),
    ];
    const back = sectionsToFlat(flatToSections(lines));

    expect(back.map((l) => l.type ?? 'line')).toEqual(['line', 'section', 'line', 'line', 'section', 'line']);
    expect(back.map((l) => l.text)).toEqual(['free intro', '', 'one', 'two', '', 'three']);
    expect(back.map((l) => l.timestamp)).toEqual([null, null, 1, 2, null, 4]);
    expect(back[3].endTime).toBe(3);
    expect(back[5].words).toEqual([{ word: 'three', time: 4 }]);
  });

  it('is idempotent — a second round trip changes nothing', () => {
    const lines: EditorLine[] = [marker('Verse'), lyric('one', { timestamp: 1 }), lyric('two')];
    const once = sectionsToFlat(flatToSections(lines));
    const twice = sectionsToFlat(flatToSections(once));
    expect(twice).toEqual(once);
  });

  it('survives a project with no sections at all', () => {
    const lines: EditorLine[] = [lyric('one', { timestamp: 1 }), lyric('two', { timestamp: 2 })];
    expect(sectionsToFlat(flatToSections(lines))).toEqual(lines);
  });

  it('survives words-mode lines with per-word singer attribution', () => {
    const lines: EditorLine[] = [
      marker('Verse', { singers: ['A', 'B'] }),
      lyric('duet line', {
        timestamp: 1,
        mode: 'duet',
        singers: ['A', 'B'],
        words: [
          { word: 'duet', time: 1, singerIndex: 0 },
          { word: 'line', time: 1.5, singerIndex: 1 },
        ],
        secondaryWords: [{ word: 'dueto', time: 1 }],
      } as Partial<EditorLine>),
    ];
    const back = sectionsToFlat(flatToSections(lines));
    expect(back[0].singers).toEqual(['A', 'B']);
    expect(back[1].words).toEqual(lines[1].words);
    expect(back[1].secondaryWords).toEqual(lines[1].secondaryWords);
  });

  it('does not invent a marker for leading lines on the way back', () => {
    const lines: EditorLine[] = [lyric('a'), lyric('b'), marker('Verse'), lyric('c')];
    const back = sectionsToFlat(flatToSections(lines));
    expect(back.filter((l) => l.type === 'section')).toHaveLength(1);
  });
});
