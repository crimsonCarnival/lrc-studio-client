export interface TourStep {
  id: string;
  target: string; // matches an element's data-tour attribute
  titleKey: string;
  bodyKey: string;
  guideAnchor: string; // matching section id on /guide
}

export const EDITOR_TOUR_STEPS: TourStep[] = [
  { id: 'sync',     target: 'editor-lines',          titleKey: 'editor.tour.steps.sync.title',     bodyKey: 'editor.tour.steps.sync.body',     guideAnchor: 'sync' },
  { id: 'player',   target: 'player-controls',       titleKey: 'editor.tour.steps.player.title',   bodyKey: 'editor.tour.steps.player.body',   guideAnchor: 'player' },
  { id: 'saveUndo', target: 'editor-undo-redo',      titleKey: 'editor.tour.steps.saveUndo.title', bodyKey: 'editor.tour.steps.saveUndo.body', guideAnchor: 'saveUndo' },
  { id: 'sections', target: 'editor-sections-banner', titleKey: 'editor.tour.steps.sections.title', bodyKey: 'editor.tour.steps.sections.body', guideAnchor: 'sections' },
  { id: 'preview',  target: 'preview-panel',         titleKey: 'editor.tour.steps.preview.title',  bodyKey: 'editor.tour.steps.preview.body',  guideAnchor: 'preview' },
  { id: 'share',    target: 'preview-share',         titleKey: 'editor.tour.steps.share.title',    bodyKey: 'editor.tour.steps.share.body',    guideAnchor: 'share' },
];
