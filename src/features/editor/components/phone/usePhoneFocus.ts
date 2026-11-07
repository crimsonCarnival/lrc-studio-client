import { useState } from 'react';

const KEY = 'lrc-phone-focus-view';

function read(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

/**
 * Whether the phone Sync tab shows the Focus view. The Sync deck (list) is the default; the
 * choice is remembered per browser. Storage can throw or be empty (private windows), and the
 * view then simply starts on the deck.
 */
export function usePhoneFocus(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(read);
  const set = (next: boolean) => {
    setOn(next);
    try { localStorage.setItem(KEY, next ? '1' : '0'); } catch { /* choice lasts for this session only */ }
  };
  return [on, set];
}
