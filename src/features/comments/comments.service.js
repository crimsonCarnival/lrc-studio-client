import { gqlRequest } from '@/app/graphql.client.js';

const COMMENT_FIELDS = `
  id projectId
  user { id accountName displayName avatarUrl }
  text parentId replyCount
  reactions { emoji count }
  myReaction isDeleted createdAt updatedAt
`;

export async function fetchComments(projectId, offset = 0, limit = 20) {
  const data = await gqlRequest(`
    query Comments($projectId: String!, $offset: Int, $limit: Int) {
      comments(projectId: $projectId, offset: $offset, limit: $limit) {
        comments { ${COMMENT_FIELDS} }
        total hasMore
      }
    }
  `, { projectId, offset, limit });
  return data.comments;
}

export async function fetchCommentReplies(commentId, offset = 0, limit = 20) {
  const data = await gqlRequest(`
    query CommentReplies($commentId: ID!, $offset: Int, $limit: Int) {
      commentReplies(commentId: $commentId, offset: $offset, limit: $limit) {
        ${COMMENT_FIELDS}
      }
    }
  `, { commentId, offset, limit });
  return data.commentReplies;
}

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

export async function submitComment(projectId, text, parentId = null) {
  const data = await gqlRequest(`
    mutation AddComment($projectId: String!, $text: String!, $parentId: ID) {
      addComment(projectId: $projectId, text: $text, parentId: $parentId) {
        ${COMMENT_FIELDS}
      }
    }
  `, { projectId, text, parentId });
  return data.addComment;
}

export async function removeComment(id) {
  const data = await gqlRequest(`
    mutation DeleteComment($id: ID!) {
      deleteComment(id: $id)
    }
  `, { id });
  return data.deleteComment;
}

export async function reactComment(commentId, emoji) {
  const data = await gqlRequest(`
    mutation ReactToComment($commentId: ID!, $emoji: String!) {
      reactToComment(commentId: $commentId, emoji: $emoji) {
        ${COMMENT_FIELDS}
      }
    }
  `, { commentId, emoji });
  return data.reactToComment;
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
