// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import type { ShelfAlbum, ShelfArtist, ShelfProject } from '@/features/artists/shelf.service';
import { LibraryByArtist } from './LibraryByArtist';
import { artistViewCounts } from './library-artist-view';

const project = (publicId: string, over: Partial<ShelfProject> = {}): ShelfProject => ({
  id: publicId, publicId, title: publicId, lineCount: 10, syncedLineCount: 10, metadata: null, ...over,
});

const album = (key: string, title: string | null, ids: Array<[string, Partial<ShelfProject>?]>): ShelfAlbum => ({
  key, title, year: null, isPublic: false, trackCount: ids.length, coverImage: null,
  tracks: ids.map(([id, over], i) => ({ trackNumber: i + 1, project: project(id, over) })),
});

const artist = (id: string, name: string, albums: ShelfAlbum[]): ShelfArtist => ({
  id, name, isPublic: false, songCount: 0, albumCount: albums.length, coverImage: null,
  latestEditAt: '2026-01-01T00:00:00.000Z', albums,
});

const SHELF: ShelfArtist[] = [
  artist('a1', 'Daft Punk', [
    album('discovery', 'Discovery', [['one-more-time'], ['aerodynamic', { syncedLineCount: 0 }]]),
    album('', null, [['loose-track']]),
  ]),
  artist('a2', 'Justice', [album('cross', 'Cross', [['genesis', { syncedLineCount: 4 }]])]),
];

const renderCard = (p: ShelfProject) => <div data-testid="card">{p.publicId}</div>;
const cards = () => screen.getAllByTestId('card').map((c) => c.textContent);
const headings = (level: number) => screen.getAllByRole('heading', { level }).map((h) => h.textContent);

function view(over: Partial<ComponentProps<typeof LibraryByArtist>> = {}) {
  return render(<LibraryByArtist shelf={SHELF} items={[]} query="" filterTab="all" renderCard={renderCard} {...over} />);
}

describe('LibraryByArtist', () => {
  it('artist sort renders artist then album headers in shelf order', () => {
    view();
    expect(headings(2)).toEqual(['Daft Punk', 'Justice']);
    expect(headings(3)).toEqual(['Discovery', 'Singles & loose tracks', 'Cross']);
    expect(cards()).toEqual(['one-more-time', 'aerodynamic', 'loose-track', 'genesis']);
  });

  it('status tab filter applies inside groups', () => {
    view({ filterTab: 'completed' });
    expect(cards()).toEqual(['one-more-time', 'loose-track']);
    // Justice has no completed track, so its header goes with it.
    expect(headings(2)).toEqual(['Daft Punk']);
  });

  it('hides an album whose tracks are all filtered out', () => {
    view({ filterTab: 'notStarted' });
    expect(headings(3)).toEqual(['Discovery']);
    expect(cards()).toEqual(['aerodynamic']);
  });

  it('projects without credits land in No artist set', () => {
    const credited = project('credited', { metadata: { artists: [{ name: 'Daft Punk', role: 'primary', order: 0 }] } });
    const featuredOnly = project('feat', { metadata: { artists: [{ name: 'Pharrell', role: 'featured', order: 0 }] } });
    view({ items: [credited, project('orphan'), featuredOnly] });
    expect(headings(2)).toEqual(['Daft Punk', 'Justice', 'No artist set']);
    // Only the credit-less ones go in the bucket, after every artist.
    expect(cards().slice(-2)).toEqual(['orphan', 'feat']);
    expect(cards()).not.toContain('credited');
  });

  it('a credited subtitles project (left out of the shelf) lands in No artist set', () => {
    const subs = project('subs', { kind: 'subtitles', metadata: { artists: [{ name: 'Daft Punk', role: 'primary', order: 0 }] } });
    view({ items: [subs] });
    expect(headings(2)).toEqual(['Daft Punk', 'Justice', 'No artist set']);
    expect(cards().slice(-1)).toEqual(['subs']);
    expect(artistViewCounts(SHELF, [subs], '').all).toBe(5);
  });

  it('search matches an album name', () => {
    view({ query: 'discovery' });
    expect(headings(3)).toEqual(['Discovery']);
    expect(cards()).toEqual(['one-more-time', 'aerodynamic']);
  });

  it('shows an empty message when nothing matches', () => {
    view({ query: 'zzzz' });
    expect(screen.queryAllByTestId('card')).toHaveLength(0);
    expect(screen.getByText('No songs match.')).toBeInTheDocument();
  });

  it('counts each status once, even for a song under two artists', () => {
    const shared = project('duet');
    const shelf = [
      artist('a1', 'A', [album('x', 'X', [['duet', shared], ['wip', { syncedLineCount: 3 }]])]),
      artist('a2', 'B', [album('y', 'Y', [['duet', shared]])]),
    ];
    expect(artistViewCounts(shelf, [project('orphan', { syncedLineCount: 0 })], '')).toEqual({
      all: 3, inProgress: 1, completed: 1, notStarted: 1,
    });
  });
});
