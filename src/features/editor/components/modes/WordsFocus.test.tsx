import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@ui/tooltip';
import { WordTimeline, WordsLineNav } from './WordsFocus';
import { TapPad } from './TapPad';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o?.word ? `${k}:${o.word}` : k) }),
  Trans: () => null,
}));
vi.mock('@/features/settings/useSettings', () => ({ useSettings: () => ({ settings: {} }) }));

const line = {
  id: 'l1',
  text: 'fighting dreamers 高みを目指して',
  timestamp: 8.88,
  words: [
    { word: 'fighting', time: 9.42 },
    { word: 'dreamers', time: 10.33, end: 10.98 },
    { word: '高み', time: 11.12, reading: 'たか' },
    { word: 'を', time: 11.93 },
    { word: '目指して', time: null, reading: 'めざ' },
  ],
};

function renderTimeline(overrides: Record<string, unknown> = {}) {
  const props = {
    line,
    lineEnd: 13.04,
    playbackPosition: 0,
    isPlaying: false,
    activeWordIndex: 4,
    selectedWordIndex: null,
    playingWordIndex: null,
    onSetWordTime: vi.fn(),
    onSetWordEnd: vi.fn(),
    onSelectWord: vi.fn(),
    markKey: 'Enter',
    wordMenu: (i: number) => <div>menu for {i}</div>,
    ...overrides,
  };
  render(<TooltipProvider><WordTimeline {...props} /></TooltipProvider>);
  return props;
}

describe('WordTimeline', () => {
  it('shows each word once, with its furigana over the kanji only', () => {
    renderTimeline();
    const kanji = screen.getAllByText('目指', { selector: 'ruby' });
    expect(kanji).toHaveLength(1);
    expect(kanji[0].querySelector('rt')?.textContent).toBe('めざ');
    expect(screen.getAllByText('dreamers')).toHaveLength(1);
  });

  it('picks a word on click and offers its menu from the ⋮ button', async () => {
    const props = renderTimeline();
    fireEvent.click(screen.getByText('dreamers'));
    expect(props.onSelectWord).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'editor.words.wordActions:dreamers' }));
    expect(await screen.findByText('menu for 1')).toBeTruthy();
  });

  it('draws the pause after a word that ends before the next one', () => {
    renderTimeline();
    expect(screen.getByRole('slider', { name: 'editor.words.endLabel:dreamers' }).getAttribute('aria-valuenow')).toBe('10.98');
  });

  it('nudges a word end with the arrow keys', () => {
    const props = renderTimeline();
    const end = screen.getByRole('slider', { name: 'editor.words.endLabel:dreamers' });
    fireEvent.keyDown(end, { key: 'ArrowRight', shiftKey: true });
    expect(props.onSetWordEnd).toHaveBeenLastCalledWith(1, 10.99);
  });

  it('joins a word back up with the next one once its end is pushed onto it', () => {
    const words = line.words.map((w, i) => (i === 1 ? { ...w, end: 11.09 } : w));
    const props = renderTimeline({ line: { ...line, words } });
    fireEvent.keyDown(screen.getByRole('slider', { name: 'editor.words.endLabel:dreamers' }), { key: 'ArrowRight' });
    expect(props.onSetWordEnd).toHaveBeenLastCalledWith(1, null);
  });
});

describe('WordTimeline scrolling', () => {
  it('always has a song-wide scrollbar, so the lines around this one stay reachable', () => {
    renderTimeline({ duration: 60 });
    const bar = screen.getByRole('scrollbar');
    fireEvent.keyDown(bar, { key: 'End' });
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
    fireEvent.keyDown(bar, { key: 'Home' });
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
  });

  it('zooms in and goes back to fitting the line', () => {
    renderTimeline({ duration: 60 });
    const fit = screen.getByRole('button', { name: 'editor.words.zoomFit' });
    expect(fit.textContent).toBe('100%');
    fireEvent.click(screen.getByRole('button', { name: 'editor.words.zoomIn' }));
    expect(fit.textContent).toBe('150%');
    fireEvent.click(fit);
    expect(fit.textContent).toBe('100%');
  });
});

describe('WordTimeline overlap with the next line', () => {
  const sung = { ...line, words: line.words.map((w, i) => (i === 4 ? { ...w, time: 12.4 } : w)) };
  const next = { id: 'l2', text: 'right here', timestamp: 13.04, words: [{ word: 'right', time: 13.04 }, { word: 'here', time: 13.5 }] };
  const around = {
    duration: 60,
    naturalEnd: 13.04,
    lineIndex: 0,
    nextLine: { index: 1, number: 2, line: next, end: 14.2 },
    bands: [
      { index: 0, number: 1, text: sung.text, from: 8.88, to: 13.04, lane: 0 as const },
      { index: 1, number: 2, text: next.text, from: 13.04, to: 14.2, lane: 0 as const },
    ],
  };

  it('lets the last word run on past the start of the next line', () => {
    const props = renderTimeline({ line: sung, ...around });
    const end = screen.getByRole('slider', { name: 'editor.words.endLabel:目指して' });
    expect(end.getAttribute('aria-valuenow')).toBe('13.04');
    fireEvent.keyDown(end, { key: 'ArrowRight' });
    expect(props.onSetWordEnd).toHaveBeenLastCalledWith(4, 13.09);
  });

  it('shows the overlap, and drops it once the end is back on the next line', () => {
    const held = { ...sung, words: sung.words.map((w, i) => (i === 4 ? { ...w, end: 13.05 } : w)) };
    const props = renderTimeline({ line: held, lineEnd: 13.05, ...around });
    expect(document.querySelector('[data-overlap]')).toBeTruthy();
    const end = screen.getByRole('slider', { name: 'editor.words.endLabel:目指して' });
    expect(end.getAttribute('aria-valuenow')).toBe('13.05');
    fireEvent.keyDown(end, { key: 'ArrowLeft', shiftKey: true });
    expect(props.onSetWordEnd).toHaveBeenLastCalledWith(4, null);
  });

  it('keeps a word in the middle of the line inside it', () => {
    const props = renderTimeline({ line: sung, ...around });
    fireEvent.keyDown(screen.getByRole('slider', { name: 'editor.words.endLabel:を' }), { key: 'ArrowRight' });
    expect(props.onSetWordEnd).not.toHaveBeenCalled();
  });

  it('draws the next line under the words and gives it the focus on click', () => {
    const onSelectLine = vi.fn();
    renderTimeline({ line: sung, ...around, onSelectLine });
    expect(document.querySelector('[data-ghost="next"]')?.textContent).toContain('right here');
    fireEvent.click(screen.getAllByRole('button', { name: 'editor.words.goToLine' })[1]);
    expect(onSelectLine).toHaveBeenCalledWith(1);
  });

  it('ends the previous line from its row while it still sounds', () => {
    const onEndPrevious = vi.fn();
    const before = { id: 'l0', text: 'my way', timestamp: 6, words: [{ word: 'my', time: 6 }, { word: 'way', time: 7, end: 9.3 }] };
    renderTimeline({ line: sung, ...around, prevLine: { index: 5, number: 9, line: before, end: 9.3 }, onEndPrevious });
    fireEvent.click(screen.getByRole('button', { name: 'editor.words.endPrevious' }));
    expect(onEndPrevious).toHaveBeenCalledTimes(1);
  });
});

describe('WordsLineNav', () => {
  Element.prototype.scrollIntoView ??= () => {};
  it('shows the furigana of a line that has readings', () => {
    render(<TooltipProvider><WordsLineNav lines={[line]} activeLineIndex={0} onSelect={() => {}} /></TooltipProvider>);
    expect(screen.getByText('高', { selector: 'ruby' }).querySelector('rt')?.textContent).toBe('たか');
  });
});

describe('TapPad', () => {
  it('stamps on click without taking the keyboard focus', () => {
    const onMark = vi.fn();
    render(<TooltipProvider><TapPad line={line} activeWordIndex={4} markKey="Enter" onMark={onMark} /></TooltipProvider>);
    const pad = screen.getByRole('button');
    const down = fireEvent.mouseDown(pad);
    // The default (focusing the button) is prevented, so Enter or Space can't press it a second time.
    expect(down).toBe(false);
    fireEvent.click(pad);
    expect(onMark).toHaveBeenCalledTimes(1);
    expect(pad.textContent).toContain('目指');
    expect(pad.textContent).toContain('5/5');
  });
});
