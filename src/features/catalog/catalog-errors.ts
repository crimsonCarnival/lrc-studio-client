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
} as const;

export type CatalogErrorKey = (typeof KEYS)[keyof typeof KEYS] | 'catalog.errors.generic';

/** The i18n key for a failed catalog call. Server text is never surfaced: unknown codes get the generic message. */
export function catalogErrorKey(err: unknown): CatalogErrorKey {
  const code = catalogErrorCode(err);
  return code && code in KEYS ? KEYS[code as keyof typeof KEYS] : 'catalog.errors.generic';
}
