export type PrimaryGenre =
  | 'pop' | 'rock' | 'hip_hop' | 'rnb' | 'electronic'
  | 'jazz' | 'classical' | 'country' | 'folk' | 'metal'
  | 'blues' | 'soul' | 'reggae' | 'latin' | 'alternative'
  | 'soundtrack' | 'world' | 'other';

export const PRIMARY_GENRES: PrimaryGenre[] = [
  'pop', 'rock', 'hip_hop', 'rnb', 'electronic', 'jazz', 'classical',
  'country', 'folk', 'metal', 'blues', 'soul', 'reggae', 'latin',
  'alternative', 'soundtrack', 'world', 'other',
];

export interface TagEntry {
  value: string;
  group: string;
}

export const TAG_GROUPS: Record<string, string> = {
  alt_indie:    'setup.tagGroup.alt_indie',
  electronic:   'setup.tagGroup.electronic',
  hiphop:       'setup.tagGroup.hiphop',
  rock_metal:   'setup.tagGroup.rock_metal',
  pop_asian:    'setup.tagGroup.pop_asian',
  latin:        'setup.tagGroup.latin',
  world:        'setup.tagGroup.world',
  instrumental: 'setup.tagGroup.instrumental',
  media:        'setup.tagGroup.media',
  religious:    'setup.tagGroup.religious',
  misc:         'setup.tagGroup.misc',
};

export const TAGS_CATALOG: TagEntry[] = [
  // Alternative & Indie
  { value: 'Indie',        group: 'alt_indie' },
  { value: 'Experimental', group: 'alt_indie' },
  { value: 'Shoegaze',     group: 'alt_indie' },
  { value: 'Grunge',       group: 'alt_indie' },
  { value: 'Emo',          group: 'alt_indie' },
  { value: 'Punk',         group: 'alt_indie' },
  // Electronic
  { value: 'House',       group: 'electronic' },
  { value: 'Techno',      group: 'electronic' },
  { value: 'Trance',      group: 'electronic' },
  { value: 'Dubstep',     group: 'electronic' },
  { value: 'Drum & Bass', group: 'electronic' },
  { value: 'Ambient',     group: 'electronic' },
  { value: 'Lo-Fi',       group: 'electronic' },
  { value: 'Synthwave',   group: 'electronic' },
  { value: 'Vaporwave',   group: 'electronic' },
  // Hip-Hop
  { value: 'Trap',     group: 'hiphop' },
  { value: 'Drill',    group: 'hiphop' },
  { value: 'Boom Bap', group: 'hiphop' },
  // Rock & Metal
  { value: 'Hard Rock',   group: 'rock_metal' },
  { value: 'Progressive', group: 'rock_metal' },
  { value: 'Metalcore',   group: 'rock_metal' },
  { value: 'Death Metal', group: 'rock_metal' },
  { value: 'Black Metal', group: 'rock_metal' },
  // Pop & Asian
  { value: 'K-Pop', group: 'pop_asian' },
  { value: 'J-Pop', group: 'pop_asian' },
  // Latin
  { value: 'Reggaetón', group: 'latin' },
  { value: 'Salsa',     group: 'latin' },
  { value: 'Bachata',   group: 'latin' },
  { value: 'Merengue',  group: 'latin' },
  { value: 'Cumbia',    group: 'latin' },
  // World
  { value: 'Afrobeats', group: 'world' },
  { value: 'Flamenco',  group: 'world' },
  // Instrumental
  { value: 'Instrumental', group: 'instrumental' },
  { value: 'Piano',        group: 'instrumental' },
  { value: 'Orchestral',   group: 'instrumental' },
  { value: 'Opera',        group: 'instrumental' },
  { value: 'Acoustic',     group: 'instrumental' },
  // Media
  { value: 'Anime',      group: 'media' },
  { value: 'Video Game', group: 'media' },
  { value: 'Film Score', group: 'media' },
  // Religious
  { value: 'Gospel',    group: 'religious' },
  { value: 'Christian', group: 'religious' },
  // Misc
  { value: "Children's", group: 'misc' },
  { value: 'Spoken Word', group: 'misc' },
  { value: 'Comedy',      group: 'misc' },
];

export const MAX_TAGS = 10;

/** Tag groups shown for each primary genre in the tags selector */
export const GENRE_TAG_GROUPS: Record<PrimaryGenre, string[]> = {
  pop:         ['pop_asian', 'misc'],
  rock:        ['rock_metal', 'alt_indie', 'instrumental'],
  hip_hop:     ['hiphop', 'misc'],
  rnb:         ['religious', 'misc'],
  electronic:  ['electronic'],
  jazz:        ['instrumental', 'misc'],
  classical:   ['instrumental'],
  country:     ['instrumental', 'misc'],
  folk:        ['alt_indie', 'instrumental'],
  metal:       ['rock_metal', 'alt_indie'],
  blues:       ['instrumental', 'misc'],
  soul:        ['religious', 'misc'],
  reggae:      ['world'],
  latin:       ['latin', 'world'],
  alternative: ['alt_indie', 'rock_metal'],
  soundtrack:  ['media', 'instrumental'],
  world:       ['world', 'latin'],
  other:       ['alt_indie', 'electronic', 'hiphop', 'rock_metal', 'pop_asian', 'latin', 'world', 'instrumental', 'media', 'religious', 'misc'],
};

/** Maps raw genre tag strings (from a track metadata lookup) to PRIMARY_GENRES enum keys */
const GENRE_KEYWORD_MAP: [PrimaryGenre, string[]][] = [
  ['hip_hop',     ['hip hop', 'hip-hop', 'rap', 'trap', 'drill']],
  ['rnb',         ['r&b', 'rnb', 'rhythm and blues']],
  ['electronic',  ['electronic', 'edm', 'techno', 'house', 'dubstep', 'electro', 'synth', 'trance', 'drum and bass']],
  ['alternative', ['alternative', 'alt rock', 'alt-rock', 'indie']],
  ['soundtrack',  ['soundtrack', 'score', 'film', 'cinema', 'game music', 'anime', 'j-pop', 'jpop', 'j pop']],
  ['classical',   ['classical', 'orchestra', 'chamber', 'baroque', 'opera', 'symphon']],
  ['metal',       ['metal', 'hardcore', 'deathcore', 'doom']],
  ['folk',        ['folk', 'acoustic', 'singer-songwriter', 'bluegrass', 'americana']],
  ['country',     ['country', 'honky']],
  ['latin',       ['latin', 'salsa', 'bossa nova', 'samba', 'reggaeton', 'cumbia', 'k-pop', 'kpop']],
  ['reggae',      ['reggae', 'dancehall', 'ska', 'dub']],
  ['soul',        ['soul', 'gospel', 'motown', 'neo soul', 'funk', 'disco', 'groove']],
  ['blues',       ['blues']],
  ['jazz',        ['jazz', 'bebop', 'swing']],
  ['pop',         ['pop']],
  ['rock',        ['rock']],
];

export function matchGenreFromTags(genres: string[]): PrimaryGenre | '' {
  if (!genres?.length) return '';
  const combined = genres.join(' ').toLowerCase();
  for (const [key, keywords] of GENRE_KEYWORD_MAP) {
    if (keywords.some((kw) => combined.includes(kw))) return key;
  }
  return '';
}
