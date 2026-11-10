import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { EditorLine } from '@/features/editor/editor.types';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));

const auth = vi.hoisted(() => ({ user: { id: 'u1' } as null | { id: string; isGuest?: boolean } }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: auth.user }) }));

const api = vi.hoisted(() => ({ update: vi.fn(), get: vi.fn() }));
vi.mock('@/features/projects/services/projects.service', () => ({ projectsService: api }));
vi.mock('@/features/sharing/components/ShareSheet', () => ({
  ShareSheet: ({ open }: { open: boolean }) => (open ? <div data-testid="share-sheet" /> : null),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { PublishDialog, type PublishProject } from './PublishDialog';

const timedLines: EditorLine[] = [{ text: 'a', timestamp: 1 }, { text: 'b', timestamp: 2 }];
const base: PublishProject = { publicId: 'abc1234567', isPublic: false, title: 'Song', artists: ['Artist'], coverImage: 'c.jpg', lines: timedLines };

function setup(project: PublishProject = base, onSave?: () => Promise<boolean>) {
  const onOpenChange = vi.fn();
  const onPublished = vi.fn();
  const ui = (open: boolean, p: PublishProject) => (
    <MemoryRouter>
      <PublishDialog open={open} onOpenChange={onOpenChange} project={p} onPublished={onPublished} onSave={onSave} />
    </MemoryRouter>
  );
  const view = render(ui(true, project));
  return { onOpenChange, onPublished, rerender: (open: boolean, p: PublishProject = project) => view.rerender(ui(open, p)) };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: 'u1' };
});

describe('PublishDialog', () => {
  it('publishes with the public flag and ends on the public link with share actions', async () => {
    api.update.mockResolvedValue({ project: {} });
    const { onPublished } = setup();
    expect(screen.getByText('Song')).toBeInTheDocument();
    fireEvent.click(screen.getByText('project.publishAction'));
    await waitFor(() => expect(screen.getByText('project.publishedTitle')).toBeInTheDocument());
    expect(api.update).toHaveBeenCalledWith('abc1234567', { public: true });
    expect(onPublished).toHaveBeenCalledWith(true, true);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toContain('/og/project/abc1234567');
    fireEvent.click(screen.getByText('project.publishShare'));
    expect(screen.getByTestId('share-sheet')).toBeInTheDocument();
  });

  it('keeps the dialog open with an error and stays private when publishing fails', async () => {
    api.update.mockRejectedValue(new Error('boom'));
    const { onPublished, onOpenChange } = setup();
    fireEvent.click(screen.getByText('project.publishAction'));
    expect(await screen.findByRole('alert')).toHaveTextContent('project.publishFailed');
    expect(onPublished).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.queryByText('project.publishedTitle')).not.toBeInTheDocument();
    expect(screen.getByText('project.publishAction')).toBeEnabled();
  });

  it('blocks publishing while a lyric line is untimed and flags it', () => {
    setup({ ...base, lines: [{ text: 'a', timestamp: 1 }, { text: 'b', timestamp: null }] });
    expect(screen.getByText('project.publishMissingLines')).toBeInTheDocument();
    expect(screen.getByText('project.publishAction').closest('button')).toBeDisabled();
  });

  it('flags a missing cover and artist without blocking', () => {
    setup({ ...base, artists: [], coverImage: '' });
    expect(screen.getByText('project.publishMissingCover')).toBeInTheDocument();
    expect(screen.getByText('project.publishMissingArtist')).toBeInTheDocument();
    expect(screen.getByText('project.publishAction').closest('button')).toBeEnabled();
  });

  it('loads the lyrics itself when the caller has none', async () => {
    api.get.mockResolvedValue({ project: { lyrics: { sections: [{ lines: [{ text: 'a', timestamp: 1 }] }] } } });
    setup({ ...base, lines: undefined });
    await waitFor(() => expect(screen.getByText('project.publishAction').closest('button')).toBeEnabled());
    expect(api.get).toHaveBeenCalledWith('abc1234567');
  });

  it('confirms before making a public project private', async () => {
    api.update.mockResolvedValue({ project: {} });
    const { onPublished, onOpenChange } = setup({ ...base, isPublic: true });
    expect(api.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('project.unpublishAction'));
    await waitFor(() => expect(onPublished).toHaveBeenCalledWith(false, true));
    expect(api.update).toHaveBeenCalledWith('abc1234567', { public: false });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps a public project public when making it private fails', async () => {
    api.update.mockRejectedValue(new Error('boom'));
    const { onPublished } = setup({ ...base, isPublic: true });
    fireEvent.click(screen.getByText('project.unpublishAction'));
    expect(await screen.findByRole('alert')).toHaveTextContent('project.unpublishFailed');
    expect(onPublished).not.toHaveBeenCalled();
  });

  it('sends a guest to sign in instead of publishing', () => {
    auth.user = { id: 'g', isGuest: true };
    setup();
    expect(screen.getByText('project.publishSignInAction').closest('a')).toHaveAttribute('href', '/auth/signin');
    expect(screen.queryByText('project.publishAction')).not.toBeInTheDocument();
  });

  it('asks to save first when the project has no server id yet', () => {
    setup({ ...base, publicId: null });
    expect(screen.getByText('project.publishNeedsSave')).toBeInTheDocument();
    expect(screen.queryByText('project.publishAction')).not.toBeInTheDocument();
  });

  it('publishes only once on a double click', async () => {
    let resolve!: () => void;
    api.update.mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    setup();
    const btn = screen.getByText('project.publishAction');
    fireEvent.click(btn);
    fireEvent.click(btn);
    resolve();
    await waitFor(() => expect(screen.getByText('project.publishedTitle')).toBeInTheDocument());
    expect(api.update).toHaveBeenCalledTimes(1);
  });

  it('tells the parent about a publish that finishes after close, without leaking into the next open', async () => {
    let resolve!: () => void;
    api.update.mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    const { onPublished, rerender } = setup();
    fireEvent.click(screen.getByText('project.publishAction'));
    rerender(false);
    resolve();
    await waitFor(() => expect(onPublished).toHaveBeenCalledWith(true, true));
    rerender(true, { ...base, isPublic: true });
    expect(screen.queryByText('project.publishedTitle')).not.toBeInTheDocument();
    expect(screen.getByText('project.unpublishAction')).toBeInTheDocument();
  });

  it('saves pending changes before publishing', async () => {
    const order: string[] = [];
    const onSave = vi.fn(async () => { order.push('save'); return true; });
    api.update.mockImplementation(async () => { order.push('update'); return { project: {} }; });
    setup(base, onSave);
    fireEvent.click(screen.getByText('project.publishAction'));
    await waitFor(() => expect(screen.getByText('project.publishedTitle')).toBeInTheDocument());
    expect(order).toEqual(['save', 'update']);
  });

  it('does not publish and stays private when the save fails', async () => {
    const { onPublished } = setup(base, vi.fn().mockResolvedValue(false));
    fireEvent.click(screen.getByText('project.publishAction'));
    expect(await screen.findByRole('alert')).toHaveTextContent('project.publishSaveFailed');
    expect(api.update).not.toHaveBeenCalled();
    expect(onPublished).not.toHaveBeenCalled();
    expect(screen.getByText('project.publishAction')).toBeEnabled();
  });

  it('judges readiness on the server lines when the caller has no save handler', async () => {
    api.get.mockResolvedValue({ project: { lyrics: { sections: [{ lines: [{ text: 'a', timestamp: null }] }] } } });
    setup({ ...base, lines: undefined });
    expect(await screen.findByText('project.publishMissingLines')).toBeInTheDocument();
    expect(screen.getByText('project.publishAction').closest('button')).toBeDisabled();
  });

  it('publishes unlisted when that option is chosen', async () => {
    api.update.mockResolvedValue({ project: {} });
    const { onPublished } = setup();
    fireEvent.click(screen.getByLabelText(/project\.choiceUnlisted/));
    fireEvent.click(screen.getByText('project.publishAction'));
    await waitFor(() => expect(onPublished).toHaveBeenCalledWith(true, false));
    expect(api.update).toHaveBeenCalledWith('abc1234567', { public: true, listed: false });
  });

  it('switches a public project to unlisted without unpublishing it', async () => {
    api.update.mockResolvedValue({ project: {} });
    const { onPublished, onOpenChange } = setup({ ...base, isPublic: true, listed: true });
    fireEvent.click(screen.getByText('project.makeUnlistedAction'));
    await waitFor(() => expect(onPublished).toHaveBeenCalledWith(true, false));
    expect(api.update).toHaveBeenCalledWith('abc1234567', { public: true, listed: false });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('reads the listed state from the server when the caller does not know it', async () => {
    api.get.mockResolvedValue({ project: { listed: false } });
    setup({ ...base, isPublic: true });
    expect(await screen.findByText('project.makeListedAction')).toBeInTheDocument();
  });
});
