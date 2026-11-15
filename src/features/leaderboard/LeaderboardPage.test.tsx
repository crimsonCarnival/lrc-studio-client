// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/app/i18n';
import LeaderboardPage from './LeaderboardPage';
import { getLeaderboard } from './leaderboard.service';

vi.mock('./leaderboard.service', () => ({ getLeaderboard: vi.fn() }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: null }) }));
vi.mock('@ui/UserHoverCard', () => ({ UserHoverCard: ({ children }: { children: React.ReactNode }) => <span data-testid="hover-trigger">{children}</span> }));

const nameTag = {
  id: 'og',
  label: { en: 'Founder', es: 'Fundador' },
  description: { en: 'Joined early', es: 'Se unió pronto' },
  icon: '',
  color: 'primary',
};

function renderPage(entry: Record<string, unknown>) {
  vi.mocked(getLeaderboard).mockResolvedValue({
    users: [{ id: 'u1', accountName: 'ana', displayName: 'Ana', ...entry }],
    total: 1,
    hasMore: false,
  } as never);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><LeaderboardPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LeaderboardPage name tag', () => {
  it('shows the pill beside the name in both layouts when nameTag is provided', async () => {
    renderPage({ nameTag });
    expect((await screen.findAllByText('Founder')).length).toBe(2);
  });

  it('renders the pill outside the hover-card trigger in both layouts', async () => {
    renderPage({ nameTag });
    const pills = await screen.findAllByText('Founder');
    for (const pill of pills) expect(pill.closest('[data-testid="hover-trigger"]')).toBeNull();
    for (const name of screen.getAllByText('Ana')) expect(name.closest('[data-testid="hover-trigger"]')).not.toBeNull();
  });

  it('shows no pill when nameTag is null', async () => {
    renderPage({ nameTag: null });
    await screen.findAllByText('Ana');
    expect(screen.queryByText('Founder')).toBeNull();
  });
});
