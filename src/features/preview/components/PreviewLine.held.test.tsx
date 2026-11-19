import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TooltipProvider } from '@ui/tooltip';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import PreviewLine from './PreviewLine';

vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ settings: DEFAULT_SETTINGS, updateSetting: vi.fn(), updateSettings: vi.fn() }),
}));

// "way" is held until 25.04 although the next line starts at 24.42.
const line = {
  id: 'a',
  text: 'my way',
  timestamp: 23.33,
  words: [{ word: 'my', time: 23.33 }, { word: 'way', time: 23.8, end: 25.04 }],
};
const sizes = { small: '', medium: '', large: '' };

function renderLine(playbackPosition: number | null, words = line.words) {
  const { container } = render(
    <TooltipProvider>
      <PreviewLine
        line={{ ...line, words }}
        originalIndex={0}
        displayedActiveIndex={1}
        lockedLineIndex={-1}
        isDualLine={false}
        displayLines={[]}
        playbackPosition={playbackPosition}
        nextTimestamp={24.42}
        handleLineClick={() => {}}
        handleLineHover={() => {}}
        handleLineHoverEnd={() => {}}
        sizeOption="medium"
        spacingOption="medium"
        activeSecondarySizes={sizes}
        inactiveSecondarySizes={sizes}
        activeFontSizes={sizes}
        inactiveFontSizes={sizes}
        activeMargin={sizes}
        editorMode="words"
        wordHighlight
      />
    </TooltipProvider>,
  );
  // A fill fading out after the held word ended is still mounted, at opacity 0: count the shown ones.
  return [...container.querySelectorAll<HTMLElement>('.karaoke-fill-glow')].filter((el) => el.style.opacity !== '0').length;
}

describe('PreviewLine with a last word held over the next line', () => {
  it('goes on filling the held word after the next line has started', () => {
    expect(renderLine(24.7)).toBeGreaterThan(0);
  });

  it('stops once the held word has ended', () => {
    expect(renderLine(25.2)).toBe(0);
  });

  it('fades the held line out instead of dropping its fill at once', () => {
    renderLine(25.2);
    const fills = [...document.querySelectorAll<HTMLElement>('.karaoke-fill-glow')];
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.every((el) => el.style.opacity === '0' && el.style.transition.includes('opacity'))).toBe(true);
  });

  it('leaves a line that ends where the next one starts alone', () => {
    expect(renderLine(24.7, [{ word: 'my', time: 23.33 }, { word: 'way', time: 23.8 }])).toBe(0);
  });
});
