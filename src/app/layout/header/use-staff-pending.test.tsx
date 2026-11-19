import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const counts = vi.hoisted(() => vi.fn());
vi.mock('@/features/admin/services/requests.service', () => ({ requestsApi: { counts } }));
const reports = vi.hoisted(() => vi.fn((enabled: boolean) => (enabled ? 2 : 0)));
vi.mock('@/features/admin/report-count', () => ({ useReportCount: reports }));

import { useStaffPending } from './use-staff-pending';

// A fresh client per test so one test's cached count never answers another's.
function withClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useStaffPending', () => {
  it('is zero and fetches nothing for non-staff', () => {
    counts.mockClear();
    const { result } = renderHook(() => useStaffPending([]), { wrapper: withClient() });
    expect(result.current).toBe(0);
    expect(counts).not.toHaveBeenCalled();
  });

  it('adds requests to review and open reports for staff', async () => {
    counts.mockResolvedValue({ pendingReview: 3, myPending: 1 });
    const { result } = renderHook(() => useStaffPending(['users.ban']), { wrapper: withClient() });
    await waitFor(() => expect(result.current).toBe(6));
  });

  it('shares one request between the header badge and the avatar menu', async () => {
    counts.mockClear();
    counts.mockResolvedValue({ pendingReview: 1, myPending: 0 });
    const { result } = renderHook(
      () => [useStaffPending(['users.ban']), useStaffPending(['users.ban'])],
      { wrapper: withClient() },
    );
    await waitFor(() => expect(result.current).toEqual([3, 3]));
    expect(counts).toHaveBeenCalledTimes(1);
  });
});
