import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CollabMe } from '../collab.types'

vi.mock('@/features/player/PlayerContext', () => ({
  usePlayer: () => ({ currentTime: 0, isPlaying: false, playbackSpeed: 1, duration: 0, hasMedia: false }),
}))

import { CollabPresenceProvider } from './CollabPresenceProvider'

type State = Record<string, unknown>

function fakeProvider() {
  const states = new Map<number, State>()
  const awareness = {
    clientID: 1,
    getStates: () => states,
    getLocalState: () => states.get(1) ?? null,
    setLocalState: vi.fn((s: State | null) => { if (s === null) states.delete(1); else states.set(1, s) }),
    setLocalStateField: vi.fn((key: string, value: unknown) => { states.set(1, { ...(states.get(1) ?? {}), [key]: value }) }),
    on: () => {},
    off: () => {},
  }
  return { awareness }
}

const me: CollabMe = { subject: 'user:1', name: 'Ana', colorIndex: 2, role: 'editor', conn: 'c1', clientId: 1 }

// D1: the active line is published by the provider, not by whichever view happens to be mounted.
describe('CollabPresenceProvider', () => {
  it('publishes the active line whichever view is mounted, and switching views does not clear it', () => {
    const provider = fakeProvider()
    const ui = (activeLineId: string | null, view: string) => (
      <CollabPresenceProvider provider={provider as never} me={me} activeLineId={activeLineId}>
        {view === 'editor' ? <div>list</div> : <section>preview</section>}
      </CollabPresenceProvider>
    )
    const { rerender, unmount } = render(ui('l1', 'editor'))
    expect(provider.awareness.getLocalState()?.activeLineId).toBe('l1')

    act(() => rerender(ui('l1', 'preview')))
    expect(provider.awareness.getLocalState()?.activeLineId).toBe('l1')
    const nulls = provider.awareness.setLocalStateField.mock.calls.filter(([k, v]) => k === 'activeLineId' && v === null)
    expect(nulls).toEqual([])

    act(() => rerender(ui('l2', 'preview')))
    expect(provider.awareness.getLocalState()?.activeLineId).toBe('l2')

    // Leaving the session leaves the room altogether.
    unmount()
    expect(provider.awareness.getLocalState()).toBeNull()
  })
})
