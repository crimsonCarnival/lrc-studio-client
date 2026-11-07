import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@ui/tooltip';
import PhoneFocusView from './PhoneFocusView';
import { focusLines } from './focus-lines';
import type { EditorLine } from '@/features/editor/editor.types';

vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ settings: {}, updateSetting: vi.fn() }),
}));
vi.mock('@/features/player/PlayerContext', () => ({
  usePlayer: () => ({
    hasMedia: true, isPlaying: false, currentTime: 65.4, duration: 180, playbackSpeed: 1,
    loopA: null, loopB: null, lines: [], viewerMode: false, togglePlay: vi.fn(), seek: vi.fn(),
    applySpeed: vi.fn(), setLoop: vi.fn(), clearLoop: vi.fn(), MIN_SPEED: 0.25, MAX_SPEED: 2, speedPresets: [1],
  }),
}));

const down = { isPrimary: true, button: 0, pointerType: 'touch' };

function setup(over: Partial<React.ComponentProps<typeof PhoneFocusView>> = {}) {
  const props = {
    previous: 'Line one', current: 'Line two', next: 'Line three',
    onMark: vi.fn(), onUndo: vi.fn(), canUndo: true, label: 'Mark line 2', disabled: false, onClose: vi.fn(),
    ...over,
  };
  render(<TooltipProvider><PhoneFocusView {...props} /></TooltipProvider>);
  return { props, stamp: screen.getByRole('button', { name: 'Mark line 2' }) };
}

describe('PhoneFocusView', () => {
  it('shows the previous, current and next line and the running time', () => {
    setup();
    expect(screen.getByText('Line one')).toBeInTheDocument();
    expect(screen.getByText('Line two')).toBeInTheDocument();
    expect(screen.getByText('Line three')).toBeInTheDocument();
    expect(screen.getAllByText('01:05.40').length).toBeGreaterThan(0);
  });

  it('stamps once on pointerdown and swallows the trailing click', () => {
    const { props, stamp } = setup();
    fireEvent.pointerDown(stamp, down);
    fireEvent.click(stamp, { detail: 1 });
    expect(props.onMark).toHaveBeenCalledTimes(1);
  });

  it('a rapid double tap stamps twice', () => {
    const { props, stamp } = setup();
    fireEvent.pointerDown(stamp, down);
    fireEvent.click(stamp, { detail: 1 });
    fireEvent.pointerDown(stamp, down);
    fireEvent.click(stamp, { detail: 2 });
    expect(props.onMark).toHaveBeenCalledTimes(2);
  });

  it('does not stamp from the other controls or from a disabled area', () => {
    const { props } = setup({ disabled: true });
    fireEvent.pointerDown(screen.getByRole('button', { name: /undo/i }), down);
    fireEvent.click(screen.getByRole('button', { name: /undo/i }), { detail: 1 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Back to list' }), down);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Mark line 2' }), down);
    expect(props.onMark).not.toHaveBeenCalled();
    expect(props.onUndo).toHaveBeenCalledTimes(1);
  });

  it('a keyboard click marks, and a second finger does not', () => {
    const { props, stamp } = setup();
    fireEvent.click(stamp, { detail: 0 });
    expect(props.onMark).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(stamp, { ...down, isPrimary: false });
    expect(props.onMark).toHaveBeenCalledTimes(1);
  });

  it('Back to list calls onClose', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Back to list' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('turns off double-tap zoom and the touch callout on the stamp area', () => {
    const { stamp } = setup();
    expect(stamp.className).toContain('touch-none');
    expect(stamp.className).toContain('select-none');
    expect(stamp.className).toContain('-webkit-touch-callout:none');
  });
});

describe('focusLines', () => {
  const lines = [
    { id: 'a', text: 'One' },
    { id: 's', type: 'section', label: 'Verse' },
    { id: 'b', text: 'Two' },
    { id: 'c', text: 'Three' },
  ] as EditorLine[];

  it('skips section markers on both sides', () => {
    expect(focusLines(lines, 2)).toEqual({ previous: 'One', current: 'Two', next: 'Three' });
  });
  it('moves a cursor resting on a marker to the next lyric', () => {
    expect(focusLines(lines, 1)).toEqual({ previous: 'One', current: 'Two', next: 'Three' });
  });
  it('has no previous at the start and no current past the end', () => {
    expect(focusLines(lines, 0)).toEqual({ previous: null, current: 'One', next: 'Two' });
    expect(focusLines(lines, 4)).toEqual({ previous: 'Three', current: null, next: null });
  });
});
