// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@/app/i18n';
import type { CatalogArtistMatch } from './catalog.queries';

const state = vi.hoisted(() => ({
  user: { isVerified: true } as null | { isVerified?: boolean },
  match: { state: 'none' } as CatalogArtistMatch,
  albums: [] as string[],
  dialog: vi.fn(),
}));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: state.user }) }));
vi.mock('./catalog.queries', () => ({
  useCatalogArtistMatch: () => state.match,
  useCatalogAlbumSuggestions: () => state.albums,
}));
vi.mock('./SubmitCatalogDialog', () => ({
  SubmitCatalogDialog: (props: { target: unknown }) => { state.dialog(props.target); return <div data-testid="dialog" />; },
}));

import { CatalogSuggestPrompt } from './CatalogSuggestPrompt';

const robyn = { id: 'a1', name: 'Robyn', slug: 'robyn' };

describe('CatalogSuggestPrompt', () => {
  beforeEach(() => {
    state.user = { isVerified: true };
    state.match = { state: 'none' };
    state.albums = [];
    state.dialog.mockClear();
  });

  it('offers to suggest an artist the catalog does not have, pre-filled', () => {
    render(<CatalogSuggestPrompt kind="artist" artist=" Robyn " />);
    expect(screen.getByText(/isn’t in the artist catalog yet/)).toHaveTextContent('“Robyn”');
    fireEvent.click(screen.getByRole('button', { name: 'Suggest it' }));
    expect(state.dialog).toHaveBeenCalledWith({ kind: 'artist', initialName: 'Robyn' });
  });

  it.each([['loading'], ['one'], ['many'], ['idle']] as const)('says nothing about the artist while the match is %s', (s) => {
    state.match = s === 'one' ? { state: 'one', artist: robyn } : { state: s };
    const { container } = render(<CatalogSuggestPrompt kind="artist" artist="Robyn" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says nothing to unverified or signed-out users', () => {
    state.user = { isVerified: false };
    const { container, rerender } = render(<CatalogSuggestPrompt kind="artist" artist="Robyn" />);
    expect(container).toBeEmptyDOMElement();
    state.user = null;
    rerender(<CatalogSuggestPrompt kind="artist" artist="Robyn" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers an album missing from a catalog artist, targeting that artist', () => {
    state.match = { state: 'one', artist: robyn };
    state.albums = ['Honey'];
    render(<CatalogSuggestPrompt kind="album" artist="Robyn" album="Body Talk" />);
    fireEvent.click(screen.getByRole('button', { name: 'Suggest it' }));
    expect(state.dialog).toHaveBeenCalledWith({ kind: 'album', artistId: 'a1', artistName: 'Robyn', artistSlug: 'robyn', initialName: 'Body Talk' });
  });

  it('stays quiet for a catalog album, an empty album, or an artist not in the catalog', () => {
    state.match = { state: 'one', artist: robyn };
    state.albums = ['Honey'];
    const { container, rerender } = render(<CatalogSuggestPrompt kind="album" artist="Robyn" album="honey" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CatalogSuggestPrompt kind="album" artist="Robyn" album="  " />);
    expect(container).toBeEmptyDOMElement();
    state.match = { state: 'none' };
    rerender(<CatalogSuggestPrompt kind="album" artist="Robyn" album="Body Talk" />);
    expect(container).toBeEmptyDOMElement();
  });
});
