import { createContext, useContext } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import type { EditorLine } from '@/features/editor/services/editor.service';

export interface UploadItem {
  id?: string;
  title?: string;
  fileName?: string;
  source?: string;
  uploadUrl?: string;
}

interface MediaPopoverProps {
  ytUrl: string;
  onYtUrlChange: (v: string) => void;
  onYtErrorChange: (v: string) => void;
  onUrlLoad: () => void;
  cdnLoading: boolean;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  uploads: UploadItem[];
  onSelectUpload: (upload: UploadItem) => void;
  onClearMedia: () => void;
}

export interface PlayerContextValue {
  // playback state
  source: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  hasMedia: boolean | string | null;
  loop: { a: number | null; b: number | null };
  loopA: number | null;
  loopB: number | null;
  // media meta / sources
  mediaTitle?: string;
  thumbnail?: string | null;
  projectCoverImage?: string;
  // hook surfaces the UI reads (keep the existing `local` / `yt` shapes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  local: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yt: any;
  mediaUploads: unknown[];
  cdnLoading: boolean;
  // config passthroughs the UI needs
  syncMode: boolean;
  viewerMode: boolean;
  speedPresets: number[];
  MIN_SPEED: number;
  MAX_SPEED: number;
  // lines and playback position (for waveform / progress)
  lines?: EditorLine[];
  playbackPosition?: number;
  // audioRef for WaveformDisplay
  audioRef: RefObject<HTMLAudioElement | null>;
  // derived url detection
  detectedUrlType: string;
  // media popover composite props
  mediaPopoverProps: MediaPopoverProps;
  // upload fetcher
  fetchUploads: () => void;
  // commands
  togglePlay: () => void;
  seek: (t: number) => void;
  applySpeed: (s: number) => void;
  setLoop: (loop: { a: number | null; b: number | null }) => void;
  handleLoopChange: (a: number | null, b: number | null) => void;
  clearLoop: () => void;
  handleUrlLoad: () => void;
  handleSelectUpload: (u: unknown) => void;
  handleClearMedia: () => void;
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerEngineProvider');
  return ctx;
}
