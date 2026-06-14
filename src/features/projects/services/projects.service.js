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
      coverImage
      metadata {
        description
        genre
        tags
        songName
        songArtist
        songAlbum
        songYear
        albumArt
        songLanguage
        trackNumber
        trackCount
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
      coverImage
      metadata {
        description
        genre
        tags
        songName
        songArtist
        songAlbum
        songYear
        albumArt
        songLanguage
        trackNumber
        trackCount
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
          type
          label
          depth
          text
          timestamp
          endTime
          secondary
          singers
          translation
          translations { language text }
          words { word time reading }
          secondaryWords { word time }
        }
      }
      user {
        id
        accountName
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

function normalizeMetadata(metadata) {
  if (!metadata) return metadata;
  const { songArtists, ...rest } = metadata;
  const songArtist = Array.isArray(songArtists) && songArtists.length > 0
    ? songArtists.join(', ')
    : (rest.songArtist ?? '');
  return { ...rest, songArtist };
}

function normalizeInput(input) {
  if (!input?.metadata) return input;
  return { ...input, metadata: normalizeMetadata(input.metadata) };
}

export const projectsService = {
  async create(input) {
    const data = await gqlRequest(CREATE_PROJECT, { input: normalizeInput(input) });
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
        return request(`/projects/${id}`);
      }
      throw err;
    }
  },

  async update(id, input, { signal, headers } = {}) {
    const data = await gqlRequest(UPDATE_PROJECT, { id, input: normalizeInput(input) }, { signal, headers });
    return { project: data.updateProject };
  },

  // patch maps to update for GQL
  async patch(id, input, { signal, headers } = {}) {
    return this.update(id, input, { signal, headers });
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
              accountName
            }
            forkCount
            starCount
            isStarredByMe
            metadata {
              description
              genre
              tags
              songName
              songArtist
              songAlbum
              songYear
              albumArt
              songLanguage
              trackNumber
              trackCount
            }
            user {
              id
              accountName
              displayName
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
                type
                label
                depth
                text
                timestamp
                endTime
                secondary
                singers
                translation
                translations { language text }
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

  async setForksEnabled(projectId, enabled) {
    const data = await gqlRequest(`
      mutation SetForksEnabled($projectId: ID!, $enabled: Boolean!) {
        setForksEnabled(projectId: $projectId, enabled: $enabled) {
          id
          projectId
          forksEnabled
        }
      }
    `, { projectId, enabled });
    return data.setForksEnabled;
  },

  async boostProject(projectId) {
    const data = await gqlRequest(`
      mutation BoostProject($projectId: ID!) {
        boostProject(projectId: $projectId)
      }
    `, { projectId });
    return data.boostProject;
  },
};
