// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'

const lang = vi.hoisted(() => ({ value: 'en' }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: lang.value, changeLanguage: vi.fn() } }),
}))

import { useThemeSync } from './useThemeSync'

function Shell() {
  useThemeSync()
  return <Outlet />
}

function renderAt(url: string) {
  window.history.replaceState({}, '', url)
  return render(
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path=":accountName" element={<Navigate to="/profile/alice" replace />} />
          <Route path="profile/:accountName" element={<div>profile page</div>} />
        </Route>
      </Routes>
    </BrowserRouter>,
  )
}

describe('useThemeSync language -> URL sync', () => {
  beforeEach(() => { lang.value = 'en' })

  it('adds ?hl= without undoing a redirect issued in the same render', () => {
    const { getByText } = renderAt('/alice')
    // Regression: the hl update used the pre-redirect path and bounced /:username back to itself.
    expect(window.location.pathname).toBe('/profile/alice')
    expect(window.location.search).toBe('?hl=en')
    expect(getByText('profile page')).toBeTruthy()
  })

  it('keeps existing query params and the hash', () => {
    lang.value = 'es-MX'
    renderAt('/profile/alice?intent=follow#top')
    expect(window.location.pathname).toBe('/profile/alice')
    expect(window.location.search).toBe('?intent=follow&hl=es')
    expect(window.location.hash).toBe('#top')
  })

  it('leaves the URL alone when hl already matches', () => {
    renderAt('/profile/alice?hl=en')
    expect(window.location.search).toBe('?hl=en')
  })
})

describe('useThemeSync theme & font weight sync', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-font-weight');
    localStorage.clear();
  });

  function ThemeShell({ theme, fontWeight }: { theme?: string; fontWeight?: string }) {
    useThemeSync(theme, fontWeight);
    return <Outlet />;
  }

  it('applies palette theme and keeps it across route navigation', () => {
    window.history.replaceState({}, '', '/page1');
    const { rerender } = render(
      <BrowserRouter>
        <Routes>
          <Route element={<ThemeShell theme="dracula" />}>
            <Route path="page1" element={<div>page 1</div>} />
            <Route path="page2" element={<div>page 2</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#282a36');

    // Simulate page change to /page2
    window.history.pushState({}, '', '/page2');
    rerender(
      <BrowserRouter>
        <Routes>
          <Route element={<ThemeShell theme="dracula" />}>
            <Route path="page1" element={<div>page 1</div>} />
            <Route path="page2" element={<div>page 2</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#282a36');
  });

  it('syncs font weight attribute to documentElement', () => {
    render(
      <BrowserRouter>
        <Routes>
          <Route element={<ThemeShell theme="dark" fontWeight="bold" />}>
            <Route path="*" element={<div>content</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    );

    expect(document.documentElement.getAttribute('data-font-weight')).toBe('bold');
  });
});