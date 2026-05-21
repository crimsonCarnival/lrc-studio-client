import { gqlRequest } from '@/app/graphql.client.js';
import { request } from '@/app/api.client.js';

const GET_PROJECTS = `
  query GetProjects($limit: Int, $offset: Int) {
    projects(limit: $limit, offset: $offset) {
      id
      projectId
      title
      type
      readOnly
      public
      createdAt
      updatedAt
      forkedFrom {
        projectId
        userId
        accountName
      }
      forkCount
      starCount
      lineCount
      syncedLineCount
      metadata {
        description
        tags
      }
      upload {
        id
        fileName
        title
        source
        duration
        cloudinaryUrl
        youtubeUrl
        spotifyTrackId
        artist
      }
    }
  }
`;

const GET_PROJECT = `
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      projectId
      title
      type
      readOnly
      public
      createdAt
      updatedAt
      forkedFrom {
        projectId
        userId
        accountName
      }
      state {
        syncMode
        activeLineIndex
        playbackPosition
        playbackSpeed
        saveTime
        timezone
        utcOffset
      }
      metadata {
        description
        tags
      }
      upload {
        id
        fileName
        title
        source
        duration
        cloudinaryUrl
        youtubeUrl
        spotifyTrackId
        artist
      }
      lyrics {
        id
        projectId
        editorMode
        language
        version
        lines {
          text
          timestamp
          endTime
          secondary
          translation
          words { word time reading }
          secondaryWords { word time }
        }
      }
      user {
        id
        username
        avatarUrl
      }
    }
  }
`;

const CREATE_PROJECT = `
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      projectId
      title
    }
  }
`;

const UPDATE_PROJECT = `
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      projectId
      title
      public
      readOnly
    }
  }
`;

const DELETE_PROJECT = `
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

export const projectsService = {
  async create(input) {
    const data = await gqlRequest(CREATE_PROJECT, { input });
    return data.createProject;
  },

  async list(limit = 20, offset = 0) {
    const data = await gqlRequest(GET_PROJECTS, { limit, offset });
    return data.projects;
  },

  async get(id) {
    try {
      const data = await gqlRequest(GET_PROJECT, { id });
      return { project: data.project };
    } catch (err) {
      if (err.graphqlErrors?.some(e => e.message.includes('Cannot query field'))) {
        const restData = await request(`/projects/${id}`);
        return restData.project;
      }
      throw err;
    }
  },

  async update(id, input, { signal } = {}) {
    const data = await gqlRequest(UPDATE_PROJECT, { id, input }, { signal });
    return { project: data.updateProject };
  },

  // patch maps to update for GQL
  async patch(id, input, { signal } = {}) {
    return this.update(id, input, { signal });
  },

  async remove(id) {
    const data = await gqlRequest(DELETE_PROJECT, { id });
    return data.deleteProject;
  },

  async getShare(id) {
    try {
      const data = await gqlRequest(`
        query GetShare($id: ID!) {
          getShare(id: $id) {
            id
            projectId
            title
            public
            readOnly
            createdAt
            forkedFrom {
              projectId
              userId
              username
            }
            forkCount
            starCount
            isStarredByMe
            metadata {
              description
              tags
            }
            user {
              id
              username
              avatarUrl
            }
            upload {
              id
              source
              fileName
              title
              youtubeUrl
              cloudinaryUrl
              publicId
              spotifyTrackId
              artist
              duration
            }
            uploadId
            lyrics {
              id
              projectId
              editorMode
              lines {
                text
                timestamp
                endTime
                secondary
                translation
                words { word time reading }
                secondaryWords { word time }
              }
            }
          }
        }
      `, { id });
      return { project: data.getShare };
    } catch (err) {
      // Fallback to REST for any GraphQL error (schema issues, etc.)
      console.warn('GraphQL getShare failed, falling back to REST:', err.message);
      try {
        const restData = await request(`/projects/share/${id}`);
        return restData;
      } catch (restErr) {
        console.error('REST fallback also failed:', restErr);
        throw err; // Throw original GraphQL error
      }
    }
  },

  async clone(id) {
    const data = await gqlRequest(`
      mutation CloneProject($id: ID!) {
        cloneProject(id: $id) {
          id
          projectId
        }
      }
    `, { id });
    return data.cloneProject;
  },

  async star(id) {
    const data = await gqlRequest(`
      mutation StarProject($id: ID!) {
        starProject(id: $id) {
          projectId
          starCount
          isStarredByMe
        }
      }
    `, { id });
    return data.starProject;
  },

  async unstar(id) {
    const data = await gqlRequest(`
      mutation UnstarProject($id: ID!) {
        unstarProject(id: $id) {
          projectId
          starCount
          isStarredByMe
        }
      }
    `, { id });
    return data.unstarProject;
  },
};
