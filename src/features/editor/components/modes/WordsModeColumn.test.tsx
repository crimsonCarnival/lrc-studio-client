import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TooltipProvider } from '@ui/tooltip';
import { WordsModeChips, type WordsModeColumnProps } from './WordsModeColumn';

// A Japanese line whose two layers tokenize to the same number of words, which is
// what lets one chip carry both.
const line = {
  text: 'We are fighting dreamers 高みを目指して',
  secondary: 'we are fighting dreamers takami wo mezashite',
  words: [
    { word: 'We', time: 8.51 },
    { word: 'are', time: 8.93 },
    { word: 'fighting', time: 9.31 },
    { word: 'dreamers', time: 9.88 },
    { word: '高み', time: 10.64 },
    { word: 'を', time: 11.02 },
    { word: '目指して', time: null },
  ],
  secondaryWords: [
    { word: 'we', time: null },
    { word: 'are', time: null },
    { word: 'fighting', time: null },
    { word: 'dreamers', time: null },
    { word: 'takami', time: null },
    { word: 'wo', time: null },
    { word: 'mezashite', time: null },
  ],
};

function renderChips(stampTarget: string) {
  const props = {
    line,
    lineIndex: 0,
    isSynced: true,
    isActive: true,
    isMobile: false,
    settings: {},
    editingTimestamp: null,
    setEditingTimestamp: () => {},
    focusedTimestamp: null,
    setFocusedTimestamp: () => {},
    stampTarget,
    activeWordIndex: 0,
    handleSetTimestamp: () => {},
    handleTimestampWheel: () => {},
    nudgeIndicator: null,
    handleWordClick: () => {},
    handleClearWordTimestamp: () => {},
  } as unknown as WordsModeColumnProps;
  return render(
    <TooltipProvider>
      <WordsModeChips {...props} />
    </TooltipProvider>
  );
}

/** Every element the component sized explicitly, in document order. */
function sizedChips(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[style*="width"]')]
    .filter((el) => el.style.width.endsWith('px'))
    .map((el) => ({
      width: parseFloat(el.style.width),
      height: parseFloat(el.style.height),
    }));
}

describe('WordsModeChips — redesigned chip geometry', () => {
  it('sizes every chip on the 32px grid with a 64px floor', () => {
    const { container } = renderChips('both');
    const chips = sizedChips(container);
    expect(chips).toHaveLength(line.words.length);
    for (const { width } of chips) {
      expect(width % 32).toBe(0);
      expect(width).toBeGreaterThanOrEqual(64);
    }
  });

  it('gives the same word the same width regardless of which layer is marked', () => {
    const main = sizedChips(renderChips('main').container).map((c) => c.width);
    const secondary = sizedChips(renderChips('secondary').container).map((c) => c.width);
    const both = sizedChips(renderChips('both').container).map((c) => c.width);
    expect(secondary).toEqual(main);
    expect(both).toEqual(main);
  });

  it('keeps chip height constant across layers, so the row never shifts', () => {
    const heights = ['main', 'secondary', 'both'].map((target) => {
      const chips = sizedChips(renderChips(target).container);
      return [...new Set(chips.map((c) => c.height))];
    });
    // One height within each layer, and the same height across all three.
    for (const set of heights) expect(set).toHaveLength(1);
    expect(new Set(heights.map((h) => h[0])).size).toBe(1);
  });

  it('renders a time slot on every chip, marked or not', () => {
    const { container } = renderChips('both');
    // The last word has no timestamp but must still show the empty slot, so the
    // chip does not change height when it gets marked.
    expect(container.textContent).toContain('--:--');
  });

  it('renders one chip per word rather than a separate row per layer', () => {
    // The old build swapped a box row for a pill row; both layers now live in the
    // same seven chips.
    expect(sizedChips(renderChips('secondary').container)).toHaveLength(7);
  });
});
