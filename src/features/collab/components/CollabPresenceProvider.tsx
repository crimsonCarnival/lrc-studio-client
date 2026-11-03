import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import { usePlayer } from '@/features/player/PlayerContext'
import type { CollabMe, CollabPeer, RemoteActiveView } from '../collab.types'
import {
  PeersContext, PresenceActionsContext, RemoteActiveContext,
  usePresenceActions, type PresenceActions, type RemoteActiveLines,
} from '../collab-presence-context'
import { useAwareness } from '../useAwareness'

// Keeps the previous holder object per line while its name and colour are unchanged, so a
// row memoised on it skips re-rendering when somebody else's cursor moves.
function activeLines(peers: CollabPeer[], prev: RemoteActiveLines): RemoteActiveLines {
  const out: RemoteActiveLines = {}
  for (const p of peers) {
    if (p.activeLineId === null || out[p.activeLineId]) continue
    const old: RemoteActiveView | undefined = prev[p.activeLineId]
    out[p.activeLineId] = old && old.name === p.name && old.colorIndex === p.colorIndex
      ? old
      : { name: p.name, colorIndex: p.colorIndex }
  }
  const same = Object.keys(out).length === Object.keys(prev).length && Object.keys(out).every((k) => out[k] === prev[k])
  return same ? prev : out
}

const NO_ACTIVE: RemoteActiveLines = {}

/**
 * Feeds the local player's position into awareness. Lives beside the player's own consumers
 * rather than inside any highlight loop: the audio clock never waits on it, and setPlayhead
 * only stores a value or arms a 250 ms timer.
 */
function PlayerPresenceBridge() {
  const actions = usePresenceActions()
  const { currentTime, isPlaying, playbackSpeed, duration, hasMedia } = usePlayer()
  const loaded = !!hasMedia
  useEffect(() => {
    actions?.setPlayhead(loaded ? { t: currentTime, playing: isPlaying, rate: playbackSpeed } : null)
  }, [actions, loaded, currentTime, isPlaying, playbackSpeed])
  useEffect(() => {
    actions?.setDuration(loaded && duration > 0 ? duration : null)
  }, [actions, loaded, duration])
  return null
}

type Props = {
  provider: HocuspocusProvider | null
  me: CollabMe | null
  children: ReactNode
}

/** Owns this tab's awareness and hands it down. Mount it inside the PlayerEngine provider. */
export function CollabPresenceProvider({ provider, me, children }: Props) {
  const { peers, setPointer, setPlayhead, setActiveLine, setDuration } = useAwareness(provider, me)
  const actions = useMemo<PresenceActions | null>(
    () => (provider ? { setPointer, setPlayhead, setActiveLine, setDuration } : null),
    [provider, setPointer, setPlayhead, setActiveLine, setDuration],
  )
  // Derived during render from the previous value, so unchanged holders keep their identity.
  const [active, setActive] = useState<RemoteActiveLines | null>(null)
  const nextActive = provider ? activeLines(peers, active ?? NO_ACTIVE) : null
  if (nextActive !== active) setActive(nextActive)

  return (
    <PresenceActionsContext.Provider value={actions}>
      <PeersContext.Provider value={peers}>
        <RemoteActiveContext.Provider value={active}>
          {provider && <PlayerPresenceBridge />}
          {children}
        </RemoteActiveContext.Provider>
      </PeersContext.Provider>
    </PresenceActionsContext.Provider>
  )
}
