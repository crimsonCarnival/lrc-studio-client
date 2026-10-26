// The editor's flat line model. Lines are flat here and converted to nested
// sections only at the persistence boundary (utils/sections.ts).

export interface EditorWord {
  word?: string;
  time?: number | null;
  reading?: string;
  singerIndex?: number;
}

export interface EditorTranslation {
  text?: string;
  language?: string;
}

export interface EditorLine {
  type?: string;
  text?: string;
  timestamp?: number | null;
  endTime?: number | null;
  words?: EditorWord[];
  secondaryWords?: EditorWord[];
  secondary?: string;
  translations?: EditorTranslation[];
  furigana?: unknown;
  singers?: string[];
  mode?: 'solo' | 'duet' | 'split';
  label?: string;
  id?: string;
  /** Tracks whether this line's timestamp was set by ASR ('asr') or manually ('manual').
   *  null = legacy/unknown lines (treated as manual). Cleared when timestamp is removed. */
  source?: 'manual' | 'asr' | null;
  /** When non-null, this line is a counterpart overlapping the parent line at timestamp=adLibOf.
   *  Keeps its pre-rename name ("ad-lib") because it is persisted in every stored project. */
  adLibOf?: number | null;
  // Lines carry other presentation fields preserved across spreads.
  [key: string]: unknown;
}

export type LineMode = 'solo' | 'duet' | 'split';
