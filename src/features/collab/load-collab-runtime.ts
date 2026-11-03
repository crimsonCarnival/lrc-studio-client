export type CollabRuntime = typeof import('./collab-runtime')

let loaded: CollabRuntime | null = null
let pending: Promise<CollabRuntime> | null = null

/** Loads yjs, the provider and the doc bridge once. */
export function loadCollabRuntime(): Promise<CollabRuntime> {
  pending ??= import('./collab-runtime').then(
    (m) => (loaded = m),
    (err: unknown) => {
      pending = null // a failed chunk load may succeed on retry
      throw err
    },
  )
  return pending
}

/**
 * The loaded runtime. Every Y.Doc in the app is created by it (useCollabSession),
 * so code that holds a doc may call this synchronously.
 */
export function requireCollabRuntime(): CollabRuntime {
  if (!loaded) throw new Error('collab runtime used before loadCollabRuntime() resolved')
  return loaded
}
