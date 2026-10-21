/**
 * Signup attribution — first-touch capture of where a visitor arrived from,
 * consumed once at registration (`User.signupSource`, write-once server-side).
 *
 * Separate from `url-params.ts` (content deep links) and `useUrlParamsSync`
 * (editor UI state): this is neither. It is read once per browser, persisted,
 * and never rewritten once captured — a returning visitor's second link must
 * not overwrite how they were *first* acquired.
 */

const STORAGE_KEY = 'lrc_studio_signup_attribution';

export type SignupSource = {
  ref?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

const REFERRER_DOMAIN_MAP: Record<string, string> = {
  'x.com': 'x',
  'twitter.com': 'x',
  'instagram.com': 'instagram',
  'tiktok.com': 'tiktok',
  'facebook.com': 'facebook',
  'reddit.com': 'reddit',
  'youtube.com': 'youtube',
};

function refFromReferrer(referrer: string): string | undefined {
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return REFERRER_DOMAIN_MAP[host];
  } catch {
    return undefined;
  }
}

function clip(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().slice(0, 64);
  return trimmed || undefined;
}

/**
 * Captures `ref`/`utm_*` from the current URL (or a referrer-domain fallback
 * when neither is present) into localStorage, once. Call on app mount; a
 * no-op once attribution is already stored.
 */
export function captureSignupAttribution(search: string = window.location.search): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return; // first touch wins

    const params = new URLSearchParams(search);
    const source: SignupSource = {
      ref: clip(params.get('ref')),
      utmSource: clip(params.get('utm_source')),
      utmMedium: clip(params.get('utm_medium')),
      utmCampaign: clip(params.get('utm_campaign')),
    };

    if (!source.ref && !source.utmSource && document.referrer) {
      source.ref = refFromReferrer(document.referrer);
    }

    const hasAny = Object.values(source).some(Boolean);
    if (!hasAny) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(source));
  } catch {
    // localStorage unavailable (private mode, etc.) — attribution is best-effort
  }
}

/** Reads the stored attribution, if any, for inclusion in a register call. */
export function getSignupAttribution(): SignupSource | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as SignupSource;
  } catch {
    return undefined;
  }
}

/** Clears stored attribution once consumed by a successful registration. */
export function clearSignupAttribution(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
