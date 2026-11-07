import { useEffect, useState } from 'react';
import { requestsApi } from '@/features/admin/services/requests.service';
import { useReportCount } from '@/features/admin/report-count';
import { isStaff, userHasPermission } from '@/features/auth/permissions';

/**
 * What waits on staff in the dashboard: requests to review plus open reports. Zero for
 * everyone else. Same sources the avatar menu's dashboard icon used.
 */
export function useStaffPending(permissions: string[] | undefined | null): number {
  const staff = isStaff(permissions);
  const [requests, setRequests] = useState(0);
  const reports = useReportCount(userHasPermission(permissions, 'users.ban'));
  useEffect(() => {
    if (!staff) return;
    let live = true;
    requestsApi.counts()
      .then((r) => { if (live) setRequests(r.pendingReview + r.myPending); })
      .catch(() => {});
    return () => { live = false; };
  }, [staff]);
  return staff ? requests + reports : 0;
}
