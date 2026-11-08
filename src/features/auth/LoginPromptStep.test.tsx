import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { TFunction } from 'i18next';

vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ registerPasskey: vi.fn() }) }));

import LoginPromptStep from './LoginPromptStep';

const t = ((k: string) => k) as unknown as TFunction;

describe('LoginPromptStep secondary actions', () => {
  it('stack on narrow widths and let long labels wrap inside 44px+ buttons', () => {
    render(
      <MemoryRouter>
        <LoginPromptStep t={t} identifierData={{ identifier: 'ana' } as never} onSave={vi.fn()} onSkip={vi.fn()} onPasskeySuccess={vi.fn()} />
      </MemoryRouter>,
    );
    const save = screen.getByRole('button', { name: 'auth.savedAccount.save' });
    const skip = screen.getByRole('button', { name: 'auth.savedAccount.skip' });
    expect(save.parentElement).toHaveClass('flex-col');
    for (const b of [save, skip]) {
      expect(b).toHaveClass('whitespace-normal', 'text-center');
      expect(b.className.includes('min-h-11') || b.className.includes('min-h-13')).toBe(true);
    }
  });
});
