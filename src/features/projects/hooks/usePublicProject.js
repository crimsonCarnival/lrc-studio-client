import { useState, useEffect } from 'react';
import { gqlRequest } from '@/app/graphql.client.js';

const GET_PUBLIC_PROJECT = `
  query GetPublicProject($projectId: String!) {
    publicProject(projectId: $projectId) {
      id projectId title coverImage
      metadata { description tags songName songArtist songAlbum songYear albumArt }
      upload { id source youtubeUrl cloudinaryUrl spotifyTrackId duration coverImage }
      user { id accountName displayName avatarUrl }
      lyrics {
        editorMode language
        lines {
          text timestamp endTime secondary translation
          words { word time reading }
          secondaryWords { word time }
        }
      }
      starCount forkCount isStarredByMe isForkedByMe
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
