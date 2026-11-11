import { describe, it, expect } from 'vitest';
import { decideAutoTour } from './tour-decision';

describe('decideAutoTour', () => {
  it('no new project → never shows', () => {
    expect(decideAutoTour(false, { shown: 0, enabled: true, legacySeen: false })).toEqual({ show: false, offerOptOut: false });
  });
  it('first new project shows without opt-out', () => {
    expect(decideAutoTour(true, { shown: 0, enabled: true, legacySeen: false })).toEqual({ show: true, offerOptOut: false });
  });
  it('second showing offers opt-out', () => {
    expect(decideAutoTour(true, { shown: 1, enabled: true, legacySeen: false })).toEqual({ show: true, offerOptOut: true });
  });
  it('disabled never shows', () => {
    expect(decideAutoTour(true, { shown: 5, enabled: false, legacySeen: false })).toEqual({ show: false, offerOptOut: false });
  });
  it('legacy seen counts as one showing', () => {
    expect(decideAutoTour(true, { shown: 0, enabled: true, legacySeen: true })).toEqual({ show: true, offerOptOut: true });
  });
  it('count is shared across device classes', () => {
    // Shown once on a phone, then a desktop new project: the count lives in
    // account settings, so the desktop caller sees shown=1 and gets the opt-out.
    expect(decideAutoTour(true, { shown: 1, enabled: true, legacySeen: false }).offerOptOut).toBe(true);
  });
});
