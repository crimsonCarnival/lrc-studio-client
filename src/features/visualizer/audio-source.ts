// Where the visualizer's samples come from. The browser plays every source the player
// supports, but page script can read only two of them:
//  - the <audio> element (uploads, CDN links), routed through Web Audio in place;
//  - a YouTube embed is a cross-origin iframe whose audio is sealed off from this page. The
//    one way in is capturing this tab's own audio with getDisplayMedia, which the viewer has
//    to grant, from a click, in a Chromium desktop browser.
import { isReadableAudioUrl } from '@features/player/media-cors';

let sharedContext: AudioContext | null = null;
const elementTaps = new WeakMap<HTMLMediaElement, AnalyserNode>();

function audioContext(): AudioContext {
  sharedContext ??= new AudioContext();
  return sharedContext;
}

function createAnalyser(ctx: AudioContext): AnalyserNode {
  const analyser = ctx.createAnalyser();
  // 2048 gives ~23 Hz bins at 48 kHz: enough resolution to split the low bands apart.
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.78;
  // Headroom above the default ceiling: loud, compressed masters otherwise pin every band
  // near the top and the spectrum reads as a flat wall.
  analyser.minDecibels = -90;
  analyser.maxDecibels = -18;
  return analyser;
}

/**
 * An analyser on the element's output, or null when routing it would not be safe. An element
 * can be wired into an AudioContext once in its life, and from then on plays only through
 * the graph — so the node is cached against the element, the path to the speakers is never
 * disconnected, and an element is routed only if its source is readable and the context is
 * running (a suspended context would play the song as silence).
 */
export async function tapMediaElement(el: HTMLMediaElement): Promise<AnalyserNode | null> {
  const cached = elementTaps.get(el);
  if (cached) return cached;
  if (!isReadableAudioUrl(el.currentSrc || el.src)) return null;
  const ctx = audioContext();
  // A function, not an inline check: the state changes across the await.
  const running = () => ctx.state === 'running';
  if (!running()) {
    try { await ctx.resume(); } catch { /* stays suspended */ }
    if (!running()) return null;
  }
  const raced = elementTaps.get(el);
  if (raced) return raced;
  try {
    const source = ctx.createMediaElementSource(el);
    const analyser = createAnalyser(ctx);
    source.connect(ctx.destination);
    source.connect(analyser);
    elementTaps.set(el, analyser);
    return analyser;
  } catch {
    // Already owned by another context (a hot reload); leave it playing as it is.
    return null;
  }
}

/** Chromium on desktop is the only engine whose getDisplayMedia shares a tab's audio. */
export function tabAudioSupported(): boolean {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) return false;
  const ua = navigator.userAgent;
  if (/firefox|fxios/i.test(ua)) return false;
  // Safari exposes getDisplayMedia but never hands back an audio track.
  return !/^((?!chrome|chromium|crios|edg|android).)*safari/i.test(ua);
}

export interface TabAudioCapture {
  analyser: AnalyserNode;
  /** Ends on stop(), or when the viewer clicks the browser's own "Stop sharing". */
  track: MediaStreamTrack;
  stop: () => void;
}

/** The viewer shared the tab but left "Also share tab audio" unticked. */
export class NoTabAudioError extends Error {}

/**
 * Asks to share this tab with its audio and returns the audio track. Call it straight from
 * the click handler: getDisplayMedia needs transient user activation, so nothing may be
 * awaited before it.
 */
async function requestTabAudioTrack(): Promise<MediaStreamTrack> {
  // Chromium-only hints (not in every lib.dom version): offer just this tab, no system audio.
  const options: DisplayMediaStreamOptions & Record<string, unknown> = {
    video: true, // the API insists on video; the track is dropped as soon as it arrives
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'exclude',
    systemAudio: 'exclude',
    monitorTypeSurfaces: 'exclude',
  };
  const stream = await navigator.mediaDevices.getDisplayMedia(options);
  stream.getVideoTracks().forEach((t) => t.stop());
  const [track] = stream.getAudioTracks();
  if (!track) {
    stream.getTracks().forEach((t) => t.stop());
    throw new NoTabAudioError();
  }
  return track;
}

export async function captureTabAudio(): Promise<TabAudioCapture> {
  // Created inside the gesture, so it starts running.
  const ctx = audioContext();
  void ctx.resume();
  const track = await requestTabAudioTrack();
  const source = ctx.createMediaStreamSource(new MediaStream([track]));
  const analyser = createAnalyser(ctx);
  // Never to the destination: the tab already plays this audio, and it would echo.
  source.connect(analyser);
  return {
    analyser,
    track,
    stop: () => {
      source.disconnect();
      track.stop();
    },
  };
}

export interface TabRecording {
  /** Ends on stop()/abort(), or when the user clicks the browser's own "Stop sharing". */
  track: MediaStreamTrack;
  /** Ends the recording and resolves with everything captured so far. */
  stop: () => Promise<Blob>;
  /** Ends the recording and throws the audio away. */
  abort: () => void;
}

const RECORDING_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm'];

/** Records this tab's audio to a webm blob. Same gesture rules as captureTabAudio. */
export async function recordTabAudio(): Promise<TabRecording> {
  const track = await requestTabAudioTrack();
  const mimeType = RECORDING_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) {
    track.stop();
    throw new Error('tab recording is not supported by this browser');
  }
  // 64 kbps opus is plenty for speech recognition and keeps a 20-minute song far under the 25 MB cap.
  const recorder = new MediaRecorder(new MediaStream([track]), { mimeType, audioBitsPerSecond: 64_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(1000);

  return {
    track,
    stop: () => new Promise<Blob>((resolve) => {
      const finish = () => {
        track.stop();
        resolve(new Blob(chunks, { type: 'audio/webm' }));
      };
      // "Stop sharing" already ended the recorder: its last chunk has been delivered.
      if (recorder.state === 'inactive') { finish(); return; }
      recorder.onstop = finish;
      recorder.stop();
    }),
    abort: () => {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') recorder.stop();
      track.stop();
    },
  };
}
