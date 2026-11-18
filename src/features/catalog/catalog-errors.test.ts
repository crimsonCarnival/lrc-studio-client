import { describe, expect, it } from 'vitest';
import { catalogErrorKey } from './catalog-errors';

describe('catalogErrorKey', () => {
  it.each([
    ['catalog_duplicate', 'catalog.errors.duplicate'],
    ['catalog_unverified', 'catalog.errors.unverified'],
    ['catalog_rate_limited', 'catalog.errors.rateLimited'],
    ['catalog_pending_cap', 'catalog.errors.pendingCap'],
    ['catalog_invalid_image', 'catalog.errors.invalidImage'],
    ['catalog_invalid_input', 'catalog.errors.invalidInput'],
    ['catalog_parent_not_approved', 'catalog.errors.parentNotApproved'],
    ['catalog_not_found', 'catalog.errors.notFound'],
    ['unauthorized', 'catalog.errors.unauthorized'],
    ['catalog_already_reviewed', 'catalog.errors.alreadyReviewed'],
    ['catalog_self_review', 'catalog.errors.selfReview'],
    ['catalog_disambiguation_required', 'catalog.errors.disambiguationRequired'],
    ['forbidden', 'catalog.errors.forbidden'],
    ['catalog_genius_unavailable', 'catalog.errors.geniusUnavailable'],
    ['catalog_genius_upstream', 'catalog.errors.geniusUpstream'],
    ['catalog_genius_not_found', 'catalog.errors.geniusNotFound'],
    ['catalog_genius_image_rejected', 'catalog.errors.geniusImageRejected'],
  ])('maps %s', (code, key) => {
    expect(catalogErrorKey(Object.assign(new Error('raw server text'), { code }))).toBe(key);
  });

  it('maps an HTTP 429 from the route limiter (body has no catalog code) to the rate-limit key', () => {
    const err = Object.assign(new Error('too_many_requests'), { status: 429, body: { error: 'too_many_requests' } });
    expect(catalogErrorKey(err)).toBe('catalog.errors.rateLimited');
  });

  it('keeps a catalog code ahead of the status, and other statuses stay generic', () => {
    expect(catalogErrorKey(Object.assign(new Error('x'), { status: 429, body: { code: 'catalog_pending_cap' } }))).toBe('catalog.errors.pendingCap');
    expect(catalogErrorKey(Object.assign(new Error('x'), { status: 500 }))).toBe('catalog.errors.generic');
  });

  it('falls back to the generic key for unknown codes and non-API errors', () => {
    expect(catalogErrorKey(Object.assign(new Error('x'), { code: 'weird' }))).toBe('catalog.errors.generic');
    expect(catalogErrorKey(new Error('boom'))).toBe('catalog.errors.generic');
  });
});
