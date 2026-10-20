import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const uploads = [
  { id: 'u1', title: 'First upload', source: 'cloudinary', uploadUrl: 'https://res.cloudinary.com/x/video/upload/a.mp3' },
  { id: 'u2', title: 'Second upload', source: 'cloudinary', uploadUrl: 'https://res.cloudinary.com/x/video/upload/b.mp3' },
  { id: 'u3', title: 'A video', source: 'youtube', uploadUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
];

// Hoisted so the vi.mock factory below can close over it: tests set the next verdict to
// drive the availability check, which gates whether a YouTube URL is ever handed to the player.
const { ytVerify } = vi.hoisted(() => ({
  ytVerify: vi.fn<() => Promise<'playable' | 'blocked' | 'superseded'>>(async () => 'playable'),
}));

vi.mock('@/app/api', () => ({
  getAccessToken: () => true,
  uploads: {
    listMedia: vi.fn(async () => uploads),
    getMedia: vi.fn(async (id: string) => ({ upload: id === 'old' ? { id: 'old', title: 'Old upload', source: 'cloudinary', uploadUrl: 'https://res.cloudinary.com/x/video/upload/old.mp3' } : null })),
    saveMedia: vi.fn(),
    deleteMedia: vi.fn(),
  },
  lyrics: { parse: vi.fn() },
  songMetadata: { lookupTrack: vi.fn() },
}));
vi.mock('@/shared/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('@/features/editor/music-library.service', () => ({ getMyMusicLibrary: vi.fn(async () => []) }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: { id: 'me', preferences: {} } }) }));
vi.mock('react-google-recaptcha-v3', () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }) }));
vi.mock('@features/projects/components/YoutubeSearchPanel', () => ({ default: () => <div data-testid="yt-search" /> }));
vi.mock('../lyrics-search/LyricsSearchBar', () => ({ default: () => null }));
vi.mock('@/features/artists/ArtistsSection', () => ({ ArtistsSection: () => null }));
vi.mock('@/features/artists/TitleFeatSuggestion', () => ({ TitleFeatSuggestion: () => null }));
vi.mock('@/features/player/hooks/useYouTubeAvailability', () => ({
  useYouTubeAvailability: () => ({ check: { state: 'idle' }, verify: ytVerify, reset: vi.fn() }),
  YT_UNAVAILABLE_KEYS: {},
}));

import { TooltipProvider } from '@ui/tooltip';
import SetupScreen from './SetupScreen';

function renderSetup(state?: unknown, search = '') {
  const playerRef = { current: { loadFromUrl: vi.fn(), loadYouTube: vi.fn(), loadLocalAudio: vi.fn() } };
  render(
    <MemoryRouter initialEntries={[{ pathname: '/project/new', search, state }]}>
      <TooltipProvider><SetupScreen onComplete={vi.fn()} playerRef={playerRef} /></TooltipProvider>
    </MemoryRouter>,
  );
  return playerRef;
}

describe('SetupScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preselects the upload passed from the uploads library', async () => {
    const playerRef = renderSetup({ uploadId: 'u2' });
    await waitFor(() => expect(screen.getByText('setup.audioReady')).toBeInTheDocument());
    expect(screen.getByText('Second upload')).toBeInTheDocument();
    expect(playerRef.current.loadFromUrl).toHaveBeenCalledWith(uploads[1].uploadUrl, 'Second upload');
  });

  // The uploads library hands the id over in the URL; history state does not
  // survive the route's app-state reset or a reload of the setup page.
  it('preselects the upload named by ?uploadId=', async () => {
    const playerRef = renderSetup(undefined, '?uploadId=u2');
    await waitFor(() => expect(screen.getByText('setup.audioReady')).toBeInTheDocument());
    expect(screen.getByText('Second upload')).toBeInTheDocument();
    expect(playerRef.current.loadFromUrl).toHaveBeenCalledWith(uploads[1].uploadUrl, 'Second upload');
  });

  it('fetches a requested upload that is not in the recent list', async () => {
    const playerRef = renderSetup({ uploadId: 'old' });
    await waitFor(() => expect(screen.getByText('setup.audioReady')).toBeInTheDocument());
    expect(screen.getAllByText('Old upload').length).toBeGreaterThan(0);
    expect(playerRef.current.loadFromUrl).toHaveBeenCalledWith('https://res.cloudinary.com/x/video/upload/old.mp3', 'Old upload');
  });

  it('lists every upload in the "Your uploads" tab', async () => {
    const playerRef = renderSetup();
    fireEvent.click(screen.getByText('setup.tabUploads'));
    await waitFor(() => expect(screen.getByText('First upload')).toBeInTheDocument());
    fireEvent.click(screen.getByText('First upload'));
    expect(screen.getByText('setup.audioReady')).toBeInTheDocument();
    expect(playerRef.current.loadFromUrl).toHaveBeenCalledWith(uploads[0].uploadUrl, 'First upload');
  });
});

/**
 * Covers the paths that decide whether media reaches the player at all: the local file
 * input, both branches of the URL loader, the availability gate in front of YouTube, and
 * the pending-URL handoff from the player. These run through the rendered screen rather
 * than the handlers directly, so they stay honest if this logic is later moved into a hook
 * of its own — which is the point of having them.
 */
describe('SetupScreen: loading media', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ytVerify.mockResolvedValue('playable');
    sessionStorage.clear();
  });

  function openLocalTab() {
    fireEvent.click(screen.getByText('setup.tabLocal'));
  }

  function enterUrl(url: string) {
    fireEvent.change(screen.getByLabelText('setup.urlPlaceholder'), { target: { value: url } });
  }

  it('hands a chosen audio file straight to the player', () => {
    const playerRef = renderSetup();
    openLocalTab();
    const file = new File(['x'], 'my-song.mp3', { type: 'audio/mpeg' });
    fireEvent.change(document.getElementById('setup-audio-input')!, { target: { files: [file] } });

    expect(playerRef.current.loadLocalAudio).toHaveBeenCalledWith(file);
    expect(screen.getByText('setup.audioReady')).toBeInTheDocument();
    expect(screen.getByText('my-song.mp3')).toBeInTheDocument();
  });

  it('refuses a file that is not audio', () => {
    const playerRef = renderSetup();
    openLocalTab();
    const file = new File(['x'], 'cover.png', { type: 'image/png' });
    fireEvent.change(document.getElementById('setup-audio-input')!, { target: { files: [file] } });

    expect(playerRef.current.loadLocalAudio).not.toHaveBeenCalled();
    expect(screen.queryByText('setup.audioReady')).not.toBeInTheDocument();
  });

  it('loads a direct audio URL and records it as an upload', async () => {
    const { uploads: uploadsApi } = await import('@/app/api') as unknown as { uploads: { saveMedia: ReturnType<typeof vi.fn> } };
    const playerRef = renderSetup();
    openLocalTab();
    enterUrl('https://res.cloudinary.com/demo/video/upload/track.mp3');
    fireEvent.click(screen.getByText('player.load'));

    expect(playerRef.current.loadFromUrl).toHaveBeenCalledWith('https://res.cloudinary.com/demo/video/upload/track.mp3', 'track');
    expect(playerRef.current.loadYouTube).not.toHaveBeenCalled();
    await waitFor(() => expect(uploadsApi.saveMedia).toHaveBeenCalledWith(expect.objectContaining({
      source: 'cloudinary',
      uploadUrl: 'https://res.cloudinary.com/demo/video/upload/track.mp3',
      fileName: 'track.mp3',
      title: 'track',
    })));
  });

  it('verifies a YouTube URL before loading it', async () => {
    const playerRef = renderSetup();
    openLocalTab();
    enterUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    fireEvent.click(screen.getByText('player.load'));

    await waitFor(() => expect(playerRef.current.loadYouTube).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
    expect(ytVerify).toHaveBeenCalledWith('dQw4w9WgXcQ');
    expect(screen.getByText('setup.audioReady')).toBeInTheDocument();
  });

  // The editor plays YouTube through the IFrame API, so an unembeddable video has to stay
  // out of the player entirely rather than loading and failing later.
  it('does not load a YouTube video the availability check rejects', async () => {
    ytVerify.mockResolvedValue('blocked');
    const playerRef = renderSetup();
    openLocalTab();
    enterUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    fireEvent.click(screen.getByText('player.load'));

    await waitFor(() => expect(ytVerify).toHaveBeenCalled());
    expect(playerRef.current.loadYouTube).not.toHaveBeenCalled();
    expect(screen.queryByText('setup.audioReady')).not.toBeInTheDocument();
  });

  // The player stashes a URL in sessionStorage when it sends someone here to start a
  // project with it; arriving with one should load it without a second click.
  it('auto-loads a URL left behind in sessionStorage and clears it', async () => {
    sessionStorage.setItem('pendingYtUrl', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const playerRef = renderSetup();

    await waitFor(() => expect(playerRef.current.loadYouTube).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
    expect(sessionStorage.getItem('pendingYtUrl')).toBeNull();
  });

  it('loads a saved YouTube upload through the YouTube player, not the URL loader', async () => {
    const playerRef = renderSetup();
    fireEvent.click(screen.getByText('setup.tabUploads'));
    await waitFor(() => expect(screen.getByText('A video')).toBeInTheDocument());
    fireEvent.click(screen.getByText('A video'));

    expect(playerRef.current.loadYouTube).toHaveBeenCalledWith(uploads[2].uploadUrl);
    expect(playerRef.current.loadFromUrl).not.toHaveBeenCalled();
  });
});
