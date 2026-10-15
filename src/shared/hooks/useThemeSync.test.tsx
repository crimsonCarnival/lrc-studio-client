// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import i18n from 'i18next'
import '@/app/i18n'
import { useThemeSync } from './useThemeSync'

function Where() {
  const loc = useLocation()
  return <div data-testid="where">{loc.pathname + loc.search}</div>
}

function App() {
  useThemeSync('dark')
  return (
    <Routes>
      <Route path="profile/:name" element={<Navigate to="/alice" replace />} />
      <Route path="*" element={<Where />} />
    </Routes>
  )
}

describe('useThemeSync', () => {
  beforeEach(async () => { await i18n.changeLanguage('en') })

  it('adds ?hl= to the URL it finds', async () => {
    window.history.replaceState(null, '', '/somewhere')
    render(<BrowserRouter><App /></BrowserRouter>)
    expect(await screen.findByTestId('where')).toHaveTextContent('/somewhere?hl=en')
  })

  it('does not undo a redirect made by a child on the first render (/profile/alice -> /alice)', async () => {
    window.history.replaceState(null, '', '/profile/alice')
    render(<BrowserRouter><App /></BrowserRouter>)
    expect(await screen.findByTestId('where')).toHaveTextContent('/alice?hl=en')
    expect(window.location.pathname).toBe('/alice')
  })

  it('keeps the other query parameters', async () => {
    window.history.replaceState(null, '', '/profile/alice?view=public')
    render(<BrowserRouter><App /></BrowserRouter>)
    expect(await screen.findByTestId('where')).toHaveTextContent(/^\/alice\?/)
    expect(window.location.search).toContain('hl=en')
  })
})
