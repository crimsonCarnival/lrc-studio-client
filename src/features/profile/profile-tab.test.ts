import { describe, expect, it } from 'vitest';
import { tabFromParams, withTab } from './profile-tab';

describe('profile tab in the URL', () => {
  it('clicking the Artists tab writes ?tab=artists and keeps ?view', () => {
    expect(withTab(new URLSearchParams('view=public'), 'artists').toString()).toBe('view=public&tab=artists');
    expect(withTab(new URLSearchParams('view=public&tab=artists'), 'projects').toString()).toBe('view=public');
  });

  it('a visitor with ?tab=artists and no artists sees Projects', () => {
    const params = new URLSearchParams('tab=artists');
    expect(tabFromParams(params, false)).toBe('projects');
    expect(tabFromParams(params, true)).toBe('artists');
    expect(tabFromParams(new URLSearchParams('tab=nope'), true)).toBe('projects');
  });
});
