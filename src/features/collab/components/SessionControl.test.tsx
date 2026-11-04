// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SessionControl } from './SessionControl'

const startSession = vi.hoisted(() => vi.fn())
vi.mock('../collab.service', () => ({ startSession }))
const toastError = vi.hoisted(() => vi.fn())
vi.mock('react-hot-toast', () => ({ default: { error: toastError, success: vi.fn() } }))

const owner = { publicId: 'k3x9a2c7qm', live: false, onEnded: () => {} }

function renderControl(onBeforeStart: () => Promise<boolean>) {
  return render(
    <MemoryRouter initialEntries={['/project/edit']}>
      <Routes>
        <Route path="/project/edit" element={<SessionControl owner={owner} lines={[]} onBeforeStart={onBeforeStart} />} />
        <Route path="/session/:publicId" element={<p>session page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  startSession.mockReset()
  toastError.mockReset()
})

describe('SessionControl', () => {
  it('does not start a session over a failed save', async () => {
    renderControl(() => Promise.resolve(false))
    await userEvent.click(screen.getByRole('button', { name: /start session/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/could not start the session/i)))
    expect(startSession).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /start session/i })).toBeEnabled()
  })

  it('starts the session once the save succeeded', async () => {
    startSession.mockResolvedValue({})
    renderControl(() => Promise.resolve(true))
    await userEvent.click(screen.getByRole('button', { name: /start session/i }))
    expect(await screen.findByText('session page')).toBeInTheDocument()
    expect(startSession).toHaveBeenCalledWith('k3x9a2c7qm')
  })

  // The session is seeded from the stored project: an edit made while it starts would be lost.
  it('blocks editing input while the session is starting, and releases it on failure', async () => {
    let finish: (v: unknown) => void = () => {}
    startSession.mockReturnValue(new Promise((_res, rej) => { finish = rej }))
    const onKey = vi.fn()
    window.addEventListener('keydown', onKey)
    renderControl(() => Promise.resolve(true))
    await userEvent.click(screen.getByRole('button', { name: /start session/i }))
    await waitFor(() => expect(startSession).toHaveBeenCalled())

    expect(screen.getByTestId('session-starting-shield')).toBeInTheDocument()
    expect(fireEvent.keyDown(document.body, { key: 'a' })).toBe(false) // default prevented
    expect(onKey).not.toHaveBeenCalled()

    await act(async () => { finish(new Error('boom')) })
    expect(screen.queryByTestId('session-starting-shield')).not.toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: 'a' })
    expect(onKey).toHaveBeenCalledTimes(1)
    window.removeEventListener('keydown', onKey)
  })
})
