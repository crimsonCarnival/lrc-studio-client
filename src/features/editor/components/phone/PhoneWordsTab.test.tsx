import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@ui/tooltip';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import { groupMorphemes } from '@/features/editor/utils/morpheme-group';
import { flatToSections, sectionsToFlat } from '@/features/editor/utils/sections';
import Editor from '../core/Editor';
import EditorPage from '../EditorPage';
import type { EditorLine } from '@/features/editor/editor.types';
import type { CollabLockInput } from '@/features/collab/collab.types';

// The phone Words view renders inside the real Editor, so a tap runs the real
// useEditor.handleMark -> applyMark. Only the player, settings, auth and socket are stubbed.
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

// Neutral lyrics. A timestamp on the first line unlocks Words mode, as in a real project.
function makeLines(): EditorLine[] {
  return [
    { id: 'a', text: 'Line one two three', timestamp: 1 },
    { id: 'b', text: 'Line four five six', timestamp: null },
    { id: 'c', text: 'Line seven', timestamp: null },
  ];
}

type State = { lines: EditorLine[]; activeLineIndex: number; mode: string };
let latest: State = { lines: [], activeLineIndex: 0, mode: 'words' };

function Harness({ initialLines, editorMode = 'words', time = 12.5, collab, viaPage = false }: {
  initialLines: EditorLine[]; editorMode?: string; time?: number; collab?: CollabLockInput; viaPage?: boolean;
}) {
  const [lines, setLinesState] = useState(initialLines);
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
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [syncMode, setSyncMode] = useState(true);
  const [mode, setMode] = useState(editorMode);
  const [ref] = useState(() => ({ current: null }));
  useEffect(() => { latest = { lines, activeLineIndex, mode }; });
  const props = {
    lines, setLines, syncMode, setSyncMode, activeLineIndex, setActiveLineIndex, playbackPosition: time,
    playerRef: ref, undo, redo: vi.fn(), canUndo: past.length > 0, canRedo: false, clearHistory: vi.fn(),
    editorMode: mode, setEditorMode: setMode, handleRemoveAllLyrics: vi.fn(), onNewProject: vi.fn(),
    collab, mediaTitle: 'Song', isPlaying: false,
  };
  return (
    <MemoryRouter>
      <TooltipProvider>{viaPage ? <EditorPage {...props} /> : <Editor phone {...props} />}</TooltipProvider>
    </MemoryRouter>
  );
}

function tapMark() {
  const mark = screen.getByRole('button', { name: /^mark /i });
  fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
  fireEvent.click(mark, { detail: 1 });
}

const chips = () => within(screen.getByRole('list', { name: /words in line/i })).getAllByRole('button');
const wordTimes = (i: number) => latest.lines[i].words?.map((w) => w.time);
const stampedCount = (i: number) => wordTimes(i)?.filter((t) => t != null).length;

beforeEach(() => { mockSettings = DEFAULT_SETTINGS; });

describe('Phone Words view', () => {
  it('shows the cursor line as one chip per word, the first one active', () => {
    render(<Harness initialLines={makeLines()} />);
    const c = chips();
    expect(c.map((b) => b.querySelector('span')?.textContent)).toEqual(['Line', 'one', 'two', 'three']);
    expect(c[0]).toHaveAttribute('aria-pressed', 'true');
    expect(c[1]).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^mark .line.$/i })).toBeInTheDocument();
  });

  it('stamps the active word once per tap and moves to the next word', () => {
    render(<Harness initialLines={makeLines()} time={3.25} />);
    tapMark();
    expect(wordTimes(0)).toEqual([3.25, null, null, null]);
    expect(latest.activeLineIndex).toBe(0);
    expect(chips()[1]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^mark .one.$/i })).toBeInTheDocument();
  });

  it('advances to the next line after the last word when auto-advance is on', () => {
    render(<Harness initialLines={makeLines()} />);
    for (let n = 0; n < 4; n++) tapMark();
    expect(wordTimes(0)).toEqual([12.5, 12.5, 12.5, 12.5]);
    expect(latest.activeLineIndex).toBe(1);
    expect(chips().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false']);
  });

  it('with auto-advance off stays on the line and the word index wraps to the first word', () => {
    mockSettings = withEditor({ autoAdvance: { enabled: false, skipBlank: false, mode: 'next' } });
    render(<Harness initialLines={makeLines()} />);
    for (let n = 0; n < 4; n++) tapMark();
    expect(wordTimes(0)).toEqual([12.5, 12.5, 12.5, 12.5]);
    expect(latest.activeLineIndex).toBe(0);
    expect(chips()[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('two taps in one frame stamp two words, not one word twice', () => {
    render(<Harness initialLines={makeLines()} />);
    const mark = screen.getByRole('button', { name: /^mark /i });
    fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
    fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
    expect(stampedCount(0)).toBe(2);
  });

  it('a keyboard click on Mark stamps, and the click trailing a touch does not stamp twice', () => {
    render(<Harness initialLines={makeLines()} />);
    const mark = screen.getByRole('button', { name: /^mark /i });
    fireEvent.click(mark, { detail: 0 });
    expect(stampedCount(0)).toBe(1);
    tapMark();
    expect(stampedCount(0)).toBe(2);
  });

  it('a tap whose click arrives with detail 0 still stamps one word', () => {
    render(<Harness initialLines={makeLines()} />);
    const mark = screen.getByRole('button', { name: /^mark /i });
    fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
    fireEvent.click(mark, { detail: 0 });
    expect(stampedCount(0)).toBe(1);
  });

  it('tapping a chip makes it the word the next Mark stamps', () => {
    render(<Harness initialLines={makeLines()} />);
    fireEvent.click(chips()[2]);
    expect(chips()[2]).toHaveAttribute('aria-pressed', 'true');
    tapMark();
    expect(wordTimes(0)).toEqual([null, null, 12.5, null]);
    // The focused word is spent; the cursor moves on to the following word.
    expect(chips()[3]).toHaveAttribute('aria-pressed', 'true');
  });

  it('on a line with no start the label names word 1, chips are inert, and marks stamp in order from word 1', () => {
    render(<Harness initialLines={[{ id: 'a', text: 'Line one two three', timestamp: null }, ...makeLines().slice(1)]} />);
    expect(screen.getByRole('button', { name: /^mark .line.$/i })).toBeInTheDocument();
    fireEvent.click(chips()[2]);
    // Tapping word 3 changes nothing: the highlight and the label still name the word Mark will stamp.
    expect(chips()[2]).toHaveAttribute('aria-disabled', 'true');
    expect(chips()[0]).toHaveAttribute('aria-pressed', 'true');
    expect(chips()[2]).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^mark .line.$/i })).toBeInTheDocument();
    tapMark();
    expect(wordTimes(0)).toEqual([12.5, null, null, null]);
    expect(latest.lines[0].timestamp).toBe(12.5);
    expect(screen.getByRole('button', { name: /^mark .one.$/i })).toBeInTheDocument();
    tapMark();
    expect(wordTimes(0)).toEqual([12.5, 12.5, null, null]);
    expect(chips()[2]).not.toHaveAttribute('aria-disabled');
  });

  it('never leaves a started line without word 1 stamped first, or a focus on a line with no start', () => {
    const lines = makeLines();
    lines[0] = { ...lines[0], timestamp: null };
    render(<Harness initialLines={lines} />);
    for (let n = 0; n < 4; n++) tapMark();
    const times = wordTimes(0) as number[];
    expect(times.every((t) => t != null)).toBe(true);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(latest.lines[0].timestamp).toBe(times[0]);
  });

  it('re-stamping the first word of a stamped line moves the line start with it', () => {
    render(<Harness initialLines={makeLines()} time={5} />);
    fireEvent.click(chips()[0]);
    tapMark();
    expect(latest.lines[0].timestamp).toBe(5);
    expect(wordTimes(0)?.[0]).toBe(5);
  });

  it('Undo restores the stamped word', () => {
    render(<Harness initialLines={makeLines()} />);
    const before = wordTimes(0);
    tapMark();
    expect(wordTimes(0)).not.toEqual(before);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(wordTimes(0)).toEqual(before);
  });

  it('previous and next line move the cursor over lyric lines only', () => {
    const lines = makeLines();
    lines.splice(1, 0, { id: 's', type: 'section', label: 'Verse' } as EditorLine);
    render(<Harness initialLines={lines} />);
    expect(screen.getByRole('button', { name: 'Previous line' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }));
    expect(latest.activeLineIndex).toBe(2);
    expect(screen.getByText('Line 2 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous line' }));
    expect(latest.activeLineIndex).toBe(0);
  });

  it('a Mark after moving to another line stamps that line, not the one left behind', () => {
    render(<Harness initialLines={makeLines()} />);
    fireEvent.click(chips()[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }));
    tapMark();
    expect(stampedCount(0)).toBe(0);
    expect(latest.lines[1].timestamp).toBe(12.5);
  });

  it('cycles the singer of the selected word on a duet line', () => {
    const lines = makeLines();
    lines[0] = { ...lines[0], singers: ['Ann', 'Bo'] };
    render(<Harness initialLines={lines} />);
    fireEvent.click(chips()[1]);
    const cycle = screen.getByRole('button', { name: /change singer for one/i });
    fireEvent.click(cycle);
    expect(latest.lines[0].words?.[1].singerIndex).toBe(0);
    fireEvent.click(cycle);
    expect(latest.lines[0].words?.[1].singerIndex).toBe(1);
    expect(latest.lines[0].words?.[0].singerIndex).toBeUndefined();
  });

  it('names chips for touch: word, time, singer and whether it is next, with distinct section and list names', () => {
    const lines = makeLines();
    lines[0] = { ...lines[0], singers: ['Ann', 'Bo'], words: [{ word: 'Line', time: null }, { word: 'one', time: 1.5 }, { word: 'two', time: null }, { word: 'three', time: null }] };
    render(<Harness initialLines={lines} />);
    // Entering Words mode retokenizes the line, so attribute the singer after mounting.
    fireEvent.click(chips()[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Change singer for one' }));
    fireEvent.click(screen.getByRole('button', { name: /^Change singer for one, now Ann$/ }));
    expect(latest.lines[0].words?.[1].singerIndex).toBe(1);
    fireEvent.click(chips()[0]);
    const names = chips().map((c) => c.getAttribute('aria-label'));
    expect(names[0]).toBe('Line, not stamped, next to mark');
    expect(names[1]).toBe('one, stamped at 00:01.50, singer Bo');
    expect(names[1]).not.toMatch(/click/i);
    expect(screen.getByRole('region', { name: 'Line 1 timing' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Words in line 1' })).toBeInTheDocument();
    fireEvent.click(chips()[1]);
    expect(screen.getByRole('button', { name: 'Change singer for one, now Bo' })).toBeInTheDocument();
  });

  it('offers no singer button on a solo line', () => {
    render(<Harness initialLines={makeLines()} />);
    expect(screen.queryByRole('button', { name: /change singer/i })).toBeNull();
  });

  it('skips a blank line gracefully: no chips, a note, and Mark still stamps the line', () => {
    const lines = makeLines();
    lines.splice(0, 0, { id: 'blank', text: '', timestamp: null });
    render(<Harness initialLines={lines} />);
    expect(screen.queryByRole('list', { name: /words in line/i })).toBeNull();
    expect(screen.getByText(/no words to time/i)).toBeInTheDocument();
    tapMark();
    expect(latest.lines[0].timestamp).toBe(12.5);
    expect(latest.activeLineIndex).toBe(1);
  });

  it('shows no Mark to a session viewer', () => {
    const collab = {
      provider: null,
      me: { subject: 'u', name: 'V', colorIndex: 0, role: 'viewer', conn: 'c', clientId: 1 },
      locks: {},
    } as unknown as CollabLockInput;
    render(<Harness initialLines={makeLines()} collab={collab} />);
    expect(screen.queryByRole('button', { name: /^mark /i })).toBeNull();
  });

  it('does not offer the Focus view in Words mode', () => {
    render(<Harness initialLines={makeLines()} />);
    expect(screen.queryByRole('button', { name: 'Focus view' })).toBeNull();
  });
});

describe('Phone Words view with Japanese text', () => {
  it('tokenizes a CJK line into the same words the desktop makes, and offers the layer choice', () => {
    const text = '高みを目指して';
    render(<Harness initialLines={[{ id: 'j', text, secondary: 'takami wo mezashite', timestamp: 1 }]} />);
    expect(chips()).toHaveLength(groupMorphemes(text).length);
    expect(latest.lines[0].words?.map((w) => w.word)).toEqual(groupMorphemes(text).map((t) => t.text));
    expect(screen.getByRole('group', { name: 'Layer to stamp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Romaji' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('a Latin line has no layer choice', () => {
    render(<Harness initialLines={makeLines()} />);
    expect(screen.queryByRole('group', { name: 'Layer to stamp' })).toBeNull();
  });
});

describe('Mode switching and layout choice', () => {
  const originalMatchMedia = window.matchMedia;
  afterEach(() => { window.matchMedia = originalMatchMedia; });

  it('keeps lines and cursor across Words -> LRC -> Words', () => {
    render(<Harness initialLines={makeLines()} />);
    tapMark();
    tapMark();
    const stamped = wordTimes(0);
    const open = (name: RegExp) => {
      fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
      fireEvent.click(within(screen.getByRole('dialog', { name: 'Tools' })).getByRole('button', { name }));
    };
    open(/LRC:/);
    expect(latest.mode).toBe('lrc');
    expect(latest.lines.map((l) => l.text)).toEqual(makeLines().map((l) => l.text));
    expect(latest.activeLineIndex).toBe(0);
    expect(screen.getByRole('button', { name: /^mark line 1$/i })).toBeInTheDocument();
    open(/Words/);
    expect(latest.mode).toBe('words');
    expect(wordTimes(0)).toEqual(stamped);
    expect(chips()).toHaveLength(4);
  });

  it('keeps words and singers intact through the section round trip after stamping every word', () => {
    const lines = makeLines();
    lines[0] = { ...lines[0], singers: ['Ann', 'Bo'] };
    render(<Harness initialLines={lines} />);
    fireEvent.click(chips()[1]);
    fireEvent.click(screen.getByRole('button', { name: /change singer for one/i }));
    fireEvent.click(chips()[0]);
    for (let n = 0; n < 4; n++) tapMark();
    const restored = sectionsToFlat(flatToSections(latest.lines));
    const pick = (l: EditorLine) => l.words?.map((w) => [w.word, w.time, w.singerIndex]);
    expect(pick(restored[0])).toEqual(pick(latest.lines[0]));
    expect(restored[0].words?.every((w) => w.time != null)).toBe(true);
    expect(restored[0].words?.[1].singerIndex).toBe(0);
  });

  it('spreads the cursor line evenly from the Tools sheet', () => {
    const lines = makeLines();
    lines[1] = { ...lines[1], timestamp: 5 };
    render(<Harness initialLines={lines} />);
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByRole('button', { name: /spread evenly/i }));
    const times = wordTimes(0) as number[];
    expect(times[0]).toBe(1);
    expect(times.every((t) => t != null)).toBe(true);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('clears every word timestamp from the Tools sheet after confirming', async () => {
    const lines = makeLines();
    lines[0] = { ...lines[0], words: [{ word: 'Line', time: 1 }, { word: 'one', time: 2 }, { word: 'two', time: 3 }, { word: 'three', time: 4 }] };
    render(<Harness initialLines={lines} />);
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByRole('button', { name: /clear all word timestamps/i }));
    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: /^confirm$/i })); });
    await waitFor(() => expect(wordTimes(0)).toEqual([null, null, null, null]));
  });

  function emulate(width: number) {
    window.matchMedia = vi.fn((query: string) => {
      const m = /min-width:\s*([\d.]+)(rem|px)/.exec(query);
      return {
        matches: m ? width >= parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1) : false, media: query, onchange: null,
        addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList;
    });
  }

  it('EditorPage gives Words the phone layout below lg and the desktop layout at lg', () => {
    Element.prototype.scrollIntoView = vi.fn();
    emulate(360);
    const { unmount } = render(<Harness viaPage initialLines={makeLines()} />);
    expect(document.querySelector('[data-phone-editor]')).not.toBeNull();
    unmount();
    emulate(1280);
    render(<Harness viaPage initialLines={makeLines()} />);
    expect(document.querySelector('[data-phone-editor]')).toBeNull();
  });
});

describe('Phone Words list', () => {
  const sizes = { clientHeight: 300, clientWidth: 360, offsetHeight: 56, offsetWidth: 360, scrollHeight: 40000 };
  const props = Object.keys(sizes) as (keyof typeof sizes)[];
  const saved = props.map((p) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, p));
  beforeEach(() => { props.forEach((p) => Object.defineProperty(HTMLElement.prototype, p, { configurable: true, get: () => sizes[p] })); });
  afterEach(() => { props.forEach((p, i) => { const d = saved[i]; if (d) Object.defineProperty(HTMLElement.prototype, p, d); }); });

  it('keeps a 500-line project virtualized', () => {
    const lines = Array.from({ length: 500 }, (_, i) => ({ id: `l${i}`, text: `Line ${i + 1} word`, timestamp: i === 0 ? 1 : null }));
    render(<Harness initialLines={lines} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(100);
  });
});
