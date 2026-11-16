import { describe, expect, it } from 'vitest';
import { looksLikeVideoTitle } from './title-heuristics';

describe('looksLikeVideoTitle', () => {
  it.each([
    'PXNDX - Los Malaventurados No Lloran (Audio Oficial) [wvR7EtLuJfg]',
    'Song (Official Video)',
    'Hold On (Remastered 2011)',
    'Song [Lyrics]',
    'Song - Official',
    'Canción [HD]',
    'Canción (vídeo oficial)',
    'Official Song',
  ])('is true for %s', (title) => expect(looksLikeVideoTitle(title)).toBe(true));

  it.each(['Yesterday', 'Song (feat. A & B)', '', 'Unofficial Remixes', 'Song (Unofficial Mix)', 'Song (Hdr)'])('is false for %s', (title) =>
    expect(looksLikeVideoTitle(title)).toBe(false));
});
