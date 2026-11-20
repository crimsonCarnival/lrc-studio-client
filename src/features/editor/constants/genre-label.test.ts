import { describe, expect, it } from 'vitest';
import { GENRE_TAG_GROUPS, PRIMARY_GENRES, genreLabel, matchGenreFromTags } from './genre-tags';

const t = (key: string) => `[${key}]`;

describe('genreLabel', () => {
  it('turns a stored code into its label key', () => {
    expect(genreLabel('hip_hop', t)).toBe('[setup.genre.hip_hop]');
    expect(genreLabel(' Rock ', t)).toBe('[setup.genre.rock]');
    expect(genreLabel('k_pop', t)).toBe('[setup.genre.k_pop]');
  });

  it('shows a freely typed genre as written, and nothing for an empty one', () => {
    expect(genreLabel('Vaporwave', t)).toBe('Vaporwave');
    expect(genreLabel('  ', t)).toBe('');
    expect(genreLabel(null, t)).toBe('');
  });
});

describe('matchGenreFromTags', () => {
  it('picks the specific genre over the broad one whose name it contains', () => {
    expect(matchGenreFromTags(['k-pop'])).toBe('k_pop');
    expect(matchGenreFromTags(['J-Pop', 'anime'])).toBe('anime');
    expect(matchGenreFromTags(['reggaeton', 'latin'])).toBe('reggaeton');
    expect(matchGenreFromTags(['dubstep'])).toBe('electronic');
    expect(matchGenreFromTags(['dancehall'])).toBe('reggae');
    expect(matchGenreFromTags(['pop punk'])).toBe('punk');
    expect(matchGenreFromTags(['indie pop'])).toBe('indie');
    expect(matchGenreFromTags(['funk carioca'])).toBe('brazilian');
    expect(matchGenreFromTags(['corridos tumbados'])).toBe('regional_mexican');
    expect(matchGenreFromTags(['christmas'])).toBe('holiday');
    expect(matchGenreFromTags(['rock'])).toBe('rock');
    expect(matchGenreFromTags([])).toBe('');
  });

  it('every primary genre has a tag group mapping and a label in each locale', async () => {
    const en = (await import('../../../locales/en/setup.js')).default as { genre: Record<string, string> };
    const es = (await import('../../../locales/es/setup.js')).default as { genre: Record<string, string> };
    for (const g of PRIMARY_GENRES) {
      expect(GENRE_TAG_GROUPS[g]?.length).toBeGreaterThan(0);
      expect(en.genre[g]).toBeTruthy();
      expect(es.genre[g]).toBeTruthy();
    }
  });
});
