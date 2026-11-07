import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import {
  BACK_TARGET, armHistoryGuard, disarmHistoryGuard, isGuardArmed, leaveEditor, listenForGuardedBack, resetHistoryGuard,
} from './history-guard';

// jsdom implements a real session history (pushState, back, go, async popstate).
const settle = () => new Promise<void>((r) => setTimeout(r, 30));
const back = async () => { window.history.back(); await settle(); };

let dirty = true;
let onBlocked: Mock<() => void>;
let stop: () => void;

beforeEach(async () => {
  resetHistoryGuard();
  dirty = true;
  onBlocked = vi.fn<() => void>();
  // A previous page, then the editor.
  window.history.pushState({ usr: null, idx: 0 }, '', '/home');
  window.history.pushState({ usr: null, idx: 1 }, '', '/project/local');
  await settle();
  stop = listenForGuardedBack(() => dirty, onBlocked);
});
afterEach(() => { stop(); });

describe('history guard', () => {
  it('Back with unsaved edits stays on the page and asks', async () => {
    armHistoryGuard();
    await back();
    expect(onBlocked).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/project/local');
  });

  it('repeated Back presses keep asking without stacking sentinels', async () => {
    armHistoryGuard();
    await back();
    await back();
    await back();
    expect(onBlocked).toHaveBeenCalledTimes(3);
    expect(window.location.pathname).toBe('/project/local');
    // A single sentinel: once nothing is unsaved, one Back pops it and carries on to /home.
    dirty = false;
    await back();
    expect(window.location.pathname).toBe('/home');
  });

  it('Cancel (doing nothing) leaves the guard armed for the next Back', async () => {
    armHistoryGuard();
    await back();
    expect(isGuardArmed()).toBe(true);
    await back();
    expect(onBlocked).toHaveBeenCalledTimes(2);
  });

  it('Discard goes to the page before the editor', async () => {
    armHistoryGuard();
    await back();
    leaveEditor(BACK_TARGET, vi.fn());
    await settle();
    expect(window.location.pathname).toBe('/home');
  });

  it('Discard/Save toward a path removes the sentinel, then navigates', async () => {
    armHistoryGuard();
    await back();
    const navigate = vi.fn((to: string) => window.history.pushState({}, '', to));
    leaveEditor('/', navigate);
    await settle();
    expect(navigate).toHaveBeenCalledWith('/');
    expect(window.location.pathname).toBe('/');
    await back();
    // Straight back to the editor's own entry, no leftover sentinel entry.
    expect(window.location.pathname).toBe('/project/local');
    dirty = false;
    await back();
    expect(window.location.pathname).toBe('/home');
  });

  it('with no unsaved edits Back behaves as today and never asks', async () => {
    dirty = false;
    armHistoryGuard();
    await back(); // pops the sentinel, finds nothing to protect, carries on
    await settle();
    expect(onBlocked).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/home');
  });

  it('disarming after a save removes the sentinel so history is not polluted', async () => {
    armHistoryGuard();
    disarmHistoryGuard();
    await settle();
    expect(isGuardArmed()).toBe(false);
    await back();
    expect(onBlocked).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/home');
  });

  it('arming twice pushes one sentinel', async () => {
    armHistoryGuard();
    armHistoryGuard();
    dirty = false;
    await back();
    await back();
    expect(window.location.pathname).toBe('/home');
  });

  it('does not pop history after the app already navigated away', async () => {
    armHistoryGuard();
    window.history.pushState({}, '', '/library');
    disarmHistoryGuard();
    await settle();
    expect(window.location.pathname).toBe('/library');
  });

  it('adopts a sentinel that survived a reload instead of stacking another', () => {
    window.history.replaceState({ __lrcBackGuard: true }, '');
    armHistoryGuard();
    expect(isGuardArmed()).toBe(true);
    expect(window.history.length).toBeGreaterThan(0);
  });
});
