import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';


vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));
vi.mock('@/app/graphql.client', () => ({ gqlRequest: vi.fn() }));

import ActivityHeatmap from './ActivityHeatmap';

const days = [{ date: new Date().toISOString().slice(0, 10), count: 3 }];

describe('ActivityHeatmap compact', () => {
  it('shows streak, longest and yearly total, with the definition behind an info toggle', () => {
    render(<ActivityHeatmap days={days} streak={{ current: 5, longest: 9 }} compact notes={['reset rule', '120 XP total']} />);
    expect(screen.getByText('profile.heatmap.streakDays').nextSibling).toHaveTextContent('5');
    expect(screen.getByText('profile.heatmap.streakLongest').nextSibling).toHaveTextContent('9');
    expect(screen.getByText('profile.heatmap.perYear').nextSibling).toHaveTextContent('3');

    expect(screen.queryByText('profile.heatmap.definition')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'home.activityInfo' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('profile.heatmap.definition')).toBeInTheDocument();
    expect(screen.getByText('reset rule')).toBeInTheDocument();
    expect(screen.getByText('120 XP total')).toBeInTheDocument();
  });

  it('keeps the definition inline on the default (desktop) rendering', () => {
    render(<ActivityHeatmap days={days} />);
    expect(screen.getByText('profile.heatmap.definition')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'home.activityInfo' })).toBeNull();
  });
});
