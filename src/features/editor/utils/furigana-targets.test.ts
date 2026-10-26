import { describe, it, expect } from 'vitest';
import { collectFuriganaTargets, setTextAtomReading } from './furigana-targets';
import type { EditorLine } from '@/features/editor/editor.types';

const lines = [
  {
    text: 'We are fighting dreamers 高みを目指して',
    words: [
      { word: 'We' }, { word: 'are' }, { word: 'fighting' }, { word: 'dreamers' },
      { word: '高み', reading: 'たか' }, { word: 'を' }, { word: '目指して' },
    ],
  },
  { type: 'section', label: 'Chorus' },
  { text: '険しい道', words: [{ word: '険しい' }, { word: '道', reading: 'みち' }] },
  { text: 'Just go my way!', words: [{ word: 'Just' }, { word: 'go' }] },
] as unknown as EditorLine[];

describe('collectFuriganaTargets', () => {
  it('collects only words containing kanji, in reading order', () => {
    const targets = collectFuriganaTargets(lines);
    expect(targets.map((t) => t.word)).toEqual(['高み', '目指して', '険しい', '道']);
  });

  it('skips section markers and latin-only lines', () => {
    const targets = collectFuriganaTargets(lines);
    // Nothing from the section marker or the English line.
    expect(targets.every((t) => t.lineIndex !== 1 && t.lineIndex !== 3)).toBe(true);
  });

  it('records where each word lives so a reading can be written back', () => {
    const [first] = collectFuriganaTargets(lines);
    expect(first).toMatchObject({ lineIndex: 0, source: 'words', index: 4, word: '高み', reading: 'たか' });
  });

  it('reports a missing reading as null rather than omitting the word', () => {
    const targets = collectFuriganaTargets(lines);
    expect(targets.find((t) => t.word === '目指して')?.reading).toBeNull();
  });

  it('returns nothing for a project with no kanji', () => {
    expect(collectFuriganaTargets([{ text: 'Just go my way!', words: [{ word: 'Just' }] }] as unknown as EditorLine[]))
      .toEqual([]);
  });

  // Lines that were never tokenized keep readings inline in the text instead.
  describe('lines with no words array', () => {
    const textLines = [
      { text: 'We are fighting dreamers {高|たか}みを目指して' },
    ] as unknown as EditorLine[];

    it('finds kanji runs in the raw text, annotated or not', () => {
      const targets = collectFuriganaTargets(textLines);
      expect(targets.map((t) => t.word)).toEqual(['高', '目指']);
      expect(targets.map((t) => t.reading)).toEqual(['たか', null]);
      expect(targets.every((t) => t.source === 'text')).toBe(true);
    });

    it('writes a reading back into the markup without disturbing the rest', () => {
      const targets = collectFuriganaTargets(textLines);
      const mezasu = targets.find((t) => t.word === '目指')!;
      expect(setTextAtomReading(textLines[0].text, mezasu.index, 'めざ'))
        .toBe('We are fighting dreamers {高|たか}みを{目指|めざ}して');
    });

    it('clears a reading when given an empty value', () => {
      const targets = collectFuriganaTargets(textLines);
      const taka = targets.find((t) => t.word === '高')!;
      expect(setTextAtomReading(textLines[0].text, taka.index, ''))
        .toBe('We are fighting dreamers 高みを目指して');
    });
  });
});
