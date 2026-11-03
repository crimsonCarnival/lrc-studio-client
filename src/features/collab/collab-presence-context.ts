import { createContext, useContext } from 'react'
import type { CollabPeer, RemoteActiveView } from './collab.types'
import type { Awareness } from './useAwareness'

/**
 * Three contexts, so each consumer re-renders only for what it reads: pointers move
 * every 50 ms, the line list must not re-render for that. All three are inert outside a
 * session (peers empty, actions null, no active lines), which is what keeps solo editing unchanged.
 */
export type PresenceActions = Pick<Awareness, 'setPointer' | 'setPlayhead' | 'setActiveLine' | 'setDuration'>

export type RemoteActiveLines = Record<string, RemoteActiveView>

const NO_PEERS: CollabPeer[] = []

export const PeersContext = createContext<CollabPeer[]>(NO_PEERS)
export const PresenceActionsContext = createContext<PresenceActions | null>(null)
/** Lines other participants are on, keyed by line id. Changes identity only when that set changes. */
export const RemoteActiveContext = createContext<RemoteActiveLines | null>(null)

export const usePresencePeers = (): CollabPeer[] => useContext(PeersContext)
export const usePresenceActions = (): PresenceActions | null => useContext(PresenceActionsContext)
export const useRemoteActiveLines = (): RemoteActiveLines | null => useContext(RemoteActiveContext)
