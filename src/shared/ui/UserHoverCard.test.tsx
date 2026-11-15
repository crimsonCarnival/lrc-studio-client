// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/app/i18n';
import { gqlRequest } from '@/app/graphql.client';
import { UserHoverCard } from './UserHoverCard';

vi.mock('@/app/graphql.client', () => ({ gqlRequest: vi.fn() }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: null }) }));
vi.mock('@/shared/hooks/usePresence', () => ({ usePresence: () => ({ isOnline: () => false, getActivity: () => null }) }));
vi.mock('@/features/badges/BadgeList', () => ({ BadgeList: () => null }));

const nameTag = {
  id: 'og',
  label: { en: 'Founder', es: 'Fundador' },
  description: { en: 'Joined early', es: 'Se unió pronto' },
  icon: '',
  color: 'primary',
};

const profile = {
  id: 'u1', accountName: 'ana', displayName: 'Ana', avatarUrl: null, coverImageUrl: null, bio: null,
  isVerified: false, followerCount: 0, followingCount: 0, projectCount: 0, totalStarsReceived: 0,
  isFollowedByMe: false, isFollowingMe: false, miniProfileBadgeIds: [], country: null, lastOnlineAt: null,
  progression: null,
};

async function openCard(extra: Record<string, unknown>) {
  vi.mocked(gqlRequest).mockResolvedValue({ publicProfile: { ...profile, ...extra } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter><UserHoverCard accountName="ana"><span>trigger</span></UserHoverCard></MemoryRouter>
    </QueryClientProvider>,
  );
  await userEvent.hover(screen.getByText('trigger'));
  await screen.findByText('Ana');
}

describe('UserHoverCard name tag', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the pill beside the display name when nameTag is provided', async () => {
    await openCard({ nameTag });
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });

  it('shows no pill when nameTag is null', async () => {
    await openCard({ nameTag: null });
    expect(screen.queryByText('Founder')).toBeNull();
  });
});
