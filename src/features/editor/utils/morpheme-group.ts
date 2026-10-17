/**
 * Groups a lyric line into the chips words mode times against.
 *
 * The old split took a kanji run as one token and every other CJK character as
 * its own, so 高みを目指して became 高/み/を/目指/し/て. Those cuts correspond to
 * nothing you would sing, none of them can carry a reading (a reading does not
 * fit on a bare okurigana), and the romaji layer produces a different count, so
 * the two layers can never be paired.
 *
 * Grouping by morpheme instead gives 高み/を/目指して, which is what a singer
 * actually holds, and makes the two layers the same length.
 *
 * Deliberately rule-based rather than dictionary-backed: a real morphological
 * analyser means shipping a multi-megabyte dictionary to the browser, and it
 * still could not settle the cases that actually need a human — 熟字訓 whose
 * reading does not decompose (今日 = きょう), names, or the invented readings
 * lyrics are full of. The rules get the ordinary line right; the editor's
 * merge and split are how the rest gets fixed.
 */

const KANJI = /[㐀-䶿一-鿿豈-﫿]/;
const HIRAGANA = /[ぁ-ゟ]/;
const KATAKANA = /[゠-ヿㇰ-ㇿ]/;
/** Marks that extend the previous sound and can never start a token. */
const KANA_EXTENDERS = /[ーー]/;
/**
 * Punctuation attaches to the chip before it and never gets a chip of its own.
 * Apostrophes and the ASCII hyphen are deliberately absent: they join latin
 * words rather than end them, and treating them as punctuation cut "don't" and
 * "low-key" in half.
 */
const PUNCTUATION = /[、。，．・…！？!?,.;:"“”「」『』（）()[\]【】〜~–—]/;

/**
 * Particles that take their own chip. Longest match wins, so でも is not read as
 * で + も. Only the set the design calls out: an exhaustive particle list would
 * start splitting words that merely happen to end in one.
 */
const PARTICLES = [
  'でも', 'から', 'まで', 'より', 'へと',
  'を', 'は', 'が', 'の', 'に', 'へ', 'と', 'も', 'で',
];

export interface MorphemeToken {
  text: string;
  /**
   * The leading kanji of the token, which is the part a reading sits over —
   * 目指 of 目指して. Empty when the token carries no kanji.
   */
  kanji: string;
  /** Particles get their own, quieter chip style and are usually left untimed. */
  isParticle: boolean;
}

function matchParticle(chars: string[], at: number): string | null {
  for (const p of PARTICLES) {
    const candidate = chars.slice(at, at + p.length).join('');
    if (candidate === p) return p;
  }
  return null;
}

function leadingKanji(text: string): string {
  const chars = [...text];
  let i = 0;
  while (i < chars.length && KANJI.test(chars[i])) i++;
  return chars.slice(0, i).join('');
}

export function groupMorphemes(input?: string): MorphemeToken[] {
  const chars = [...(input ?? '')];
  const tokens: MorphemeToken[] = [];
  let i = 0;

  const push = (text: string, isParticle = false) => {
    if (!text) return;
    tokens.push({ text, kanji: leadingKanji(text), isParticle });
  };

  /** Punctuation rides along with the chip before it rather than opening one. */
  const attach = (text: string) => {
    if (tokens.length) tokens[tokens.length - 1].text += text;
    else push(text);
  };

  while (i < chars.length) {
    const ch = chars[i];

    if (!ch.trim()) { i++; continue; }

    if (PUNCTUATION.test(ch)) {
      let j = i;
      while (j < chars.length && PUNCTUATION.test(chars[j])) j++;
      attach(chars.slice(i, j).join(''));
      i = j;
      continue;
    }

    if (KANJI.test(ch)) {
      let j = i;
      while (j < chars.length && KANJI.test(chars[j])) j++;
      // Trailing kana inflect the word the kanji starts, so they belong to the
      // same chip — until a particle, which starts a chip of its own.
      while (j < chars.length && (HIRAGANA.test(chars[j]) || KANA_EXTENDERS.test(chars[j]))) {
        if (matchParticle(chars, j)) break;
        j++;
      }
      push(chars.slice(i, j).join(''));
      i = j;
      continue;
    }

    if (KATAKANA.test(ch) || KANA_EXTENDERS.test(ch)) {
      let j = i;
      while (j < chars.length && (KATAKANA.test(chars[j]) || KANA_EXTENDERS.test(chars[j]))) j++;
      push(chars.slice(i, j).join(''));
      i = j;
      continue;
    }

    if (HIRAGANA.test(ch)) {
      // A particle only stands alone between words. Splitting one out of a run of
      // kana would cut こんにちは into こんにち + は, so a bare hiragana run is
      // taken whole.
      const particle = tokens.length > 0 ? matchParticle(chars, i) : null;
      if (particle) {
        push(particle, true);
        i += particle.length;
        continue;
      }
      // Taken whole, with no particle splitting inside it: a particle is only a
      // particle between words, and cutting at every match turns こんにちは into
      // こん/に/ち/は.
      let j = i;
      while (j < chars.length && (HIRAGANA.test(chars[j]) || KANA_EXTENDERS.test(chars[j]))) j++;
      push(chars.slice(i, j).join(''));
      i = j;
      continue;
    }

    // Latin, digits and anything else: run up to the next space or CJK character.
    let j = i;
    while (
      j < chars.length
      && chars[j].trim()
      && !KANJI.test(chars[j]) && !HIRAGANA.test(chars[j]) && !KATAKANA.test(chars[j])
      && !PUNCTUATION.test(chars[j])
    ) j++;
    if (j === i) j++;
    push(chars.slice(i, j).join(''));
    i = j;
  }

  return tokens;
}
