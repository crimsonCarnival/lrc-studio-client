import { describe, it, expect } from 'vitest';
import { deepMerge, pushSettingsChanges } from './settings-merge';

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

describe('pushSettingsChanges', () => {
  const rejection = (field: string) => Object.assign(new Error('bad input'), {
    graphqlErrors: [{ message: `Variable "$input" got invalid value; Field "${field}" is not defined by type "InterfaceSettingsInput".` }],
  });

  it('takes the whole current state as the snapshot when the batch succeeds', async () => {
    const current = { interface: { theme: 'light', fontSize: 'large' } };
    const result = await pushSettingsChanges({ interface: { theme: 'light' } }, current, {}, async () => {});
    expect(result).toEqual({ snapshot: current, failed: [] });
  });

  it('still saves the good keys when the server rejects one key in the batch', async () => {
    const sent: unknown[] = [];
    const send = async (input: Record<string, unknown>) => {
      sent.push(input);
      if (JSON.stringify(input).includes('bogus')) throw rejection('bogus');
    };
    const current = { interface: { theme: 'light', bogus: 1, fontSize: 'large' } };
    const snapshot = { interface: { theme: 'dark', fontSize: 'large' } };
    const result = await pushSettingsChanges({ interface: { theme: 'light', bogus: 1 } }, current, snapshot, send);
    expect(result.failed).toEqual(['interface.bogus']);
    expect(result.snapshot).toEqual({ interface: { theme: 'light', fontSize: 'large' } });
    expect(sent).toHaveLength(3); // the batch, then one request per key
  });

  it('does not split the batch for failures that are not input rejections', async () => {
    let calls = 0;
    const send = async () => { calls++; throw new TypeError('Failed to fetch'); };
    const snapshot = { interface: { theme: 'dark' } };
    const result = await pushSettingsChanges({ interface: { theme: 'light', fontSize: 'large' } }, {}, snapshot, send);
    expect(calls).toBe(1);
    expect(result).toEqual({ snapshot, failed: ['interface.theme', 'interface.fontSize'] });
  });
});
