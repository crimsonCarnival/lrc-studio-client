import { describe, expect, it } from 'vitest';
import { genreLabel } from './genre-tags';

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
