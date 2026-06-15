import { useState, useEffect } from 'react';
import { gqlRequest } from '@/app/graphql.client.js';

const GET_PUBLIC_PROJECT = `
  query GetPublicProject($projectId: String!) {
    publicProject(projectId: $projectId) {
      id projectId title coverImage
      metadata { description genre tags songName songArtist songAlbum songYear albumArt songLanguage trackNumber trackCount }
      upload { id source youtubeUrl uploadUrl spotifyTrackId duration coverImage }
      user { id accountName displayName avatarUrl }
      lyrics {
        editorMode language
        sections {
          label depth id singers timestamp
          lines {
            id text timestamp endTime secondary translation
            singers
            words { word time reading singerIndex }
            secondaryWords { word time }
          }
        }
      }
      starCount forkCount isStarredByMe isForkedByMe forksEnabled createdAt
      forkedFrom { projectId accountName }
    }
  }
`;

export function usePublicProject(projectId) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setNotFound(false);
    gqlRequest(GET_PUBLIC_PROJECT, { projectId })
      .then(data => {
        if (cancelled) return;
        if (!data?.publicProject) { setNotFound(true); return; }
        setProject(data.publicProject);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  return { project, loading, notFound };
}
