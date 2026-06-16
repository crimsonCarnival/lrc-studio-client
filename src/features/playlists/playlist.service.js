import { gqlRequest } from '@/app/graphql.client';

const PLAYLIST_FIELDS = `
  id name description coverImage tags isPublic sortMode
  projectCount savedCount isSavedByMe createdAt updatedAt
  userId
  user { id accountName displayName avatarUrl }
  projects {
    id projectId title starCount forkCount coverImage
    metadata { songName songArtist genre }
    upload { source uploadUrl coverImage }
  }
`;

const GET_PLAYLISTS = `
  query GetPlaylists($accountName: String!) {
    playlists(accountName: $accountName) { ${PLAYLIST_FIELDS} }
  }
`;

const GET_PLAYLIST = `
  query GetPlaylist($id: ID!) {
    playlist(id: $id) { ${PLAYLIST_FIELDS} }
  }
`;

const GET_SAVED_PLAYLISTS = `
  query GetSavedPlaylists {
    savedPlaylists { ${PLAYLIST_FIELDS} }
  }
`;

const CREATE_PLAYLIST = `
  mutation CreatePlaylist($input: CreatePlaylistInput!) {
    createPlaylist(input: $input) { ${PLAYLIST_FIELDS} }
  }
`;

const UPDATE_PLAYLIST = `
  mutation UpdatePlaylist($id: ID!, $input: UpdatePlaylistInput!) {
    updatePlaylist(id: $id, input: $input) { ${PLAYLIST_FIELDS} }
  }
`;

const DELETE_PLAYLIST = `
  mutation DeletePlaylist($id: ID!) {
    deletePlaylist(id: $id)
  }
`;

const ADD_PROJECT_TO_PLAYLIST = `
  mutation AddProjectToPlaylist($playlistId: ID!, $projectId: ID!) {
    addProjectToPlaylist(playlistId: $playlistId, projectId: $projectId) { ${PLAYLIST_FIELDS} }
  }
`;

const REMOVE_PROJECT_FROM_PLAYLIST = `
  mutation RemoveProjectFromPlaylist($playlistId: ID!, $projectId: ID!) {
    removeProjectFromPlaylist(playlistId: $playlistId, projectId: $projectId) { ${PLAYLIST_FIELDS} }
  }
`;

const REORDER_PLAYLIST = `
  mutation ReorderPlaylist($playlistId: ID!, $projectIds: [ID!]!) {
    reorderPlaylist(playlistId: $playlistId, projectIds: $projectIds) { ${PLAYLIST_FIELDS} }
  }
`;

const SAVE_PLAYLIST = `
  mutation SavePlaylist($playlistId: ID!) {
    savePlaylist(playlistId: $playlistId)
  }
`;

const UNSAVE_PLAYLIST = `
  mutation UnsavePlaylist($playlistId: ID!) {
    unsavePlaylist(playlistId: $playlistId)
  }
`;

export const getPlaylists = (accountName) =>
  gqlRequest(GET_PLAYLISTS, { accountName }).then(d => d?.playlists ?? []);

export const getPlaylist = (id) =>
  gqlRequest(GET_PLAYLIST, { id }).then(d => d?.playlist ?? null);

export const getSavedPlaylists = () =>
  gqlRequest(GET_SAVED_PLAYLISTS).then(d => d?.savedPlaylists ?? []);

export const createPlaylist = (input) =>
  gqlRequest(CREATE_PLAYLIST, { input }).then(d => d?.createPlaylist);

export const updatePlaylist = (id, input) =>
  gqlRequest(UPDATE_PLAYLIST, { id, input }).then(d => d?.updatePlaylist);

export const deletePlaylist = (id) =>
  gqlRequest(DELETE_PLAYLIST, { id }).then(d => d?.deletePlaylist);

export const addProjectToPlaylist = (playlistId, projectId) =>
  gqlRequest(ADD_PROJECT_TO_PLAYLIST, { playlistId, projectId }).then(d => d?.addProjectToPlaylist);

export const removeProjectFromPlaylist = (playlistId, projectId) =>
  gqlRequest(REMOVE_PROJECT_FROM_PLAYLIST, { playlistId, projectId }).then(d => d?.removeProjectFromPlaylist);

export const reorderPlaylist = (playlistId, projectIds) =>
  gqlRequest(REORDER_PLAYLIST, { playlistId, projectIds }).then(d => d?.reorderPlaylist);

export const savePlaylist = (playlistId) =>
  gqlRequest(SAVE_PLAYLIST, { playlistId }).then(d => d?.savePlaylist);

export const unsavePlaylist = (playlistId) =>
  gqlRequest(UNSAVE_PLAYLIST, { playlistId }).then(d => d?.unsavePlaylist);
