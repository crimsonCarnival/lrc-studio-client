// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { ReportGroup } from '@/features/reports/reports.service';

const { listReportGroups, resolveReportGroup, banUser, withSudo } = vi.hoisted(() => ({
  listReportGroups: vi.fn(),
  resolveReportGroup: vi.fn(),
  banUser: vi.fn(),
  withSudo: vi.fn(),
}));
vi.mock('@/features/reports/reports.service', async importOriginal => ({
  ...(await importOriginal<object>()),
  listReportGroups,
  resolveReportGroup,
}));
vi.mock('./services/admin.service', () => ({ adminService: { banUser } }));
vi.mock('./services/sudo', async importOriginal => ({ ...(await importOriginal<object>()), withSudo }));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: { advanced: {} } }) }));
// The hover card needs the app's auth and query providers; these tests are about the rows.
vi.mock('@ui/UserHoverCard', () => ({ UserHoverCard: ({ children }: { children: ReactNode }) => children }));
// The real ban form's checkboxes need ResizeObserver; a stand-in that submits its defaults.
vi.mock('./BanUserModal', () => ({
  default: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: (p: object) => void }) => isOpen
    ? <button type="button" onClick={() => onConfirm({ reason: '', bannedUntil: null, banIp: false, banDevice: false })}>Confirm Ban</button>
    : null,
}));

import AdminReportsTab from './AdminReportsTab';

const person = (accountName: string) => ({ id: `id-${accountName}`, accountName, displayName: null, avatarUrl: null, staffRole: null });

const base = (targetType: ReportGroup['targetType'], targetId: string, extra: Partial<ReportGroup> = {}): ReportGroup => ({
  targetType,
  targetId,
  comment: null,
  user: null,
  project: null,
  playlist: null,
  wallAccountName: null,
  reports: [
    { id: `${targetId}-r1`, reason: 'spam', note: 'not nice', status: 'open', createdAt: new Date().toISOString(), resolvedAt: null, reporter: person('bob') },
  ],
  openCount: 2,
  latestAt: new Date().toISOString(),
  subject: person('ann'),
  subjectActionedCount: 0,
  subjectRestrictedUntil: null,
  ...extra,
});

const commentGroup = (id: string, extra: Partial<ReportGroup> = {}) => base('wall_comment', id, {
  wallAccountName: 'sam',
  comment: {
    wallAccountName: 'sam',
    parent: null,
    comment: {
      id,
      body: 'hey @[u:id-sam]',
      mentions: [{ id: 'id-sam', accountName: 'sam', displayName: null }],
      projectRefs: [],
      author: { ...person('ann'), allowsTags: true },
      createdAt: new Date().toISOString(),
      status: 'visible',
    },
  },
  ...extra,
});

const userGroup = (id: string) => base('user', id, {
  user: { id, accountName: 'ann', displayName: 'Ann', avatarUrl: null, bio: 'hello', createdAt: new Date().toISOString(), banned: false },
});

const projectGroup = (id: string) => base('project', id, {
  project: { id, publicId: 'pub1', slug: 'creep', title: 'Creep', artist: 'Radiohead', coverImage: null, ownerAccountName: 'ann', public: true },
});

const renderTab = () => render(<MemoryRouter><AdminReportsTab /></MemoryRouter>);

describe('AdminReportsTab', () => {
  beforeEach(() => {
    listReportGroups.mockReset();
    resolveReportGroup.mockReset().mockResolvedValue(undefined);
    banUser.mockReset().mockResolvedValue(undefined);
    withSudo.mockReset().mockImplementation((fn: () => Promise<unknown>) => fn());
  });

  it('shows a reported comment with its tags, a link to it, the reason, the note, the open count and the author record', async () => {
    listReportGroups.mockResolvedValue([commentGroup('c1', { subjectActionedCount: 3 })]);
    renderTab();
    expect(await screen.findByText('@sam')).toHaveAttribute('href', '/sam');
    expect(screen.getByText('Spam')).toBeInTheDocument();
    expect(screen.getByText('Note: “not nice”')).toBeInTheDocument();
    expect(screen.getByText('2 open reports')).toBeInTheDocument();
    expect(screen.getByText('3 reports acted on in the last 30 days')).toBeInTheDocument();
    expect(screen.getByText("On sam's wall").closest('a')).toHaveAttribute('href', '/sam#comment-c1');
    expect(listReportGroups).toHaveBeenCalledWith('open', null);
  });

  it('drops a group once it is dismissed', async () => {
    listReportGroups.mockResolvedValueOnce([commentGroup('c1'), commentGroup('c2')]).mockResolvedValue([commentGroup('c2')]);
    renderTab();
    fireEvent.click((await screen.findAllByText('Dismiss'))[0]);
    await waitFor(() => expect(screen.getAllByText('Dismiss')).toHaveLength(1));
    expect(resolveReportGroup).toHaveBeenCalledWith('wall_comment', 'c1', 'dismiss');
  });

  it('filters by type and by status, and offers no delete for a target that is gone', async () => {
    listReportGroups.mockResolvedValue([commentGroup('c9', { comment: null })]);
    renderTab();
    await screen.findByText('This comment has been removed.');
    expect(screen.queryByText('Delete comment')).not.toBeInTheDocument();
    listReportGroups.mockResolvedValue([]);
    fireEvent.click(screen.getByRole('tab', { name: 'Playlists' }));
    await waitFor(() => expect(listReportGroups).toHaveBeenLastCalledWith('open', 'playlist'));
    fireEvent.click(screen.getByRole('tab', { name: 'Dismissed' }));
    await screen.findByText('No dismissed reports.');
    expect(listReportGroups).toHaveBeenLastCalledWith('dismissed', 'playlist');
  });

  it('bans a reported account with the ban form, then marks its reports as acted on', async () => {
    listReportGroups.mockResolvedValueOnce([userGroup('u1')]).mockResolvedValue([]);
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: /^Ban$/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Ban' }));
    await waitFor(() => expect(resolveReportGroup).toHaveBeenCalledWith('user', 'u1', 'action'));
    expect(banUser).toHaveBeenCalledWith('u1', { reason: '', bannedUntil: null, banIp: false, banDevice: false });
  });

  it('marks an account handled without banning it', async () => {
    listReportGroups.mockResolvedValueOnce([userGroup('u1')]).mockResolvedValue([]);
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: /Mark handled/ }));
    await waitFor(() => expect(resolveReportGroup).toHaveBeenCalledWith('user', 'u1', 'action'));
    expect(banUser).not.toHaveBeenCalled();
  });

  it('deletes a project only after confirming, through the sudo flow', async () => {
    listReportGroups.mockResolvedValueOnce([projectGroup('p1')]).mockResolvedValue([]);
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: /Delete project/ }));
    expect(resolveReportGroup).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(resolveReportGroup).toHaveBeenCalledWith('project', 'p1', 'action'));
    expect(withSudo).toHaveBeenCalledTimes(1);
  });
});
