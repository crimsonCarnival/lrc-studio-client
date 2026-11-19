import { useQuery } from '@tanstack/react-query';
import { gqlRequest } from '@/app/graphql.client';
import type { Project } from '@/types';

const GET_PUBLIC_PROJECT = /* GraphQL */ `
  query GetPublicProject($publicId: String!) {
    publicProject(publicId: $publicId) {
      id publicId slug title coverImage listed
      metadata { description genre tags songName songVersion songArtist artists { name role order catalogSlug } songAlbum catalogAlbum { artistSlug albumSlug } songYear songLanguage trackNumber trackCount singerColors }
      upload { id source uploadUrl duration coverImage }
      user { id accountName displayName avatarUrl staffRole nameTag { id label { en es } description { en es } icon color } progression { level } }
      lyrics {
        editorMode
        sections {
          label depth id singers timestamp
          lines {
            id text timestamp endTime secondary translation
            singers
            mode
            adLibOf
            words { word time end reading singerIndex }
            secondaryWords { word time end singerIndex }
          }
        }
      }
      starCount forkCount viewCount shareCount profileShareCount isStarredByMe isForkedByMe isSharedToProfileByMe forksEnabled createdAt
      myProfileShare { description tags }
      forkedFrom { publicId accountName sourceDeleted }
      collaborators { id name isGuest user { id accountName displayName avatarUrl } }
    }
  }
`;

/**
 * Deliberately outside the `['projects', …]` family: cache-sync's projectsChanged() invalidates that
 * prefix after every star, and a refetch landing mid-view would add the server's new star count to
 * the page's own optimistic delta. Staleness is covered anyway — staleTime 0 revalidates on mount.
 */
export const publicProjectKey = (publicId: string) => ['publicProject', publicId] as const;

export function usePublicProject(publicId: string | null | undefined) {
  const query = useQuery({
    queryKey: publicProjectKey(publicId ?? ''),
    queryFn: () => gqlRequest<{ publicProject: Project | null }>(GET_PUBLIC_PROJECT, { publicId }).then((d) => d?.publicProject ?? null),
    enabled: !!publicId,
  });

  // Same contract as before: no id → still loading; any failure or a null project → not found.
  return {
    project: query.data ?? null,
    loading: !publicId || query.isPending,
    notFound: query.isError || query.data === null,
  };
}
