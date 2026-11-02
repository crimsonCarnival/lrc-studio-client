import { describe, it, expect } from 'vitest';
import { deepMerge } from './settings-merge';

describe('deepMerge', () => {
  const defaults = { playback: { showWaveform: true, volume: 1, speedPresets: [1, 2] }, theme: 'dark' };

  it('keeps a default where the server sent null for a field it never stored', () => {
    const remote = { playback: { showWaveform: null, volume: 0.5, speedPresets: null }, theme: null };
    expect(deepMerge(defaults, remote)).toEqual({ playback: { showWaveform: true, volume: 0.5, speedPresets: [1, 2] }, theme: 'dark' });
  });

  it('still applies a stored false, and replaces arrays whole', () => {
    expect(deepMerge(defaults, { playback: { showWaveform: false, speedPresets: [0.5] } }).playback)
      .toEqual({ showWaveform: false, volume: 1, speedPresets: [0.5] });
  });

  it('keeps the base for a null section, and takes a section the base lacks', () => {
    expect(deepMerge(defaults, { playback: null, extra: { a: 1 } })).toEqual({ ...defaults, extra: { a: 1 } });
  });
});
