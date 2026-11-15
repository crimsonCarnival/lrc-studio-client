import { gqlRequest } from '@/app/graphql.client';

/** Equip a badge as the name tag shown beside the user's name, or pass null to clear it. */
export async function setNameTag(badgeId: string | null): Promise<void> {
  await gqlRequest<{ setNameTag: boolean }>(/* GraphQL */ `
    mutation SetNameTag($badgeId: String) {
      setNameTag(badgeId: $badgeId)
    }
  `, { badgeId });
}
