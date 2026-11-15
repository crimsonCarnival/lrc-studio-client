// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@/app/i18n';
import type { FollowUser } from '@/types';
import { SearchUserCard } from './SearchUserCard';

vi.mock('@ui/UserHoverCard', () => ({ UserHoverCard: ({ children }: { children: ReactNode }) => <span data-testid="hover-trigger">{children}</span> }));
vi.mock('@/features/profile/profile.service', () => ({ followUser: vi.fn(), unfollowUser: vi.fn() }));

const nameTag = {
  id: 'og',
  label: { en: 'Founder', es: 'Fundador' },
  description: { en: 'Joined early', es: 'Se unió pronto' },
  icon: '',
  color: 'primary',
};

const setup = (extra: Partial<FollowUser>) =>
  render(
    <MemoryRouter>
      <SearchUserCard
        user={{ id: 'u1', accountName: 'ana', displayName: 'Ana', isFollowedByMe: false, ...extra } as FollowUser}
        query=""
        canFollow={false}
      />
    </MemoryRouter>,
  );

describe('SearchUserCard name tag', () => {
  it('shows the pill when nameTag is provided', () => {
    setup({ nameTag });
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });

  it('renders the pill outside the hover-card trigger', () => {
    setup({ nameTag });
    expect(screen.getByText('Founder').closest('[data-testid="hover-trigger"]')).toBeNull();
    expect(screen.getByText('Ana').closest('[data-testid="hover-trigger"]')).not.toBeNull();
  });

  it('shows no pill when nameTag is null', () => {
    setup({ nameTag: null });
    expect(screen.queryByText('Founder')).toBeNull();
  });
});
