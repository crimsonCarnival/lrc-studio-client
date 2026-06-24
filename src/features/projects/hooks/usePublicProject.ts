import { useState, useEffect } from 'react';
import { gqlRequest } from '@/app/graphql.client';
import type { Project } from '@/types';

const GET_PUBLIC_PROJECT = /* GraphQL */ `
  query GetPublicProject($publicId: String!) {
    publicProject(publicId: $publicId) {
      id publicId title coverImage
      metadata { description genre tags songName songArtist songAlbum songYear songLanguage trackNumber trackCount }
      upload { id source uploadUrl duration coverImage }
      user { id accountName displayName avatarUrl }
      lyrics {
        editorMode
        sections {
          label depth id singers timestamp
          lines {
            id text timestamp endTime secondary translation
            singers
            mode
            words { word time reading singerIndex }
            secondaryWords { word time singerIndex }
          }
        }
      }
      starCount forkCount isStarredByMe isForkedByMe forksEnabled createdAt
      forkedFrom { publicId accountName }
    }
  }
`;

export function usePublicProject(publicId: string | null | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!publicId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setNotFound(false);
    gqlRequest<{ publicProject: Project | null }>(GET_PUBLIC_PROJECT, { publicId })
      .then(data => {
        if (cancelled) return;
        if (!data?.publicProject) { setNotFound(true); return; }
        setProject(data.publicProject);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [publicId]);

  return { project, loading, notFound };
}
