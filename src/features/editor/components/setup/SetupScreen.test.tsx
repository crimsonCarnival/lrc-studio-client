import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const uploads = [
  { id: 'u1', title: 'First upload', source: 'cloudinary', uploadUrl: 'https://res.cloudinary.com/x/video/upload/a.mp3' },
  { id: 'u2', title: 'Second upload', source: 'cloudinary', uploadUrl: 'https://res.cloudinary.com/x/video/upload/b.mp3' },
];

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

import { TooltipProvider } from '@ui/tooltip';
import SetupScreen from './SetupScreen';

function renderSetup(state?: unknown) {
  const playerRef = { current: { loadFromUrl: vi.fn(), loadYouTube: vi.fn() } };
  render(
    <MemoryRouter initialEntries={[{ pathname: '/project/new', state }]}>
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
