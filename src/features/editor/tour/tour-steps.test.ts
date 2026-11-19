import { describe, expect, it } from 'vitest';
import en from '@/locales/en/editor.js';
import es from '@/locales/es/editor.js';
import { GUIDE_SECTION_IDS } from '@/features/guide/guide-sections';
import { EDITOR_TOUR_STEPS, PHONE_TOUR_STEPS, REVIEW_TOUR_STEPS, SRT_TOUR_STEPS, WORDS_TOUR_STEPS, tourStepsFor } from './tour-steps';

const ALL_STEPS = [...EDITOR_TOUR_STEPS, ...SRT_TOUR_STEPS, ...WORDS_TOUR_STEPS, ...REVIEW_TOUR_STEPS, ...PHONE_TOUR_STEPS];

const resolve = (dict: unknown, key: string): unknown =>
  key.replace(/^editor\./, '').split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    dict,
  );

describe('tour steps', () => {
  it('desktop Lines list is the eleven steps in order', () => {
    expect(tourStepsFor(true).map((s) => s.id)).toEqual([
      'sync', 'player', 'modes', 'unmarkedFilter', 'tools', 'counterparts', 'sections', 'saveUndo', 'preview', 'share', 'session',
    ]);
    expect(tourStepsFor(true)).toBe(EDITOR_TOUR_STEPS);
  });

  it('picks the Words and Review tours by view on desktop, and the phone tour on any phone view', () => {
    expect(tourStepsFor(true, 'lines')).toBe(EDITOR_TOUR_STEPS);
    expect(tourStepsFor(true, 'words')).toBe(WORDS_TOUR_STEPS);
    expect(tourStepsFor(true, 'review')).toBe(REVIEW_TOUR_STEPS);
    expect(tourStepsFor(false, 'words')).toBe(PHONE_TOUR_STEPS);
    expect(tourStepsFor(false, 'review')).toBe(PHONE_TOUR_STEPS);
    expect(tourStepsFor(true, 'srt')).toBe(SRT_TOUR_STEPS);
    expect(tourStepsFor(false, 'srt')).toBe(PHONE_TOUR_STEPS);
  });

  it('SRT list swaps the Lines marking step for the start/end pair and keeps the rest', () => {
    expect(SRT_TOUR_STEPS.map((s) => s.id)).toEqual([
      'srtSync', 'srtEnd', 'player', 'modes', 'unmarkedFilter', 'tools', 'counterparts', 'sections', 'saveUndo', 'preview', 'share', 'session',
    ]);
    expect(SRT_TOUR_STEPS.slice(0, 2).map((s) => [s.target, s.guideAnchor])).toEqual([
      ['editor-lines', 'srt'], ['srt-end-time', 'srt'],
    ]);
  });

  it('phone list is the seven steps in order', () => {
    expect(tourStepsFor(false).map((s) => s.id)).toEqual([
      'phoneLines', 'phoneMark', 'phonePlayer', 'phoneTabs', 'phoneTools', 'phoneSave', 'phoneSession',
    ]);
    expect(tourStepsFor(false)).toBe(PHONE_TOUR_STEPS);
  });

  it('maps steps to their guide anchors', () => {
    const anchors = Object.fromEntries([...EDITOR_TOUR_STEPS, ...PHONE_TOUR_STEPS].map((s) => [s.id, s.guideAnchor]));
    expect(anchors).toMatchObject({
      modes: 'words', tools: 'autoStamp', session: 'sessions', phoneLines: 'sync', phoneMark: 'sync',
      phonePlayer: 'player', phoneTabs: 'preview', phoneTools: 'words', phoneSave: 'saveUndo', phoneSession: 'sessions',
    });
  });

  it.each(ALL_STEPS.map((s) => [s.id, s] as const))('%s resolves', (_id, step) => {
    expect(GUIDE_SECTION_IDS).toContain(step.guideAnchor);
    for (const dict of [en, es]) {
      expect(typeof resolve(dict, step.titleKey)).toBe('string');
      expect(typeof resolve(dict, step.bodyKey)).toBe('string');
    }
  });

  it('desktop preview and share steps point at controls visible in the editor view', () => {
    const targets = Object.fromEntries(EDITOR_TOUR_STEPS.map((s) => [s.id, s.target]));
    expect(targets.preview).toBe('editor-review');
    expect(targets.share).toBe('editor-export');
  });

  it('has unique ids and targets within each list', () => {
    for (const list of [EDITOR_TOUR_STEPS, SRT_TOUR_STEPS, WORDS_TOUR_STEPS, REVIEW_TOUR_STEPS, PHONE_TOUR_STEPS]) {
      expect(new Set(list.map((s) => s.id)).size).toBe(list.length);
      expect(new Set(list.map((s) => s.target)).size).toBe(list.length);
    }
  });
});
