import type { ComponentType } from 'react';

export const GUIDE_SECTION_IDS = [
  'start', 'sync', 'player', 'saveUndo', 'preview',
  'words', 'counterparts', 'srt', 'sections', 'furigana', 'autoStamp', 'lyricsSearch',
  'subtitles', 'sessions', 'share', 'look',
] as const;

export type GuideSectionId = (typeof GUIDE_SECTION_IDS)[number];

export type GuideSectionDef = {
  id: GuideSectionId;
  group: 'basics' | 'features';
  load: () => Promise<{ default: ComponentType }>;
};

const BODIES: Record<GuideSectionId, GuideSectionDef['load']> = {
  start: () => import('./sections/StartSection'),
  sync: () => import('./sections/SyncSection'),
  player: () => import('./sections/PlayerSection'),
  saveUndo: () => import('./sections/SaveUndoSection'),
  preview: () => import('./sections/PreviewSection'),
  words: () => import('./sections/WordsSection'),
  counterparts: () => import('./sections/CounterpartsSection'),
  srt: () => import('./sections/SrtSection'),
  sections: () => import('./sections/SectionsSection'),
  furigana: () => import('./sections/FuriganaSection'),
  autoStamp: () => import('./sections/AutoStampSection'),
  lyricsSearch: () => import('./sections/LyricsSearchSection'),
  subtitles: () => import('./sections/SubtitlesSection'),
  sessions: () => import('./sections/SessionsSection'),
  share: () => import('./sections/ShareSection'),
  look: () => import('./sections/LookSection'),
};

const BASICS: ReadonlySet<GuideSectionId> = new Set(['start', 'sync', 'player', 'saveUndo', 'preview']);

export const GUIDE_SECTIONS: GuideSectionDef[] = GUIDE_SECTION_IDS.map((id) => ({
  id,
  group: BASICS.has(id) ? 'basics' : 'features',
  load: BODIES[id],
}));
