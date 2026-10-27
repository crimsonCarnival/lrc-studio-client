// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { WallReport } from '@/features/profile/wall/wall.service';

const { listWallReports, resolveWallReport } = vi.hoisted(() => ({
  listWallReports: vi.fn(),
  resolveWallReport: vi.fn(),
}));
vi.mock('@/features/profile/wall/wall.service', async importOriginal => ({
  ...(await importOriginal<object>()),
  listWallReports,
  resolveWallReport,
}));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: { advanced: {} } }) }));

import AdminReportsTab from './AdminReportsTab';

const person = (accountName: string) => ({ id: `id-${accountName}`, accountName, displayName: null, avatarUrl: null, staffRole: null, allowsTags: true });

const report = (id: string, commentId: string, extra: Partial<WallReport> = {}): WallReport => ({
  id,
  reason: 'harassment',
  note: 'not nice',
  status: 'open',
  createdAt: new Date().toISOString(),
  openCount: 2,
  reporter: person('bob'),
  wallAccountName: 'sam',
  comment: {
    id: commentId,
    body: 'hey @[u:id-sam]',
    mentions: [{ id: 'id-sam', accountName: 'sam', displayName: null }],
    projectRefs: [],
    author: person('ann'),
    createdAt: new Date().toISOString(),
  },
  ...extra,
});

const renderTab = () => render(<MemoryRouter><AdminReportsTab /></MemoryRouter>);

describe('AdminReportsTab', () => {
  beforeEach(() => {
    listWallReports.mockReset();
    resolveWallReport.mockReset().mockResolvedValue(undefined);
  });

  it('shows the comment with its tags, a link to it, the reason, the note and the open count', async () => {
    listWallReports.mockResolvedValue([report('r1', 'c1')]);
    renderTab();
    expect(await screen.findByText('@sam')).toHaveAttribute('href', '/sam');
    expect(screen.getByText('Harassment or bullying')).toBeInTheDocument();
    expect(screen.getByText('Note: “not nice”')).toBeInTheDocument();
    expect(screen.getByText('2 open reports')).toBeInTheDocument();
    expect(screen.getByText("On sam's wall").closest('a')).toHaveAttribute('href', '/sam#comment-c1');
    expect(listWallReports).toHaveBeenCalledWith('open');
  });

  it('drops every report of a comment once one of them is dismissed', async () => {
    listWallReports.mockResolvedValueOnce([report('r1', 'c1'), report('r2', 'c1'), report('r3', 'c2')]).mockResolvedValue([report('r3', 'c2')]);
    renderTab();
    fireEvent.click((await screen.findAllByText('Dismiss'))[0]);
    await waitFor(() => expect(screen.getAllByText('Dismiss')).toHaveLength(1));
    expect(resolveWallReport).toHaveBeenCalledWith('r1', 'dismiss');
  });

  it('filters by status and offers no delete for a comment that is gone', async () => {
    listWallReports.mockResolvedValue([report('r9', 'c9', { comment: null })]);
    renderTab();
    await screen.findByText('This comment has been deleted.');
    expect(screen.queryByText('Delete comment')).not.toBeInTheDocument();
    listWallReports.mockResolvedValue([]);
    fireEvent.click(screen.getByRole('tab', { name: 'Dismissed' }));
    await screen.findByText('No dismissed reports.');
    expect(listWallReports).toHaveBeenLastCalledWith('dismissed');
  });
});
