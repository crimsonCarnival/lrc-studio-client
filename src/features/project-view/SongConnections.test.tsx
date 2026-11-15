// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SongConnections as Data } from './song-connections.types';

const { getSongConnections, toast } = vi.hoisted(() => ({
  getSongConnections: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('./song-connections.service', () => ({ getSongConnections }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('react-hot-toast', () => ({ default: toast, toast }));

import { SongConnections } from './SongConnections';

const song = (id: number, title: string) => ({ geniusId: id, title, artist: 'Someone', url: `https://genius.com/${id}`, thumbnail: null });
const data = (): Data => ({
  geniusId: 1, url: 'https://genius.com/stronger', title: 'Stronger', artist: 'Kanye West', album: null, releaseDate: null,
  groups: [
    { type: 'covered_by', total: 1, songs: [song(5, 'Cover One')] },
    { type: 'samples', total: 12, songs: [song(2, 'Sampled A'), song(3, 'Sampled B')] },
  ],
});

function wrap() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SongConnections track="Stronger" artist="Kanye West" />
    </QueryClientProvider>,
  );
}

describe('SongConnections', () => {
  beforeEach(() => {
    getSongConnections.mockReset();
    toast.error.mockReset();
  });

  it('renders nothing while loading and on null', async () => {
    let resolve!: (v: null) => void;
    getSongConnections.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { container } = wrap();
    expect(container).toBeEmptyDOMElement();
    resolve(null);
    await waitFor(() => expect(getSongConnections).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });

  it('orders groups samples-first', async () => {
    getSongConnections.mockResolvedValue(data());
    wrap();
    const headings = await screen.findAllByRole('heading', { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(['projectView.connections.samples', 'projectView.connections.covered_by']);
  });

  it('shows +N more when total exceeds songs', async () => {
    getSongConnections.mockResolvedValue(data());
    wrap();
    const more = await screen.findByText('projectView.connections.more');
    expect(more.closest('a')).toHaveAttribute('href', 'https://genius.com/stronger');
    expect(screen.getAllByText('projectView.connections.more')).toHaveLength(1);
  });

  it('links open in a new tab with noopener', async () => {
    getSongConnections.mockResolvedValue(data());
    wrap();
    await screen.findByText('Sampled A');
    for (const a of screen.getAllByRole('link')) {
      expect(a).toHaveAttribute('target', '_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    }
  });

  it('no toast on failure', async () => {
    getSongConnections.mockResolvedValue(null);
    const { container } = wrap();
    await waitFor(() => expect(getSongConnections).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
});
