// Stub — will be replaced when the socket.io plan is executed.
// Returns null when socket is not initialized; callers must guard: if (!socket) return.
let _socket = null;

export function getSocket() {
  return _socket;
}

export function setSocket(socket) {
  _socket = socket;
}
