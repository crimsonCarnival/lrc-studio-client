import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EditorPage from './EditorPage';

// Only the layout choice is under test here; the editor itself is covered elsewhere.
vi.mock('./core/Editor', () => ({
  default: ({ phone }: { phone?: boolean }) => <div data-testid="editor" data-layout={phone ? 'phone' : 'desktop'} />,
}));

/** A viewport `width` px wide, with a touch screen (coarse pointer, no hover) or a mouse. */
function emulate({ width, touch }: { width: number; touch: boolean }) {
  window.matchMedia = vi.fn((query: string) => {
    let matches = false;
    const minWidth = /min-width:\s*([\d.]+)(rem|px)/.exec(query);
    if (minWidth) matches = width >= parseFloat(minWidth[1]) * (minWidth[2] === 'rem' ? 16 : 1);
    else if (query.includes('pointer: coarse')) matches = touch;
    else if (query.includes('hover: hover')) matches = !touch;
    return {
      matches, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  });
}

const originalMatchMedia = window.matchMedia;
afterEach(() => { window.matchMedia = originalMatchMedia; });

describe('EditorPage layout choice', () => {
  it('gives a touch tablet at lg or wider the desktop editor', () => {
    emulate({ width: 1180, touch: true });
    render(<EditorPage editorMode="lrc" />);
    expect(screen.getByTestId('editor').dataset.layout).toBe('desktop');
  });

  it('gives a narrow window with a mouse the phone editor', () => {
    emulate({ width: 600, touch: false });
    render(<EditorPage editorMode="lrc" />);
    expect(screen.getByTestId('editor').dataset.layout).toBe('phone');
  });

  it('gives a phone the phone editor in SRT mode too', () => {
    emulate({ width: 360, touch: true });
    render(<EditorPage editorMode="srt" />);
    expect(screen.getByTestId('editor').dataset.layout).toBe('phone');
  });

  it('keeps the wide desktop editor for a mouse at lg or wider', () => {
    emulate({ width: 1440, touch: false });
    render(<EditorPage editorMode="lrc" />);
    expect(screen.getByTestId('editor').dataset.layout).toBe('desktop');
  });

  it('gives a phone the phone editor in Words mode, and the desktop one at lg', () => {
    emulate({ width: 360, touch: true });
    const { unmount } = render(<EditorPage editorMode="words" />);
    expect(screen.getByTestId('editor').dataset.layout).toBe('phone');
    unmount();
    emulate({ width: 1280, touch: false });
    render(<EditorPage editorMode="words" />);
    expect(screen.getByTestId('editor').dataset.layout).toBe('desktop');
  });
});
