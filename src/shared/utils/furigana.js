/**
 * Furigana utility functions for Japanese text processing.
 * Converts kuromoji tokenizer output into per-character readings.
 */

const HIRAGANA_RE = /[\u3040-\u309F]/;
const KATAKANA_RE = /[\u30A0-\u30FF]/;
const KANJI_RE = /[\u4E00-\u9FAF\u3400-\u4DBF\uF900-\uFAFF]/;
const CJK_RE = /[\u3000-\u9FFF\uF900-\uFAFF]/;

/**
 * Convert katakana string to hiragana.
 * Kuromoji returns readings in katakana — we normalize to hiragana.
 */
export function toHiragana(katakana) {
  if (!katakana) return '';
  return katakana.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

/**
 * Convert hiragana string to katakana.
 */
export function toKatakana(hiragana) {
  if (!hiragana) return '';
  return hiragana.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

const ROMAJI_MAP = {
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'を': 'wo', 'ん': 'n',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
  'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
  'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
  'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
  'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
  'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
  'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
  'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
  'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
  'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
  'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
  'っ': ' ', 'ー': '-'
};


/**
 * Check if a character is kanji (CJK Unified Ideograph).
 */
export function isKanji(ch) {
  return KANJI_RE.test(ch);
}


/**
 * Check if a string contains any CJK characters.
 */
export function hasCJK(text) {
  return CJK_RE.test(text);
}

/**
 * Check if a string contains any Kanji characters.
 */
export function hasKanji(text) {
  return KANJI_RE.test(text);
}

export function isHiragana(ch) {
  return HIRAGANA_RE.test(ch);
}

export function isKatakana(ch) {
  return KATAKANA_RE.test(ch);
}

/**
 * Parse {word|reading} ruby markup into plain text and annotated segments.
 * Supports single-char ({字|じ}) and multi-char ({二人|ふたり}) annotations.
 *
 * Readings are only applied when the word portion contains at least one kanji
 * character. A {kana|reading} block like {う|いっとうしょう} is treated as
 * plain text (the reading is discarded) because furigana only makes sense
 * over kanji.
 *
 * @param {string} input  e.g. "{二人|ふたり}で{歌|うた}いましょう"
 * @returns {{ plainText: string, segments: Array<{text: string, reading: string|null}> }}
 */
export function parseRubyMarkup(input) {
  if (!input) return { plainText: '', segments: [] };
  const segments = [];
  let plainText = '';
  
  const regex = /\{([^}]+)\}|([^{]+)/g;
  let match;
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
export function serializeToRubyMarkup(words) {
  if (!words?.length) return '';
  return words.map((w, i) => {
    const serialized = w.reading ? `{${w.word}|${w.reading}}` : w.word;
    // Add space after Latin/alphanumeric words (but not after the last word)
    const needsSpace = i < words.length - 1 && /[a-zA-Z0-9]/.test(w.word);
    return needsSpace ? serialized + ' ' : serialized;
  }).join('');
}



