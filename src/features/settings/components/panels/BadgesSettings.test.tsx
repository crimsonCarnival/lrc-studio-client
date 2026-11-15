// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/app/i18n';
import BadgesSettings from './BadgesSettings';

vi.mock('@/features/auth/useAuthContext', () => ({
  useAuthContext: () => ({ user: { accountName: 'ana', badges: [], nameTagBadgeId: null }, setUser: vi.fn() }),
}));
vi.mock('@/features/badges/ShowcaseEditor', () => ({ ShowcaseEditor: () => null }));
vi.mock('@/features/badges/NameTagPicker', () => ({
  NameTagPicker: ({ onChange, onSaved }: { onChange: (v: string | null) => void; onSaved?: () => void }) => (
    <>
      <button onClick={() => onChange('og')}>optimistic</button>
      <button onClick={() => onSaved?.()}>saved</button>
    </>
  ),
}));

describe('BadgesSettings name tag', () => {
  it('refreshes my cached mini profile only once the save succeeded', async () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    render(<QueryClientProvider client={client}><BadgesSettings /></QueryClientProvider>);

    await userEvent.click(screen.getByText('optimistic'));
    expect(spy).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText('saved'));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['profile', 'ana', 'mini'] });
  });
});
