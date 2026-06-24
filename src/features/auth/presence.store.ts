type Listener = () => void;

const onlineIds = new Set<string>();
const listeners = new Set<Listener>();
let version = 0;

function notify() {
  version++;
  listeners.forEach(fn => fn());
}

export const presenceStore = {
  init(ids: string[]) {
    onlineIds.clear();
    ids.forEach(id => onlineIds.add(id));
    notify();
  },
  add(userId: string) {
    if (!onlineIds.has(userId)) {
      onlineIds.add(userId);
      notify();
    }
  },
  remove(userId: string) {
    if (onlineIds.has(userId)) {
      onlineIds.delete(userId);
      notify();
    }
  },
  isOnline(userId: string): boolean {
    return onlineIds.has(userId);
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getVersion(): number {
    return version;
  },
};
