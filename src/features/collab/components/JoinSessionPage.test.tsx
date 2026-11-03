// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import JoinSessionPage from './JoinSessionPage'

const auth = vi.hoisted(() => ({ value: { user: null as null | { id: string; isGuest?: boolean }, loading: false } }))
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => auth.value }))

const joinSession = vi.hoisted(() => vi.fn())
vi.mock('../collab.service', () => ({ joinSession }))

const apiError = (code: string, status = 403) => Object.assign(new Error(code), { code, status })

function renderAt(path = '/join/secret-token') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/join/:token" element={<JoinSessionPage />} />
        <Route path="/session/:publicId" element={<p>session page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  joinSession.mockReset()
  auth.value = { user: null, loading: false }
})

describe('JoinSessionPage', () => {
  it('a guest joins with a trimmed name and lands on the session', async () => {
    joinSession.mockResolvedValue({ ok: true, publicId: 'abc123', role: 'editor' })
    renderAt()
    await userEvent.type(screen.getByLabelText(/your name/i), '  Ana  ')
    await userEvent.click(screen.getByRole('button', { name: /^join$/i }))
    expect(await screen.findByText('session page')).toBeInTheDocument()
    expect(joinSession).toHaveBeenCalledWith('secret-token', 'Ana')
  })

  it('rejects a blank guest name without calling the server', async () => {
    renderAt()
    await userEvent.type(screen.getByLabelText(/your name/i), '   ')
    await userEvent.click(screen.getByRole('button', { name: /^join$/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/between 1 and 40/i)
    expect(joinSession).not.toHaveBeenCalled()
  })

  it('a signed-in user joins at once, with no name', async () => {
    auth.value = { user: { id: 'u1' }, loading: false }
    joinSession.mockResolvedValue({ ok: true, publicId: 'abc123', role: 'viewer' })
    renderAt()
    expect(await screen.findByText('session page')).toBeInTheDocument()
    expect(joinSession).toHaveBeenCalledWith('secret-token', undefined)
    expect(screen.queryByLabelText(/your name/i)).toBeNull()
  })

  it('a signed-in user refused for their name gets an error, not an endless spinner', async () => {
    auth.value = { user: { id: 'u1' }, loading: false }
    joinSession.mockRejectedValue(apiError('collab_invalid_name', 400))
    renderAt()
    expect(await screen.findByRole('alert')).toHaveTextContent(/name is not valid/i)
  })

  it.each([
    ['collab_link_revoked', /revoked this invite link/i],
    ['collab_guests_disabled', /turned off guest access/i],
    ['collab_kicked', /removed from this session/i],
    ['collab_session_ended', /already ended/i],
    ['something_else', /could not join the session/i, 500],
  ])('shows its own message for %s, without the token', async (code, message, status = 403) => {
    joinSession.mockRejectedValue(apiError(code, status))
    renderAt()
    await userEvent.type(screen.getByLabelText(/your name/i), 'Ana')
    await userEvent.click(screen.getByRole('button', { name: /^join$/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(message)
    await waitFor(() => expect(document.body.textContent).not.toContain('secret-token'))
  })
})
