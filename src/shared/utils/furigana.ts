/**
 * Furigana utility functions for Japanese text processing.
 * Converts kuromoji tokenizer output into per-character readings.
 */

const KANJI_RE = /[一-龯㐀-䶿豈-﫿]/;
const CJK_RE = /[\u3000-\u9FFF\uF900-\uFAFF]/;

interface RubyWord {
  word?: string;
  reading?: string | null;
  time?: number | null;
}

export interface RubySegment {
  text: string;
  reading: string | null;
}

/**
 * Convert katakana string to hiragana.
 * Kuromoji returns readings in katakana — we normalize to hiragana.
 */
export function toHiragana(katakana?: string | null): string {
  if (!katakana) return '';
  return katakana.replace(/[ァ-ヶ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

/**
 * Convert hiragana string to katakana.
 */
export function toKatakana(hiragana?: string | null): string {
  if (!hiragana) return '';
  return hiragana.replace(/[ぁ-ゖ]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

/**
 * Check if a character is kanji (CJK Unified Ideograph).
 */
export function isKanji(ch?: string): boolean {
  return KANJI_RE.test(ch || '');
}


/**
 * Check if a string contains any CJK characters.
 */
export function hasCJK(text?: string): boolean {
  return CJK_RE.test(text || '');
}

/**
 * Check if a string contains any Kanji characters.
 */
export function hasKanji(text?: string): boolean {
  return KANJI_RE.test(text || '');
}

/**
 * How far a reading outruns the kanji it sits over, as a class the CSS acts on.
 *
 * Both runs are CJK, so each glyph is about one em of its own font and the ratio
 * reduces to a count ratio scaled by the two font sizes — the rt renders at
 * roughly 0.59x the base (10px over 17px). That reproduces the three reference
 * cases exactly: 目指/めざ -> r1, 高/たか -> r2, 承/うけたまわ -> r3.
 *
 * Deliberately arithmetic rather than measured: the ratio is resolved once when
 * a line is tokenized and carried on the element, so playback never measures.
 */
const RT_TO_BASE_SIZE = 13 / 17;

/** Small kana and the sokuon take roughly half a square. */
const NARROW_KANA = /[ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ]/;

/** Width of a reading in base-font squares. */
function readingSquares(reading: string): number {
  let n = 0;
  for (const ch of reading) n += NARROW_KANA.test(ch) ? 0.5 : 1;
  return n;
}

/**
 * The rt font size, in em of the base, at which a reading stops outrunning the
 * kanji it sits over.
 *
 * A reading like ごくさいしょく over 極彩色 is seven squares across three, so at a
 * fixed size it spills well past its kanji and collides with the words beside
 * it. Sizing it to fit keeps the annotation within its own base. Returned as em
 * so it works at any of the sizes the ruby is rendered at — list, preview,
 * modal — without measuring anything.
 *
 * The floor is the point where furigana stops being readable; a reading long
 * enough to need less than that will still overhang a little, which is normal
 * Japanese typesetting and far less than it overhangs unsized.
 */
export function rubyFitEm(word?: string, reading?: string | null): number | null {
  if (!word || !reading) return null;
  const kanji = [...splitOkurigana(word).kanji].length;
  const squares = readingSquares(reading);
  if (!kanji || !squares) return null;
  return kanji / squares;
}

export function rubyRatioClass(word?: string, reading?: string | null): 'r1' | 'r2' | 'r3' {
  if (!word || !reading) return 'r1';
  const base = [...word].length;
  const rt = [...reading].length;
  if (!base) return 'r1';
  const ratio = (rt * RT_TO_BASE_SIZE) / base;
  if (ratio <= 1.0) return 'r1';
  return ratio <= 1.6 ? 'r2' : 'r3';
}

/**
 * Parse {word|reading} ruby markup into plain text and annotated segments.
 * Supports single-char ({字|じ}) and multi-char ({二人|ふたり}) annotations.
 *
 * Readings are only applied when the word portion contains at least one kanji
 * character. A {kana|reading} block like {う|いっとうしょう} is treated as
 * plain text (the reading is discarded) because furigana only makes sense
 * over kanji.
 */
export function parseRubyMarkup(input?: string): { plainText: string; segments: RubySegment[] } {
  if (!input) return { plainText: '', segments: [] };
  const segments: RubySegment[] = [];
  let plainText = '';

  const regex = /\{([^}]+)\}|([^{]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    if (match[1]) {
      const inner = match[1];
      const pipeMatch = inner.match(/^(.*?)\|(.*)$/);
      if (pipeMatch) {
        const word = pipeMatch[1];
        const reading = pipeMatch[2].trim();
        plainText += word;
        // Only attach a reading when the word contains at least one kanji.
        // Non-kanji tokens (kana, latin, …) inside {word|reading} blocks are
        // treated as plain text — the reading is silently dropped.
        const hasKanjiInWord = word && KANJI_RE.test(word);
        if (word) segments.push({ text: word, reading: (hasKanjiInWord && reading) ? reading : null });
      } else {
        plainText += inner;
        if (inner) segments.push({ text: inner, reading: null });
      }
    } else if (match[2]) {
      plainText += match[2];
      segments.push({ text: match[2], reading: null });
    }
  }
  return { plainText, segments };
}

export interface OkuriganaSplit {
  /** Kana before the kanji, e.g. the お of お花. Rendered plain. */
  lead: string;
  /** The kanji run the reading belongs to. This is what the rt sits over. */
  kanji: string;
  /** Okurigana — the inflecting kana after the kanji. Rendered plain. */
  tail: string;
}

/**
 * Splits a word into the kanji a reading belongs to and the kana around it.
 *
 * A reading annotates the kanji only: 目指して is read めざ+して, so the rt sits
 * over 目指 and して stays outside it. Since words are grouped by morpheme the
 * token now carries its okurigana, and wrapping the whole token in <ruby> would
 * stretch めざ across 目指して — which reads as though the kana were part of the
 * reading.
 */
export function splitOkurigana(word?: string): OkuriganaSplit {
  const chars = [...(word ?? '')];
  const first = chars.findIndex((ch) => KANJI_RE.test(ch));
  if (first === -1) return { lead: word ?? '', kanji: '', tail: '' };
  let end = first;
  while (end < chars.length && KANJI_RE.test(chars[end])) end++;
  return {
    lead: chars.slice(0, first).join(''),
    kanji: chars.slice(first, end).join(''),
    tail: chars.slice(end).join(''),
  };
}

/** Inline style that keeps a long reading from outrunning its kanji. */
export function rubyFitStyle(word?: string, reading?: string | null): Record<string, string> | undefined {
  const em = rubyFitEm(word, reading);
  return em == null ? undefined : ({ '--size-ruby-fit': `${em.toFixed(3)}em` } as Record<string, string>);
}

export interface RubyAtom {
  text: string;
  reading: string | null;
  /** True for a run of kanji, which is what can carry a reading. */
  annotatable: boolean;
}

/**
 * Break a line's ruby markup into atoms: each existing {word|reading} block, and
 * each maximal run of kanji inside the unannotated text between them.
 *
 * `parseRubyMarkup` keeps a whole unannotated stretch as one segment, which is too
 * coarse to annotate against — "dreamers 高みを目指して" would be a single target.
 * Splitting the plain runs by kanji gives one atom per word that could take a
 * reading, whether or not it already has one, and `serializeRubyAtoms` puts the
 * line back together so a reading can be written into text-only lyrics.
 */
export function explodeRubyAtoms(input?: string): RubyAtom[] {
  const { segments } = parseRubyMarkup(input);
  const atoms: RubyAtom[] = [];
  for (const seg of segments) {
    if (seg.reading) {
      atoms.push({ text: seg.text, reading: seg.reading, annotatable: true });
      continue;
    }
    // Split the run into alternating kanji / non-kanji pieces.
    let buffer = '';
    let bufferIsKanji: boolean | null = null;
    const flush = () => {
      if (!buffer) return;
      atoms.push({ text: buffer, reading: null, annotatable: bufferIsKanji === true });
      buffer = '';
    };
    for (const ch of seg.text) {
      const kanji = isKanji(ch);
      if (bufferIsKanji !== null && kanji !== bufferIsKanji) flush();
      bufferIsKanji = kanji;
      buffer += ch;
    }
    flush();
  }
  return atoms;
}

/** Inverse of explodeRubyAtoms: rebuilds the {word|reading} markup for a line. */
export function serializeRubyAtoms(atoms: RubyAtom[]): string {
  return atoms.map((a) => (a.reading ? `{${a.text}|${a.reading}}` : a.text)).join('');
}

/**
 * Serialize a words array back to {word|reading} markup for use in the edit input.
 * Words that carry a reading are wrapped in {word|reading}; others are plain text.
 * Adds spaces after Latin/alphanumeric words to preserve original formatting.
 */
export function serializeToRubyMarkup(words?: RubyWord[]): string {
  if (!words?.length) return '';
  return words.map((w, i) => {
    const serialized = w.reading ? `{${w.word ?? ''}|${w.reading}}` : (w.word ?? '');
    // Add space after Latin/alphanumeric words (but not after the last word)
    const needsSpace = i < words.length - 1 && /[a-zA-Z0-9]/.test(w.word ?? '');
    return needsSpace ? serialized + ' ' : serialized;
  }).join('');
}
