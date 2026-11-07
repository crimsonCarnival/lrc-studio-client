import { hasCJK, parseRubyMarkup } from '@/shared/utils/furigana';
import { groupMorphemes } from '@/features/editor/utils/morpheme-group';
import type { EditorLine, EditorWord } from '@/features/editor/editor.types';

/**
 * Gives one line the `words[]` that Words mode edits, called when the editor enters that mode.
 * A line whose words already spell its text is returned as-is, so stamped times, readings and
 * singer attribution survive switching modes. Otherwise the line is tokenized again, and
 * times (plus singer/reading where the word is unchanged) are carried over by character position.
 */
/** Singer attribution belongs to a word, so it only follows a word whose text is unchanged. */
function keepSinger(old: EditorWord | undefined, text: string): Pick<EditorWord, 'singerIndex'> {
  return old && old.word === text && old.singerIndex != null ? { singerIndex: old.singerIndex } : {};
}

export function ensureLineWords(line: EditorLine): EditorLine {
  const rawValue = (line.text || '').trim();
  if (!rawValue) return line;

  const { plainText, segments } = parseRubyMarkup(rawValue);
  const hasMarkup = segments.some(s => s.reading);

  // If no markup and the words already spell the text, skip. Whitespace is ignored on both
  // sides: Latin words are stored without the spaces between them, so a strict comparison
  // never matched and every Latin line was re-tokenized, dropping singers and readings.
  if (!hasMarkup && line.words?.length) {
    const squash = (t: string) => t.replace(/\s+/g, '');
    if (squash(line.words.map(w => w.word).join('')) === squash(plainText)) return line;
  }

  // Build a map from old char positions so timestamps survive edits if text didn't change too much
  const oldWordAtPos = new Map<number, EditorWord>();
  // Text→reading fallback for when position-based matching misses (e.g. 々 boundary shifts)
  const oldReadingByText = new Map<string, string>();
  let flat = 0;
  for (const w of line.words || []) {
    for (let k = 0; k < [...(w.word || "")].length; k++) oldWordAtPos.set(flat + k, w);
    flat += [...(w.word || "")].length;
    if (w.reading) oldReadingByText.set(w.word || "", w.reading);
  }

  let charPos = 0;
  const newWords: EditorWord[] = [];
  const isCJKText = hasCJK(plainText);

  for (const seg of segments) {
    const segChars = [...seg.text];
    if (seg.reading) {
      // Annotated segment — store as one word with the reading
      const anchor = oldWordAtPos.get(charPos);
      newWords.push({ word: seg.text, time: anchor?.time ?? null, reading: seg.reading, ...keepSinger(anchor, seg.text) });
      charPos += segChars.length;
    } else if (isCJKText) {
      // Grouped by morpheme so a chip is a unit someone sings; see
      // morpheme-group.ts for why the per-character split was wrong.
      for (const token of groupMorphemes(seg.text)) {
        const old = oldWordAtPos.get(charPos);
        const w: EditorWord = { word: token.text, time: old?.time ?? null, ...keepSinger(old, token.text) };
        const inherited = (old?.reading && old.word === token.text)
          ? old.reading
          : oldReadingByText.get(token.text) ?? oldReadingByText.get(token.kanji);
        if (inherited) w.reading = inherited;
        newWords.push(w);
        charPos += [...token.text].length;
      }
    } else {
      // Pure Latin
      const tokens = seg.text.split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        const old = oldWordAtPos.get(charPos);
        const w: EditorWord = { word: token, time: old?.time ?? null, ...keepSinger(old, token) };
        if (old?.reading && old.word === token) w.reading = old.reading;
        newWords.push(w);
        charPos += [...token].length;
      }
    }
  }

  const filteredWords = newWords.filter(w => (w.word || "").trim());
  if (filteredWords.length === 0) return line;

  return { ...line, text: plainText, words: filteredWords };
}
