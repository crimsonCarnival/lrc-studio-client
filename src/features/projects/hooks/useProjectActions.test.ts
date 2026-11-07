import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProjectActions } from './useProjectActions';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';

vi.mock('react-google-recaptcha-v3', () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }) }));

function setup() {
  const fn = () => vi.fn();
  return renderHook(() => useProjectActions({
    setLines: fn(), setSyncMode: fn(), setActiveLineIndex: fn(), setMediaTitle: fn(), setProjectMetadata: fn(),
    setForkedFrom: fn(), setProjectYtUrl: fn(), setRestoredMedia: fn(), setRestoredPosition: fn(), setRestoredSpeed: fn(),
    setActivepublicId: fn(), activepublicIdRef: { current: null }, setUploadedAudio: fn(),
    lastServerSnapshotRef: { current: null }, sessionUploadIdRef: { current: null },
  } as never));
}

describe('resetAppState', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.PROJECT, '{"lines":[{"text":"Line one"}]}');
  });

  it('discards the guest draft on an explicit new project', () => {
    setup().result.current.resetAppState();
    expect(localStorage.getItem(STORAGE_KEYS.PROJECT)).toBeNull();
  });

  it('keeps the guest draft when asked to, as when browser Back lands on the setup screen', () => {
    setup().result.current.resetAppState({ keepGuestDraft: true });
    expect(localStorage.getItem(STORAGE_KEYS.PROJECT)).not.toBeNull();
  });

  it('an explicit new project also discards the rejected-draft backup, but Back keeps it', () => {
    localStorage.setItem(STORAGE_KEYS.PROJECT_REJECTED, 'old');
    setup().result.current.resetAppState({ keepGuestDraft: true });
    expect(localStorage.getItem(STORAGE_KEYS.PROJECT_REJECTED)).toBe('old');
    setup().result.current.resetAppState();
    expect(localStorage.getItem(STORAGE_KEYS.PROJECT_REJECTED)).toBeNull();
  });
});
