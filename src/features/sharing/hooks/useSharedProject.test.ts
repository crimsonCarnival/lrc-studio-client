import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ updateSetting: vi.fn() }) }));
vi.mock('./useProjectSocket', () => ({ useProjectSocket: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const api = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), patch: vi.fn(), getShare: vi.fn() }));
vi.mock('@/app/api', () => ({ projects: api }));

import toast from 'react-hot-toast';
import { useSharedProject } from './useSharedProject';

function setup(id: string | null) {
  const setShareModal = vi.fn();
  const { result } = renderHook(() => useSharedProject({
    setLines: vi.fn(), setSyncMode: vi.fn(), setActiveLineIndex: vi.fn(), setEditorModeRaw: vi.fn(),
    setRestoredMedia: vi.fn(), setRestoredPosition: vi.fn(), setRestoredSpeed: vi.fn(), setIsProjectLoading: vi.fn(),
    setShareModal, activepublicIdRef: { current: id },
    lines: [{ text: 'a', timestamp: 1 }], projectYtUrl: '', uploadedAudio: null,
  }));
  return { result, setShareModal };
}

beforeEach(() => vi.clearAllMocks());

describe('exportToUrl (Share project)', () => {
  it('only presents the link of a saved project: it never creates, updates or publishes', async () => {
    const { result, setShareModal } = setup('abc1234567');
    await act(async () => result.current.exportToUrl());
    expect(setShareModal).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining('/share/abc1234567') }));
    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('gives no link for a project without a server id', async () => {
    const { result, setShareModal } = setup(null);
    await act(async () => result.current.exportToUrl());
    expect(setShareModal).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
  });
});
