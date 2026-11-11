import type { EditorLine } from '@/features/editor/editor.types';
import { buildCues } from './subtitle-cues';
import { serializeCues, type SerializeOptions } from './subtitle-formats';
import type { BuildCuesOptions, SubtitleFormat } from './subtitles.types';

/** One translation slot of the lyrics: lines carry their translations by position, and slot `index` is one language. */
export type TranslationSlot = { index: number; label: string };

export type SubtitleFile = { name: string; content: string };

/**
 * The translation slots that have any text, each named by the language its lines give it (the
 * first non-empty one), else "Translation N". A slot nobody has written in is left out: its file
 * would be empty.
 */
export function translationSlots(lines: EditorLine[]): TranslationSlot[] {
  const labels: string[] = [];
  const filled = new Set<number>();
  for (const line of lines) {
    line.translations?.forEach((tr, i) => {
      if (!labels[i] && tr.language?.trim()) labels[i] = tr.language.trim();
      if (tr.text?.trim()) filled.add(i);
    });
  }
  return [...filled].sort((a, b) => a - b).map((index) => ({ index, label: labels[index] || `Translation ${index + 1}` }));
}

/** A language name as a file-name part: letters and digits of any script, joined by dashes. */
export function languageSlug(label: string): string {
  return label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
}

export type SubtitleFilesOptions = {
  /** File name without extension. */
  base: string;
  format: SubtitleFormat;
  /** Timing and capping options shared by every file, so all languages are cut the same way. */
  cues?: Omit<BuildCuesOptions, 'onlyTranslationIndex' | 'includeTranslations' | 'translationIndex'>;
  serialize?: SerializeOptions;
  /** Name for the original text's file. */
  originalLabel?: string;
};

/**
 * One subtitle file per language: the original text, then every translation that has text. All
 * of them share the lines' timing. Returns [] when there is no translation, because then the one
 * plain file is the export and nothing needs bundling.
 */
export function buildSubtitleFiles(lines: EditorLine[], opts: SubtitleFilesOptions): SubtitleFile[] {
  const slots = translationSlots(lines);
  if (slots.length === 0) return [];
  const taken = new Set<string>();
  const nameFor = (label: string) => {
    const slug = languageSlug(label) || 'translation';
    let name = `${opts.base}.${slug}.${opts.format}`;
    for (let n = 2; taken.has(name); n++) name = `${opts.base}.${slug}-${n}.${opts.format}`;
    taken.add(name);
    return name;
  };
  const write = (cueOptions: BuildCuesOptions) => serializeCues(buildCues(lines, { ...opts.cues, ...cueOptions }), opts.format, opts.serialize);
  return [
    { name: nameFor(opts.originalLabel || 'original'), content: write({}) },
    ...slots.map((slot) => ({ name: nameFor(slot.label), content: write({ onlyTranslationIndex: slot.index }) })),
  ];
}
