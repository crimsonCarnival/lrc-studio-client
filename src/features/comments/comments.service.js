import { gqlRequest } from '@/app/graphql.client.js';

export async function fetchProjectReactions(projectId) {
  const data = await gqlRequest(`
    query ProjectReactions($projectId: String!) {
      projectReactions(projectId: $projectId) {
        reactions { emoji count }
        myReaction
      }
    }
  `, { projectId });
  return data.projectReactions;
}

export async function reactProject(projectId, emoji) {
  const data = await gqlRequest(`
    mutation ReactToProject($projectId: String!, $emoji: String!) {
      reactToProject(projectId: $projectId, emoji: $emoji) {
        reactions { emoji count }
        myReaction
      }
    }
  `, { projectId, emoji });
  return data.reactToProject;
}
