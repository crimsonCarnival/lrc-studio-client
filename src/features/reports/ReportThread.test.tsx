// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { ReportMessage } from './reports.service';

const { listReportMessages, addReportMessage } = vi.hoisted(() => ({ listReportMessages: vi.fn(), addReportMessage: vi.fn() }));
vi.mock('./reports.service', async importOriginal => ({ ...(await importOriginal<object>()), listReportMessages, addReportMessage }));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: { advanced: {} } }) }));

import { ReportThread } from './ReportThread';

const msg = (over: Partial<ReportMessage>): ReportMessage => ({
  id: 'm1', body: 'hello', createdAt: new Date().toISOString(), author: null, fromReporter: false, mine: false, replies: [], ...over,
});

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('ReportThread', () => {
  beforeEach(() => {
    listReportMessages.mockReset();
    addReportMessage.mockReset().mockResolvedValue(msg({ id: 'new' }));
  });

  it('shows an anonymous moderator to the reporter, and the reporter\'s own messages as "You"', async () => {
    listReportMessages.mockResolvedValue([
      msg({ id: 'a', body: 'We removed it' }),
      msg({ id: 'b', body: 'Thanks', fromReporter: true, mine: true, author: { id: 'u', accountName: 'rita', displayName: null, avatarUrl: null, staffRole: null } }),
    ]);
    wrap(<ReportThread reportId="r1" moderatorView={false} />);
    expect(await screen.findByText('We removed it')).toBeInTheDocument();
    expect(screen.getByText('Moderator')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    // The reporter badge is for moderators only.
    expect(screen.queryByText('Reporter')).not.toBeInTheDocument();
  });

  it('sends a comment, and a reply to the message it answers', async () => {
    listReportMessages.mockResolvedValue([msg({ id: 'a', body: 'Any news?', fromReporter: true, author: { id: 'u', accountName: 'rita', displayName: null, avatarUrl: null, staffRole: null } })]);
    wrap(<ReportThread reportId="r1" moderatorView />);
    expect(await screen.findByText('Reporter')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Write to the reporter'), { target: { value: '  On it  ' } });
    fireEvent.click(screen.getByText('Send'));
    await waitFor(() => expect(addReportMessage).toHaveBeenCalledWith('r1', 'On it', null));

    fireEvent.click(screen.getByText('Reply'));
    fireEvent.change(screen.getByLabelText('Write a reply'), { target: { value: 'Done' } });
    fireEvent.click(screen.getAllByText('Reply').at(-1)!);
    await waitFor(() => expect(addReportMessage).toHaveBeenCalledWith('r1', 'Done', 'a'));
  });
});
