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
