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
export const EDITOR_TOUR_STEPS: TourStep[] = [
  step('sync', 'editor-lines', 'sync'),
  step('player', 'player-controls', 'player'),
  step('modes', 'editor-modes', 'words'),
  step('tools', 'editor-tools', 'autoStamp', { later: { target: 'editor-find-lyrics', afterMs: 3000 } }),
  step('counterparts', 'editor-counterparts', 'counterparts'),
  step('sections', 'editor-sections-banner', 'sections'),
  step('saveUndo', 'editor-undo-redo', 'saveUndo', { also: ['editor-save'] }),
  step('preview', 'editor-review', 'preview'),
  step('share', 'editor-export', 'share'),
  step('session', 'editor-session', 'sessions'),
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

export const tourStepsFor = (isLg: boolean): TourStep[] => (isLg ? EDITOR_TOUR_STEPS : PHONE_TOUR_STEPS);
