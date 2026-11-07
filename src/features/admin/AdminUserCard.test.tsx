import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
    renderCard(target, access('admin', ['users.ban']));
    const toggle = screen.getByRole('button', { name: 'admin.card.toggle' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('user1@example.com')).toBeNull();
    expect(screen.queryByText(/203\.0\.113\.5/)).toBeNull();
    expect(screen.queryByRole('button', { name: /admin.table.ban/ })).toBeNull();
  });

  it('expands to the details and the visible actions', () => {
    const h = renderCard(target, access('admin', ['users.ban', 'users.role']));
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
    const h = renderCard(target, access('admin', []));
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

// The card and the long-press menu share this function, so the table below is the contract for both.
describe('availableUserActions', () => {
  const cases: Array<[string, Role, string[], Partial<AdminUser>, string[], string[]]> = [
    ['mod on a user', 'mod', [], {}, ['ban', 'adjustXp', 'blockIp', 'blockDevice', 'delete'], ['changeRole', 'shadowBan']],
    ['mod with shadowban', 'mod', ['users.shadowban'], {}, ['ban', 'shadowBan'], ['unshadowBan']],
    ['admin with role perm', 'admin', ['users.role'], {}, ['changeRole'], []],
    ['admin on a mod', 'admin', ['users.role'], { role: 'mod' }, ['changeRole', 'ban'], []],
    ['mod on another mod', 'mod', ['users.shadowban'], { role: 'mod' }, ['profile'], ['ban', 'delete', 'adjustXp', 'shadowBan', 'canAct']],
    ['admin on a superadmin', 'admin', ['users.role'], { role: 'superadmin' }, ['profile'], ['ban', 'changeRole', 'delete']],
    ['banned user', 'mod', [], { ban: { active: true } }, ['unban'], ['ban']],
    ['pending appeal', 'mod', [], { ban: { active: true }, appeal: { status: 'pending' } }, ['reviewAppeal'], ['ban', 'unban']],
    ['shadowbanned user', 'mod', ['users.shadowban'], { shadowBanned: true }, ['unshadowBan'], ['shadowBan']],
    ['deleted user', 'mod', [], { isDeleted: true }, ['reactivate', 'delete'], ['ban', 'blockIp', 'blockDevice']],
    ['no ip or device', 'mod', [], { lastIp: undefined, lastDeviceId: undefined }, ['ban'], ['blockIp', 'blockDevice']],
    ['mod with role perm can still demote', 'mod', ['users.role'], {}, ['ban', 'changeRole'], []],
  ];
  it.each(cases)('%s', (_name, role, perms, patch, yes, no) => {
    const can = availableUserActions({ ...target, ...patch }, access(role, perms)) as Record<string, boolean>;
    for (const k of yes) expect(can[k], `${k} should be on`).toBe(true);
    for (const k of no) expect(can[k], `${k} should be off`).toBe(false);
  });
});
