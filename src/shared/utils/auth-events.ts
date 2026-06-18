/**
 * authEvents — lightweight event bus for cross-cutting auth signals.
 *
 * Usage:
 *   // Fire:
 *   authEvents.emit('token:expired');
 *
 *   // Listen (call unsubscribe() when done):
 *   const unsub = authEvents.on('token:expired', () => logout());
 */

type AuthEvent = 'token:expired';
type Listener = (payload?: unknown) => void;
type Unsubscribe = () => void;

const listeners: Partial<Record<AuthEvent, Set<Listener>>> = {};

export const authEvents = {
  on(event: AuthEvent, fn: Listener): Unsubscribe {
    const set = (listeners[event] ??= new Set<Listener>());
    set.add(fn);
    return () => set.delete(fn);
  },
  emit(event: AuthEvent, payload?: unknown): void {
    listeners[event]?.forEach((fn) => fn(payload));
  },
};
