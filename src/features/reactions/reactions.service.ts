import { gqlRequest } from '@/app/graphql.client';
import type { ProjectReactions } from '@/types';

export async function fetchProjectReactions(publicId: string): Promise<ProjectReactions> {
  const data = await gqlRequest<{ projectReactions: ProjectReactions }>(/* GraphQL */ `
    query ProjectReactions($publicId: String!) {
      projectReactions(publicId: $publicId) {
        reactions { emoji count }
        myReaction
      }
    }
  `, { publicId });
  return data.projectReactions;
}

export async function reactProject(publicId: string, emoji: string): Promise<ProjectReactions> {
  const data = await gqlRequest<{ reactToProject: ProjectReactions }>(/* GraphQL */ `
    mutation ReactToProject($publicId: String!, $emoji: String!) {
      reactToProject(publicId: $publicId, emoji: $emoji) {
        reactions { emoji count }
        myReaction
      }
    }
  `, { publicId, emoji });
  return data.reactToProject;
}
