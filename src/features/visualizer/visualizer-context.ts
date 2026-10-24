import { createContext, useContext } from 'react';
import type { VisualizerKind } from './visualizer-presets';

/** What the visualizer is listening to right now. */
export type AudioFeed =
  /** The song's own <audio> element: real samples. */
  | 'element'
  /** An <audio> from a host that forbids reading it: the lyric-timed stand-in. */
  | 'element-sealed'
  /** This tab's audio, shared by the viewer: real samples. */
  | 'tab'
  /** YouTube; tab audio could be shared but is not yet: the stand-in meanwhile. */
  | 'tab-available'
  /** YouTube in a browser that cannot share tab audio: the stand-in. */
  | 'tab-unsupported';

export type TabAudioError = 'denied' | 'noAudio' | 'failed';

export interface VisualizerContextValue {
  kind: VisualizerKind;
  setKind: (kind: VisualizerKind) => void;
  feed: AudioFeed;
  /** Real samples for this frame, or null while the stand-in is drawing. Read per frame. */
  getAnalyser: () => AnalyserNode | null;
  connecting: boolean;
  tabError: TabAudioError | null;
  shareTabAudio: () => void;
  stopTabAudio: () => void;
}

export const VisualizerContext = createContext<VisualizerContextValue | null>(null);

export function useVisualizer(): VisualizerContextValue {
  const ctx = useContext(VisualizerContext);
  if (!ctx) throw new Error('useVisualizer must be used inside <VisualizerProvider>');
  return ctx;
}
