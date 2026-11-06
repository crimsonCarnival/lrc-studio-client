import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@ui/tooltip';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import Editor from '../core/Editor';
import type { EditorLine } from '@/features/editor/editor.types';
import type { CollabLockInput } from '@/features/collab/collab.types';

// The phone layout renders inside the real Editor, so marking runs through the real
// useEditor.handleMark. Only the player and settings are stubbed.
let mockSettings: typeof DEFAULT_SETTINGS = DEFAULT_SETTINGS;
vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ settings: mockSettings, updateSetting: vi.fn(), updateSettings: vi.fn() }),
}));

vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: null }) }));
vi.mock('@/app/socket.client', () => ({ connectSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), connected: false }) }));

vi.mock('@/features/player/PlayerContext', () => ({
  usePlayer: () => ({
    source: 'local', isPlaying: false, currentTime: 0, duration: 180, playbackSpeed: 1,
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

function withEditor(settings: Record<string, unknown>) {
  return { ...DEFAULT_SETTINGS, editor: { ...DEFAULT_SETTINGS.editor, ...settings } } as typeof DEFAULT_SETTINGS;
}

function makeLines(count: number): EditorLine[] {
  return Array.from({ length: count }, (_, i) => ({ id: `l${i}`, text: `Line ${i + 1}`, timestamp: null }));
}

type HarnessProps = {
  initialLines: EditorLine[];
  editorMode?: string;
  playbackPosition?: number;
  collab?: CollabLockInput;
  activeLineIndex?: number;
};

let latest: { lines: EditorLine[]; activeLineIndex: number } = { lines: [], activeLineIndex: 0 };

function Harness({ initialLines, editorMode = 'lrc', playbackPosition = 12.5, collab, activeLineIndex: controlledIndex }: HarnessProps) {
  const [lines, setLines] = useState(initialLines);
  const [activeLineIndex, setActiveLineIndex] = useState(controlledIndex ?? 0);
  const [mode, setMode] = useState(editorMode);
  const index = controlledIndex ?? activeLineIndex;
  useEffect(() => { latest = { lines, activeLineIndex: index }; });
  return (
    <MemoryRouter>
      <TooltipProvider>
        <Editor
          phone
          lines={lines}
          setLines={setLines}
          syncMode
          setSyncMode={vi.fn()}
          activeLineIndex={index}
          setActiveLineIndex={setActiveLineIndex}
          playbackPosition={playbackPosition}
          playerRef={{ current: null }}
          undo={vi.fn()}
          redo={vi.fn()}
          canUndo={false}
          canRedo={false}
          clearHistory={vi.fn()}
          editorMode={mode}
          setEditorMode={setMode}
          handleRemoveAllLyrics={vi.fn()}
          onNewProject={vi.fn()}
          collab={collab}
          mediaTitle="Song"
        />
      </TooltipProvider>
    </MemoryRouter>
  );
}

function tapMark(name: RegExp) {
  const mark = screen.getByRole('button', { name });
  fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
  fireEvent.click(mark, { detail: 1 });
}

const originalScrollTo = Element.prototype.scrollTo;
beforeEach(() => { mockSettings = DEFAULT_SETTINGS; });
afterEach(() => { Element.prototype.scrollTo = originalScrollTo; });

describe('Phone editor marking (shared handleMark)', () => {
  it('stamps the cursor line and advances by default', () => {
    render(<Harness initialLines={makeLines(3)} />);
    tapMark(/mark line 1/i);
    expect(latest.lines[0].timestamp).toBe(12.5);
    expect(latest.activeLineIndex).toBe(1);
    expect(screen.getByRole('button', { name: /mark line 2/i })).toBeInTheDocument();
  });

  it('keeps the cursor on the line when auto-advance is off (stay on the same line)', () => {
    mockSettings = withEditor({ autoAdvance: { enabled: false, skipBlank: false, mode: 'next' } });
    render(<Harness initialLines={makeLines(3)} />);
    tapMark(/mark line 1/i);
    expect(latest.lines[0].timestamp).toBe(12.5);
    expect(latest.activeLineIndex).toBe(0);
  });

  it('in SRT mode the second mark sets the end time', () => {
    const { rerender } = render(<Harness initialLines={makeLines(3)} editorMode="srt" playbackPosition={10} />);
    tapMark(/mark line 1/i);
    expect(latest.lines[0].timestamp).toBe(10);
    // The button now asks for the end of the same line.
    rerender(<Harness initialLines={makeLines(3)} editorMode="srt" playbackPosition={13} />);
    tapMark(/mark end of line 1/i);
    expect(latest.lines[0].endTime).toBe(13);
  });

  it('shows no Mark control to a session viewer', () => {
    const collab = {
      provider: null,
      me: { subject: 'u', name: 'V', colorIndex: 0, role: 'viewer', conn: 'c', clientId: 1 },
      locks: {},
    } as unknown as CollabLockInput;
    render(<Harness initialLines={makeLines(3)} collab={collab} />);
    expect(screen.queryByRole('button', { name: /mark line/i })).toBeNull();
  });
});

describe('Phone editor lyric list', () => {
  // jsdom has no layout: give the scroller a phone-sized viewport and each row a height,
  // which is what the virtualizer reads (clientHeight for the viewport, offsetHeight per row,
  // scrollHeight to clamp a scroll).
  const props = ['clientHeight', 'clientWidth', 'offsetHeight', 'offsetWidth', 'scrollHeight'] as const;
  const sizes = { clientHeight: 600, clientWidth: 360, offsetHeight: 56, offsetWidth: 360, scrollHeight: 40000 };
  const saved = props.map((p) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, p));
  beforeEach(() => {
    props.forEach((p) => Object.defineProperty(HTMLElement.prototype, p, { configurable: true, get: () => sizes[p] }));
  });
  afterEach(() => {
    props.forEach((p, i) => { const d = saved[i]; if (d) Object.defineProperty(HTMLElement.prototype, p, d); });
  });

  it('virtualizes a 500-line project instead of mounting every row', () => {
    render(<Harness initialLines={makeLines(500)} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(100);
  });

  it('keeps the Mark button outside the list scroller', () => {
    render(<Harness initialLines={makeLines(20)} />);
    const list = screen.getByRole('list', { name: /lyric lines/i });
    const scroller = list.parentElement as HTMLElement;
    expect(scroller.className).toContain('overflow-y-auto');
    expect(scroller.contains(screen.getByRole('button', { name: /mark line/i }))).toBe(false);
  });

  it('scrolls the cursor line into place as it moves', async () => {
    // Instant scrolling, so the jump is one scrollTo call rather than an animation.
    mockSettings = withEditor({ scroll: { mode: 'auto', alignment: 'center' } });
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo;
    const { rerender } = render(<Harness initialLines={makeLines(500)} activeLineIndex={0} />);
    scrollTo.mockClear();
    rerender(<Harness initialLines={makeLines(500)} activeLineIndex={300} />);
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    // Row 300 sits thousands of pixels down; the list must scroll there, not stay at the top.
    const tops = scrollTo.mock.calls.map((c) => (c[0] as ScrollToOptions).top ?? 0);
    expect(Math.max(0, ...tops)).toBeGreaterThan(1000);
  });
});
