import { gqlRequest } from '@/app/graphql.client';
import { withSudo } from '@/features/admin/services/sudo';
import type { UserPreferences, UpdatePreferencesInput } from '@/types';

const PREFERENCES_FIELDS = /* GraphQL */ `
  showFollowers
  onlineVisibility
  lastOnlineVisibility
  country
  countryVisibility
  miniProfileBadgesEnabled
  miniProfileBadgeIds
  defaultProjectPrivacy
  showActivityHeatmap
  showXpProgress
  wallEnabled
  allowTags
  notifications {
    follow
    reaction
    star
    fork
    badge_awarded
    xp_changed
    streak_warning
    followed_project
    wall_comment
    mention
    comment_like
    wall_report
    wall_report_reviewed
    level_up
    playlist_saved
    star_milestone
    new_device
    appeal_result
  }
`;

export async function myPreferences(): Promise<UserPreferences> {
  const data = await gqlRequest<{ myPreferences: UserPreferences }>(/* GraphQL */ `
    query MyPreferences {
      myPreferences {
        ${PREFERENCES_FIELDS}
      }
    }
  `);
  return data.myPreferences;
}

export async function updatePreferences(input: UpdatePreferencesInput): Promise<UserPreferences> {
  const data = await gqlRequest<{ updatePreferences: UserPreferences }>(/* GraphQL */ `
    mutation UpdatePreferences($input: UpdatePreferencesInput!) {
      updatePreferences(input: $input) {
        ${PREFERENCES_FIELDS}
      }
    }
  `, { input });
  return data.updatePreferences;
}

export async function adminShadowBan(
  userId: string,
  feed: boolean,
  search: boolean,
  reason: string | null,
): Promise<void> {
  await withSudo(() => gqlRequest(/* GraphQL */ `
    mutation AdminShadowBan($userId: ID!, $feed: Boolean!, $search: Boolean!, $reason: String) {
      adminShadowBan(userId: $userId, feed: $feed, search: $search, reason: $reason)
    }
  `, { userId, feed, search, reason }));
}

export async function adminUnshadowBan(userId: string): Promise<void> {
  await withSudo(() => gqlRequest(/* GraphQL */ `
    mutation AdminUnshadowBan($userId: ID!) {
      adminUnshadowBan(userId: $userId)
    }
  `, { userId }));
}
