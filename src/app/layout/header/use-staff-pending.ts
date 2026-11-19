import { useQuery } from '@tanstack/react-query';
import { requestsApi } from '@/features/admin/services/requests.service';
import { useReportCount } from '@/features/admin/report-count';
import { isStaff, userHasPermission } from '@/features/auth/permissions';

/**
 * What waits on staff in the dashboard: requests to review plus open reports. Zero for
 * everyone else. Same sources the avatar menu's dashboard icon used.
 */
export function useStaffPending(permissions: string[] | undefined | null): number {
  const staff = isStaff(permissions);
  const reports = useReportCount(userHasPermission(permissions, 'users.ban'));
  // A query, so the header badge and the avatar menu share one request instead of each firing their own.
  const { data: requests = 0 } = useQuery({
    queryKey: ['staffPending', 'requests'],
    queryFn: () => requestsApi.counts().then((r) => r.pendingReview + r.myPending),
    enabled: staff,
  });
  return staff ? requests + reports : 0;
}
