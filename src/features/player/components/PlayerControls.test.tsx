import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@ui/tooltip';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import PlayerControls from './PlayerControls';

vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ settings: DEFAULT_SETTINGS, updateSetting: vi.fn() }),
}));
vi.mock('@/features/player/PlayerContext', () => ({
  usePlayer: () => ({
    source: 'local', isPlaying: false, isSeeking: false, currentTime: 0, duration: 180, playbackSpeed: 1,
    hasMedia: true, loopA: null, loopB: null, mediaTitle: 'Song', songName: 'Song',
    local: {}, yt: {}, mediaUploads: [], cdnLoading: false, syncMode: true, viewerMode: false,
    MIN_SPEED: 0.25, MAX_SPEED: 2, speedPresets: [1], lines: [], playbackPosition: 0, audioRef: { current: null },
    detectedUrlType: '', mediaPopoverProps: {}, fetchUploads: vi.fn(), togglePlay: vi.fn(), seek: vi.fn(),
    applySpeed: vi.fn(), setLoop: vi.fn(), handleLoopChange: vi.fn(), clearLoop: vi.fn(), handleUrlLoad: vi.fn(),
    handleSelectUpload: vi.fn(), failedAudioUrl: null, retryAudio: vi.fn(), volume: 1, setVolume: vi.fn(),
  }),
}));

describe('PlayerControls mobile dock', () => {
  it('keeps Change song and has no editor:mark button, even while syncing', () => {
    const marks = vi.fn();
    window.addEventListener('editor:mark', marks);
    const { container } = render(<TooltipProvider><PlayerControls variant="mobile" /></TooltipProvider>);
    expect(screen.getAllByRole('button', { name: /change/i }).length).toBeGreaterThan(0);
    // The old dock had a mark dot that fired editor:mark. Nothing listens for it any more, so
    // a dock that dispatches it again would be a Mark that silently does nothing.
    for (const b of container.querySelectorAll('button')) fireEvent.pointerDown(b);
    expect(marks).not.toHaveBeenCalled();
    window.removeEventListener('editor:mark', marks);
  });
});
