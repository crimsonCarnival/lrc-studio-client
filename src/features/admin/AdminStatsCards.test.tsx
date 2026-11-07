import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@ui/tooltip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, number>) => (o ? `${k}:${Object.values(o).join(',')}` : k),
    i18n: { language: 'en' },
  }),
}));
const breakpoint = vi.hoisted(() => ({ lg: false }));
vi.mock('@/shared/hooks/useBreakpoint', () => ({ useBreakpoint: () => breakpoint.lg }));

import AdminStatsCards from './AdminStatsCards';

const stats = {
  totalUsers: 12, activeUsers: 3, totalProjects: 40, totalUploads: 9, pendingAppeals: 2, bannedUsers: 1,
  deletedUsers: 0, newSignups24h: 1, newSignups7d: 4, newSignups30d: 9, totalStorage: 2048,
  jobHealth: { succeeded: 0, failed: 1 },
};

const renderCards = () => render(
  <MemoryRouter><TooltipProvider><AdminStatsCards stats={stats} /></TooltipProvider></MemoryRouter>,
);

beforeEach(() => { breakpoint.lg = false; });

describe('AdminStatsCards', () => {
  it('below lg is one scrolling strip with every number, jobs spelled out', () => {
    renderCards();
    const strip = screen.getByRole('list', { name: 'admin.dashboard.stats.strip' });
    const items = within(strip).getAllByRole('listitem');
    expect(items).toHaveLength(10);
    expect(within(strip).getByText('12')).toBeInTheDocument();
    expect(within(strip).getByText('2 KB')).toBeInTheDocument();
    expect(within(strip).getByText('admin.dashboard.stats.jobsValue:0,1')).toBeInTheDocument();
    expect(strip.textContent).not.toMatch(/[✓✗]/);
    expect(strip.className).toContain('overflow-x-auto');
  });

  it('at lg keeps the tiles and the glyph pair', () => {
    breakpoint.lg = true;
    renderCards();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText('0✓/1✗')).toBeInTheDocument();
  });
});
