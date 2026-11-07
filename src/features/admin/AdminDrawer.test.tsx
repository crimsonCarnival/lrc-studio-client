import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { count?: number }) => (o?.count != null ? `${k}:${o.count}` : k),
    i18n: { language: 'en' },
  }),
}));

import { AdminDrawer } from './AdminDrawer';
import { ADMIN_NAV_GROUPS, ADMIN_TABS, groupAdminTabs, type AdminTabId } from './admin-nav';
import type { AdminTab } from './useAdminTabs';

const tab = (id: AdminTabId, count?: number): AdminTab => ({ id, icon: 'x', label: `label-${id}`, count });
const ALL = ADMIN_TABS.map((id) => tab(id));

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderDrawer(tabs: AdminTab[], activeTab?: AdminTabId, start = '/admin/inbox') {
  return render(
    <MemoryRouter initialEntries={[start]}>
      <Where />
      <AdminDrawer open onOpenChange={vi.fn()} tabs={tabs} activeTab={activeTab} />
    </MemoryRouter>,
  );
}

describe('ADMIN_NAV_GROUPS', () => {
  it('puts every tab in exactly one group', () => {
    const listed = ADMIN_NAV_GROUPS.flatMap((g) => g.tabs);
    expect([...listed].sort()).toEqual([...ADMIN_TABS].sort());
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('orders the groups Queue, People, Rewards, Records', () => {
    expect(ADMIN_NAV_GROUPS.map((g) => g.id)).toEqual(['queue', 'people', 'rewards', 'records']);
  });
});

describe('groupAdminTabs', () => {
  it('keeps only the permitted tabs and drops empty groups', () => {
    const groups = groupAdminTabs([tab('moderation'), tab('staff'), tab('inbox')]);
    expect(groups.map((g) => [g.id, g.tabs.map((x) => x.id)])).toEqual([
      ['queue', ['inbox']],
      ['people', ['moderation', 'staff']],
    ]);
  });
});

describe('AdminDrawer', () => {
  it('lists each permitted tab once, under its group', () => {
    renderDrawer(ALL, 'inbox');
    const links = screen.getAllByRole('link').filter((l) => l.textContent?.startsWith('label-'));
    expect(links.map((l) => l.textContent)).toEqual(
      ADMIN_NAV_GROUPS.flatMap((g) => g.tabs).map((id) => `label-${id}`),
    );
    const people = screen.getByRole('region', { name: 'admin.header.groups.people' });
    expect(within(people).getAllByRole('link').map((l) => l.textContent)).toEqual(['label-moderation', 'label-staff', 'label-permissions']);
  });

  it('shows only the tabs it is given', () => {
    renderDrawer([tab('moderation'), tab('audit')], 'moderation');
    expect(screen.queryByText('label-badges')).toBeNull();
    expect(screen.queryByRole('region', { name: 'admin.header.groups.rewards' })).toBeNull();
    expect(screen.getByText('label-audit')).toBeInTheDocument();
  });

  it('marks the open tab as current', () => {
    renderDrawer(ALL, 'reports');
    expect(screen.getByRole('link', { name: /label-reports/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /label-inbox/ })).not.toHaveAttribute('aria-current');
  });

  it('shows pending counts where a tab has them', () => {
    renderDrawer([tab('inbox', 7), tab('appeals', 120), tab('reports'), tab('moderation')], 'inbox');
    expect(within(screen.getByRole('link', { name: /label-inbox/ })).getByText('7')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /label-appeals/ })).getByText('99+')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /label-reports/ })).queryByText('0')).toBeNull();
  });

  it('navigates to a tab and offers the way back to the app', async () => {
    renderDrawer(ALL, 'inbox');
    fireEvent.click(screen.getByRole('link', { name: /label-xp/ }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin/xp'));
    expect(screen.getByRole('link', { name: /admin.header.backToSite/ })).toHaveAttribute('href', '/home');
  });
});
