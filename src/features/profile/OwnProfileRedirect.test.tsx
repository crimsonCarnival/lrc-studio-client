// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

const auth = vi.hoisted(() => ({ value: { user: null as { accountName?: string } | null, loading: false } }))
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => auth.value }))
vi.mock('@ui/LogoLoader', () => ({ LogoLoader: () => <div data-testid="loader" /> }))

import OwnProfileRedirect from './OwnProfileRedirect'

function Where() {
  const loc = useLocation()
  return <div data-testid="where">{loc.pathname + loc.search}</div>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="profile" element={<OwnProfileRedirect />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('OwnProfileRedirect (/profile with no name)', () => {
  beforeEach(() => { auth.value = { user: null, loading: false } })

  it('sends a signed-in user to their own profile', () => {
    auth.value = { user: { accountName: 'alice' }, loading: false }
    renderAt('/profile')
    expect(screen.getByTestId('where').textContent).toBe('/profile/alice')
  })

  it('sends a visitor to sign in, returning to /profile afterwards', () => {
    renderAt('/profile')
    expect(screen.getByTestId('where').textContent).toBe('/auth/signin?redirect=%2Fprofile')
  })

  it('waits for the session to load instead of redirecting early', () => {
    auth.value = { user: null, loading: true }
    renderAt('/profile')
    expect(screen.getByTestId('loader')).toBeTruthy()
    expect(screen.queryByTestId('where')).toBeNull()
  })
})
