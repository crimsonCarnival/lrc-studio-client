import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const counts = vi.hoisted(() => vi.fn());
vi.mock('@/features/admin/services/requests.service', () => ({ requestsApi: { counts } }));
const reports = vi.hoisted(() => vi.fn((enabled: boolean) => (enabled ? 2 : 0)));
vi.mock('@/features/admin/report-count', () => ({ useReportCount: reports }));

import { useStaffPending } from './use-staff-pending';

describe('useStaffPending', () => {
  it('is zero and fetches nothing for non-staff', () => {
    counts.mockClear();
    const { result } = renderHook(() => useStaffPending([]));
    expect(result.current).toBe(0);
    expect(counts).not.toHaveBeenCalled();
  });

  it('adds requests to review and open reports for staff', async () => {
    counts.mockResolvedValue({ pendingReview: 3, myPending: 1 });
    const { result } = renderHook(() => useStaffPending(['users.ban']));
    await waitFor(() => expect(result.current).toBe(6));
  });
});
