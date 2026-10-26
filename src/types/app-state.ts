// Data shapes owned by useAppState (src/app/useAppState.ts). They live here,
// not in the hook, so features can type against them without importing app/.
import type { ArtistCredit } from '@/features/artists/artist-credits';

export interface ProjectMetadata {
  description?: string;
  tags?: string[];
  songName?: string;
  /** Ordered credits, primaries first. The singer roster and every artist display are built from these. */
  artists?: ArtistCredit[];
  /** Read-only display string derived from the credits. Never sent to the server. */
  songArtist?: string;
  /** The credits were edited this session; only then is an empty list sent (it would clear the stored artists). */
  artistsDirty?: boolean;
  songAlbum?: string;
  songYear?: string | number;
  genre?: string;
  songLanguage?: string;
  trackNumber?: number;
  trackCount?: number;
  /** Song-level singer roster offered when tagging sections/lines. */
  singers?: string[];
  singerColors?: string[];
  [key: string]: unknown;
}

export interface RestoredMedia {
  type: string;
  url: string;
  id?: string | null;
  fileName?: string | null;
  title?: string | null;
  duration?: number | null;
  publicId?: string | null;
}

export interface UploadedAudio {
  id?: string;
  uploadUrl?: string;
  publicId?: string;
  fileName?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface ForkedFrom {
  publicId?: string;
  accountName?: string;
  [key: string]: unknown;
}
