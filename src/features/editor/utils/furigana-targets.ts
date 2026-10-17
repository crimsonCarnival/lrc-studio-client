import { hasKanji, explodeRubyAtoms, serializeRubyAtoms } from '@/shared/utils/furigana';
import type { EditorLine } from '@/features/editor/services/editor.service';

/** One annotatable token: a word containing kanji, located in the project. */
export interface FuriganaTarget {
  lineIndex: number;
  /**
   * Where the reading is stored for this line. `words` lines keep it on
   * `line.words[i].reading`; `text` lines keep it inline in `line.text` as
   * {漢字|かんじ} markup and have no words array to hang it on.
   */
  source: 'words' | 'text';
  /** Index into `line.words` for a words line, or into the line's atoms for a text line. */
  index: number;
  word: string;
  reading: string | null;
  /** The owning line broken into display pieces, for the context strip. */
  lineWords: { word: string; reading?: string | null }[];
}

/**
 * Collects every kanji-bearing word across the project, in reading order.
 *
 * Prefers `line.words`, which is where both lrc and words mode put readings once a
 * line has been tokenized. Lines that were never tokenized keep their readings
 * inline in the text instead, so those are exploded into atoms and annotated
 * there — otherwise a project imported as plain lyrics would look empty here.
 */
export function collectFuriganaTargets(lines: EditorLine[]): FuriganaTarget[] {
  const targets: FuriganaTarget[] = [];
  lines.forEach((line, lineIndex) => {
    if (line.type === 'section') return;

    const words = line.words ?? [];
    if (words.length) {
      words.forEach((w, index) => {
        if (!hasKanji(w.word)) return;
        targets.push({
          lineIndex,
          source: 'words',
          index,
          word: w.word ?? '',
          reading: w.reading ?? null,
          lineWords: words as FuriganaTarget['lineWords'],
        });
      });
      return;
    }

    if (!hasKanji(line.text)) return;
    const atoms = explodeRubyAtoms(line.text);
    const lineWords = atoms.map((a) => ({ word: a.text, reading: a.reading }));
    atoms.forEach((atom, index) => {
      if (!atom.annotatable) return;
      targets.push({
        lineIndex,
        source: 'text',
        index,
        word: atom.text,
        reading: atom.reading,
        lineWords,
      });
    });
  });
  return targets;
}

/**
 * Returns the line's text with the reading at `atomIndex` replaced — the write
 * path for lines that store readings inline instead of on a words array.
 */
export function setTextAtomReading(text: string | undefined, atomIndex: number, reading: string): string {
  const atoms = explodeRubyAtoms(text);
  if (!atoms[atomIndex]) return text ?? '';
  atoms[atomIndex] = { ...atoms[atomIndex], reading: reading.trim() || null };
  return serializeRubyAtoms(atoms);
}
