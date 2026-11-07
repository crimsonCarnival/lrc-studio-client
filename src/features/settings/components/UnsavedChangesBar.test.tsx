import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import UnsavedChangesBar from './UnsavedChangesBar';

describe('UnsavedChangesBar', () => {
  it('floats above the phone bottom bar and its inset, and returns to the edge on desktop', () => {
    render(<UnsavedChangesBar saving={false} onSave={vi.fn()} onDiscard={vi.fn()} />);
    const pill = document.body.querySelector('div.fixed') as HTMLElement;
    expect(pill.className).toContain('bottom-[calc(4.5rem+env(safe-area-inset-bottom))]');
    expect(pill.className).toContain('lg:bottom-5');
  });
});
