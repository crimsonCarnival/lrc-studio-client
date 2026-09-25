import { useState, useRef, useCallback } from 'react';
import { youtube } from '@/features/player/services/youtube.service';
import type { YoutubeAvailability } from '@/features/player/services/youtube.service';
import { isApiError } from '@/types';

export type YtUnavailableReason = Exclude<YoutubeAvailability, 'available'> | 'invalid_id';

export type YtCheck =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'unavailable'; reason: YtUnavailableReason }
  | { state: 'unverified' }; // the check itself failed — warn, don't block

/** `playable` includes the unverified case (check failed → allow with a warning). */
export type YtVerifyResult = 'playable' | 'blocked' | 'superseded';

/** i18n key per reason code (setup namespace; keys exist in en + es). */
export const YT_UNAVAILABLE_KEYS: Record<YtUnavailableReason, string> = {
  not_found: 'setup.ytUnavailableNotFound',
  private: 'setup.ytUnavailablePrivate',
  embed_disabled: 'setup.ytUnavailableEmbed',
  age_restricted: 'setup.ytUnavailableAgeRestricted',
  region_blocked: 'setup.ytUnavailableRegionBlocked',
  restricted: 'setup.ytUnavailableRestricted',
  invalid_id: 'setup.ytUnavailableInvalid',
};

// Session cache of definitive answers per video id, shared by every consumer, so
// re-selecting the same video doesn't refetch. Failed checks are not cached (retried).
const availabilityCache = new Map<string, YoutubeAvailability | 'invalid_id'>();

/**
 * Verifies a YouTube video is playable through the IFrame API before it's used.
 * Newer calls (or `reset`) supersede in-flight ones so a stale answer never lands.
 */
export function useYouTubeAvailability(): {
  check: YtCheck;
  verify: (videoId: string) => Promise<YtVerifyResult>;
  reset: () => void;
} {
  const [check, setCheck] = useState<YtCheck>({ state: 'idle' });
  const seqRef = useRef(0);

  const verify = useCallback(async (videoId: string): Promise<YtVerifyResult> => {
    const seq = ++seqRef.current;
    let status = availabilityCache.get(videoId);
    if (!status) {
      setCheck({ state: 'checking' });
      try {
        status = (await youtube.checkAvailability(videoId))?.status;
      } catch (err) {
        // 400 = malformed id (definitive); anything else = couldn't check → "unverified".
        status = isApiError(err) && err.status === 400 ? 'invalid_id' : undefined;
      }
      if (status) availabilityCache.set(videoId, status);
      if (seq !== seqRef.current) return 'superseded';
    }
    if (status && status !== 'available') {
      setCheck({ state: 'unavailable', reason: status });
      return 'blocked';
    }
    setCheck(status ? { state: 'idle' } : { state: 'unverified' });
    return 'playable';
  }, []);

  const reset = useCallback(() => {
    seqRef.current++; // drop any in-flight result
    setCheck({ state: 'idle' });
  }, []);

  return { check, verify, reset };
}
