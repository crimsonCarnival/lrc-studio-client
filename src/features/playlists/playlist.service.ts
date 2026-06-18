import { gqlRequest } from '@/app/graphql.client';
import type { Playlist, CreatePlaylistInput, UpdatePlaylistInput } from '@/types';

// Shared selection as a real GraphQL fragment. Defining it as a fragment (not a
// raw interpolated string) lets codegen validate it against the schema and
// resolve the `...PlaylistFields` spreads in each operation. It is appended to
// each operation at call time via string concatenation (NOT template
// interpolation) so graphql-tag-pluck can still statically parse each operation
// document — `${...}` interpolation would defeat the build-time validation.
const PLAYLIST_FIELDS = /* GraphQL */ `
  fragment PlaylistFields on Playlist {
    id name description coverImage tags isPublic sortMode
    projectCount savedCount isSavedByMe createdAt updatedAt
    owner { id accountName displayName avatarUrl }
    projects {
      id publicId title starCount forkCount coverImage
      metadata { songName songArtist genre }
      upload { source uploadUrl coverImage }
    }
  }
`;

const GET_PLAYLISTS = /* GraphQL */ `
  query GetPlaylists($accountName: String!) {
    playlists(accountName: $accountName) { ...PlaylistFields }
  }
`;

const GET_PLAYLIST = /* GraphQL */ `
  query GetPlaylist($id: ID!) {
    playlist(id: $id) { ...PlaylistFields }
  }
`;

const CREATE_PLAYLIST = /* GraphQL */ `
  mutation CreatePlaylist($input: CreatePlaylistInput!) {
    createPlaylist(input: $input) { ...PlaylistFields }
  }
`;

const UPDATE_PLAYLIST = /* GraphQL */ `
  mutation UpdatePlaylist($id: ID!, $input: UpdatePlaylistInput!) {
    updatePlaylist(id: $id, input: $input) { ...PlaylistFields }
  }
`;

const ADD_PROJECT_TO_PLAYLIST = /* GraphQL */ `
  mutation AddProjectToPlaylist($playlistId: ID!, $publicId: ID!) {
    addProjectToPlaylist(playlistId: $playlistId, publicId: $publicId) { ...PlaylistFields }
  }
`;

const REMOVE_PROJECT_FROM_PLAYLIST = /* GraphQL */ `
  mutation RemoveProjectFromPlaylist($playlistId: ID!, $publicId: ID!) {
    removeProjectFromPlaylist(playlistId: $playlistId, publicId: $publicId) { ...PlaylistFields }
  }
`;

const DELETE_PLAYLIST = /* GraphQL */ `
  mutation DeletePlaylist($id: ID!) {
    deletePlaylist(id: $id)
  }
`;

const SAVE_PLAYLIST = /* GraphQL */ `
  mutation SavePlaylist($playlistId: ID!) {
    savePlaylist(playlistId: $playlistId)
  }
`;

const UNSAVE_PLAYLIST = /* GraphQL */ `
  mutation UnsavePlaylist($playlistId: ID!) {
    unsavePlaylist(playlistId: $playlistId)
  }
`;

export const getPlaylists = (accountName: string): Promise<Playlist[]> =>
  gqlRequest<{ playlists: Playlist[] | null }>(GET_PLAYLISTS + PLAYLIST_FIELDS, { accountName }).then((d) => d?.playlists ?? []);

export const getPlaylist = (id: string): Promise<Playlist | null> =>
  gqlRequest<{ playlist: Playlist | null }>(GET_PLAYLIST + PLAYLIST_FIELDS, { id }).then((d) => d?.playlist ?? null);

export const createPlaylist = (input: CreatePlaylistInput): Promise<Playlist | undefined> =>
  gqlRequest<{ createPlaylist: Playlist }>(CREATE_PLAYLIST + PLAYLIST_FIELDS, { input }).then((d) => d?.createPlaylist);

export const updatePlaylist = (id: string, input: UpdatePlaylistInput): Promise<Playlist | undefined> =>
  gqlRequest<{ updatePlaylist: Playlist }>(UPDATE_PLAYLIST + PLAYLIST_FIELDS, { id, input }).then((d) => d?.updatePlaylist);

export const deletePlaylist = (id: string): Promise<boolean | undefined> =>
  gqlRequest<{ deletePlaylist: boolean }>(DELETE_PLAYLIST, { id }).then((d) => d?.deletePlaylist);

export const addProjectToPlaylist = (playlistId: string, publicId: string): Promise<Playlist | undefined> =>
  gqlRequest<{ addProjectToPlaylist: Playlist }>(ADD_PROJECT_TO_PLAYLIST + PLAYLIST_FIELDS, { playlistId, publicId }).then((d) => d?.addProjectToPlaylist);

export const removeProjectFromPlaylist = (playlistId: string, publicId: string): Promise<Playlist | undefined> =>
  gqlRequest<{ removeProjectFromPlaylist: Playlist }>(REMOVE_PROJECT_FROM_PLAYLIST + PLAYLIST_FIELDS, { playlistId, publicId }).then((d) => d?.removeProjectFromPlaylist);

export const savePlaylist = (playlistId: string): Promise<boolean | undefined> =>
  gqlRequest<{ savePlaylist: boolean }>(SAVE_PLAYLIST, { playlistId }).then((d) => d?.savePlaylist);

export const unsavePlaylist = (playlistId: string): Promise<boolean | undefined> =>
  gqlRequest<{ unsavePlaylist: boolean }>(UNSAVE_PLAYLIST, { playlistId }).then((d) => d?.unsavePlaylist);
