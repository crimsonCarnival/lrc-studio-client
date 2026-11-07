import { useCallback, useState } from 'react';

const KEY_PREFIX = 'lrc-publish-prompt-dismissed:';

function isDismissed(publicId: string): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + publicId) === '1';
  } catch {
    return false;
  }
}

/**
 * Offers Publish once per project. Dismissal (or opening the flow) is remembered per
 * `publicId` in localStorage; where storage is unavailable the offer simply stays for the
 * session, which is harmless because it is only ever a dismissible banner.
 */
export function usePublishPrompt(publicId: string | null | undefined, eligible: boolean) {
  const [dismissedNow, setDismissedNow] = useState<string[]>([]);
  const dismiss = useCallback(() => {
    if (!publicId) return;
    try { localStorage.setItem(KEY_PREFIX + publicId, '1'); } catch { /* storage unavailable */ }
    setDismissedNow((prev) => [...prev, publicId]);
  }, [publicId]);
  const show = !!publicId && eligible && !dismissedNow.includes(publicId) && !isDismissed(publicId);
  return { show, dismiss };
}
