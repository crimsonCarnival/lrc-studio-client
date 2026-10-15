/**
 * Public profile and playlist URLs live at the site root: `/:accountName` and
 * `/:accountName/lists/:listId`. The old `/profile/…` and `/u/…` forms still resolve
 * (they redirect), so links already shared keep working.
 *
 * Because they share the top level with the app's own routes, every top-level route
 * segment must be a reserved account name on the server.
 */
type Name = string | null | undefined;

/** A missing account name (a deleted user, a row that didn't select it) falls back to the home page rather than `/undefined`. */
export function profilePath(accountName: Name): string {
  return accountName ? `/${encodeURIComponent(accountName)}` : '/';
}

export function listPath(accountName: Name, listId: string | number | null | undefined): string {
  return accountName && listId != null ? `${profilePath(accountName)}/lists/${encodeURIComponent(String(listId ?? ''))}` : '/';
}
