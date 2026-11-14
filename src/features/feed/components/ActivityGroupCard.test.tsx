import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o && 'count' in o ? `${k}:${o.count}` : k) }),
}));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: { accountName: 'viewer' } }) }));
vi.mock('@ui/UserHoverCard', () => ({ UserHoverCard: ({ children }: { children: React.ReactNode }) => children }));

import { ActivityGroupCard } from './ActivityGroupCard';
import type { Activity } from './ActivityCard';

const DAY = 86_400_000;
const follow = (id: string, name: string, msAgo: number): Activity => ({
  id, type: 'USER_FOLLOWED', projectTitle: name, coverImage: null, targetPath: `/${name}`,
  createdAt: new Date(Date.now() - msAgo).toISOString(),
  actor: { accountName: 'ana', displayName: 'Ana' },
  target: { accountName: name, displayName: name },
});

function renderExpanded(activities: Activity[]) {
  render(<MemoryRouter><ActivityGroupCard activities={activities} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { expanded: false }));
}

describe('ActivityGroupCard row times', () => {
  it('leaves them out when every row would say the same thing', () => {
    renderExpanded([follow('1', 'a', 56 * DAY), follow('2', 'b', 56 * DAY + 60_000), follow('3', 'c', 56 * DAY + 120_000)]);
    expect(screen.getByText('a', { selector: 'li span' })).toBeInTheDocument();
    expect(document.querySelectorAll('li time')).toHaveLength(0);
  });

  it('shows them once the rows differ', () => {
    renderExpanded([follow('1', 'a', 1 * DAY), follow('2', 'b', 2 * DAY)]);
    expect(screen.getByText('a', { selector: 'li span' })).toBeInTheDocument();
    expect(document.querySelectorAll('li time')).toHaveLength(2);
  });
});
