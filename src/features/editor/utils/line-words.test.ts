import { describe, expect, it } from 'vitest';
import { ensureLineWords } from './line-words';
import { flatToSections, sectionsToFlat } from './sections';
import type { EditorLine } from '@/features/editor/editor.types';

const stamped = (): EditorLine => ({
  id: 'a',
  text: 'hello big world',
  timestamp: 1,
  singers: ['A', 'B'],
  mode: 'duet',
  words: [
    { word: 'hello', time: 1, singerIndex: 0, reading: 'heh-loh' },
    { word: 'big', time: 1.5, singerIndex: 1 },
    { word: 'world', time: 2, singerIndex: 0 },
  ],
});

describe('ensureLineWords', () => {
  it('keeps existing words, times, readings and singers when the text is unchanged', () => {
    const line = stamped();
    expect(ensureLineWords(line)).toBe(line);
  });

  it('also keeps words that carry their trailing whitespace', () => {
    const line = { ...stamped(), words: stamped().words!.map((w, i) => ({ ...w, word: i < 2 ? `${w.word} ` : w.word })) };
    expect(ensureLineWords(line)).toBe(line);
  });

  it('survives lrc -> words -> lrc -> words and a sections round-trip', () => {
    const once = ensureLineWords(stamped());
    const twice = ensureLineWords(once);
    expect(sectionsToFlat(flatToSections([twice]))[0].words).toEqual(stamped().words);
  });

  it('tokenizes a line that has no words yet', () => {
    const out = ensureLineWords({ id: 'b', text: 'two words', timestamp: null });
    expect(out.words).toEqual([{ word: 'two', time: null }, { word: 'words', time: null }]);
  });

  it('re-tokenizes changed text, carrying time and singer for words unchanged at the same position', () => {
    const out = ensureLineWords({ ...stamped(), text: 'hello big planet' });
    expect(out.words).toEqual([
      { word: 'hello', time: 1, singerIndex: 0, reading: 'heh-loh' },
      { word: 'big', time: 1.5, singerIndex: 1 },
      { word: 'planet', time: 2 },
    ]);
  });

  it('still groups CJK lines by morpheme and leaves blanks and sections alone', () => {
    const cjk = ensureLineWords({ id: 'c', text: '愛してる', timestamp: null });
    expect(cjk.words!.map((w) => w.word).join('')).toBe('愛してる');
    const blank = { id: 'd', text: '  ' } as EditorLine;
    expect(ensureLineWords(blank)).toBe(blank);
    const section = { type: 'section', label: 'Verse', text: '' } as EditorLine;
    expect(ensureLineWords(section)).toBe(section);
  });

  // handleSaveLineText feeds the edited raw text (which may hold ruby markup) plus the previous words.
  it('keeps singers on unchanged words when a line is edited with the old words passed in', () => {
    const prev = stamped();
    const out = ensureLineWords({ ...prev, text: 'hello big wide world', words: prev.words });
    expect(out.words!.map((w) => w.word)).toEqual(['hello', 'big', 'wide', 'world']);
    expect(out.words![0]).toMatchObject({ time: 1, singerIndex: 0, reading: 'heh-loh' });
    expect(out.words![1]).toMatchObject({ time: 1.5, singerIndex: 1 });
  });

  it('keeps the singer of an unchanged word when ruby markup is present', () => {
    const line: EditorLine = {
      id: 'e', text: '{愛|あい} you', timestamp: 0,
      words: [{ word: '愛', time: 1, singerIndex: 1 }, { word: 'you', time: 2, singerIndex: 0 }],
    };
    const out = ensureLineWords(line);
    expect(out.words).toEqual([
      { word: '愛', time: 1, reading: 'あい', singerIndex: 1 },
      { word: 'you', time: 2, singerIndex: 0 },
    ]);
  });
});
