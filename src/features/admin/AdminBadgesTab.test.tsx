// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@ui/tooltip';

// t must be referentially stable: AdminBadgesTab's fetchDefs depends on it.
const tStable = (k: string) => k;
const i18nStable = { language: 'en' };
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tStable, i18n: i18nStable }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/shared/hooks/useConfirm', () => ({ default: () => [vi.fn(), null] }));

vi.mock('@/features/badges/BadgeDefsContext', () => ({ useBadgeDefs: () => ({}) }));

const gqlRequest = vi.fn();
vi.mock('@/app/graphql.client', () => ({ gqlRequest: (...a: unknown[]) => gqlRequest(...a) }));

import toast from 'react-hot-toast';
import AdminBadgesTab from './AdminBadgesTab';

const def = {
  id: 'og', label: { en: 'Founder', es: 'Fundador' }, description: { en: 'd', es: 'd' }, icon: 'star', color: 'primary',
  rarity: 'common', conditionType: 'manual', conditionValue: null, autoGrant: false, isBuiltin: false,
  holderCount: 0, holderPct: 0, xpReward: 50,
};

async function openGrantModal() {
  gqlRequest.mockImplementation(async (query: string) => {
    if (String(query).includes('adminGrantBadge')) return { adminGrantBadge: true };
    return { badgeDefinitions: [def] };
  });
  const view = render(<TooltipProvider><AdminBadgesTab /></TooltipProvider>);
  fireEvent.click(await screen.findByText('admin.badges.grantToUser'));
  fireEvent.change(screen.getByPlaceholderText('admin.badges.accountNamePlaceholder'), { target: { value: 'alice' } });
  return view;
}

const grantCall = () => gqlRequest.mock.calls.find(([q]) => String(q).includes('adminGrantBadge'));

describe('AdminBadgesTab grant modal', () => {
  beforeEach(() => gqlRequest.mockReset());

  it('sends expiresAt only when a date is chosen', async () => {
    const first = await openGrantModal();
    fireEvent.click(screen.getByText('admin.badges.grant'));
    await waitFor(() => expect(grantCall()).toBeTruthy());
    const blank = grantCall()![1] as Record<string, unknown>;
    expect(blank).toEqual({ userIdentifier: 'alice', badgeId: 'og' });
    expect('expiresAt' in blank).toBe(false);
    first.unmount();

    gqlRequest.mockClear();
    await openGrantModal();
    // A chosen YYYY-MM-DD means the end of that local day.
    fireEvent.change(screen.getByLabelText('admin.badges.grantExpires'), { target: { value: '2099-01-15' } });
    fireEvent.click(screen.getByText('admin.badges.grant'));
    await waitFor(() => expect(grantCall()).toBeTruthy());
    expect(grantCall()![1]).toEqual({
      userIdentifier: 'alice', badgeId: 'og', expiresAt: new Date('2099-01-15T23:59:59').toISOString(),
    });
  });

  it('explains a rejected expiry instead of echoing the server message', async () => {
    await openGrantModal();
    gqlRequest.mockImplementation(async (query: string) => {
      if (String(query).includes('adminGrantBadge')) throw Object.assign(new Error('raw server text'), { code: 'invalid_input' });
      return { badgeDefinitions: [def] };
    });
    fireEvent.click(screen.getByText('admin.badges.grant'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('admin.badges.grantExpiresInvalid'));
  });

  it('keeps the server message for other grant failures', async () => {
    await openGrantModal();
    gqlRequest.mockImplementation(async (query: string) => {
      if (String(query).includes('adminGrantBadge')) throw Object.assign(new Error('User not found'), { code: 'not_found' });
      return { badgeDefinitions: [def] };
    });
    fireEvent.click(screen.getByText('admin.badges.grant'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('User not found'));
  });

  it('cannot pick a past date', async () => {
    await openGrantModal();
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(screen.getByLabelText('admin.badges.grantExpires')).toHaveAttribute('min', today);
  });
});
