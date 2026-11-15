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
  ])('maps %s', (code, key) => {
    expect(catalogErrorKey(Object.assign(new Error('raw server text'), { code }))).toBe(key);
  });

  it('falls back to the generic key for unknown codes and non-API errors', () => {
    expect(catalogErrorKey(Object.assign(new Error('x'), { code: 'weird' }))).toBe('catalog.errors.generic');
    expect(catalogErrorKey(new Error('boom'))).toBe('catalog.errors.generic');
  });
});
