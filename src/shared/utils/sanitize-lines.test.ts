// @vitest-environment node
/**
 * sanitizeLines is the trust boundary for lyric data entering the editor:
 * server project loads, shared-link payloads and localStorage restores all pass
 * through it. Input is whatever the wire or storage happened to contain, so the
 * contract is "drop what is malformed, never repair it, and always return a
 * usable array".
 */
import { describe, it, expect } from 'vitest';
import { sanitizeLines } from './sanitize-lines';

describe('sanitizeLines — non-array and non-object input', () => {
  it('returns an empty array for anything that is not an array', () => {
    for (const input of [null, undefined, 0, '', 'lines', {}, true, NaN]) {
      expect(sanitizeLines(input)).toEqual([]);
    }
  });

  it('drops entries that are not objects', () => {
    expect(sanitizeLines([null, undefined, 'text', 42, true, []])).toEqual([]);
  });

  it('keeps the valid entries alongside invalid ones', () => {
    const out = sanitizeLines([null, { text: 'kept' }, 'junk', { text: 'also kept' }]);
    expect(out.map((l) => l.text)).toEqual(['kept', 'also kept']);
  });
});

describe('sanitizeLines — lyric lines', () => {
  it('drops a line whose text is not a string', () => {
    // A lyric line without text is not a line — note this also drops text: 123,
    // rather than coercing it.
    expect(sanitizeLines([{ timestamp: 1 }, { text: 123 }, { text: null }])).toEqual([]);
  });

  it('keeps an empty string as a real (blank) line', () => {
    const out = sanitizeLines([{ text: '' }]);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe('');
  });

  it('assigns an id when one is missing', () => {
    const out = sanitizeLines([{ text: 'one' }]);
    expect(typeof out[0].id).toBe('string');
    expect(out[0].id).toBeTruthy();
  });

  it('keeps a provided string id and replaces a non-string one', () => {
    const out = sanitizeLines([{ text: 'one', id: 'keep-me' }, { text: 'two', id: 42 }]);
    expect(out[0].id).toBe('keep-me');
    expect(typeof out[1].id).toBe('string');
    expect(out[1].id).not.toBe(42);
  });

  it('gives every line a distinct generated id', () => {
    const out = sanitizeLines([{ text: 'a' }, { text: 'b' }, { text: 'c' }]);
    expect(new Set(out.map((l) => l.id)).size).toBe(3);
  });

  it('preserves timing, secondary text, singers and translations', () => {
    const out = sanitizeLines([{
      text: 'one',
      timestamp: 12.5,
      endTime: 15,
      secondary: 'ichi',
      mode: 'duet',
      singers: ['A', 'B'],
      translations: [{ text: 'uno', language: 'es' }],
    }]);
    expect(out[0]).toMatchObject({
      text: 'one',
      timestamp: 12.5,
      endTime: 15,
      secondary: 'ichi',
      mode: 'duet',
      singers: ['A', 'B'],
      translations: [{ text: 'uno', language: 'es' }],
    });
  });

  it('defaults secondary to an empty string rather than leaving it undefined', () => {
    expect(sanitizeLines([{ text: 'one' }])[0].secondary).toBe('');
  });

  it('drops non-array singers and translations instead of wrapping them', () => {
    const out = sanitizeLines([{ text: 'one', singers: 'A', translations: 'uno' }]);
    expect(out[0].singers).toBeUndefined();
    expect(out[0].translations).toBeUndefined();
  });
});

describe('sanitizeLines — numeric hardening', () => {
  it('treats a non-finite timestamp as unset, not as zero', () => {
    // Zero is a legitimate timestamp (the very start of the track), so coercing
    // NaN to 0 would silently stamp a line at 0:00.
    for (const bad of [NaN, Infinity, -Infinity, '1.5', null, undefined, {}]) {
      expect(sanitizeLines([{ text: 'one', timestamp: bad }])[0].timestamp).toBeNull();
    }
  });

  it('keeps zero and negative finite timestamps', () => {
    expect(sanitizeLines([{ text: 'one', timestamp: 0 }])[0].timestamp).toBe(0);
    expect(sanitizeLines([{ text: 'one', timestamp: -1 }])[0].timestamp).toBe(-1);
  });

  it('treats a non-finite endTime as absent', () => {
    for (const bad of [NaN, Infinity, '15']) {
      expect(sanitizeLines([{ text: 'one', endTime: bad }])[0].endTime).toBeUndefined();
    }
  });
});

describe('sanitizeLines — words', () => {
  it('keeps word text and time', () => {
    const out = sanitizeLines([{ text: 'one two', words: [{ word: 'one', time: 1 }, { word: 'two', time: 2 }] }]);
    expect(out[0].words).toEqual([{ word: 'one', time: 1 }, { word: 'two', time: 2 }]);
  });

  it('drops a word with no text — it carries no timing worth keeping', () => {
    const out = sanitizeLines([{ text: 'one', words: [{ word: '', time: 1 }, { word: null, time: 2 }, { time: 3 }] }]);
    expect(out[0].words).toEqual([]);
  });

  it('drops word entries that are not objects', () => {
    const out = sanitizeLines([{ text: 'one', words: ['one', null, 5, { word: 'kept', time: 1 }] }]);
    expect(out[0].words).toEqual([{ word: 'kept', time: 1 }]);
  });

  it('nulls a non-finite word time but keeps the word', () => {
    const out = sanitizeLines([{ text: 'one', words: [{ word: 'one', time: NaN }] }]);
    expect(out[0].words).toEqual([{ word: 'one', time: null }]);
  });

  it('returns undefined when words is not an array', () => {
    expect(sanitizeLines([{ text: 'one', words: 'one two' }])[0].words).toBeUndefined();
    expect(sanitizeLines([{ text: 'one' }])[0].words).toBeUndefined();
  });

  it('keeps singerIndex on main words', () => {
    const out = sanitizeLines([{ text: 'one', words: [{ word: 'one', time: 1, singerIndex: 1 }] }]);
    expect(out[0].words?.[0]).toMatchObject({ singerIndex: 1 });
  });

  it('strips singerIndex from secondary words — the secondary track has no attribution', () => {
    const out = sanitizeLines([{ text: 'one', secondaryWords: [{ word: 'ichi', time: 1, singerIndex: 1 }] }]);
    expect(out[0].secondaryWords?.[0]).not.toHaveProperty('singerIndex');
  });

  it('keeps a non-empty furigana reading and omits an empty one', () => {
    const out = sanitizeLines([{
      text: 'one',
      words: [{ word: 'one', time: 1, reading: 'wan' }, { word: 'two', time: 2, reading: '' }],
    }]);
    expect(out[0].words?.[0]).toMatchObject({ reading: 'wan' });
    expect(out[0].words?.[1]).not.toHaveProperty('reading');
  });
});

describe('sanitizeLines — section markers', () => {
  it('keeps a marker with its label, depth, singers and timestamp', () => {
    const out = sanitizeLines([{ type: 'section', label: 'Verse', depth: 1, singers: ['A'], timestamp: 3 }]);
    expect(out[0]).toMatchObject({ type: 'section', label: 'Verse', depth: 1, singers: ['A'], timestamp: 3 });
  });

  it('keeps a marker that has no text field at all', () => {
    // Markers are exempt from the text requirement that drops lyric lines.
    expect(sanitizeLines([{ type: 'section', label: 'Verse' }])).toHaveLength(1);
  });

  it('defaults a non-string label to an empty string', () => {
    expect(sanitizeLines([{ type: 'section', label: 42 }])[0].label).toBe('');
    expect(sanitizeLines([{ type: 'section' }])[0].label).toBe('');
  });

  it('leaves depth undefined when it is not a number', () => {
    expect(sanitizeLines([{ type: 'section', label: 'V', depth: '1' }])[0].depth).toBeUndefined();
  });

  it('assigns an id to a marker that lacks one', () => {
    expect(typeof sanitizeLines([{ type: 'section', label: 'V' }])[0].id).toBe('string');
  });
});

describe('sanitizeLines — untrusted payloads', () => {
  it('does not execute or alter script-like text, it just carries it', () => {
    // Escaping belongs to the render layer; sanitizeLines is a shape guard, and
    // quietly rewriting lyrics would corrupt legitimate content.
    const payload = '<img src=x onerror=alert(1)>';
    expect(sanitizeLines([{ text: payload }])[0].text).toBe(payload);
  });

  it('ignores unknown extra fields rather than passing them through', () => {
    const out = sanitizeLines([{ text: 'one', __proto__hack: 1, isAdmin: true, source: 'asr' }]);
    expect(out[0]).not.toHaveProperty('isAdmin');
    expect(out[0]).not.toHaveProperty('__proto__hack');
  });

  it('does not pollute Object.prototype via a crafted key', () => {
    sanitizeLines([JSON.parse('{"text":"one","__proto__":{"polluted":true}}')]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('handles a deeply mixed realistic payload without throwing', () => {
    const out = sanitizeLines([
      { type: 'section', label: 'Verse', depth: 1 },
      { text: 'one', timestamp: 1 },
      null,
      { text: 'two', timestamp: 'bad', words: [{ word: 'two', time: 2 }, 'junk'] },
      { notALine: true },
      { type: 'section', label: 'Chorus', depth: 1 },
      { text: 'three', timestamp: 3, endTime: Infinity },
    ]);
    expect(out).toHaveLength(5);
    expect(out.map((l) => l.type ?? 'line')).toEqual(['section', 'line', 'line', 'section', 'line']);
    expect(out[2].timestamp).toBeNull();
    expect(out[2].words).toEqual([{ word: 'two', time: 2 }]);
    expect(out[4].endTime).toBeUndefined();
  });
});
