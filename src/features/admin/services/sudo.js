import { startAuthentication } from '@simplewebauthn/browser';
import { request } from '@/app/api.client.js';

/**
 * Coordinates the admin re-authentication ("sudo") flow. Destructive admin
 * requests that return 403 `sudo_required` trigger a password prompt; on success
 * the short-lived grant cookie is set server-side and the original request is
 * retried once. Keeps the prompt logic out of every call site. (F24)
 */

let pending = null;            // { resolve, reject, promise } for the in-flight prompt
const subscribers = new Set(); // modal visibility subscribers

/** Subscribe to prompt open/close. Returns an unsubscribe fn. */
export function onSudoPrompt(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function emit(open) {
  subscribers.forEach((cb) => cb(open));
}

function promptForPassword() {
  // Coalesce concurrent prompts into a single modal.
  if (pending) return pending.promise;
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
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
export async function submitSudoPassword(password) {
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
  const { options } = await request('/admin/sudo/passkey/options', { method: 'POST', body: JSON.stringify({}) });
  const assertion = await startAuthentication({ optionsJSON: options });
  await request('/admin/sudo/passkey/verify', { method: 'POST', body: JSON.stringify(assertion) });
  emit(false);
  if (pending) { pending.resolve(); pending = null; }
}

/** Called by the modal on cancel/escape — rejects the awaiting action. */
export function cancelSudo() {
  emit(false);
  if (pending) {
    const err = new Error('sudo_cancelled');
    err.code = 'sudo_cancelled';
    pending.reject(err);
    pending = null;
  }
}

/** True if `err` is a rejection from the user dismissing the sudo prompt (not a real failure). */
export function isSudoCancelled(err) {
  return err?.code === 'sudo_cancelled';
}

/**
 * Wrap a destructive admin call. On `sudo_required`, prompt for the password and
 * retry once. Any other error (or a cancelled prompt) propagates to the caller.
 */
export async function withSudo(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err?.code === 'sudo_required') {
      await promptForPassword(); // rejects if the user cancels the modal
      return fn();               // retry once with the fresh grant
    }
    throw err;
  }
}
