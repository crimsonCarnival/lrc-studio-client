export const PRIMARY_GENRES = [
  'pop', 'k_pop', 'j_pop', 'c_pop',
  'rock', 'alternative', 'indie', 'punk', 'metal',
  'hip_hop', 'rnb', 'soul', 'funk', 'disco', 'gospel',
  'electronic', 'dance', 'ambient', 'experimental',
  'jazz', 'blues', 'classical',
  'country', 'folk', 'singer_songwriter',
  'latin', 'reggaeton', 'regional_mexican', 'brazilian',
  'reggae', 'afrobeats', 'bollywood', 'world',
  'new_age', 'easy_listening',
  'soundtrack', 'anime', 'vocaloid', 'musical',
  'children', 'holiday', 'comedy', 'spoken_word',
  'other',
] as const;

export type PrimaryGenre = (typeof PRIMARY_GENRES)[number];

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
  soul_funk:    'setup.tagGroup.soul_funk',
  jazz_blues:   'setup.tagGroup.jazz_blues',
  country_folk: 'setup.tagGroup.country_folk',
  latin:        'setup.tagGroup.latin',
  world:        'setup.tagGroup.world',
  instrumental: 'setup.tagGroup.instrumental',
  media:        'setup.tagGroup.media',
  religious:    'setup.tagGroup.religious',
  misc:         'setup.tagGroup.misc',
};

const tags = (group: string, values: string[]): TagEntry[] => values.map((value) => ({ value, group }));

export const TAGS_CATALOG: TagEntry[] = [
  ...tags('alt_indie', [
    'Indie', 'Experimental', 'Shoegaze', 'Grunge', 'Emo', 'Punk', 'Post-Punk', 'Pop Punk',
    'Dream Pop', 'Bedroom Pop', 'Post-Rock', 'Math Rock', 'Indie Folk', 'Garage Rock', 'Britpop',
  ]),
  ...tags('electronic', [
    'House', 'Deep House', 'Techno', 'Trance', 'Dubstep', 'Drum & Bass', 'Ambient', 'Lo-Fi',
    'Synthwave', 'Vaporwave', 'Future Bass', 'Hardstyle', 'UK Garage', 'Breakbeat', 'Downtempo',
    'Chillwave', 'Electro', 'Eurobeat', 'Eurodance', 'IDM', 'Trip-Hop', 'Hyperpop', 'Phonk',
  ]),
  ...tags('hiphop', [
    'Trap', 'Drill', 'Boom Bap', 'Grime', 'Cloud Rap', 'Conscious Rap', 'Emo Rap',
    'Gangsta Rap', 'Jazz Rap', 'Lo-Fi Hip-Hop', 'Rage',
  ]),
  ...tags('rock_metal', [
    'Hard Rock', 'Progressive', 'Metalcore', 'Death Metal', 'Black Metal', 'Classic Rock',
    'Psychedelic', 'Nu Metal', 'Thrash Metal', 'Power Metal', 'Doom Metal', 'Symphonic Metal',
    'Djent', 'Deathcore', 'Post-Hardcore', 'Glam Rock', 'Stoner Rock',
  ]),
  ...tags('pop_asian', [
    'K-Pop', 'J-Pop', 'C-Pop', 'Mandopop', 'Cantopop', 'J-Rock', 'City Pop', 'Visual Kei',
    'Enka', 'T-Pop', 'OPM', 'Synth-Pop', 'Dance-Pop', 'Electropop', 'Teen Pop', 'Bubblegum Pop',
  ]),
  ...tags('soul_funk', [
    'Funk', 'Disco', 'Neo-Soul', 'Motown', 'Contemporary R&B', 'New Jack Swing', 'Quiet Storm',
    'Doo-Wop', 'Alternative R&B',
  ]),
  ...tags('jazz_blues', [
    'Bebop', 'Swing', 'Big Band', 'Smooth Jazz', 'Jazz Fusion', 'Acid Jazz', 'Vocal Jazz',
    'Delta Blues', 'Chicago Blues', 'Blues Rock',
  ]),
  ...tags('country_folk', [
    'Bluegrass', 'Americana', 'Country Pop', 'Outlaw Country', 'Folk Rock', 'Celtic', 'Traditional',
  ]),
  ...tags('latin', [
    'Reggaetón', 'Salsa', 'Bachata', 'Merengue', 'Cumbia', 'Latin Trap', 'Dembow', 'Latin Pop',
    'Bossa Nova', 'Samba', 'Tango', 'Bolero', 'Vallenato', 'Corridos', 'Banda', 'Mariachi',
    'Ranchera', 'Norteño', 'Sertanejo', 'Funk Carioca', 'Champeta', 'Rock en Español',
  ]),
  ...tags('world', [
    'Afrobeats', 'Amapiano', 'Highlife', 'Flamenco', 'Dancehall', 'Ska', 'Soca', 'Zouk',
    'Fado', 'Chanson', 'Bhangra', 'Qawwali', 'Arabic Pop', 'Klezmer', 'Polka', 'Schlager',
  ]),
  ...tags('instrumental', [
    'Instrumental', 'Piano', 'Orchestral', 'Opera', 'Acoustic', 'Chamber Music', 'Choral',
    'Guitar', 'Minimalism', 'A Cappella', 'Neoclassical',
  ]),
  ...tags('media', [
    'Anime', 'Video Game', 'Film Score', 'TV Theme', 'Musical Theatre', 'Vocaloid', 'Utaite',
    'Disney', 'Trailer Music', 'Cover', 'Remix',
  ]),
  ...tags('religious', ['Gospel', 'Christian', 'Worship', 'Hymn', 'Chant', 'Devotional']),
  ...tags('misc', [
    "Children's", 'Spoken Word', 'Comedy', 'Christmas', 'Holiday', 'Lullaby', 'Parody',
    'Meditation', 'Novelty',
  ]),
];

export const MAX_TAGS = 10;

/** Tag groups shown for each primary genre in the tags selector */
export const GENRE_TAG_GROUPS: Record<PrimaryGenre, string[]> = {
  pop:               ['pop_asian', 'electronic', 'misc'],
  k_pop:             ['pop_asian', 'hiphop', 'electronic'],
  j_pop:             ['pop_asian', 'media', 'rock_metal'],
  c_pop:             ['pop_asian', 'media'],
  rock:              ['rock_metal', 'alt_indie', 'instrumental'],
  alternative:       ['alt_indie', 'rock_metal'],
  indie:             ['alt_indie', 'electronic', 'country_folk'],
  punk:              ['alt_indie', 'rock_metal'],
  metal:             ['rock_metal', 'alt_indie'],
  hip_hop:           ['hiphop', 'misc'],
  rnb:               ['soul_funk', 'hiphop', 'religious'],
  soul:              ['soul_funk', 'religious', 'jazz_blues'],
  funk:              ['soul_funk', 'jazz_blues'],
  disco:             ['soul_funk', 'electronic'],
  gospel:            ['religious', 'soul_funk'],
  electronic:        ['electronic'],
  dance:             ['electronic', 'pop_asian'],
  ambient:           ['electronic', 'instrumental'],
  experimental:      ['alt_indie', 'electronic', 'instrumental'],
  jazz:              ['jazz_blues', 'instrumental', 'soul_funk'],
  blues:             ['jazz_blues', 'country_folk'],
  classical:         ['instrumental'],
  country:           ['country_folk', 'instrumental'],
  folk:              ['country_folk', 'alt_indie', 'instrumental'],
  singer_songwriter: ['country_folk', 'alt_indie', 'instrumental'],
  latin:             ['latin', 'world'],
  reggaeton:         ['latin', 'hiphop'],
  regional_mexican:  ['latin'],
  brazilian:         ['latin', 'world'],
  reggae:            ['world'],
  afrobeats:         ['world', 'hiphop'],
  bollywood:         ['world', 'media'],
  world:             ['world', 'latin', 'country_folk'],
  new_age:           ['instrumental', 'electronic', 'misc'],
  easy_listening:    ['jazz_blues', 'instrumental'],
  soundtrack:        ['media', 'instrumental'],
  anime:             ['media', 'pop_asian', 'rock_metal'],
  vocaloid:          ['media', 'pop_asian', 'electronic'],
  musical:           ['media', 'instrumental'],
  children:          ['misc', 'media'],
  holiday:           ['misc', 'religious'],
  comedy:            ['misc'],
  spoken_word:       ['misc', 'hiphop'],
  other:             Object.keys(TAG_GROUPS),
};

/**
 * Maps raw genre tag strings (from a track metadata lookup) to PRIMARY_GENRES keys. The first entry
 * with a keyword found anywhere in the joined tags wins, so specific genres come before the broad
 * ones whose names they contain ("k-pop" before "pop", "reggaeton" before "reggae", "dubstep" before "dub").
 */
const GENRE_KEYWORD_MAP: [PrimaryGenre, string[]][] = [
  ['vocaloid',          ['vocaloid', 'utaite']],
  ['anime',             ['anime']],
  ['k_pop',             ['k-pop', 'kpop', 'k pop', 'korean']],
  ['j_pop',             ['j-pop', 'jpop', 'j pop', 'j-rock', 'japanese', 'city pop']],
  ['c_pop',             ['c-pop', 'cpop', 'mandopop', 'cantopop', 'chinese']],
  ['reggaeton',         ['reggaeton', 'reggaetón', 'dembow', 'urbano latino']],
  ['regional_mexican',  ['regional mexican', 'mexican', 'corrido', 'banda', 'mariachi', 'ranchera', 'norteño', 'norteno', 'grupero']],
  ['brazilian',         ['brazil', 'mpb', 'sertanejo', 'samba', 'bossa nova', 'pagode', 'forró', 'forro', 'funk carioca', 'axé']],
  ['afrobeats',         ['afrobeat', 'afropop', 'afro-pop', 'amapiano', 'highlife', 'afroswing']],
  ['bollywood',         ['bollywood', 'filmi', 'indian', 'desi', 'punjabi', 'bhangra', 'tollywood']],
  ['musical',           ['musical', 'show tune', 'broadway', 'cast recording']],
  ['children',          ['children', 'kids', 'nursery', 'lullab']],
  ['holiday',           ['christmas', 'holiday', 'xmas']],
  ['gospel',            ['gospel', 'christian', 'worship', 'ccm', 'praise']],
  ['comedy',            ['comedy', 'parody', 'novelty']],
  ['spoken_word',       ['spoken word', 'poetry', 'audiobook']],
  ['soundtrack',        ['soundtrack', 'score', 'film', 'cinema', 'game music', 'video game']],
  ['hip_hop',           ['hip hop', 'hip-hop', 'rap', 'trap', 'drill', 'grime']],
  ['rnb',               ['r&b', 'rnb', 'rhythm and blues']],
  ['disco',             ['disco', 'nu-disco']],
  ['funk',              ['funk']],
  ['ambient',           ['ambient', 'drone']],
  ['new_age',           ['new age', 'meditation', 'healing', 'relaxation']],
  ['electronic',        ['electronic', 'edm', 'techno', 'house', 'dubstep', 'electro', 'synth', 'trance', 'drum and bass', 'idm']],
  ['reggae',            ['reggae', 'dancehall', 'ska', 'dub']],
  ['dance',             ['dance', 'club']],
  ['punk',              ['punk']],
  ['singer_songwriter', ['singer-songwriter', 'singer/songwriter', 'singer songwriter']],
  ['experimental',      ['experimental', 'avant-garde', 'avant garde', 'noise']],
  ['indie',             ['indie']],
  ['alternative',       ['alternative', 'alt rock', 'alt-rock']],
  ['classical',         ['classical', 'orchestra', 'chamber', 'baroque', 'opera', 'symphon']],
  ['metal',             ['metal', 'hardcore', 'deathcore', 'doom']],
  ['folk',              ['folk', 'acoustic', 'bluegrass', 'americana', 'celtic']],
  ['country',           ['country', 'honky']],
  ['latin',             ['latin', 'salsa', 'cumbia', 'bachata', 'merengue', 'tango', 'bolero', 'vallenato']],
  ['soul',              ['soul', 'motown', 'groove']],
  ['blues',             ['blues']],
  ['jazz',              ['jazz', 'bebop', 'swing']],
  ['easy_listening',    ['easy listening', 'lounge', 'adult contemporary']],
  ['world',             ['world', 'flamenco', 'fado', 'chanson', 'arabic']],
  ['pop',               ['pop']],
  ['rock',              ['rock']],
];

export function matchGenreFromTags(genres: string[]): PrimaryGenre | '' {
  if (!genres?.length) return '';
  const combined = genres.join(' ').toLowerCase();
  for (const [key, keywords] of GENRE_KEYWORD_MAP) {
    if (keywords.some((kw) => combined.includes(kw))) return key;
  }
  return '';
}

/**
 * The display name of a stored genre. Genres are saved as codes (`hip_hop`), so showing the stored
 * value prints the code. A genre typed freely (older or imported projects) has no label and is
 * shown as it was written.
 */
export function genreLabel(genre: string | null | undefined, t: (key: string) => string): string {
  const value = genre?.trim();
  if (!value) return '';
  const code = value.toLowerCase();
  return PRIMARY_GENRES.includes(code as PrimaryGenre) ? t(`setup.genre.${code}`) : value;
}
