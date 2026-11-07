import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: null }) }));
vi.mock('@ui/UserHoverCard', () => ({ UserHoverCard: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@features/reactions/components/ReactionBar', () => ({ ReactionBar: () => null }));
vi.mock('@features/reactions/hooks/useCardReactions', () => ({
  useCardReactions: () => ({ reactions: [], myReaction: null, loaded: true, load: vi.fn(), react: vi.fn() }),
}));
vi.mock('../hooks/useIntersectionLoader', () => ({ useIntersectionLoader: () => undefined }));

import { ActivityCard } from './ActivityCard';

vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} });

// The light theme remaps the zinc scale to dark ink, but `text-white` is a literal
// #fff, so names rendered near-white on the light card. Text must use theme roles.
describe('ActivityCard text colours', () => {
  it('uses theme text roles, never a literal white or the raw zinc scale', () => {
    const { container } = render(
      <MemoryRouter>
        <ActivityCard
          activity={{
            id: 'a1',
            actor: { accountName: 'ana', displayName: 'Ana' },
            type: 'PROJECT_FORKED',
            publicId: 'p1',
            projectTitle: 'Song',
            targetPath: '/ana/song',
            createdAt: new Date().toISOString(),
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Ana', { selector: 'a' })).toHaveClass('text-foreground');
    expect(screen.getByText('Song')).toHaveClass('text-foreground');
    const classes = Array.from(container.querySelectorAll('[class]'), (el) => el.getAttribute('class')).join(' ');
    expect(classes).not.toMatch(/text-white|zinc-/);
  });
});
