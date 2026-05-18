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

const listeners = {};

export const authEvents = {
  on(event, fn) {
    if (!listeners[event]) listeners[event] = new Set();
    listeners[event].add(fn);
    return () => listeners[event].delete(fn);
  },
  emit(event, payload) {
    listeners[event]?.forEach((fn) => fn(payload));
  },
};
