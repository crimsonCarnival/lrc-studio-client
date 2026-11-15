import { profilePath } from '@/features/profile/profile-path';

/** A user's artist page; falls back to the home page for a missing name, like `listPath`. */
export function artistPath(accountName: string | null | undefined, artistId: string): string {
  return accountName ? `${profilePath(accountName)}/artists/${encodeURIComponent(artistId)}` : '/';
}
