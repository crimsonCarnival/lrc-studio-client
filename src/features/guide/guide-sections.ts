import { createElement, type ComponentType } from 'react';

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

// Until a section gets its own demo or mock, it loads the shared text-only body.
const stub = (id: GuideSectionId): GuideSectionDef['load'] => () =>
  import('./components/StubBody').then((m) => ({ default: () => createElement(m.default, { id }) }));

// Sections that have their own body; the rest still load the text stub.
const BODIES: Partial<Record<GuideSectionId, GuideSectionDef['load']>> = {
  start: () => import('./sections/StartSection'),
  sync: () => import('./sections/SyncSection'),
  player: () => import('./sections/PlayerSection'),
  saveUndo: () => import('./sections/SaveUndoSection'),
  preview: () => import('./sections/PreviewSection'),
  words: () => import('./sections/WordsSection'),
  counterparts: () => import('./sections/CounterpartsSection'),
  srt: () => import('./sections/SrtSection'),
};

const BASICS: ReadonlySet<GuideSectionId> = new Set(['start', 'sync', 'player', 'saveUndo', 'preview']);

export const GUIDE_SECTIONS: GuideSectionDef[] = GUIDE_SECTION_IDS.map((id) => ({
  id,
  group: BASICS.has(id) ? 'basics' : 'features',
  load: BODIES[id] ?? stub(id),
}));
