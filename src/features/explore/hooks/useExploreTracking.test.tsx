import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const track = vi.hoisted(() => vi.fn());
vi.mock('../explore.service.js', () => ({
  trackExploreEvents: track,
  getTrendingProjects: vi.fn(),
  getPopularPlaylists: vi.fn(),
  getSuggestedUsers: vi.fn(),
}));

import { useExploreTracking } from './useExplore';

const p = (id: string) => ({ id, publicId: id });

describe('useExploreTracking', () => {
  beforeEach(() => track.mockClear());

  it('reports each project once, with its feed position, and not again on re-render or when more load', () => {
    const { rerender } = renderHook(({ list }) => useExploreTracking(list), { initialProps: { list: [p('a'), p('b')] } });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenLastCalledWith([
      { publicId: 'a', type: 'IMPRESSION', position: 0 },
      { publicId: 'b', type: 'IMPRESSION', position: 1 },
    ]);

    rerender({ list: [p('a'), p('b')] });
    expect(track).toHaveBeenCalledTimes(1);

    rerender({ list: [p('a'), p('b'), p('c')] });
    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenLastCalledWith([{ publicId: 'c', type: 'IMPRESSION', position: 2 }]);
  });

  it('splits large first loads into batches of 50 and sends clicks on demand', () => {
    const many = Array.from({ length: 120 }, (_, i) => p(`p${i}`));
    const { result } = renderHook(() => useExploreTracking(many));
    expect(track.mock.calls.map((c) => c[0].length)).toEqual([50, 50, 20]);

    track.mockClear();
    result.current('p7');
    expect(track).toHaveBeenCalledWith([{ publicId: 'p7', type: 'CLICK' }]);
  });
});
