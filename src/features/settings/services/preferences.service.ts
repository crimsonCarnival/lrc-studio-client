import { gqlRequest } from '@/app/graphql.client';
import { withSudo } from '@/features/admin/services/sudo';
import type { UserPreferences, UpdatePreferencesInput } from '@/types';

const PREFERENCES_FIELDS = /* GraphQL */ `
  showFollowers
  onlineVisibility
  miniProfileBadgesEnabled
  miniProfileBadgeIds
  notifications {
    follow
    reaction
    star
    fork
    badge_awarded
    xp_changed
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
  shadowBanned: boolean,
  hideContent: boolean,
  reason: string | null,
): Promise<void> {
  await withSudo(() => gqlRequest(/* GraphQL */ `
    mutation AdminShadowBan($userId: ID!, $shadowBanned: Boolean!, $hideContent: Boolean!, $reason: String) {
      adminShadowBan(userId: $userId, shadowBanned: $shadowBanned, hideContent: $hideContent, reason: $reason)
    }
  `, { userId, shadowBanned, hideContent, reason }));
}

export async function adminUnshadowBan(userId: string): Promise<void> {
  await withSudo(() => gqlRequest(/* GraphQL */ `
    mutation AdminUnshadowBan($userId: ID!) {
      adminShadowBan(userId: $userId, shadowBanned: false, hideContent: false, reason: null)
    }
  `, { userId }));
}
