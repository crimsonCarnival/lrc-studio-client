import { gqlRequest } from '@/app/graphql.client';
import { request } from '@/app/api.client';
import { isApiError } from '@/types';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types';

const GET_PROJECTS = /* GraphQL */ `
  query GetProjects($limit: Int, $offset: Int) {
    projects(limit: $limit, offset: $offset) {
      id
      publicId
      title
      type
      readOnly
      public
      createdAt
      updatedAt
      forkedFrom {
        publicId
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
        uploadUrl
      }
    }
  }
`;

// NOT tagged for codegen validation: this query is stale (pre-sections
// refactor). It selects `lyrics { lines }` and `state { timezone utcOffset }`,
// none of which exist on the current schema (Lyrics exposes `sections[].lines`;
// ProjectState has no timezone/utcOffset). The GraphQL path therefore fails and
// `get()` already falls back to REST (see the 'Cannot query field' catch).
// Aligned to the current schema: lyrics are nested under `sections` (the editor
// consumes `project.lyrics.sections` via sectionsToFlat), and the previously
// selected `state { timezone utcOffset }` were phantom fields — never present in
// the model, TS interface, or SDL (the real timezone lives in user settings).
// The REST fallback in get() is retained as a backstop.
const GET_PROJECT = /* GraphQL */ `
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      publicId
      title
      type
      readOnly
      public
      createdAt
      updatedAt
      forkedFrom {
        publicId
        userId
        accountName
      }
      state {
        syncMode
        activeLineIndex
        playbackPosition
        playbackSpeed
        saveTime
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
        uploadUrl
      }
      lyrics {
        id
        publicId
        editorMode
        version
        sections {
          id
          label
          depth
          singers
          timestamp
          lines {
            id
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
      user {
        id
        accountName
        avatarUrl
      }
    }
  }
`;

const CREATE_PROJECT = /* GraphQL */ `
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      publicId
      title
    }
  }
`;

const UPDATE_PROJECT = /* GraphQL */ `
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      publicId
      title
      public
      readOnly
    }
  }
`;

const DELETE_PROJECT = /* GraphQL */ `
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

// Aligned to the sections schema (see GET_PROJECT). getShare() retains its REST
// fallback as a backstop.
const GET_SHARE = /* GraphQL */ `
  query GetShare($id: ID!) {
    getShare(id: $id) {
      id
      publicId
      title
      public
      readOnly
      createdAt
      forkedFrom {
        publicId
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
        uploadUrl
        publicId
        duration
      }
      uploadId
      lyrics {
        id
        publicId
        editorMode
        sections {
          id
          label
          depth
          singers
          timestamp
          lines {
            id
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
  }
`;

const CLONE_PROJECT = /* GraphQL */ `
  mutation CloneProject($id: ID!) {
    cloneProject(id: $id) {
      id
      publicId
    }
  }
`;

const STAR_PROJECT = /* GraphQL */ `
  mutation StarProject($id: ID!) {
    starProject(id: $id) {
      publicId
      starCount
      isStarredByMe
    }
  }
`;

const UNSTAR_PROJECT = /* GraphQL */ `
  mutation UnstarProject($id: ID!) {
    unstarProject(id: $id) {
      publicId
      starCount
      isStarredByMe
    }
  }
`;

const SET_FORKS_ENABLED = /* GraphQL */ `
  mutation SetForksEnabled($publicId: ID!, $enabled: Boolean!) {
    setForksEnabled(publicId: $publicId, enabled: $enabled) {
      id
      publicId
      forksEnabled
    }
  }
`;

const BOOST_PROJECT = /* GraphQL */ `
  mutation BoostProject($publicId: ID!) {
    boostProject(publicId: $publicId)
  }
`;

function normalizeMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null | undefined {
  if (!metadata) return metadata;
  const { songArtists, ...rest } = metadata;
  const songArtist = Array.isArray(songArtists) && songArtists.length > 0
    ? songArtists.join(', ')
    : ((rest.songArtist as string | undefined) ?? '');
  return { ...rest, songArtist };
}

function normalizeInput(input: CreateProjectInput | UpdateProjectInput): Record<string, unknown> {
  const i = input as Record<string, unknown>;
  if (!i.metadata) return i;
  return { ...i, metadata: normalizeMetadata(i.metadata as Record<string, unknown>) };
}

interface RequestOpts {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export const projectsService = {
  async create(input: CreateProjectInput): Promise<Project> {
    const data = await gqlRequest<{ createProject: Project }>(CREATE_PROJECT, { input: normalizeInput(input) });
    return data.createProject;
  },

  async list(limit = 20, offset = 0): Promise<Project[]> {
    const data = await gqlRequest<{ projects: Project[] }>(GET_PROJECTS, { limit, offset });
    return data.projects;
  },

  async get(id: string): Promise<{ project: Project | null }> {
    try {
      const data = await gqlRequest<{ project: Project | null }>(GET_PROJECT, { id });
      return { project: data.project };
    } catch (err) {
      if (isApiError(err) && err.graphqlErrors?.some((e) => e.message.includes('Cannot query field'))) {
        return (await request<{ project: Project | null }>(`/projects/${id}`)) ?? { project: null };
      }
      throw err;
    }
  },

  async update(id: string, input: UpdateProjectInput, { signal, headers }: RequestOpts = {}): Promise<{ project: Project }> {
    const data = await gqlRequest<{ updateProject: Project }>(UPDATE_PROJECT, { id, input: normalizeInput(input) }, { signal, headers });
    return { project: data.updateProject };
  },

  // patch maps to update for GQL
  async patch(id: string, input: UpdateProjectInput, opts: RequestOpts = {}): Promise<{ project: Project }> {
    return this.update(id, input, opts);
  },

  async remove(id: string): Promise<boolean> {
    const data = await gqlRequest<{ deleteProject: boolean }>(DELETE_PROJECT, { id });
    return data.deleteProject;
  },

  async getShare(id: string): Promise<{ project: Project | null }> {
    try {
      const data = await gqlRequest<{ getShare: Project | null }>(GET_SHARE, { id });
      return { project: data.getShare };
    } catch (err) {
      // Fallback to REST for any GraphQL error (schema issues, etc.)
      const message = isApiError(err) ? err.message : String(err);
      console.warn('GraphQL getShare failed, falling back to REST:', message);
      try {
        return (await request<{ project: Project | null }>(`/projects/share/${id}`)) ?? { project: null };
      } catch (restErr) {
        console.error('REST fallback also failed:', restErr);
        throw err; // Throw original GraphQL error
      }
    }
  },

  async clone(id: string): Promise<Project> {
    const data = await gqlRequest<{ cloneProject: Project }>(CLONE_PROJECT, { id });
    return data.cloneProject;
  },

  async star(id: string): Promise<Project> {
    const data = await gqlRequest<{ starProject: Project }>(STAR_PROJECT, { id });
    return data.starProject;
  },

  async unstar(id: string): Promise<Project> {
    const data = await gqlRequest<{ unstarProject: Project }>(UNSTAR_PROJECT, { id });
    return data.unstarProject;
  },

  async setForksEnabled(publicId: string, enabled: boolean): Promise<Project> {
    const data = await gqlRequest<{ setForksEnabled: Project }>(SET_FORKS_ENABLED, { publicId, enabled });
    return data.setForksEnabled;
  },

  async boostProject(publicId: string): Promise<boolean> {
    const data = await gqlRequest<{ boostProject: boolean }>(BOOST_PROJECT, { publicId });
    return data.boostProject;
  },
};
