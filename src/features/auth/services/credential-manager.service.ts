/**
 * Password saving via the browser's Credential Management API.
 *
 * Deliberately NOT localStorage. The browser's own password manager holds the
 * secret — encrypted, origin-bound, and outside anything our JavaScript can
 * read. We hand the password over once and never keep a copy, so an XSS on this
 * origin cannot walk off with reusable credentials.
 *
 * `PasswordCredential` is Chromium-only. Everywhere else the feature detection
 * fails, we never show our prompt, and the browser's own "save password?"
 * bubble handles it via the `autocomplete` attributes on the login form.
 */

const DISMISSED_KEY = 'lrc-studio-credential-prompt-dismissed';

/** Minimal local typings — `PasswordCredential` is absent from TS's DOM lib. */
type PasswordCredentialData = {
  id: string;
  password: string;
  name?: string;
  iconURL?: string;
};

type PasswordCredentialCtor = new (data: PasswordCredentialData) => Credential;

function getCtor(): PasswordCredentialCtor | null {
  const ctor = (window as unknown as { PasswordCredential?: PasswordCredentialCtor }).PasswordCredential;
  return typeof ctor === 'function' ? ctor : null;
}

/**
 * True only when the browser can actually store a password credential. Requires
 * a secure context — on plain http this silently isn't available, which is
 * correct rather than a bug to work around.
 */
export function isCredentialStorageSupported(): boolean {
  if (typeof window === 'undefined' || !window.isSecureContext) return false;
  if (!navigator.credentials || typeof navigator.credentials.store !== 'function') return false;
  return getCtor() !== null;
}

/** The user said no once — never ask again on this device. */
export function hasDismissedCredentialPrompt(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    // Private mode / storage blocked: treat as "not dismissed" but the write
    // below will also fail, so the prompt simply reappears. Acceptable.
    return false;
  }
}

export function dismissCredentialPrompt(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
  } catch { /* storage unavailable — prompt may reappear next time */ }
}

/** Lets the user undo the permanent dismissal (surfaced in settings). */
export function resetCredentialPrompt(): void {
  try {
    localStorage.removeItem(DISMISSED_KEY);
  } catch { /* ignore */ }
}

/** Should we offer our prompt at all? */
export function shouldOfferCredentialSave(): boolean {
  return isCredentialStorageSupported() && !hasDismissedCredentialPrompt();
}

/**
 * Hands the credential to the browser's password manager. Returns false rather
 * than throwing — failing to save a password must never block a sign-in that
 * already succeeded.
 *
 * Note: Chrome shows its own confirmation bubble on `store()`, so the user may
 * see our prompt followed by the browser's. Ours controls whether we offer at
 * all; the browser's is the one that actually persists anything.
 */
export async function storePasswordCredential(data: PasswordCredentialData): Promise<boolean> {
  const Ctor = getCtor();
  if (!Ctor || !data.id || !data.password) return false;
  try {
    await navigator.credentials.store(new Ctor(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves a stored credential to pre-fill the saved-account step.
 *
 * `mediation: 'optional'` means the browser may return one silently if the user
 * previously allowed it, and otherwise shows its own account chooser — it never
 * hands over a password without the user having consented at some point.
 */
export async function requestStoredCredential(): Promise<{ id: string; password: string } | null> {
  if (typeof window === 'undefined' || !window.isSecureContext) return null;
  if (!navigator.credentials || typeof navigator.credentials.get !== 'function') return null;
  try {
    const cred = await navigator.credentials.get({
      password: true,
      mediation: 'optional',
    } as CredentialRequestOptions);
    if (!cred) return null;
    const { id, password } = cred as unknown as { id?: string; password?: string };
    if (!id || !password) return null;
    return { id, password };
  } catch {
    return null;
  }
}
