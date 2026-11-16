// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: { role: 'mod', permissions: auth.permissions } }) }));
vi.mock('./services/requests.service', () => ({
  requestsApi: { capabilities: () => Promise.resolve({ submittable: [], reviewable: [] }), counts: () => Promise.resolve({ pendingReview: 0 }) },
}));
vi.mock('./report-count', () => ({ useReportCount: () => 0 }));
vi.mock('./appeals-store', () => ({ useAppeals: () => ({ total: 0, appeals: [] }) }));

import { useAdminTabs } from './useAdminTabs';

const ids = () => renderHook(() => useAdminTabs()).result.current.map((tab) => tab.id);

describe('useAdminTabs catalog tab', () => {
  beforeEach(() => { auth.permissions = []; });

  it('is hidden without catalog.review or catalog.manage', () => {
    expect(ids()).not.toContain('catalog');
  });

  it.each(['catalog.review', 'catalog.manage'])('is visible with %s', (perm) => {
    auth.permissions = [perm];
    expect(ids()).toContain('catalog');
  });
});
