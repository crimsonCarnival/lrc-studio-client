import type { PlaybackEntry } from './playback-history';

export interface Loop {
  a: number | null;
  b: number | null;
}

/** The imperative API PlayerEngine exposes through its ref — the one shape every playerRef holds. */
export interface PlayerHandle {
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  adjustSpeed: (delta: number) => void;
  getSpeed: () => number;
  seek: (time: number) => void;
  getAudioBlob: () => Blob | null;
  getYoutubeUrl: () => string | null;
  loadLocalAudio: (file: File) => void;
  loadYouTube: (url?: string) => void;
  loadFromUrl: (url: string, title?: string) => void;
  setLoop: (a: number | null, b: number | null) => void;
  clearLoop: () => void;
  getLoop: () => Loop;
  getPrevTrack: () => PlaybackEntry | undefined;
}
