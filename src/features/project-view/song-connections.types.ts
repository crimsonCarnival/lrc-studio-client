export type ConnectionType =
  | 'samples' | 'sampled_in' | 'interpolates' | 'interpolated_by'
  | 'cover_of' | 'covered_by' | 'remix_of' | 'remixed_by';

export type ConnectionSong = {
  geniusId: number;
  title: string;
  artist: string;
  url: string;
  thumbnail: string | null;
};

export type ConnectionGroup = {
  type: ConnectionType;
  total: number;
  songs: ConnectionSong[];
};

export type SongConnections = {
  geniusId: number;
  url: string;
  title: string;
  artist: string;
  album: string | null;
  releaseDate: string | null;
  groups: ConnectionGroup[];
};
