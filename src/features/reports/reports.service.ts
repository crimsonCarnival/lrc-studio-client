import { gqlRequest } from '@/app/graphql.client';
import type { WallAuthor, WallComment } from '@/features/profile/wall/wall.service';

export const REPORT_TARGET_TYPES = ['wall_comment', 'user', 'project', 'playlist'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export type ReportReason = 'spam' | 'harassment' | 'hate' | 'sexual' | 'impersonation' | 'copyright' | 'other';

/** The reasons offered per target type, in the order the form lists them. Mirrors the server. */
export const REASONS_BY_TYPE: Record<ReportTargetType, readonly ReportReason[]> = {
  wall_comment: ['spam', 'harassment', 'hate', 'sexual', 'other'],
  user: ['spam', 'harassment', 'hate', 'sexual', 'impersonation', 'other'],
  project: ['spam', 'hate', 'sexual', 'copyright', 'other'],
  playlist: ['spam', 'hate', 'sexual', 'copyright', 'other'],
};

export type ReportStatus = 'open' | 'dismissed' | 'actioned';

export type ReportUser = {
  id: string;
  accountName: string;
  displayName: string | null;
  avatarUrl: string | null;
  staffRole: string | null;
};

export type ReportComment = Pick<WallComment, 'id' | 'body' | 'mentions' | 'projectRefs' | 'createdAt'> & {
  author: WallAuthor | null;
  status: string;
};

export type ReportCommentTarget = {
  comment: ReportComment;
  /** The comment it answers (moderators only); null for a top-level comment. */
  parent: ReportComment | null;
  wallAccountName: string;
};

export type ReportUserTarget = {
  id: string;
  accountName: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string;
  createdAt: string | null;
  banned: boolean;
};

export type ReportProjectTarget = {
  id: string;
  publicId: string;
  slug: string;
  title: string;
  artist: string | null;
  coverImage: string | null;
  ownerAccountName: string;
  public: boolean;
};

export type ReportPlaylistTarget = {
  id: string;
  name: string;
  coverImage: string | null;
  ownerAccountName: string;
  projectCount: number;
  public: boolean;
};

/** The preview fields; only the one matching targetType is set, and none once the target is gone. */
type ReportTargets = {
  comment: ReportCommentTarget | null;
  user: ReportUserTarget | null;
  project: ReportProjectTarget | null;
  playlist: ReportPlaylistTarget | null;
};

export type ReportEntry = {
  id: string;
  reason: ReportReason;
  note: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  reporter: ReportUser | null;
};

/** Every report on one target, for moderators. */
export type ReportGroup = ReportTargets & {
  targetType: ReportTargetType;
  targetId: string;
  /** For a wall comment: the wall, kept once the comment is gone. */
  wallAccountName: string | null;
  reports: ReportEntry[];
  /** Open reports on the target, whatever status was listed. */
  openCount: number;
  latestAt: string;
  /** Who is accountable: the comment's author, the account itself, or the owner. */
  subject: ReportUser | null;
  /** The subject's targets actioned after reports in the last 30 days. */
  subjectActionedCount: number;
  /** The subject's wall-commenting restriction: an ISO date, 'forever', or null. */
  subjectRestrictedUntil: string | null;
};

/** One of the viewer's own reports. */
export type MyReport = ReportTargets & {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  note: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
};

const USER_FIELDS = 'id accountName displayName avatarUrl staffRole';
const COMMENT_FIELDS = `id body createdAt status
  author { id accountName displayName avatarUrl staffRole allowsTags }
  mentions { id accountName displayName }
  projectRefs { publicId title slug coverImage ownerAccountName }`;
const TARGET_FIELDS = (withParent: boolean) => `
  comment { wallAccountName comment { ${COMMENT_FIELDS} } ${withParent ? `parent { ${COMMENT_FIELDS} }` : ''} }
  user { id accountName displayName avatarUrl bio createdAt banned }
  project { id publicId slug title artist coverImage ownerAccountName public }
  playlist { id name coverImage ownerAccountName projectCount public }`;

/** File a report. `alsoBlock` (accounts only) blocks the account too. */
export async function fileReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  note?: string;
  alsoBlock?: boolean;
}): Promise<void> {
  await gqlRequest(/* GraphQL */ `
    mutation FileReport($targetType: String!, $targetId: ID!, $reason: String!, $note: String, $alsoBlock: Boolean) {
      fileReport(targetType: $targetType, targetId: $targetId, reason: $reason, note: $note, alsoBlock: $alsoBlock)
    }
  `, { ...input, note: input.note || null, alsoBlock: input.alsoBlock ?? false });
}

/** Reports grouped by target, for moderators (users.ban). Open ones come oldest first. */
export async function listReportGroups(status: ReportStatus = 'open', targetType: ReportTargetType | null = null): Promise<ReportGroup[]> {
  const data = await gqlRequest<{ reportGroups: ReportGroup[] }>(/* GraphQL */ `
    query ReportGroups($status: String, $targetType: String) {
      reportGroups(status: $status, targetType: $targetType) {
        targetType targetId wallAccountName openCount latestAt subjectActionedCount subjectRestrictedUntil
        ${TARGET_FIELDS(true)}
        subject { ${USER_FIELDS} }
        reports { id reason note status createdAt resolvedAt reporter { ${USER_FIELDS} } }
      }
    }
  `, { status, targetType });
  return data.reportGroups;
}

/** Targets with open reports, for moderators. */
export async function getOpenReportCount(): Promise<number> {
  const data = await gqlRequest<{ openReportCount: number }>('query { openReportCount }');
  return data.openReportCount;
}

/** The viewer's own reports, newest first. */
export async function listMyReports(limit: number, offset: number): Promise<{ reports: MyReport[]; total: number }> {
  const data = await gqlRequest<{ myReports: { reports: MyReport[]; total: number } }>(/* GraphQL */ `
    query MyReports($limit: Int, $offset: Int) {
      myReports(limit: $limit, offset: $offset) {
        total
        reports { id targetType targetId reason note status createdAt resolvedAt ${TARGET_FIELDS(false)} }
      }
    }
  `, { limit, offset });
  return data.myReports;
}

/**
 * Settle every open report on a target. `action` deletes a comment, project or playlist (the
 * last two need sudo, so callers wrap this in withSudo) and has no side effect on an account.
 */
export async function resolveReportGroup(targetType: ReportTargetType, targetId: string, action: 'dismiss' | 'action'): Promise<void> {
  await gqlRequest(/* GraphQL */ `
    mutation ResolveReportGroup($targetType: String!, $targetId: ID!, $action: String!) {
      resolveReportGroup(targetType: $targetType, targetId: $targetId, action: $action)
    }
  `, { targetType, targetId, action });
}

const REPORT_ERROR_KEYS = ['rate_limited', 'forbidden', 'not_found', 'invalid_body', 'sudo_required'] as const;

/** The i18n key of the message for a failed report call: its code's, or the generic one. */
export function reportErrorKey(err: unknown): string {
  const code = ((err as { graphqlErrors?: { extensions?: { code?: string } }[] })?.graphqlErrors?.[0]?.extensions?.code ?? '').toLowerCase();
  return `reports.errors.${(REPORT_ERROR_KEYS as readonly string[]).includes(code) ? code : 'failed'}`;
}
