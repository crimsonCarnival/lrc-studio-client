import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CollabMe, CollabParticipant, CollabPeer } from '../collab.types'
import { PeersContext } from '../collab-presence-context'
import { ParticipantsBar } from './ParticipantsBar'
import { splitParticipants } from '../participants'
import { TooltipProvider } from '@ui/tooltip'

const getSessionMock = vi.fn()
vi.mock('../collab.service', () => ({
  getSession: (publicId: string) => getSessionMock(publicId),
}))

const meOwner: CollabMe = {
  subject: 'user:owner',
  name: 'Alice Owner',
  colorIndex: 1,
  role: 'owner',
  conn: 'c1',
  clientId: 1,
  avatarUrl: 'https://example.com/alice.png',
}

const luisMember: CollabParticipant = {
  subject: 'user:luis',
  name: 'Luis',
  role: 'editor',
  colorIndex: 2,
  inviteId: null,
  avatarUrl: null,
}

const zoeMember: CollabParticipant = {
  subject: 'guest:zoe',
  name: 'Zoe',
  role: 'viewer',
  colorIndex: 3,
  inviteId: 'inv-1',
  avatarUrl: null,
}

const luisPeer: CollabPeer = {
  clientId: 2,
  subject: 'user:luis',
  name: 'Luis',
  colorIndex: 2,
  role: 'editor',
  avatarUrl: null,
  pointer: null,
  playhead: null,
  activeLineId: null,
  duration: null,
  view: null,
  receivedAt: 0,
}

type StatelessHandler = (p: { payload: string }) => void

function fakeProvider() {
  const listeners: Record<string, StatelessHandler[]> = {}
  return {
    on: vi.fn((event: string, fn: StatelessHandler) => {
      listeners[event] = [...(listeners[event] ?? []), fn]
    }),
    off: vi.fn((event: string, fn: StatelessHandler) => {
      listeners[event] = (listeners[event] ?? []).filter((f) => f !== fn)
    }),
    emitStateless: (payload: object) => {
      ; (listeners['stateless'] ?? []).forEach((fn) => fn({ payload: JSON.stringify(payload) }))
    },
  }
}

function renderBar(ui: React.ReactNode) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe('ParticipantsBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSessionMock.mockResolvedValue({
      publicId: 'sess-1',
      members: [luisMember, zoeMember],
    })
  })

  it('renders owner and members from getSession', async () => {
    const provider = fakeProvider()
    renderBar(
      <PeersContext.Provider value={[luisPeer]}>
        <ParticipantsBar me={meOwner} publicId="sess-1" provider={provider as never} />
      </PeersContext.Provider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Owner')).toBeDefined()
      expect(screen.getByText('Luis')).toBeDefined()
      expect(screen.getByText('Zoe')).toBeDefined()
    })
  })

  it('renders avatar image when avatarUrl exists, and initials fallback when null', async () => {
    const provider = fakeProvider()
    renderBar(
      <PeersContext.Provider value={[luisPeer]}>
        <ParticipantsBar me={meOwner} publicId="sess-1" provider={provider as never} />
      </PeersContext.Provider>,
    )

    await waitFor(() => {
      // Alice has avatarUrl
      const aliceImg = screen.getByRole('img', { name: 'Alice Owner' }) as HTMLImageElement
      expect(aliceImg).toBeDefined()
      expect(aliceImg.src).toBe('https://example.com/alice.png')

      // Luis has no avatarUrl, so initials 'L' are rendered
      const luisEl = screen.getByLabelText(/Luis/i)
      expect(luisEl.querySelector('img')).toBeNull()
      expect(luisEl.textContent).toContain('L')
    })
  })

  it('drops a kicked member in real time when stateless kicked message is received', async () => {
    const provider = fakeProvider()
    renderBar(
      <PeersContext.Provider value={[]}>
        <ParticipantsBar me={meOwner} publicId="sess-1" provider={provider as never} />
      </PeersContext.Provider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Zoe')).toBeDefined()
    })

    // Zoe is kicked
    await act(async () => {
      provider.emitStateless({ t: 'kicked', subject: 'guest:zoe' })
    })

    // Zoe is immediately gone from the list in real time
    expect(screen.queryByText('Zoe')).toBeNull()
    expect(screen.getByText('Luis')).toBeDefined()
  })

  it('drops an online peer in real time when stateless kicked message is received', async () => {
    const provider = fakeProvider()
    renderBar(
      <PeersContext.Provider value={[luisPeer]}>
        <ParticipantsBar me={meOwner} publicId="sess-1" provider={provider as never} />
      </PeersContext.Provider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Luis')).toBeDefined()
    })

    // Luis is kicked
    await act(async () => {
      provider.emitStateless({ t: 'kicked', subject: 'user:luis' })
    })

    // Luis is immediately gone
    expect(screen.queryByText('Luis')).toBeNull()
  })
})

describe('ParticipantsBar overflow (phone header)', () => {
  const peers: CollabPeer[] = Array.from({ length: 7 }, (_, i) => ({
    ...luisPeer, clientId: 10 + i, subject: `user:p${i}`, name: `Peer ${i}`,
  }))

  it('shows the cap plus a +N chip for the rest', () => {
    renderBar(
      <PeersContext.Provider value={peers}>
        <ParticipantsBar me={{ ...meOwner, role: 'editor' }} publicId="sess-1" maxVisible={2} />
      </PeersContext.Provider>,
    )
    const list = screen.getByRole('list', { name: /participants/i })
    // me plus 7 peers = 8 rows: 2 avatars and the chip.
    expect(list.querySelectorAll(':scope > li')).toHaveLength(3)
    expect(screen.getByRole('button', { name: /6 more participants/i })).toHaveTextContent('+6')
  })

  it('has no chip when everyone fits, and no cap by default', () => {
    renderBar(
      <PeersContext.Provider value={peers}>
        <ParticipantsBar me={{ ...meOwner, role: 'editor' }} publicId="sess-1" />
      </PeersContext.Provider>,
    )
    expect(screen.queryByRole('button', { name: /more participants/i })).toBeNull()
    expect(splitParticipants([1, 2], 2).hidden).toEqual([])
  })
})
