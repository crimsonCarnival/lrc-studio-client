import { creditsOf } from '@/features/artists/artist-credits';
import type { ShelfAlbum, ShelfArtist, ShelfProject } from '@/features/artists/shelf.service';
import { projectStatus, type ProjectStatus } from '@/features/projects/project-status';

export type LibraryFilterTab = 'all' | ProjectStatus;

const statusOf = (p: ShelfProject): ProjectStatus =>
  projectStatus({ lineCount: p.lineCount ?? undefined, syncedLineCount: p.syncedLineCount ?? undefined });

/** The Library's tab test, shared by the groups and the counts so a badge always equals the cards under it. */
const inTab = (p: ShelfProject, tab: LibraryFilterTab): boolean => tab === 'all' || statusOf(p) === tab;

/** A project the Library's own list can't place under an artist: no primary credit. */
const hasNoPrimary = (p: ShelfProject): boolean =>
  !creditsOf(p.metadata).some((c) => c.role === 'primary');

const includes = (text: string | null | undefined, needle: string): boolean => !!text && text.toLowerCase().includes(needle);

/** The query matches the track, or the artist/album it sits under (so searching an album name shows the album). */
function trackMatches(p: ShelfProject, artist: ShelfArtist, album: ShelfAlbum, needle: string): boolean {
  return !needle
    || includes(p.title, needle) || includes(p.metadata?.songName, needle)
    || includes(artist.name, needle) || includes(album.title, needle);
}

export type Group = { artist: ShelfArtist; albums: Array<{ album: ShelfAlbum; projects: ShelfProject[] }> };

/** The shelf narrowed to tracks that pass the search and status tab; empty albums and artists are dropped. */
export function filterShelf(shelf: ShelfArtist[], query: string, tab: LibraryFilterTab): Group[] {
  const needle = query.trim().toLowerCase();
  const groups: Group[] = [];
  for (const artist of shelf) {
    const albums: Group['albums'] = [];
    for (const album of artist.albums) {
      const projects = album.tracks.map((tr) => tr.project).filter((p) => inTab(p, tab) && trackMatches(p, artist, album, needle));
      if (projects.length > 0) albums.push({ album, projects });
    }
    if (albums.length > 0) groups.push({ artist, albums });
  }
  return groups;
}

/** Credit-less projects, status-filtered. `items` arrive already search-filtered by the Library. */
export const noArtistOf = (items: ShelfProject[], tab: LibraryFilterTab): ShelfProject[] =>
  items.filter((p) => hasNoPrimary(p) && inTab(p, tab));

/**
 * Per-tab counts for this view. A song credited to two primaries sits under both
 * artists but is one song, so it is counted by publicId.
 */
export function artistViewCounts(shelf: ShelfArtist[], items: ShelfProject[], query: string): Record<LibraryFilterTab, number> {
  const counts: Record<LibraryFilterTab, number> = { all: 0, inProgress: 0, completed: 0, notStarted: 0 };
  const seen = new Set<string>();
  const add = (p: ShelfProject) => {
    if (seen.has(p.publicId)) return;
    seen.add(p.publicId);
    counts.all++;
    counts[statusOf(p)]++;
  };
  for (const g of filterShelf(shelf, query, 'all')) for (const a of g.albums) a.projects.forEach(add);
  noArtistOf(items, 'all').forEach(add);
  return counts;
}
