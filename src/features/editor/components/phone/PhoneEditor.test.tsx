import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@ui/tooltip';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import Editor from '../core/Editor';
import EditorPage from '../EditorPage';
import PhoneEditor from './PhoneEditor';
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
  sessionPublicId?: string | null;
  activeLineIndex?: number;
  isPlaying?: boolean;
  playerRef?: { current: unknown };
  /** Render through EditorPage, which picks the layout from the (stubbed) viewport width. */
  viaPage?: boolean;
  initialSyncMode?: boolean;
};

let latest: { lines: EditorLine[]; activeLineIndex: number; syncMode: boolean; history: number } = {
  lines: [], activeLineIndex: 0, syncMode: true, history: 0,
};

function Harness({
  initialLines, editorMode = 'lrc', playbackPosition = 12.5, collab, sessionPublicId, activeLineIndex: controlledIndex,
  isPlaying = false, playerRef, viaPage = false, initialSyncMode = true,
}: HarnessProps) {
  const [lines, setLinesState] = useState(initialLines);
  // A minimal undo stack standing in for useHistory, owned above the editor like the real one.
  const [past, setPast] = useState<EditorLine[][]>([]);
  const setLines = (next: EditorLine[] | ((prev: EditorLine[]) => EditorLine[])) => {
    setLinesState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      if (value !== prev) setPast((p) => [...p, prev]);
      return value;
    });
  };
  const undo = () => {
    if (!past.length) return;
    setLinesState(past[past.length - 1]);
    setPast(past.slice(0, -1));
  };
  const [activeLineIndex, setActiveLineIndex] = useState(controlledIndex ?? 0);
  const [syncMode, setSyncMode] = useState(initialSyncMode);
  const [mode, setMode] = useState(editorMode);
  const [ref] = useState(() => playerRef ?? { current: null });
  // Stands in for AppRouter's workspace: the editor is mounted only while it is the view.
  const [view, setView] = useState<'editor' | 'preview'>('editor');
  const index = controlledIndex ?? activeLineIndex;
  useEffect(() => { latest = { lines, activeLineIndex: index, syncMode, history: past.length }; });
  const props = {
    lines, setLines, syncMode, setSyncMode,
    activeLineIndex: index, setActiveLineIndex, playbackPosition, playerRef: ref,
    undo, redo: vi.fn(), canUndo: past.length > 0, canRedo: false, clearHistory: vi.fn(),
    editorMode: mode, setEditorMode: setMode, handleRemoveAllLyrics: vi.fn(), onNewProject: vi.fn(),
    collab, sessionPublicId, mediaTitle: 'Song', isPlaying, onShowPreview: () => setView('preview'),
  };
  return (
    <MemoryRouter>
      <TooltipProvider>
        {view === 'preview'
          ? <button type="button" onClick={() => setView('editor')}>Back to editor</button>
          : viaPage ? <EditorPage {...props} /> : <Editor phone {...props} />}
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

  it('two rapid taps stamp two lines and advance twice', () => {
    render(<Harness initialLines={makeLines(4)} />);
    const mark = screen.getByRole('button', { name: /mark line 1/i });
    fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
    fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
    expect(latest.lines[0].timestamp).toBe(12.5);
    expect(latest.lines[1].timestamp).toBe(12.5);
    expect(latest.lines[2].timestamp).toBeNull();
    expect(latest.activeLineIndex).toBe(2);
  });

  it('stamps the shown position while paused', () => {
    const getCurrentTime = vi.fn(() => 20.25);
    render(<Harness initialLines={makeLines(2)} playbackPosition={12.5} isPlaying={false} playerRef={{ current: { getCurrentTime } }} />);
    tapMark(/mark line 1/i);
    expect(latest.lines[0].timestamp).toBe(12.5);
  });

  it('stamps the live player time while playing', () => {
    const getCurrentTime = vi.fn(() => 20.25);
    render(<Harness initialLines={makeLines(2)} playbackPosition={12.5} isPlaying playerRef={{ current: { getCurrentTime } }} />);
    tapMark(/mark line 1/i);
    expect(getCurrentTime).toHaveBeenCalled();
    expect(latest.lines[0].timestamp).toBe(20.25);
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

describe('Crossing the lg breakpoint on a mounted editor', () => {
  // A matchMedia whose width can change while mounted, firing 'change' like a real resize.
  let width = 360;
  const listeners = new Map<string, Set<(e: { matches: boolean }) => void>>();
  const matches = (query: string) => {
    const m = /min-width:\s*([\d.]+)(rem|px)/.exec(query);
    return m ? width >= parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1) : false;
  };
  const originalMatchMedia = window.matchMedia;
  const resize = (next: number) => {
    width = next;
    act(() => { listeners.forEach((set, query) => set.forEach((fn) => fn({ matches: matches(query) }))); });
  };
  const sizes = { clientHeight: 600, clientWidth: 360, offsetHeight: 56, offsetWidth: 360, scrollHeight: 40000 };
  const props = Object.keys(sizes) as (keyof typeof sizes)[];
  const saved = props.map((p) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, p));
  beforeEach(() => {
    width = 360;
    listeners.clear();
    window.matchMedia = vi.fn((query: string) => ({
      get matches() { return matches(query); }, media: query, onchange: null,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
        if (!listeners.has(query)) listeners.set(query, new Set());
        listeners.get(query)!.add(fn);
      },
      removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => { listeners.get(query)?.delete(fn); },
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    props.forEach((p) => Object.defineProperty(HTMLElement.prototype, p, { configurable: true, get: () => sizes[p] }));
  });
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    props.forEach((p, i) => { const d = saved[i]; if (d) Object.defineProperty(HTMLElement.prototype, p, d); });
  });

  it('keeps lines, cursor, sync mode and undo history across phone -> desktop -> phone', () => {
    render(<Harness viaPage initialLines={makeLines(5)} />);
    tapMark(/mark line 1/i);
    tapMark(/mark line 2/i);
    expect(latest.activeLineIndex).toBe(2);
    expect(latest.history).toBe(2);

    resize(1280);
    expect(document.querySelector('[data-phone-editor]')).toBeNull();
    expect(latest.lines[0].timestamp).toBe(12.5);
    expect(latest.lines[1].timestamp).toBe(12.5);
    expect(latest.activeLineIndex).toBe(2);
    expect(latest.syncMode).toBe(true);
    expect(latest.history).toBe(2);

    resize(360);
    expect(document.querySelector('[data-phone-editor]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /mark line 3/i })).toBeInTheDocument();
    // The undo history survived both crossings: undo still steps back through the marks.
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(latest.lines[1].timestamp).toBeNull();
    expect(latest.lines[0].timestamp).toBe(12.5);
  });

  it('does not offer Focus in Words mode on the phone and leaves the stored choice alone', () => {
    localStorage.setItem('lrc-phone-focus-view', '1');
    render(<Harness viaPage editorMode="words" initialLines={makeLines(3)} />);
    expect(document.querySelector('[data-phone-editor]')).not.toBeNull();
    expect(screen.queryByTestId('phone-focus-view')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Focus view' })).toBeNull();
    expect(localStorage.getItem('lrc-phone-focus-view')).toBe('1');
    localStorage.removeItem('lrc-phone-focus-view');
  });

  it('scrolls the cursor line into view when the list remounts on a crossing', async () => {
    mockSettings = withEditor({ scroll: { mode: 'auto', alignment: 'center' } });
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo;
    width = 1280;
    render(<Harness viaPage initialLines={makeLines(500)} activeLineIndex={300} />);
    scrollTo.mockClear();
    resize(360);
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    const tops = scrollTo.mock.calls.map((c) => (c[0] as ScrollToOptions).top ?? 0);
    expect(Math.max(0, ...tops)).toBeGreaterThan(1000);
  });
});

describe('Phone editor header and tabs', () => {
  it('has Sync and Edit as tabs with roving focus, and Preview as a plain button', () => {
    const onShowPreview = vi.fn();
    render(
      <MemoryRouter>
        <TooltipProvider>
          <PhoneEditorView onShowPreview={onShowPreview} />
        </TooltipProvider>
      </MemoryRouter>,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Sync', 'Edit']);
    expect(screen.queryByRole('tab', { name: 'Preview' })).toBeNull();
    const [sync, edit] = tabs;
    expect(sync).toHaveAttribute('aria-selected', 'true');
    expect(sync).toHaveAttribute('tabindex', '0');
    expect(edit).toHaveAttribute('tabindex', '-1');
    const panel = screen.getByRole('tabpanel');
    expect(sync.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(sync.id);

    sync.focus();
    fireEvent.keyDown(sync, { key: 'ArrowRight' });
    expect(edit).toHaveAttribute('aria-selected', 'true');
    expect(edit).toHaveFocus();
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(edit.id);

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(onShowPreview).toHaveBeenCalledTimes(1);
  });

  it('labels play/pause by what it will do and keeps the Tools placeholder labelled but disabled', () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <PhoneEditorView />
        </TooltipProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More actions' })).toHaveAttribute('aria-disabled', 'true');
  });
});

function PhoneEditorView({ onShowPreview }: { onShowPreview?: () => void }) {
  return (
    <PhoneEditor
      title="Song"
      saveState="saved"
      visibility={null}
      list={<div />}
      onShowPreview={onShowPreview}
      mark={{ onMark: vi.fn(), onUndo: vi.fn(), canUndo: false, label: 'Mark line 1', disabled: false }}
    />
  );
}

describe('Phone Focus view', () => {
  beforeEach(() => { try { localStorage.clear(); } catch { /* none */ } });
  afterEach(() => { try { localStorage.clear(); } catch { /* none */ } });

  const openFocus = () => fireEvent.click(screen.getByRole('button', { name: 'Focus view' }));

  it('starts on the Sync deck and the toggle swaps in the Focus view and back', () => {
    render(<Harness initialLines={makeLines(3)} />);
    expect(screen.queryByTestId('phone-focus-view')).toBeNull();
    expect(screen.getByRole('list', { name: /lyric lines/i })).toBeInTheDocument();
    openFocus();
    expect(screen.getByTestId('phone-focus-view')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /lyric lines/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to list' }));
    expect(screen.queryByTestId('phone-focus-view')).toBeNull();
  });

  it('remembers the choice across a remount, and renders without storage', () => {
    const { unmount } = render(<Harness initialLines={makeLines(3)} />);
    openFocus();
    unmount();
    render(<Harness initialLines={makeLines(3)} />);
    expect(screen.getByTestId('phone-focus-view')).toBeInTheDocument();
    cleanup();
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<Harness initialLines={makeLines(3)} />);
    expect(screen.queryByTestId('phone-focus-view')).toBeNull();
    openFocus();
    expect(screen.getByTestId('phone-focus-view')).toBeInTheDocument();
    get.mockRestore();
    set.mockRestore();
  });

  it('is reachable from the Tools sheet', () => {
    render(<Harness initialLines={makeLines(3)} />);
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Focus view' }));
    expect(screen.getByTestId('phone-focus-view')).toBeInTheDocument();
  });

  it('shows the cursor line large with its neighbours and stamps it once per tap', () => {
    render(<Harness initialLines={makeLines(4)} activeLineIndex={1} />);
    openFocus();
    expect(screen.getByText('Previous line:').closest('p')).toHaveTextContent('Previous line: Line 1');
    expect(screen.getByText('Current line:').closest('p')).toHaveTextContent('Current line: Line 2');
    expect(screen.getByText('Next line:').closest('p')).toHaveTextContent('Next line: Line 3');
    tapMark(/mark line 2/i);
    expect(latest.lines[1].timestamp).toBe(12.5);
    expect(latest.lines[2].timestamp).toBeNull();
  });

  it('a rapid double tap stamps two lines', () => {
    render(<Harness initialLines={makeLines(4)} />);
    openFocus();
    const stamp = screen.getByRole('button', { name: /mark line 1/i });
    fireEvent.pointerDown(stamp, { isPrimary: true, button: 0, pointerType: 'touch' });
    fireEvent.pointerDown(stamp, { isPrimary: true, button: 0, pointerType: 'touch' });
    expect(latest.lines[0].timestamp).toBe(12.5);
    expect(latest.lines[1].timestamp).toBe(12.5);
    expect(latest.activeLineIndex).toBe(2);
  });

  it('honours autoAdvance off (never forces the advance)', () => {
    mockSettings = withEditor({ autoAdvance: { enabled: false, skipBlank: false, mode: 'next' } });
    render(<Harness initialLines={makeLines(3)} />);
    openFocus();
    tapMark(/mark line 1/i);
    expect(latest.lines[0].timestamp).toBe(12.5);
    expect(latest.activeLineIndex).toBe(0);
  });

  it('in SRT mode the second tap sets the end time', () => {
    const { rerender } = render(<Harness initialLines={makeLines(3)} editorMode="srt" playbackPosition={10} />);
    openFocus();
    tapMark(/mark line 1/i);
    expect(latest.lines[0].timestamp).toBe(10);
    rerender(<Harness initialLines={makeLines(3)} editorMode="srt" playbackPosition={13} />);
    tapMark(/mark end of line 1/i);
    expect(latest.lines[0].endTime).toBe(13);
  });

  it('makes the stamp area inert while a sheet is open', () => {
    render(<Harness initialLines={makeLines(3)} />);
    openFocus();
    const stamp = () => screen.getByRole('button', { name: /^mark line 1$/i, hidden: true });
    expect(stamp().closest('[inert]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(stamp().closest('[inert]')).not.toBeNull();
  });

  it('gives a session viewer no Focus toggle', () => {
    const collab = {
      provider: null,
      me: { subject: 'u', name: 'V', colorIndex: 0, role: 'viewer', conn: 'c', clientId: 1 },
      locks: {},
    } as unknown as CollabLockInput;
    render(<Harness initialLines={makeLines(3)} collab={collab} />);
    expect(screen.queryByRole('button', { name: 'Focus view' })).toBeNull();
  });

  it('keeps Focus and Mark for a session editor', () => {
    const collab = {
      provider: null,
      me: { subject: 'u', name: 'E', colorIndex: 0, role: 'editor', conn: 'c', clientId: 1 },
      locks: {},
    } as unknown as CollabLockInput;
    render(<Harness initialLines={makeLines(3)} collab={collab} />);
    expect(screen.getByRole('button', { name: /mark line 1/i })).toBeInTheDocument();
    openFocus();
    tapMark(/mark line 1/i);
    expect(latest.lines[0].timestamp).toBe(12.5);
  });
});

describe('Phone collab session', () => {
  const sessionAs = (role: string) => ({
    provider: null,
    me: { subject: 'u', name: 'Sam', colorIndex: 0, role, conn: 'c', clientId: 1 },
    locks: {},
  }) as unknown as CollabLockInput;

  it('a session editor sees the participants in the header and keeps Mark', () => {
    render(<Harness initialLines={makeLines(3)} collab={sessionAs('editor')} sessionPublicId="abc123" />);
    expect(screen.getByRole('list', { name: /participants/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark line 1/i })).toBeInTheDocument();
  });

  it('shows no participants outside a session', () => {
    render(<Harness initialLines={makeLines(3)} />);
    expect(screen.queryByRole('list', { name: /participants/i })).toBeNull();
  });

  it('the Tools sheet hides save, publish and change song inside a session, as the desktop does', () => {
    render(<Harness initialLines={makeLines(3)} collab={sessionAs('editor')} sessionPublicId="abc123" />);
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    const sheet = within(screen.getByRole('dialog'));
    expect(sheet.getByRole('button', { name: 'Focus view' })).toBeInTheDocument();
    expect(sheet.queryByRole('button', { name: /^save$/i })).toBeNull();
    expect(sheet.queryByRole('button', { name: /publish/i })).toBeNull();
    expect(sheet.queryByRole('button', { name: /change song/i })).toBeNull();
  });

  it('a viewer gets no Tools edits, Focus, Mark or publish', () => {
    render(<Harness initialLines={makeLines(3)} collab={sessionAs('viewer')} sessionPublicId="abc123" />);
    expect(screen.queryByRole('button', { name: /mark line/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Focus view' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    const sheet = within(screen.getByRole('dialog'));
    for (const name of [/auto stamp/i, /shift all/i, /find lyrics/i, /^lrc/i, /publish/i, /^save$/i, /remove all/i]) {
      expect(sheet.queryByRole('button', { name })).toBeNull();
    }
  });
});

describe('Phone Preview round trip', () => {
  beforeEach(() => { try { localStorage.clear(); } catch { /* none */ } });

  it('keeps the stamped lines and the cursor, and the Mark bar is not part of the preview', () => {
    render(<Harness initialLines={makeLines(4)} />);
    tapMark(/mark line 1/i);
    tapMark(/mark line 2/i);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.queryByRole('button', { name: /mark line/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to editor' }));
    expect(screen.getByRole('button', { name: /mark line 3/i })).toBeInTheDocument();
    expect(latest.lines[0].timestamp).toBe(12.5);
    expect(latest.lines[1].timestamp).toBe(12.5);
    expect(latest.activeLineIndex).toBe(2);
  });

  it('returns to the Focus view when it was the chosen presentation', () => {
    render(<Harness initialLines={makeLines(3)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Focus view' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to editor' }));
    expect(screen.getByTestId('phone-focus-view')).toBeInTheDocument();
  });
});
