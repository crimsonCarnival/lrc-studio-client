import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { usePlayer } from '@features/player/PlayerContext';
import { useVisualizer } from '../visualizer-context';
import { startVisualizer } from '../visualizer-presets';
import { buildBeatTimes, fftToBands, fillSimulated, simulatedEnergy, timeDomainToWave } from '../visualizer-signal';

type BeatLines = Parameters<typeof buildBeatTimes>[0];

// Dims the band where the active lyric line sits (upper-middle of the stage) so a preset's
// busiest detail reads above and below the text instead of through it. Only alpha matters
// in a mask, so these are not theme colours.
const LYRIC_ZONE_MASK = 'linear-gradient(to bottom, black 0%, black 14%, rgb(0 0 0 / 0.35) 30%, rgb(0 0 0 / 0.35) 58%, black 78%, black 100%)';
const MASK_STYLE = { maskImage: LYRIC_ZONE_MASK, WebkitMaskImage: LYRIC_ZONE_MASK };

/**
 * The chosen visualizer, filling its positioned parent behind the lyrics. Real samples when
 * the provider has an analyser; otherwise a stand-in that pulses on the lyric timestamps.
 */
export function AudioVisualizerCanvas({ lines }: { lines: BeatLines }) {
  const { kind, getAnalyser, bloom } = useVisualizer();
  const { currentTime, isPlaying } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beats = useMemo(() => buildBeatTimes(lines), [lines]);

  // The loop reads the clock per frame, so a tick does not restart it.
  const clockRef = useRef({ time: currentTime, playing: isPlaying, beats });
  useLayoutEffect(() => { clockRef.current = { time: currentTime, playing: isPlaying, beats }; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (kind === 'off' || !canvas) return;
    let fft: Uint8Array<ArrayBuffer> | null = null;
    let samples: Uint8Array<ArrayBuffer> | null = null;
    return startVisualizer(canvas, kind, (bands, wave, clock) => {
      const { time, playing, beats: beatTimes } = clockRef.current;
      const analyser = getAnalyser();
      if (!analyser) {
        fillSimulated(bands, wave, clock, playing ? simulatedEnergy(beatTimes, time) : 0);
        return playing;
      }
      if (fft?.length !== analyser.frequencyBinCount || !samples) {
        fft = new Uint8Array(analyser.frequencyBinCount);
        samples = new Uint8Array(analyser.fftSize);
      }
      analyser.getByteFrequencyData(fft);
      analyser.getByteTimeDomainData(samples);
      fftToBands(fft, analyser.context.sampleRate, bands);
      timeDomainToWave(samples, wave);
      return playing;
    }, { bloom });
  }, [kind, getAnalyser, bloom]);

  if (kind === 'off') return null;
  return (
    <canvas
      key={kind}
      ref={canvasRef}
      aria-hidden="true"
      style={MASK_STYLE}
      className="pointer-events-none absolute inset-0 size-full opacity-55 animate-in fade-in duration-700"
    />
  );
}
