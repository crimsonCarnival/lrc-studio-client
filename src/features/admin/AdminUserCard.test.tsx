import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@ui/tooltip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k}${o.count != null ? `:${o.count}` : ''}` : k),
    i18n: { language: 'en' },
  }),
}));
vi.mock('@/features/settings/services/preferences.service', () => ({ adminShadowBan: vi.fn(), adminUnshadowBan: vi.fn() }));
vi.mock('@/features/admin/services/sudo', () => ({ withSudo: (fn: () => unknown) => fn(), isSudoCancelled: () => false }));

import { AdminUserCard } from './AdminUserCard';
import { AdminUserContextMenu } from './AdminUserContextMenu';
import { availableUserActions } from './admin-user-actions';
import { ROLE_RANK, ROLES, type Role } from '@/features/auth/permissions';
import type { AdminUser } from './admin.types';

const handlers = () => ({
  handleChangeRole: vi.fn(), handleToggleBan: vi.fn(), handleReactivate: vi.fn(), handleDelete: vi.fn(),
  setAppealModal: vi.fn(), handleAdjustXP: vi.fn(), handleBlockIpDirect: vi.fn(), handleBlockDeviceDirect: vi.fn(),
});

const target: AdminUser = {
  id: 'u1', displayName: 'Test User one', accountName: 'testuser1', email: 'user1@example.com', role: 'user',
  lastIp: '203.0.113.5', lastDeviceId: 'dev-1', lastDeviceName: 'Test phone', projectCount: 3, uploadCount: 2,
};

const access = (role: Role, permissions: string[]) => {
  const myRank = ROLE_RANK[role];
  return { myRank, myPermissions: permissions, canAssignRoles: permissions.includes('users.role'), assignableRoles: ROLES.filter(r => ROLE_RANK[r] < myRank) };
};

function renderCard(user: AdminUser, acc: ReturnType<typeof access>, h = handlers()) {
  render(
    <MemoryRouter>
      <TooltipProvider>
        <AdminUserCard user={user} isSelf={false} online={false} formatDay={(d) => d} {...acc} {...h} />
      </TooltipProvider>
    </MemoryRouter>,
  );
  return h;
}
const open = () => fireEvent.click(screen.getByRole('button', { name: 'admin.card.toggle' }));

describe('AdminUserCard', () => {
  it('is collapsed by default and keeps email and IP out of the DOM', () => {
    renderCard(target, access('admin', ['users.ban', 'users.delete', 'xp.adjust']));
    const toggle = screen.getByRole('button', { name: 'admin.card.toggle' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('user1@example.com')).toBeNull();
    expect(screen.queryByText(/203\.0\.113\.5/)).toBeNull();
    expect(screen.queryByRole('button', { name: /admin.table.ban/ })).toBeNull();
  });

  it('expands to the details and the visible actions', () => {
    const h = renderCard(target, access('admin', ['users.ban', 'users.role', 'xp.adjust']));
    open();
    expect(screen.getByRole('button', { name: 'admin.card.toggle' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText(/203\.0\.113\.5/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /admin.table.ban$/ }));
    expect(h.handleToggleBan).toHaveBeenCalledWith(target);
    for (const btn of screen.getByRole('group', { name: 'admin.table.actions' }).querySelectorAll('button')) {
      expect(btn.className).toMatch(/min-h-11|size-11/);
    }
  });

  it('asks for an amount before adjusting XP', () => {
    const h = renderCard(target, access('admin', ['xp.adjust']));
    open();
    fireEvent.click(screen.getByRole('button', { name: /admin.table.adjustXp/ }));
    expect(h.handleAdjustXP).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('admin.card.xpAmount'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: '+XP' }));
    expect(h.handleAdjustXP).toHaveBeenCalledWith('grant', 25, 'user', 'u1');
  });

  it('offers no staff action on someone of equal rank, only the profile', () => {
    renderCard({ ...target, role: 'admin' }, access('admin', ['users.ban', 'users.role', 'users.shadowban']));
    open();
    const group = screen.getByRole('group', { name: 'admin.table.actions' });
    expect(group.querySelectorAll('button, a')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /admin.table.viewProfile/ })).toBeInTheDocument();
  });
});

// The card, the long-press menu and the desktop table share this function, so this table is the contract for all three.
describe('availableUserActions', () => {
  const ALL = ['users.ban', 'users.delete', 'xp.adjust', 'network.block', 'users.role', 'users.shadowban'];
  const cases: Array<[string, Role, string[], Partial<AdminUser>, string[], string[]]> = [
    ['mod with no permissions: only the profile', 'mod', [], {}, ['profile', 'canAct'], ['ban', 'adjustXp', 'blockIp', 'blockDevice', 'delete', 'changeRole', 'shadowBan']],
    ['users.ban unlocks only ban', 'admin', ['users.ban'], {}, ['ban'], ['adjustXp', 'delete', 'blockIp', 'blockDevice', 'shadowBan']],
    ['xp.adjust', 'admin', ['xp.adjust'], {}, ['adjustXp'], ['ban', 'delete']],
    ['users.delete', 'admin', ['users.delete'], {}, ['delete'], ['ban']],
    ['network.block', 'admin', ['network.block'], {}, ['blockIp', 'blockDevice'], ['ban']],
    ['users.shadowban', 'mod', ['users.shadowban'], {}, ['shadowBan'], ['unshadowBan', 'ban']],
    ['users.role with roles below mine', 'admin', ['users.role'], {}, ['changeRole'], ['ban']],
    ['mod with users.role can still demote', 'mod', ['users.role'], {}, ['changeRole'], []],
    ['everything on a plain user', 'admin', ALL, {}, ['ban', 'adjustXp', 'blockIp', 'blockDevice', 'delete', 'changeRole', 'shadowBan'], ['unban', 'reactivate', 'reviewAppeal']],
    ['same rank: nothing', 'mod', ALL, { role: 'mod' }, ['profile'], ['canAct', 'ban', 'delete', 'adjustXp', 'shadowBan', 'changeRole', 'blockIp']],
    ['higher rank: nothing', 'admin', ALL, { role: 'superadmin' }, ['profile'], ['canAct', 'ban', 'delete', 'changeRole']],
    ['lower rank target is actionable', 'admin', ALL, { role: 'mod' }, ['ban', 'delete'], []],
    ['banned', 'admin', ALL, { ban: { active: true } }, ['unban'], ['ban', 'reviewAppeal']],
    ['banned without users.ban', 'admin', ['users.delete'], { ban: { active: true } }, ['delete'], ['unban']],
    ['pending appeal', 'admin', ALL, { ban: { active: true }, appeal: { status: 'pending' } }, ['reviewAppeal'], ['ban', 'unban']],
    ['shadowbanned', 'admin', ALL, { shadowBanned: true }, ['unshadowBan'], ['shadowBan']],
    ['deleted', 'admin', ALL, { isDeleted: true }, ['reactivate', 'delete'], ['ban', 'blockIp', 'blockDevice', 'shadowBan']],
    ['deleted without users.ban', 'admin', ['users.delete'], { isDeleted: true }, ['delete'], ['reactivate']],
    ['no ip or device on record', 'admin', ALL, { lastIp: undefined, lastDeviceId: undefined }, ['ban'], ['blockIp', 'blockDevice']],
  ];
  it.each(cases)('%s', (_name, role, perms, patch, yes, no) => {
    const can = availableUserActions({ ...target, ...patch }, access(role, perms)) as Record<string, boolean>;
    for (const k of yes) expect(can[k], `${k} should be on`).toBe(true);
    for (const k of no) expect(can[k], `${k} should be off`).toBe(false);
  });

  it('the superadmin wildcard unlocks everything below their rank', () => {
    const can = availableUserActions(target, { ...access('superadmin', ['*']), canAssignRoles: true });
    expect(can.ban && can.delete && can.adjustXp && can.blockIp && can.changeRole && can.shadowBan).toBe(true);
  });
});

const LABELS: Array<[string, string]> = [
  ['admin.table.ban', 'ban'], ['admin.table.unban', 'unban'], ['admin.table.reactivate', 'reactivate'],
  ['admin.table.reviewAppeal', 'reviewAppeal'], ['admin.table.adjustXp', 'adjustXp'], ['admin.table.blockIp', 'blockIp'],
  ['admin.table.blockDevice', 'blockDevice'], ['admin.table.delete', 'delete'], ['admin.table.shadowBan', 'shadowBan'],
  ['admin.table.unshadowBan', 'unshadowBan'], ['admin.table.changeRole', 'changeRole'],
];
const shown = (root: HTMLElement) => {
  // An element's own text nodes only, so icon glyph names and parents do not count.
  const texts = [...root.querySelectorAll('*')].map((el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim());
  return LABELS.filter(([label]) => texts.includes(label)).map(([, k]) => k).sort();
};

describe('card and long-press menu agree', () => {
  const scenarios: Array<[Role, string[], Partial<AdminUser>]> = [
    ['mod', [], {}],
    ['mod', ['users.ban', 'users.shadowban'], {}],
    ['admin', ['users.ban', 'users.delete', 'network.block', 'users.role', 'xp.adjust'], { ban: { active: true } }],
    ['admin', ['users.ban'], { isDeleted: true }],
    ['admin', ['users.ban'], { role: 'admin' }],
  ];
  it.each(scenarios)('%s %j %j', async (role, perms, patch) => {
    const user = { ...target, ...patch };
    const acc = access(role, perms);
    const h = handlers();
    const { unmount } = render(
      <MemoryRouter><TooltipProvider>
        <AdminUserContextMenu user={user} {...acc} {...h}><div data-testid="row">row</div></AdminUserContextMenu>
      </TooltipProvider></MemoryRouter>,
    );
    fireEvent.contextMenu(screen.getByTestId('row'));
    const fromMenu = shown(await screen.findByRole('menu'));
    unmount();
    renderCard(user, acc, h);
    open();
    const fromCard = shown(screen.getByRole('group', { name: 'admin.table.actions' }));
    expect(fromCard).toEqual(fromMenu);
  });
});

describe('long press', () => {
  it('holding a card action does not open the menu, holding the card details does', async () => {
    vi.useFakeTimers();
    const acc = access('admin', ['users.ban', 'users.delete', 'xp.adjust']);
    const h = handlers();
    render(
      <MemoryRouter><TooltipProvider>
        <AdminUserContextMenu user={target} {...acc} {...h}>
          <div><AdminUserCard user={target} isSelf={false} online={false} formatDay={(d) => d} {...acc} {...h} /></div>
        </AdminUserContextMenu>
      </TooltipProvider></MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'admin.card.toggle' }));
    const ban = screen.getByRole('button', { name: /admin.table.ban$/ });
    fireEvent.pointerDown(ban, { pointerType: 'touch', button: 0, clientX: 5, clientY: 5 });
    await act(async () => { vi.advanceTimersByTime(900); });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.pointerUp(ban, { pointerType: 'touch' });
    fireEvent.pointerDown(screen.getByText('user1@example.com'), { pointerType: 'touch', button: 0, clientX: 5, clientY: 5 });
    await act(async () => { vi.advanceTimersByTime(900); });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
