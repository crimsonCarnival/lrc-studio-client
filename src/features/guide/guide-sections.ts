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

const BASICS: ReadonlySet<GuideSectionId> = new Set(['start', 'sync', 'player', 'saveUndo', 'preview']);

export const GUIDE_SECTIONS: GuideSectionDef[] = GUIDE_SECTION_IDS.map((id) => ({
  id,
  group: BASICS.has(id) ? 'basics' : 'features',
  load: stub(id),
}));
