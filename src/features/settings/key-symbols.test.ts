import { describe, expect, it } from 'vitest';
import { shortcutParts } from './key-symbols';

describe('shortcutParts', () => {
  it('splits a combo and maps named keys to their symbols', () => {
    expect(shortcutParts('Shift+ArrowLeft')).toEqual(['⇧ Shift', '←']);
    expect(shortcutParts('Ctrl+m')).toEqual(['Ctrl', 'm']);
  });

  it('keeps a single key as one cap', () => {
    expect(shortcutParts('v')).toEqual(['v']);
    expect(shortcutParts('Space')).toEqual([' ␣ ']);
  });

  it('treats a lone or trailing plus as the plus key', () => {
    expect(shortcutParts('+')).toEqual(['+']);
    expect(shortcutParts('Ctrl++')).toEqual(['Ctrl', '+']);
  });
});
