import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@ui/tooltip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));

import { HeaderBreadcrumb } from './HeaderBreadcrumb';

function renderBar(hideLogo?: boolean) {
  return render(
    <MemoryRouter initialEntries={['/library']}>
      <TooltipProvider>
        <HeaderBreadcrumb
          isReady={false}
          mediaTitle=""
          setMediaTitle={vi.fn()}
          triggerImportSave={vi.fn()}
          onLogoClick={vi.fn()}
          hideLogo={hideLogo}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('HeaderBreadcrumb logo', () => {
  it('shows the logo mark by default', () => {
    const { container } = renderBar();
    expect(container.querySelector('svg[viewBox="0 0 64 64"]')).not.toBeNull();
  });

  it('drops the logo on phones (hideLogo) and keeps the back control', () => {
    const { container, getByRole } = renderBar(true);
    expect(container.querySelector('svg[viewBox="0 0 64 64"]')).toBeNull();
    expect(getByRole('button', { name: /common\.back/ })).toBeInTheDocument();
  });
});
