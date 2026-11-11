import { describe, it, expect } from 'vitest';
import { markNewProject, consumeNewProject, requestTourReplay, consumeTourReplay, rememberEditorPath, lastEditorPath } from './tour-launch';

describe('tour-launch', () => {
  it('consumeNewProject is true once, then false', () => {
    expect(consumeNewProject()).toBe(false);
    markNewProject();
    expect(consumeNewProject()).toBe(true);
    expect(consumeNewProject()).toBe(false);
  });
  it('consumeTourReplay is true once, then false', () => {
    requestTourReplay();
    expect(consumeTourReplay()).toBe(true);
    expect(consumeTourReplay()).toBe(false);
  });
  it('rememberEditorPath(null) clears the path', () => {
    rememberEditorPath('/project/abc');
    expect(lastEditorPath()).toBe('/project/abc');
    rememberEditorPath(null);
    expect(lastEditorPath()).toBeNull();
  });
});
