import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@ui/tooltip';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import Editor from './Editor';
import type { EditorLine } from '@/features/editor/editor.types';
import { lineSpanEnd } from '@/features/editor/utils/line-span';

vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ settings: DEFAULT_SETTINGS, updateSetting: vi.fn(), updateSettings: vi.fn() }),
}));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: null }) }));
vi.mock('@/app/socket.client', () => ({ connectSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), connected: false }) }));
vi.mock('@/features/player/PlayerContext', () => ({
  usePlayer: () => ({
    source: 'local', isPlaying: false, currentTime: 0, duration: 239, playbackSpeed: 1,
    hasMedia: true, isSeeking: false, loop: { a: null, b: null }, loopA: null, loopB: null,
    local: {}, yt: {}, mediaUploads: [], cdnLoading: false, syncMode: true, viewerMode: false,
    speedPresets: [0.5, 1], MIN_SPEED: 0.25, MAX_SPEED: 2, lines: [], playbackPosition: 0,
    audioRef: { current: null }, detectedUrlType: '', fetchUploads: vi.fn(),
    mediaPopoverProps: {}, togglePlay: vi.fn(), seek: vi.fn(), applySpeed: vi.fn(),
    setLoop: vi.fn(), handleLoopChange: vi.fn(), clearLoop: vi.fn(), handleUrlLoad: vi.fn(),
    handleSelectUpload: vi.fn(), handleClearMedia: vi.fn(), failedAudioUrl: null,
    retryAudio: vi.fn(), setLoopActiveLine: vi.fn(),
  }),
}));

// Words focus through the real Editor: the previous line's last word is held over the focused
// line, and the focused line's last word is held over the next one (overlapping lines).
const mk = (text: string, times: number[], end?: number): EditorLine => ({
  id: text, text, timestamp: times[0],
  words: text.split(' ').map((w, i, a) => ({ word: w, time: times[i], ...(i === a.length - 1 && end ? { end } : {}) })),
});
let latest: EditorLine[] = [];
function Harness() {
  const [lines, setLines] = useState<EditorLine[]>([
    mk('a b', [10, 11]),
    mk('c d', [20, 21], 24.4),
    mk('e f', [24, 25], 26.5),
    mk('g h', [26, 27]),
    mk('i j', [30, 31]),
  ]);
  const [active, setActive] = useState(2);
  useEffect(() => { latest = lines; });
  return (
    <MemoryRouter><TooltipProvider>
      <Editor lines={lines} setLines={setLines} syncMode setSyncMode={vi.fn()} activeLineIndex={active} setActiveLineIndex={setActive}
        playbackPosition={22} duration={239} playerRef={{ current: null }} undo={vi.fn()} redo={vi.fn()} canUndo={false} canRedo={false} clearHistory={vi.fn()}
        editorMode="words" setEditorMode={vi.fn()} hasMedia handleRemoveAllLyrics={vi.fn()} onNewProject={vi.fn()} />
    </TooltipProvider></MemoryRouter>
  );
}
const starts = (ls: EditorLine[]) => ls.map((l) => ({ ts: l.timestamp, times: l.words!.map((w) => w.time) }));
// Where each line stops sounding: its own end, or up to the next line when it has none.
const ends = (ls: EditorLine[]) => ls.map((_, i) => lineSpanEnd(ls, i, 239));

describe('words focus: one handle changes one line', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = () => {};
    window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
    const sizes = { clientHeight: 600, clientWidth: 1200, offsetHeight: 56, offsetWidth: 1200, scrollHeight: 4000 };
    (Object.keys(sizes) as (keyof typeof sizes)[]).forEach((p) => Object.defineProperty(HTMLElement.prototype, p, { configurable: true, get: () => sizes[p] }));
  });
  afterEach(() => cleanup());

  const handleCount = () => { render(<Harness />); const n = screen.getAllByRole('slider').length; cleanup(); return n; };

  it('moving an end never moves a start, and moving a start never moves an end', { timeout: 60_000 }, () => {
    const count = handleCount();
    // Word handles of the focused line and of the lines on either side, and the lines lane's.
    expect(count).toBeGreaterThanOrEqual(16);
    for (let k = 0; k < count; k++) {
      for (const key of ['ArrowRight', 'ArrowLeft']) {
        render(<Harness />);
        const before = [...latest];
        const handle = screen.getAllByRole('slider')[k];
        const label = handle.getAttribute('aria-label') ?? '';
        const isStart = /start|inicio/i.test(label);
        fireEvent.keyDown(handle, { key });
        const where = `${label} ${key}`;
        if (isStart) {
          // Only the line it belongs to starts anywhere else, and no line stops anywhere else:
          // the end of the line before stays where it was.
          expect(ends(latest), where).toEqual(ends(before));
          const moved = starts(latest).filter((s, i) => JSON.stringify(s) !== JSON.stringify(starts(before)[i]));
          expect(moved.length, where).toBeLessThanOrEqual(1);
        } else {
          expect(starts(latest), where).toEqual(starts(before));
          const stopped = ends(latest).filter((e, i) => e !== ends(before)[i]);
          expect(stopped.length, where).toBeLessThanOrEqual(1);
        }
        cleanup();
      }
    }
  });

  it('moving a word\'s start leaves the word before where it stops: a pause, or an overlap', () => {
    for (const [key, to] of [['ArrowRight', 25.05], ['ArrowLeft', 24.95]] as const) {
      render(<Harness />);
      fireEvent.keyDown(screen.getByRole('slider', { name: /Start of “f”|Inicio de «f»/ }), { key });
      const [e, f] = latest[2].words!;
      // "e" ran up to "f" (25); it now has that end of its own and "f" moved alone.
      expect(e).toMatchObject({ time: 24, end: 25 });
      expect(f.time).toBe(to);
      cleanup();
    }
  });

  it('dragging a word by its block moves the whole word and keeps its length', () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByRole('button', { name: /^(Play|Reproducir) [“«]e[”»]/ }), { key: 'ArrowLeft' });
    const [e, f] = latest[2].words!;
    expect(e.time).toBe(23.95);
    expect(e.end).toBe(24.95);
    expect(f.time).toBe(25);
    expect(latest[2].timestamp).toBe(23.95);
  });

  it('dragging the end of a line in the lines lane changes only that line\'s last word', () => {
    render(<Harness />);
    const before = [...latest];
    const ends = screen.getAllByRole('slider', { name: /End of line|Fin de la línea/ });
    fireEvent.keyDown(ends[1], { key: 'ArrowLeft' });
    expect(starts(latest)).toEqual(starts(before));
    expect(latest.filter((l, i) => JSON.stringify(l) !== JSON.stringify(before[i]))).toHaveLength(1);
  });
});
