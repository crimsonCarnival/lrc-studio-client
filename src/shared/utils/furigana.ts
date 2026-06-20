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
