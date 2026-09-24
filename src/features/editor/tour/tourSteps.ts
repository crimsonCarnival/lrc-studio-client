export interface TourStep {
  id: string;
  target: string; // matches an element's data-tour attribute
  titleKey: string;
  bodyKey: string;
}

export const EDITOR_TOUR_STEPS: TourStep[] = [
  { id: 'sync',     target: 'editor-lines',          titleKey: 'editor.tour.steps.sync.title',     bodyKey: 'editor.tour.steps.sync.body' },
  { id: 'player',   target: 'player-controls',       titleKey: 'editor.tour.steps.player.title',   bodyKey: 'editor.tour.steps.player.body' },
  { id: 'saveUndo', target: 'editor-undo-redo',      titleKey: 'editor.tour.steps.saveUndo.title', bodyKey: 'editor.tour.steps.saveUndo.body' },
  { id: 'sections', target: 'editor-sections-banner', titleKey: 'editor.tour.steps.sections.title', bodyKey: 'editor.tour.steps.sections.body' },
  { id: 'preview',  target: 'preview-panel',         titleKey: 'editor.tour.steps.preview.title',  bodyKey: 'editor.tour.steps.preview.body' },
  { id: 'share',    target: 'preview-share',         titleKey: 'editor.tour.steps.share.title',    bodyKey: 'editor.tour.steps.share.body' },
];
