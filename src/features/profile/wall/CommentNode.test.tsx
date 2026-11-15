// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@/app/i18n';
import { WallThreadContext } from './wall-thread';
import type { WallThread } from './wall-thread';
import type { WallComment } from './wall.service';
import CommentNode from './CommentNode';
import { getWallLikers } from './wall.service';

vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: { advanced: {} } }) }));
vi.mock('@ui/UserHoverCard', () => ({ UserHoverCard: ({ children }: { children: ReactNode }) => children }));
vi.mock('./WallComposer', () => ({ default: () => null }));
vi.mock('./CommentBody', () => ({ default: () => null }));
vi.mock('./CommentMenus', () => ({ CommentMenu: () => null, LikersPopover: () => null }));
vi.mock('./wall.service', async (orig) => ({ ...(await orig<typeof import('./wall.service')>()), getWallLikers: vi.fn() }));

const nameTag = {
  id: 'og',
  label: { en: 'Founder', es: 'Fundador' },
  description: { en: 'Joined early', es: 'Se unió pronto' },
  icon: '',
  color: 'primary',
};

const thread = {
  signedIn: false, viewerId: undefined, isOwner: false, busy: false,
  replyingTo: null, editingId: null, highlightedId: null, paths: [], collapsed: new Set<string>(),
  flash: null, loadingRepliesFor: null,
  setReplyingTo: vi.fn(), setEditingId: vi.fn(), setHoverPath: vi.fn(), select: vi.fn(),
  toggleCollapsed: vi.fn(), toggleLike: vi.fn(), togglePin: vi.fn(), remove: vi.fn(),
} as unknown as WallThread;

const comment = (author: Partial<WallComment['author']>): WallComment => ({
  id: 'c1', body: 'hi', mentions: [], projectRefs: [], createdAt: new Date().toISOString(),
  editedAt: null, depth: 0, canDelete: false, canEdit: false, pinned: false, likeCount: 0,
  likedByMe: false, replyToId: null, replyToMissing: false, replyCount: 0, descendantCount: 0,
  replies: [], deleted: false,
  author: { id: 'u1', accountName: 'ana', displayName: 'Ana', avatarUrl: null, staffRole: null, allowsTags: true, ...author },
});

const setup = (author: Partial<WallComment['author']>) =>
  render(
    <MemoryRouter>
      <WallThreadContext.Provider value={thread}><CommentNode comment={comment(author)} /></WallThreadContext.Provider>
    </MemoryRouter>,
  );

describe('CommentNode name tag', () => {
  it('shows the pill after the author name when nameTag is provided', () => {
    setup({ nameTag });
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });

  it('shows no pill when nameTag is null', () => {
    setup({ nameTag: null });
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Founder')).toBeNull();
  });
});

describe('LikersPopover name tag', () => {
  it('shows the pill beside a liker name when nameTag is provided', async () => {
    const { LikersPopover } = await vi.importActual<typeof import('./CommentMenus')>('./CommentMenus');
    vi.mocked(getWallLikers).mockResolvedValue({
      total: 2,
      users: [
        { id: 'u1', accountName: 'ana', displayName: 'Ana', avatarUrl: null, staffRole: null, allowsTags: true, nameTag },
        { id: 'u2', accountName: 'bo', displayName: 'Bo', avatarUrl: null, staffRole: null, allowsTags: true, nameTag: null },
      ],
    });
    render(<MemoryRouter><LikersPopover commentId="c1" count={2} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Bo')).toBeInTheDocument();
    expect(screen.getAllByText('Founder')).toHaveLength(1);
  });
});
