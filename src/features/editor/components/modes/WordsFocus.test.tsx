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

describe('WordTimeline zoom', () => {
  it('gets a scrollbar once zoomed in, so every part of the line stays reachable', () => {
    renderTimeline();
    expect(screen.queryByRole('scrollbar')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'editor.words.zoomIn' }));
    const bar = screen.getByRole('scrollbar');
    fireEvent.keyDown(bar, { key: 'End' });
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
    fireEvent.keyDown(bar, { key: 'Home' });
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
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
