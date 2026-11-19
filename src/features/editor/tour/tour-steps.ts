export interface TourStep {
  id: string;
  target: string; // matches an element's data-tour attribute
  titleKey: string;
  bodyKey: string;
  guideAnchor: string; // matching section id on /guide
  /** Further targets lit together with `target` (the spotlight covers all of them). */
  also?: string[];
  /** After `afterMs` the spotlight moves to this target, for a body that talks about two controls in turn. */
  later?: { target: string; afterMs: number };
}

const step = (
  id: string,
  target: string,
  guideAnchor: string,
  extra: Pick<TourStep, 'also' | 'later'> = {},
): TourStep => ({
  id,
  target,
  titleKey: `editor.tour.steps.${id}.title`,
  bodyKey: `editor.tour.steps.${id}.body`,
  guideAnchor,
  ...extra,
});

// A step whose target isn't mounted is skipped by GuidedTour, so conditional
// controls (sections banner, session button) are safe to list.
// The Lines view. It is also the tour a new project auto-starts with, since Lines is where one opens.
export const EDITOR_TOUR_STEPS: TourStep[] = [
  step('sync', 'editor-lines', 'sync'),
  step('player', 'player-controls', 'player'),
  step('modes', 'editor-modes', 'words'),
  step('unmarkedFilter', 'editor-filter', 'sync'),
  step('tools', 'editor-tools', 'autoStamp', { later: { target: 'editor-find-lyrics', afterMs: 3000 } }),
  step('counterparts', 'editor-counterparts', 'counterparts'),
  step('sections', 'editor-sections-banner', 'sections'),
  step('saveUndo', 'editor-undo-redo', 'saveUndo', { also: ['editor-save'] }),
  step('preview', 'editor-review', 'preview'),
  step('share', 'editor-export', 'share'),
  step('session', 'editor-session', 'sessions'),
];

// Lines with end times (SRT is a toggle on the Lines view, not a tab of its own). Only marking
// differs, so the first step is swapped for the start/end pair and the rest follow the Lines tour.
export const SRT_TOUR_STEPS: TourStep[] = [
  step('srtSync', 'editor-lines', 'srt'),
  step('srtEnd', 'srt-end-time', 'srt'),
  ...EDITOR_TOUR_STEPS.slice(1),
];

export const PHONE_TOUR_STEPS: TourStep[] = [
  step('phoneLines', 'phone-lines', 'sync'),
  step('phoneMark', 'phone-mark', 'sync'),
  step('phonePlayer', 'phone-player', 'player'),
  step('phoneTabs', 'phone-tabs', 'preview'),
  step('phoneTools', 'phone-tools', 'words'),
  step('phoneSave', 'phone-save', 'saveUndo'),
  step('phoneSession', 'phone-session', 'sessions'),
];

// The Words view: one line at a time, one row per word.
export const WORDS_TOUR_STEPS: TourStep[] = [
  step('wordsNav', 'words-nav', 'words'),
  step('wordsLine', 'words-line-info', 'words'),
  step('wordsStamp', 'words-tap-pad', 'words'),
  step('wordsRow', 'words-row', 'words'),
  step('wordsTimeline', 'words-timeline', 'words'),
  step('wordsViewTools', 'words-view-tools', 'words'),
  step('wordsDistribute', 'words-distribute', 'words'),
  step('wordsTools', 'editor-toolbar', 'furigana'),
  step('wordsModes', 'editor-modes', 'preview'),
];

// The Review view: the karaoke preview, its display options, and publishing.
export const REVIEW_TOUR_STEPS: TourStep[] = [
  step('reviewLyrics', 'review-lyrics', 'preview'),
  step('reviewProgress', 'review-progress', 'preview'),
  step('reviewShow', 'review-show', 'preview'),
  step('reviewAlign', 'review-align', 'look'),
  step('reviewPlayer', 'review-player', 'player'),
  step('reviewPublish', 'review-publish', 'share'),
  step('reviewMore', 'preview-share', 'share'),
  step('reviewBack', 'review-back', 'sync'),
];

export type TourView = 'lines' | 'srt' | 'words' | 'review';

/**
 * The tour for the screen on show, so "Take the tour" explains what is in front of the user.
 * Phones keep their own tour: their editor is laid out differently and has no Review tab.
 */
export const tourStepsFor = (isLg: boolean, view: TourView = 'lines'): TourStep[] => {
  if (!isLg) return PHONE_TOUR_STEPS;
  if (view === 'srt') return SRT_TOUR_STEPS;
  if (view === 'words') return WORDS_TOUR_STEPS;
  if (view === 'review') return REVIEW_TOUR_STEPS;
  return EDITOR_TOUR_STEPS;
};
