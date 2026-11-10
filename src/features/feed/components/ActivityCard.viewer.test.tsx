import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let viewer: string | null = null;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: { returnObjects?: boolean }) => (o?.returnObjects ? [k] : k) }),
}));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: viewer ? { accountName: viewer } : null }) }));
vi.mock('@ui/UserHoverCard', () => ({ UserHoverCard: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@features/reactions/components/ReactionBar', () => ({ ReactionBar: () => null }));
vi.mock('@features/reactions/hooks/useCardReactions', () => ({
  useCardReactions: () => ({ reactions: [], myReaction: null, loaded: true, load: vi.fn(), react: vi.fn() }),
}));
vi.mock('../hooks/useIntersectionLoader', () => ({ useIntersectionLoader: () => undefined }));
vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} });

import { ActivityCard } from './ActivityCard';

const ana = { accountName: 'ana', displayName: 'Ana' };
const bo = { accountName: 'bo', displayName: 'Bo' };

function card(as: string | null, type: string, actor = ana, target: typeof ana | null = bo) {
  viewer = as;
  return render(
    <MemoryRouter>
      <ActivityCard activity={{ id: 'a1', actor, target, type, publicId: 'p1', projectTitle: 'Song', targetPath: '/bo/song', createdAt: new Date().toISOString() }} />
    </MemoryRouter>,
  ).container.textContent ?? '';
}

describe('ActivityCard: who is who', () => {
  it('says "you" when the viewer is the one followed', () => {
    const text = card('bo', 'USER_FOLLOWED');
    expect(text).toContain('feed.toYouAction.user_followed');
    expect(text).not.toContain('Bo');
  });

  it('names the followed user to anyone else, and says "You" when the viewer followed', () => {
    expect(card('cy', 'USER_FOLLOWED')).toContain('Bo');
    expect(card('ana', 'USER_FOLLOWED')).toContain('feed.you feed.selfAction.user_followed');
  });

  it('says "your project" when the project is the viewer\'s', () => {
    expect(card('bo', 'PROJECT_STARRED')).toContain('feed.target.mine');
  });

  it('says "their own project" when the actor owns it and the viewer is someone else', () => {
    expect(card('cy', 'PROJECT_SHARED', ana, ana)).toContain('feed.target.own');
  });

  it('says "your own project" when the viewer did it to themselves', () => {
    expect(card('ana', 'PROJECT_FORKED', ana, ana)).toContain('feed.target.ownMine');
  });

  it('names the owner when it is a third person\'s project', () => {
    const text = card('cy', 'PROJECT_STARRED', ana, bo);
    expect(text).toContain('Bo');
    expect(text).toContain('feed.target.ofSuffix');
    screen.getByText('Bo', { selector: 'a' });
  });

  it('adds nothing to a publish, which has no target', () => {
    expect(card('cy', 'PROJECT_PUBLISHED', ana, null)).not.toContain('feed.target');
  });
});
