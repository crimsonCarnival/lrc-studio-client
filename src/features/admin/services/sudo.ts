import { startAuthentication } from '@simplewebauthn/browser';
import { request } from '@/app/api.client';

/**
 * Coordinates the admin re-authentication ("sudo") flow. Destructive admin
 * requests that return 403 `sudo_required` trigger a password prompt; on success
 * the short-lived grant cookie is set server-side and the original request is
 * retried once. Keeps the prompt logic out of every call site. (F24)
 */

interface PendingPrompt {
  resolve: () => void;
  reject: (err: unknown) => void;
  promise: Promise<void>;
}

let pending: PendingPrompt | null = null; // for the in-flight prompt
const subscribers = new Set<(open: boolean) => void>(); // modal visibility subscribers

/** Subscribe to prompt open/close. Returns an unsubscribe fn. */
export function onSudoPrompt(cb: (open: boolean) => void) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function emit(open: boolean) {
  subscribers.forEach((cb) => cb(open));
}

function promptForPassword(): Promise<void> {
  // Coalesce concurrent prompts into a single modal.
  if (pending) return pending.promise;
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  pending = { resolve, reject, promise };
  emit(true);
  return promise;
}

/** Which step-up factors the current admin can use (password / passkey). */
export function getSudoFactors() {
  return request('/admin/sudo/factors');
}

/**
 * Called by the modal on submit. Throws on a bad password so the modal can show
 * an error and let the user retry; only resolves the pending prompt on success.
 */
export async function submitSudoPassword(password: string) {
  await request('/admin/sudo', { method: 'POST', body: JSON.stringify({ password }) });
  emit(false);
  if (pending) { pending.resolve(); pending = null; }
}

/**
 * Step up via passkey: fetch a WebAuthn challenge, run the browser ceremony, and
 * verify it server-side. Resolves the pending prompt on success. Throws on
 * cancellation or failure so the modal can react.
 */
export async function submitSudoPasskey() {
  const { options } = await request('/admin/sudo/passkey/options', { method: 'POST', body: JSON.stringify({}) }) as { options: Parameters<typeof startAuthentication>[0]['optionsJSON'] };
  const assertion = await startAuthentication({ optionsJSON: options });
  await request('/admin/sudo/passkey/verify', { method: 'POST', body: JSON.stringify(assertion) });
  emit(false);
  if (pending) { pending.resolve(); pending = null; }
}

/** Called by the modal on cancel/escape — rejects the awaiting action. */
export function cancelSudo() {
  emit(false);
  if (pending) {
    const err = new Error('sudo_cancelled') as Error & { code?: string };
    err.code = 'sudo_cancelled';
    pending.reject(err);
    pending = null;
  }
}

/** True if `err` is a rejection from the user dismissing the sudo prompt (not a real failure). */
export function isSudoCancelled(err: unknown): boolean {
  return (err as { code?: string })?.code === 'sudo_cancelled';
}

/**
 * Wrap a destructive admin call. On `sudo_required`, prompt for the password and
 * retry once. Any other error (or a cancelled prompt) propagates to the caller.
 */
export async function withSudo<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if ((err as { code?: string })?.code === 'sudo_required') {
      await promptForPassword(); // rejects if the user cancels the modal
      return fn();               // retry once with the fresh grant
    }
    throw err;
  }
}
