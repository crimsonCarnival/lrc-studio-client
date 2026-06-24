type Listener = () => void;

export interface UserActivity {
  projectTitle: string;
  songName: string;
  publicId: string;
}

const onlineIds = new Set<string>();
const activityMap = new Map<string, UserActivity>();
const listeners = new Set<Listener>();
let version = 0;

function notify() {
  version++;
  listeners.forEach(fn => fn());
}

export const presenceStore = {
  init(ids: string[], activities: Record<string, UserActivity> = {}) {
    onlineIds.clear();
    activityMap.clear();
    ids.forEach(id => onlineIds.add(id));
    Object.entries(activities).forEach(([id, act]) => activityMap.set(id, act));
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
      activityMap.delete(userId);
      notify();
    }
  },
  setActivity(userId: string, activity: UserActivity) {
    activityMap.set(userId, activity);
    notify();
  },
  clearActivity(userId: string) {
    if (activityMap.has(userId)) {
      activityMap.delete(userId);
      notify();
    }
  },
  isOnline(userId: string): boolean {
    return onlineIds.has(userId);
  },
  getActivity(userId: string): UserActivity | null {
    return activityMap.get(userId) ?? null;
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getVersion(): number {
    return version;
  },
};
