/**
 * Lets the system / browser Back button ask before dropping unsaved editor edits.
 *
 * The app uses a plain BrowserRouter (no `useBlocker`), so while there are unsaved edits we keep
 * exactly one "sentinel" history entry on top of the editor's own: same URL, state flagged with
 * GUARD_KEY. Back pops the sentinel and lands on the editor entry (the page does not change);
 * we re-push the sentinel straight away and ask the caller to show the unsaved-changes dialog.
 * Invariant: at most one sentinel, so repeated Back presses never stack entries.
 */
export const BACK_TARGET = '\0back';
const GUARD_KEY = '__lrcBackGuard';

let sentinelOnTop = false;
// popstate events caused by our own history.back() that the handler must not treat as a user Back.
let ownPops = 0;

const stateHasGuard = (): boolean =>
  !!(window.history.state && (window.history.state as Record<string, unknown>)[GUARD_KEY]);

/** Test hook: forget module state between tests. */
export function resetHistoryGuard(): void {
  sentinelOnTop = false;
  ownPops = 0;
}

/** Whether a sentinel entry currently sits on top of the history stack. */
export function isGuardArmed(): boolean {
  return sentinelOnTop;
}

export function armHistoryGuard(): void {
  if (sentinelOnTop) return;
  // A reload keeps the flagged state of the entry it happened on: adopt it instead of stacking another.
  if (stateHasGuard()) {
    sentinelOnTop = true;
    return;
  }
  window.history.pushState({ ...(window.history.state as object | null), [GUARD_KEY]: true }, '');
  sentinelOnTop = true;
}

export function disarmHistoryGuard(): void {
  if (!sentinelOnTop) return;
  sentinelOnTop = false;
  // Only pop what is ours: if the app already navigated on, the sentinel is below us and popping would walk the user back.
  if (stateHasGuard()) {
    ownPops += 1;
    window.history.back();
  }
}

/**
 * Starts listening for the user popping the sentinel. `hasUnsavedChanges` is re-read at pop
 * time (the arming effect can be stale after a save); `onBlocked` should open the dialog.
 */
export function listenForGuardedBack(hasUnsavedChanges: () => boolean, onBlocked: () => void): () => void {
  const onPop = () => {
    if (ownPops > 0) {
      ownPops -= 1;
      return;
    }
    if (!sentinelOnTop || stateHasGuard()) return;
    // The user popped the sentinel and now sits on the editor's own entry.
    sentinelOnTop = false;
    if (hasUnsavedChanges()) {
      armHistoryGuard();
      onBlocked();
    } else {
      // Nothing to protect after all: let the Back they pressed carry on.
      window.history.back();
    }
  };
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}

/**
 * Leaves the editor from the unsaved-changes dialog. A path is navigated to after the sentinel is
 * removed (so it doesn't linger in the stack); BACK_TARGET goes where the system Back was heading.
 */
export function leaveEditor(target: string, navigate: (to: string) => void): void {
  if (ownPops > 0) {
    // A save just un-armed the guard and its history.back() hasn't landed yet: navigating now would be undone by it.
    const onPop = () => {
      window.removeEventListener('popstate', onPop);
      setTimeout(() => leaveEditor(target, navigate), 0);
    };
    window.addEventListener('popstate', onPop);
    return;
  }
  if (target === BACK_TARGET) {
    const hadSentinel = sentinelOnTop;
    sentinelOnTop = false;
    // Sentinel + the editor's own entry.
    window.history.go(hadSentinel && stateHasGuard() ? -2 : -1);
    return;
  }
  if (sentinelOnTop && stateHasGuard()) {
    sentinelOnTop = false;
    const onPop = () => {
      window.removeEventListener('popstate', onPop);
      setTimeout(() => navigate(target), 0);
    };
    window.addEventListener('popstate', onPop);
    window.history.back();
    return;
  }
  sentinelOnTop = false;
  navigate(target);
}
