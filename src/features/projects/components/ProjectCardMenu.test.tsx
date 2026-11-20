import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@ui/tooltip';

const m = vi.hoisted(() => ({
  navigate: vi.fn(),
  user: { accountName: 'me', isGuest: false } as { accountName: string; isGuest: boolean } | null,
  startSession: vi.fn(),
  listMySessions: vi.fn(),
  getPlaylists: vi.fn(),
  addProjectToPlaylist: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<typeof import('react-router-dom')>()), useNavigate: () => m.navigate }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: m.user }) }));
vi.mock('@/features/collab/collab.service', () => ({ startSession: m.startSession, listMySessions: m.listMySessions }));
vi.mock('@/features/playlists/playlist.service', () => ({ getPlaylists: m.getPlaylists, addProjectToPlaylist: m.addProjectToPlaylist }));

import { ProjectCardMenuButton } from './ProjectCardMenu';

// Font-drawn icons put their glyph in the item's accessible name, so match the label inside it.
const item = (label: string) => new RegExp(label.replace(/\./g, '\\.'));

const project = { publicId: 'abcdefghij', title: 'Song', metadata: { songName: 'Song', songArtist: 'Band' } };

function open(props: Partial<Parameters<typeof ProjectCardMenuButton>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TooltipProvider>
          <ProjectCardMenuButton project={project} isOwner {...props} />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.click(screen.getByRole('button', { name: 'common.moreActions' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  m.user = { accountName: 'me', isGuest: false };
  m.listMySessions.mockResolvedValue([]);
  m.getPlaylists.mockResolvedValue([]);
  m.startSession.mockResolvedValue({});
});

describe('ProjectCardMenu', () => {
  it('lets the owner start a live session and moves to it', async () => {
    await open();
    await userEvent.click(await screen.findByRole('menuitem', { name: item('collab.menu.start') }));
    await waitFor(() => expect(m.navigate).toHaveBeenCalledWith('/session/abcdefghij'));
    expect(m.startSession).toHaveBeenCalledWith('abcdefghij');
  });

  it('says "Open live session" when the project already has one', async () => {
    m.listMySessions.mockResolvedValue([{ publicId: 'abcdefghij' }]);
    await open();
    expect(await screen.findByRole('menuitem', { name: item('collab.menu.open') })).toBeInTheDocument();
  });

  it('opens the owner\'s project in the editor', async () => {
    await open();
    await userEvent.click(await screen.findByRole('menuitem', { name: item('projectView.actions.openEditor') }));
    expect(m.navigate).toHaveBeenCalledWith('/me/projects/band-song-abcdefghij/edit');
  });

  it('offers a visitor fork instead of session and editor items', async () => {
    await open({ isOwner: false, ownerAccountName: 'someone' });
    expect(await screen.findByRole('menuitem', { name: item('projectView.actions.fork') })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: item('collab.menu.start') })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: item('projectView.actions.openEditor') })).not.toBeInTheDocument();
  });

  it('hides fork when the owner turned forks off', async () => {
    await open({ isOwner: false, ownerAccountName: 'someone', project: { ...project, forksEnabled: false } });
    await screen.findByRole('menuitem', { name: item('projectView.actions.copyLink') });
    expect(screen.queryByRole('menuitem', { name: item('projectView.actions.fork') })).not.toBeInTheDocument();
  });

  it('gives guests neither a session nor list items', async () => {
    m.user = { accountName: 'guest', isGuest: true };
    await open();
    await screen.findByRole('menuitem', { name: item('projectView.actions.copyLink') });
    expect(screen.queryByRole('menuitem', { name: item('collab.menu.start') })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: item('projectView.actions.addToList') })).not.toBeInTheDocument();
  });
});
