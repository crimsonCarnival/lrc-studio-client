// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ProjectCollaborator } from '@/types/graphql';

const { removeCollaborator, toastError } = vi.hoisted(() => ({ removeCollaborator: vi.fn(), toastError: vi.fn() }));
vi.mock('@features/projects/services/projects.service', () => ({ projectsService: { removeCollaborator } }));
vi.mock('react-hot-toast', () => ({ default: { error: toastError } }));
// Confirms immediately, so the tests are about the row; the message is still captured.
const requestConfirm = vi.fn((_message: string, action: () => void) => action());
vi.mock('@/shared/hooks/useConfirm', () => ({ default: () => [requestConfirm, null] }));
// The hover card needs the app's auth and query providers.
vi.mock('@ui/UserHoverCard', () => ({ UserHoverCard: ({ children }: { children: ReactNode }) => children }));

import { ProjectCollaborators } from './ProjectCollaborators';

const ana: ProjectCollaborator = {
  id: 'user:1', name: 'ana', isGuest: false,
  // The API only fills these four fields of the generated (full) User type.
  user: { id: '1', accountName: 'ana', displayName: 'Ana B', avatarUrl: null } as ProjectCollaborator['user'],
};
const guest: ProjectCollaborator = { id: 'guest:9', name: 'Visitor', isGuest: true, user: null };

const setup = (collaborators: ProjectCollaborator[], isOwner = false) =>
  render(
    <MemoryRouter>
      <dl><ProjectCollaborators publicId="p1" collaborators={collaborators} isOwner={isOwner} /></dl>
    </MemoryRouter>,
  );

describe('ProjectCollaborators', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders nothing when there are no collaborators', () => {
    const { container } = setup([]);
    expect(container.querySelector('dl')).toBeEmptyDOMElement();
  });

  it('links a signed-in collaborator to their profile', () => {
    setup([ana]);
    const link = screen.getByRole('link', { name: /Ana B/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('ana'));
  });

  it('shows a guest unlinked, with a guest tag', () => {
    setup([guest]);
    expect(screen.getByText('Visitor')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('guest')).toBeInTheDocument();
  });

  it('offers removal to the owner only', () => {
    const { unmount } = setup([ana, guest], false);
    expect(screen.queryByRole('button')).toBeNull();
    unmount();
    setup([ana, guest], true);
    expect(screen.getByRole('button', { name: 'Remove Ana B from the credits' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Visitor from the credits' })).toBeInTheDocument();
  });

  it('confirms with the collaborator named, calls the mutation and drops the row', async () => {
    removeCollaborator.mockResolvedValue(true);
    setup([ana, guest], true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Visitor from the credits' }));
    expect(requestConfirm.mock.calls[0][0]).toContain('Visitor');
    await waitFor(() => expect(screen.queryByText('Visitor')).toBeNull());
    expect(removeCollaborator).toHaveBeenCalledWith('p1', 'guest:9');
    expect(screen.getByText('Ana B')).toBeInTheDocument();
  });

  it('treats not_found as already removed: the row goes and no error shows', async () => {
    removeCollaborator.mockRejectedValue(Object.assign(new Error('gone'), { code: 'not_found' }));
    setup([ana], true);
    fireEvent.click(screen.getByRole('button', { name: /Remove Ana B/ }));
    await waitFor(() => expect(screen.queryByText('Ana B')).toBeNull());
    expect(toastError).not.toHaveBeenCalled();
  });

  it('keeps the row and shows an error for any other failure', async () => {
    removeCollaborator.mockRejectedValue(Object.assign(new Error('nope'), { code: 'forbidden' }));
    setup([ana], true);
    fireEvent.click(screen.getByRole('button', { name: /Remove Ana B/ }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Could not remove the credit'));
    expect(screen.getByText('Ana B')).toBeInTheDocument();
  });
});
