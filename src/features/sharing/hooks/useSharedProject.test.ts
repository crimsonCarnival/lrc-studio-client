import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('react-google-recaptcha-v3', () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }) }));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ updateSetting: vi.fn() }) }));
vi.mock('@/app/recaptcha-arm', () => ({ executeRecaptchaSafe: vi.fn().mockResolvedValue('token') }));
vi.mock('./useProjectSocket', () => ({ useProjectSocket: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const api = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), getShare: vi.fn() }));
vi.mock('@/app/api', () => ({
  projects: api,
  uploads: { saveMedia: vi.fn() },
  getAccessToken: () => null,
}));

import toast from 'react-hot-toast';
import { useSharedProject } from './useSharedProject';

function setup() {
  const setShareModal = vi.fn();
  const setActivepublicId = vi.fn();
  const setProjectVisibility = vi.fn();
  const activepublicIdRef = { current: null as string | null };
  const { result } = renderHook(() => useSharedProject({
    setLines: vi.fn(), setSyncMode: vi.fn(), setActiveLineIndex: vi.fn(), setEditorModeRaw: vi.fn(),
    setRestoredMedia: vi.fn(), setRestoredPosition: vi.fn(), setRestoredSpeed: vi.fn(), setIsProjectLoading: vi.fn(),
    setActivepublicId, setShareModal, setProjectVisibility, activepublicIdRef,
    lines: [{ text: 'a', timestamp: 1 }], editorMode: 'lrc', syncMode: true, mediaTitle: 'Song',
    projectMetadata: {}, duration: 10, projectYtUrl: '', uploadedAudio: null, restoredMedia: null,
  }));
  return { result, setShareModal, setActivepublicId, setProjectVisibility, activepublicIdRef };
}

beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

describe('exportToUrl', () => {
  it('hands out the link and records the project as public when both steps succeed', async () => {
    api.create.mockResolvedValue({ publicId: 'abc1234567' });
    api.update.mockResolvedValue({ project: {} });
    const { result, setShareModal, setProjectVisibility } = setup();
    await act(() => result.current.exportToUrl());
    expect(api.update).toHaveBeenCalledWith('abc1234567', { public: true });
    expect(setProjectVisibility).toHaveBeenCalledWith('abc1234567', true);
    expect(setShareModal).toHaveBeenLastCalledWith(expect.objectContaining({ url: expect.stringContaining('/share/abc1234567') }));
  });

  it('tells the user and gives no link when the project is created but cannot be made public', async () => {
    api.create.mockResolvedValue({ publicId: 'abc1234567' });
    api.update.mockRejectedValue(new Error('boom'));
    const { result, setShareModal, setActivepublicId, setProjectVisibility } = setup();
    await act(() => result.current.exportToUrl());
    expect(toast.error).toHaveBeenCalledWith('project.shareMadePublicFailed');
    expect(setProjectVisibility).not.toHaveBeenCalled();
    // The saved project is still adopted, so the editor keeps working on it.
    expect(setActivepublicId).toHaveBeenCalledWith('abc1234567');
    expect(setShareModal).toHaveBeenLastCalledWith(null);
    expect(setShareModal).not.toHaveBeenCalledWith(expect.objectContaining({ url: expect.anything() }));
  });
});
