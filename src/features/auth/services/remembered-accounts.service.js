const ACCOUNTS_KEY = 'lrc-studio-remembered-accounts';
const LEGACY_KEY = 'lrc-studio-saved-account';
const MAX_ACCOUNTS = 10;

// Run once on app startup — migrates single-account format to array format.
function migrate() {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return;
    const parsed = JSON.parse(legacy);
    if (!parsed) return;
    // Only migrate if we have enough info to identify the account
    const lookupKey = parsed.userId || parsed.identifier || parsed.accountName;
    if (!lookupKey) return;
    const existing = getAll();
    const alreadyMigrated = existing.some(
      (a) => a.userId === parsed.userId || a.identifier === parsed.identifier
    );
    if (!alreadyMigrated) {
      saveAll([{ ...parsed, lastUsedAt: Date.now() }, ...existing]);
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Corrupted storage — just remove the legacy key silently
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
  }
}

function getAll() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // Storage quota exceeded or private browsing — silently ignore
  }
}

// Inserts or updates an account entry; most recently used is always first.
// account shape: { userId, displayName, accountName, avatarUrl, identifier, hasPasskey }
function upsert(account) {
  if (!account || !account.userId) return;
  const accounts = getAll();
  const existing = accounts.find((a) => a.userId === account.userId) || {};
  const filtered = accounts.filter((a) => a.userId !== account.userId);
  const updated = { ...existing, ...account, lastUsedAt: Date.now() };
  // Keep newest first, cap at MAX_ACCOUNTS
  saveAll([updated, ...filtered].slice(0, MAX_ACCOUNTS));
}

function remove(userId) {
  if (!userId) return;
  saveAll(getAll().filter((a) => a.userId !== userId));
}

function getMostRecent() {
  const accounts = getAll();
  return accounts.length > 0 ? accounts[0] : null;
}

// Updates specific fields without touching lastUsedAt (preserves sort order).
function patch(userId, fields) {
  if (!userId) return;
  saveAll(getAll().map((a) => a.userId === userId ? { ...a, ...fields } : a));
}

function clear() {
  try {
    localStorage.removeItem(ACCOUNTS_KEY);
  } catch { /* ignore */ }
}

export const rememberedAccounts = {
  migrate,
  getAll,
  upsert,
  patch,
  remove,
  getMostRecent,
  clear,
};
