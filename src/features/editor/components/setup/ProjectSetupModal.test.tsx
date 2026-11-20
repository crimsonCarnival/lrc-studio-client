import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('react-google-recaptcha-v3', () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }) }));
const api = vi.hoisted(() => ({ songMetadata: { lookupTrack: vi.fn(), searchTracks: vi.fn() } }));
vi.mock('@/app/api', () => api);
vi.mock('@/features/artists/ArtistsInput', () => ({ ArtistsInput: () => null }));
vi.mock('@/features/artists/ArtistImportReview', () => ({ ArtistImportReview: () => null }));
vi.mock('@/features/assist/NameCheckSuggestion', () => ({ NameCheckSuggestion: ({ children }: { children: unknown }) => children }));
vi.mock('@/features/artists/TitleFeatSuggestion', () => ({ TitleFeatSuggestion: () => null }));

vi.mock('@/features/projects/components/PublishDialog', () => ({
  PublishDialog: ({ open, project, onPublished }: { open: boolean; project: { publicId?: string | null; isPublic: boolean }; onPublished?: (v: boolean) => void }) => (
    open ? <button onClick={() => onPublished?.(!project.isPublic)}>publish-dialog:{project.publicId}</button> : null
  ),
}));

import ProjectSetupModal from './ProjectSetupModal';

function renderModal(props: Partial<React.ComponentProps<typeof ProjectSetupModal>> = {}) {
  const onConfirm = vi.fn();
  render(<ProjectSetupModal isOpen onClose={vi.fn()} onConfirm={onConfirm} initialName="Song" {...props} />);
  return onConfirm;
}

describe('ProjectSetupModal visibility', () => {
  it('shows visibility read-only: no switch, and saving never sends a visibility', () => {
    const onConfirm = renderModal({ initialIsPublic: true, isEditing: true });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText('project.visibilityPublic')).toBeInTheDocument();
    fireEvent.click(screen.getByText('common.save'));
    expect(onConfirm.mock.calls[0][0]).not.toHaveProperty('isPublic');
  });

  it('offers no visibility action for a project that is not saved', () => {
    renderModal({ isEditing: true });
    expect(screen.getByText('project.visibilityPrivate')).toBeInTheDocument();
    expect(screen.queryByText('project.visibilityManage')).not.toBeInTheDocument();
  });

  it('leads through the publish dialog and reflects only what it confirms', () => {
    const onVisibilityChange = vi.fn();
    renderModal({ isEditing: true, publicId: 'abc1234567', initialIsPublic: false, onVisibilityChange });
    expect(screen.getByText('project.visibilityPrivate')).toBeInTheDocument();
    fireEvent.click(screen.getByText('project.visibilityManage'));
    fireEvent.click(screen.getByText('publish-dialog:abc1234567'));
    expect(onVisibilityChange).toHaveBeenCalledWith(true, undefined);
    expect(screen.getByText('project.visibilityPublic')).toBeInTheDocument();
  });
});

describe('ProjectSetupModal song search', () => {
  const suggestion = (over: Record<string, unknown>) => ({
    provider: 'itunes', trackId: '1', name: '', artist: '', album: '', duration: 0, albumArt: null, releaseYear: null,
    totalTracks: null, trackNumber: null, previewUrl: null, explicit: false, genres: [], score: 0,
    artistMatch: true, featuredMatch: false, titleMatch: true, ...over,
  });

  it('lists the tracks, sends the featured artists, and applies only the one picked', async () => {
    api.songMetadata.searchTracks.mockResolvedValue([
      suggestion({ trackId: '2', name: 'castles', artist: 'Lil Peep & Lil Tracy', album: 'Castles', releaseYear: '2016', featuredMatch: true }),
      suggestion({ trackId: '3', name: 'Castles (feat. SNIIMA BEATS)', artist: 'Lil Peep', album: 'Other' }),
      suggestion({ trackId: '1', name: 'Castles', artist: 'Tom MacDonald', album: 'Tom', artistMatch: false }),
    ]);
    renderModal({
      initialSongName: 'castles',
      initialArtists: [{ name: 'Lil Peep', role: 'primary', order: 0 }, { name: 'Lil Tracy', role: 'featured', order: 1 }],
    });
    fireEvent.click(screen.getByText('setup.fetchInfo'));
    await screen.findByText('setup.songSuggestions.title');
    expect(api.songMetadata.searchTracks).toHaveBeenCalledWith('castles', 'Lil Peep', ['Lil Tracy']);
    expect(screen.getByText('setup.songSuggestions.otherArtists')).toBeInTheDocument();
    // Nothing applied yet.
    expect((document.getElementById('song-album') as HTMLInputElement).value).toBe('');

    fireEvent.click(screen.getByText('Castles (feat. SNIIMA BEATS)'));
    await waitFor(() => expect(screen.queryByText('setup.songSuggestions.title')).not.toBeInTheDocument());
    expect((document.getElementById('song-album') as HTMLInputElement).value).toBe('Other');
    expect((document.getElementById('song-name') as HTMLInputElement).value).toBe('Castles (feat. SNIIMA BEATS)');
  });

  it('says so when no track is by the artist', async () => {
    api.songMetadata.searchTracks.mockResolvedValue([suggestion({ name: 'Castles', artist: 'Tom MacDonald', artistMatch: false })]);
    renderModal({ initialSongName: 'castles', initialArtists: [{ name: 'Lil Peep', role: 'primary', order: 0 }] });
    fireEvent.click(screen.getByText('setup.fetchInfo'));
    expect(await screen.findByText('setup.songSuggestions.noArtistMatch')).toBeInTheDocument();
    expect(screen.queryByText('setup.songSuggestions.best')).not.toBeInTheDocument();
  });
});

describe('ProjectSetupModal for subtitles', () => {
  it('hides the song-only fields and keeps title, description, tags and cover', () => {
    renderModal({ kind: 'subtitles', initialSingers: [] });
    expect(screen.queryByText('setup.songInformation')).not.toBeInTheDocument();
    expect(screen.queryByText('setup.fetchInfo')).not.toBeInTheDocument();
    expect(screen.queryByText('settings.interface.singerColors')).not.toBeInTheDocument();
    for (const id of ['song-version', 'song-album', 'song-year', 'song-genre']) expect(document.getElementById(id)).not.toBeInTheDocument();
    expect(screen.getByLabelText('setup.subtitleTitle')).toBeInTheDocument();
    for (const id of ['project-description', 'project-tags', 'cover-image']) expect(document.getElementById(id)).toBeInTheDocument();
  });

  it('still shows them for a song project', () => {
    renderModal({ initialSingers: [] });
    expect(screen.getByText('setup.songInformation')).toBeInTheDocument();
    expect(document.getElementById('song-album')).toBeInTheDocument();
  });
});
