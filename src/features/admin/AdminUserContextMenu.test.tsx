import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@ui/tooltip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o?.amount != null ? `${k}:${o.amount}` : k),
    i18n: { language: 'en' },
  }),
}));
vi.mock('@/features/settings/services/preferences.service', () => ({ adminShadowBan: vi.fn(), adminUnshadowBan: vi.fn() }));
vi.mock('@/features/admin/services/sudo', () => ({ withSudo: (fn: () => unknown) => fn(), isSudoCancelled: () => false }));

import { AdminUserContextMenu } from './AdminUserContextMenu';
import { ROLE_RANK } from '@/features/auth/permissions';
import type { AdminUser } from './admin.types';

const target: AdminUser = { id: 'u1', accountName: 'testuser1', role: 'user', lastIp: '203.0.113.5' } as AdminUser;
const handlers = () => ({
  handleChangeRole: vi.fn(), handleToggleBan: vi.fn(), handleReactivate: vi.fn(), handleDelete: vi.fn(),
  setAppealModal: vi.fn(), handleAdjustXP: vi.fn(), handleBlockIpDirect: vi.fn(), handleBlockDeviceDirect: vi.fn(),
});
// Font-drawn icons put their glyph in the accessible name.
const named = (label: string) => new RegExp(label.replace(/[.:]/g, (c) => `\\${c}`));

function openMenu(h = handlers()) {
  render(
    <MemoryRouter><TooltipProvider>
      <AdminUserContextMenu user={target} myRank={ROLE_RANK.admin} myPermissions={['xp.adjust']} canAssignRoles={false} assignableRoles={[]} {...h}>
        <div data-testid="row">row</div>
      </AdminUserContextMenu>
    </TooltipProvider></MemoryRouter>,
  );
  fireEvent.contextMenu(screen.getByTestId('row'));
  return h;
}

describe('AdminUserContextMenu', () => {
  it('adjusts XP only by an amount picked from the submenu', async () => {
    const h = openMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: named('admin.table.adjustXp') }));
    expect(h.handleAdjustXP).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('menuitem', { name: named('admin.table.revokeXp:500') }));
    expect(h.handleAdjustXP).toHaveBeenCalledWith('revoke', 500, 'user', 'u1');
  });

  it('copies the user\'s identifiers', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    openMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: named('admin.table.copy') }));
    await userEvent.click(await screen.findByRole('menuitem', { name: named('admin.table.copyIp') }));
    expect(writeText).toHaveBeenCalledWith('203.0.113.5');
  });
});
