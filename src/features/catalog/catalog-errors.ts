import { isApiError } from '@/types';
import { catalogErrorCode } from './catalog.service';

const KEYS = {
  catalog_duplicate: 'catalog.errors.duplicate',
  catalog_unverified: 'catalog.errors.unverified',
  catalog_rate_limited: 'catalog.errors.rateLimited',
  catalog_pending_cap: 'catalog.errors.pendingCap',
  catalog_invalid_image: 'catalog.errors.invalidImage',
  catalog_invalid_input: 'catalog.errors.invalidInput',
  catalog_parent_not_approved: 'catalog.errors.parentNotApproved',
  catalog_not_found: 'catalog.errors.notFound',
  catalog_changed: 'catalog.errors.changed',
  unauthorized: 'catalog.errors.unauthorized',
  catalog_already_reviewed: 'catalog.errors.alreadyReviewed',
  catalog_self_review: 'catalog.errors.selfReview',
  catalog_disambiguation_required: 'catalog.errors.disambiguationRequired',
  forbidden: 'catalog.errors.forbidden',
  catalog_genius_unavailable: 'catalog.errors.geniusUnavailable',
  catalog_genius_upstream: 'catalog.errors.geniusUpstream',
  catalog_genius_not_found: 'catalog.errors.geniusNotFound',
  catalog_genius_image_rejected: 'catalog.errors.geniusImageRejected',
} as const;

export type CatalogErrorKey =
  | (typeof KEYS)[keyof typeof KEYS]
  | 'catalog.errors.generic'
  | 'catalog.errors.geniusRateLimited'
  | 'catalog.errors.imageNotImage'
  | 'catalog.errors.imageTooLarge'
  | 'catalog.errors.uploadFailed';

/** The i18n key for a failed catalog call. Server text is never surfaced: unknown codes get the generic message. */
export function catalogErrorKey(err: unknown): CatalogErrorKey {
  const code = catalogErrorCode(err);
  if (code && code in KEYS) return KEYS[code as keyof typeof KEYS];
  // The per-route limiter's 429 body is `{ error: 'too_many_requests' }` with no catalog code.
  if (isApiError(err) && err.status === 429) return 'catalog.errors.geniusRateLimited';
  return 'catalog.errors.generic';
}

/**
 * Like `catalogErrorKey`, for a failed image upload. A signature rejection carries a code (rate limit,
 * bad image); a Cloudinary or network failure does not, so that case says the upload failed.
 */
export function uploadErrorKey(err: unknown): CatalogErrorKey {
  const key = catalogErrorKey(err);
  return key === 'catalog.errors.generic' ? 'catalog.errors.uploadFailed' : key;
}
