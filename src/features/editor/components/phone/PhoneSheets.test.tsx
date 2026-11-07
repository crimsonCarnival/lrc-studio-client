import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { TooltipProvider } from '@ui/tooltip';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import Editor from '../core/Editor';
import type { EditorLine } from '@/features/editor/editor.types';
import type { CollabLockInput } from '@/features/collab/collab.types';

// The whole phone editor renders (real Editor, real useEditor), so every sheet row is checked
// against the handler it really reaches. Only the player, settings and auth are stubbed.
vi.mock('@/features/settings/useSettings', () => ({
  useSettings: () => ({ settings: DEFAULT_SETTINGS, updateSetting: vi.fn(), updateSettings: vi.fn() }),
}));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: null }) }));
vi.mock('@/app/socket.client', () => ({ connectSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), connected: false }) }));

const savePendingProject = vi.fn(async () => undefined);
const startSession = vi.fn(async () => undefined);
vi.mock('@/features/collab/collab.service', () => ({ startSession: (...a: unknown[]) => startSession(...(a as [])) }));
vi.mock('@/features/collab/components/SessionSettingsModal', () => ({
  SessionSettingsModal: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Session settings stub" /> : null),
}));
vi.mock('@/features/editor/services/guest-project-db', () => ({ savePendingProject: (...a: unknown[]) => savePendingProject(...(a as [])) }));

let playerSource = 'local';
vi.mock('@/features/player/PlayerContext', () => ({
  usePlayer: () => ({
    source: playerSource, isPlaying: false, currentTime: 0, duration: 180, playbackSpeed: 1,
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

const line = (i: number, over: Partial<EditorLine> = {}): EditorLine => ({ id: `l${i}`, text: `Line ${i + 1}`, timestamp: null, ...over });
const makeLines = (n: number) => Array.from({ length: n }, (_, i) => line(i));

let latest: {
  lines: EditorLine[]; activeLineIndex: number;
  setLines: (l: EditorLine[]) => void; setSyncMode: (v: boolean) => void;
} = { lines: [], activeLineIndex: 0, setLines: () => {}, setSyncMode: () => {} };
const redo = vi.fn();
const undo = vi.fn();
const onOpenProjectSettings = vi.fn();
const onNewProject = vi.fn();
const onTogglePublicView = vi.fn();
const handleManualSave = vi.fn(async () => true);

function Where() {
  const loc = useLocation();
  return <output data-testid="where">{loc.pathname}{loc.search}</output>;
}

type HarnessProps = {
  initialLines?: EditorLine[];
  user?: unknown;
  hasMedia?: boolean;
  collab?: CollabLockInput;
  activepublicId?: string | null;
  withSave?: boolean;
  sessionOwner?: { publicId: string; live: boolean; onEnded: () => void };
  startActive?: number;
};

function Harness({ initialLines = makeLines(3), user, hasMedia = true, collab, activepublicId, withSave = true, sessionOwner, startActive = 0 }: HarnessProps) {
  const [lines, setLines] = useState(initialLines);
  const [activeLineIndex, setActiveLineIndex] = useState(startActive);
  const [syncMode, setSyncMode] = useState(true);
  const [mode, setMode] = useState('lrc');
  useEffect(() => { latest = { lines, activeLineIndex, setLines, setSyncMode }; }, [lines, activeLineIndex]);
  return (
    <MemoryRouter>
      <TooltipProvider>
        <Editor
          phone
          user={user as never}
          lines={lines}
          setLines={setLines}
          syncMode={syncMode}
          setSyncMode={setSyncMode}
          activeLineIndex={activeLineIndex}
          setActiveLineIndex={setActiveLineIndex}
          playbackPosition={12.5}
          playerRef={{ current: null }}
          undo={undo}
          redo={redo}
          canUndo
          canRedo
          clearHistory={vi.fn()}
          editorMode={mode}
          setEditorMode={setMode}
          handleRemoveAllLyrics={vi.fn()}
          onNewProject={onNewProject}
          onOpenProjectSettings={onOpenProjectSettings}
          onTogglePublicView={onTogglePublicView}
          handleManualSave={withSave ? handleManualSave : undefined}
          buildProjectPayload={() => ({ title: 'Song', lines })}
          hasMedia={hasMedia}
          activepublicId={activepublicId}
          mediaTitle="Song"
          collab={collab}
          sessionOwner={sessionOwner}
        />
        <Where />
      </TooltipProvider>
    </MemoryRouter>
  );
}

const sizes = { clientHeight: 600, clientWidth: 360, offsetHeight: 56, offsetWidth: 360, scrollHeight: 40000 };
const sizeProps = Object.keys(sizes) as (keyof typeof sizes)[];
const savedSizes = sizeProps.map((p) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, p));
beforeEach(() => {
  // jsdom has no layout: give the scroller a phone viewport and each row a height so the virtualizer renders rows.
  sizeProps.forEach((p) => Object.defineProperty(HTMLElement.prototype, p, { configurable: true, get: () => sizes[p] }));
  playerSource = 'local';
  [redo, undo, startSession, onOpenProjectSettings, onNewProject, onTogglePublicView, handleManualSave, savePendingProject].forEach((m) => m.mockClear());
});
afterEach(() => {
  sizeProps.forEach((p, i) => { const d = savedSizes[i]; if (d) Object.defineProperty(HTMLElement.prototype, p, d); });
  vi.useRealTimers();
});

const openTools = () => fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
const tools = () => screen.getByRole('dialog', { name: 'Tools' });
const tapMark = (name: RegExp) => {
  const mark = screen.getByRole('button', { name });
  fireEvent.pointerDown(mark, { isPrimary: true, button: 0, pointerType: 'touch' });
  fireEvent.click(mark, { detail: 1 });
};

describe('Tools sheet in the phone editor', () => {
  it('opens from the header, marks nothing and leaves the cursor alone', () => {
    render(<Harness />);
    openTools();
    expect(tools()).toBeInTheDocument();
    expect(latest.lines.every((l) => l.timestamp == null)).toBe(true);
    expect(latest.activeLineIndex).toBe(0);
  });

  it('Redo reaches the editor redo once', () => {
    render(<Harness />);
    openTools();
    fireEvent.click(within(tools()).getByRole('button', { name: /^redo$/i }));
    expect(redo).toHaveBeenCalledTimes(1);
  });

  it('Undo stays reachable after a sheet action', async () => {
    render(<Harness initialLines={[line(0, { timestamp: 4 })]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 1' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /clear timestamp/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /undo/i }));
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('Start session saves, starts once even on a double tap, and closes the sheet', async () => {
    render(<Harness user={{ id: 'u1' }} activepublicId="abc123" sessionOwner={{ publicId: 'abc123', live: false, onEnded: vi.fn() }} />);
    openTools();
    const start = within(tools()).getByRole('button', { name: /edit this project/i });
    fireEvent.click(start);
    fireEvent.click(start);
    await waitFor(() => expect(startSession).toHaveBeenCalledTimes(1));
    expect(handleManualSave).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tools' })).toBeNull());
  });

  it('Manage session closes the Tools sheet before opening the settings', async () => {
    render(<Harness user={{ id: 'u1' }} activepublicId="abc123" sessionOwner={{ publicId: 'abc123', live: true, onEnded: vi.fn() }} />);
    openTools();
    fireEvent.click(within(tools()).getByRole('button', { name: /manage session/i }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tools' })).toBeNull());
    expect(screen.getByRole('dialog', { name: 'Session settings stub' })).toBeInTheDocument();
  });

  it('Project settings, public page and New project reach their handlers', () => {
    render(<Harness activepublicId="abc123" />);
    openTools();
    fireEvent.click(within(tools()).getByRole('button', { name: /project settings/i }));
    expect(onOpenProjectSettings).toHaveBeenCalledTimes(1);
    openTools();
    fireEvent.click(within(tools()).getByRole('button', { name: /view as public/i }));
    expect(onTogglePublicView).toHaveBeenCalledTimes(1);
    openTools();
    fireEvent.click(within(tools()).getByRole('button', { name: /new project/i }));
    expect(onNewProject).toHaveBeenCalledTimes(1);
  });

  it('Export opens the preview export dialog through the same event the desktop button uses', () => {
    const open = vi.fn();
    window.addEventListener('preview:open-export', open);
    render(<Harness />);
    openTools();
    fireEvent.click(within(tools()).getByRole('button', { name: /^export lrc$/i }));
    window.removeEventListener('preview:open-export', open);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('a guest who taps Save is sent to sign in with the draft kept', async () => {
    render(<Harness user={undefined} />);
    openTools();
    await act(async () => { fireEvent.click(within(tools()).getByRole('button', { name: /^save$/i })); });
    expect(savePendingProject).toHaveBeenCalledTimes(1);
    expect(handleManualSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('where').textContent).toContain('/auth?action=signin');
  });

  it('a signed-in user who taps Save saves through handleManualSave', () => {
    render(<Harness user={{ id: 'u1' }} />);
    openTools();
    fireEvent.click(within(tools()).getByRole('button', { name: /^save$/i }));
    expect(handleManualSave).toHaveBeenCalledTimes(1);
  });

  it('Auto Stamp is unavailable, with the reason, when no audio is loaded', () => {
    render(<Harness hasMedia={false} />);
    openTools();
    const btn = within(tools()).getByRole('button', { name: /auto stamp/i });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toHaveTextContent(/load or upload audio first/i);
  });

  it('on a YouTube source in a browser that cannot capture tab audio, Auto Stamp says a file is needed', () => {
    playerSource = 'youtube';
    // jsdom has no getDisplayMedia, which is what tabAudioSupported() checks.
    render(<Harness />);
    openTools();
    const btn = within(tools()).getByRole('button', { name: /auto stamp/i });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toHaveTextContent(/add an audio file/i);
  });

  it('hides Save, Publish, Change media and the public page inside a live session', () => {
    const collab = {
      provider: null,
      me: { subject: 'u', name: 'Me', colorIndex: 0, role: 'editor', conn: 'c', clientId: 1 },
      locks: {},
    } as unknown as CollabLockInput;
    render(<Harness user={{ id: 'u1' }} collab={collab} activepublicId="abc123" />);
    openTools();
    for (const name of [/^save$/i, /publish$/i, /change media/i, /view as public/i]) {
      expect(within(tools()).queryByRole('button', { name })).toBeNull();
    }
    expect(within(tools()).getByRole('button', { name: /^export lrc$/i })).toBeInTheDocument();
  });

  it('offers a viewer only what does not edit', () => {
    const collab = {
      provider: null,
      me: { subject: 'u', name: 'V', colorIndex: 0, role: 'viewer', conn: 'c', clientId: 1 },
      locks: {},
    } as unknown as CollabLockInput;
    render(<Harness collab={collab} />);
    openTools();
    expect(within(tools()).queryByRole('button', { name: /auto stamp/i })).toBeNull();
    expect(within(tools()).queryByRole('button', { name: /^redo$/i })).toBeNull();
    expect(within(tools()).queryByRole('button', { name: /remove all/i })).toBeNull();
    expect(within(tools()).getByRole('button', { name: /^export lrc$/i })).toBeInTheDocument();
  });

  it('switching to SRT changes the editor mode, and Mark still stamps one line per tap afterwards', async () => {
    render(<Harness />);
    openTools();
    fireEvent.click(within(tools()).getByRole('button', { name: /SRT:/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tools' })).toBeNull());
    tapMark(/mark line 1/i);
    expect(latest.lines.filter((l) => l.timestamp != null)).toHaveLength(1);
    expect(latest.activeLineIndex).toBe(0); // SRT: the first mark waits for its end time
  });

  it('Mark still works with the sheet closed, one line per tap', async () => {
    render(<Harness />);
    openTools();
    fireEvent.keyDown(tools(), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tools' })).toBeNull());
    tapMark(/mark line 1/i);
    expect(latest.lines.filter((l) => l.timestamp != null)).toHaveLength(1);
    expect(latest.activeLineIndex).toBe(1);
  });
});

describe('Line sheet', () => {
  const rowFor = (text: string) => screen.getByRole('button', { name: text });

  it('opens from the visible options button on the cursor line, without marking', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 1' }));
    expect(screen.getByRole('dialog', { name: 'Line 1' })).toBeInTheDocument();
    expect(latest.lines.every((l) => l.timestamp == null)).toBe(true);
    expect(latest.activeLineIndex).toBe(0);
  });

  it('opens on a long press of a row, and the click that ends it does not move the cursor', () => {
    vi.useFakeTimers();
    render(<Harness />);
    const row = rowFor('Line 3');
    fireEvent.touchStart(row, { touches: [{ clientX: 10, clientY: 10 }] });
    act(() => { vi.advanceTimersByTime(520); });
    expect(screen.getByRole('dialog', { name: 'Line 3' })).toBeInTheDocument();
    fireEvent.touchEnd(row, { changedTouches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.click(row);
    expect(latest.activeLineIndex).toBe(0);
    expect(latest.lines.every((l) => l.timestamp == null)).toBe(true);
  });

  it('a scroll gesture is not a long press', () => {
    vi.useFakeTimers();
    render(<Harness />);
    const row = rowFor('Line 3');
    fireEvent.touchStart(row, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 10, clientY: 60 }] });
    act(() => { vi.advanceTimersByTime(900); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('inserts a line below the right index', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 1' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /insert below/i }));
    expect(latest.lines).toHaveLength(4);
    expect(latest.lines[0].text).toBe('Line 1');
    expect(latest.lines[1].text).toBe('');
    expect(latest.lines[2].text).toBe('Line 2');
  });

  it('inserts above and duplicates at the right index', () => {
    render(<Harness startActive={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 2' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /insert above/i }));
    expect(latest.lines.map((l) => l.text)).toEqual(['Line 1', '', 'Line 2', 'Line 3']);
  });

  it('nudges the line by the fine and coarse amounts and stays open', () => {
    render(<Harness initialLines={[line(0, { timestamp: 10 }), line(1)]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 1' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /0\.1 s later/i }));
    expect(latest.lines[0].timestamp).toBeCloseTo(10.1, 5);
    fireEvent.click(within(dialog).getByRole('button', { name: /0\.01 s earlier/i }));
    expect(latest.lines[0].timestamp).toBeCloseTo(10.09, 5);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('disables nudge on a line with no time and offers Clear only on a timed line', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 1' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /0\.1 s later/i })).toHaveAttribute('aria-disabled', 'true');
    expect(within(dialog).queryByRole('button', { name: /clear timestamp/i })).toBeNull();
  });

  it('clears the timestamp of that line only', () => {
    render(<Harness initialLines={[line(0, { timestamp: 4 }), line(1, { timestamp: 8 })]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 1' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /clear timestamp/i }));
    expect(latest.lines.map((l) => l.timestamp)).toEqual([null, 8]);
  });

  it('assigns a singer to that line through the existing handler', () => {
    const lines = [line(0, { singers: ['Ana'] }), line(1, { singers: ['Bea'] }), line(2)];
    render(<Harness initialLines={lines} startActive={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 3' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /assign singer/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Bea/ }));
    expect(latest.lines[2].singers).toEqual(['Bea']);
    expect(latest.lines[0].singers).toEqual(['Ana']);
  });

  it('moves a line to a section', () => {
    const lines: EditorLine[] = [
      { id: 's1', type: 'section', label: 'verse', depth: 1 } as EditorLine,
      line(0),
      { id: 's2', type: 'section', label: 'chorus', depth: 1 } as EditorLine,
      line(1),
    ];
    render(<Harness initialLines={lines} startActive={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 1' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /move to section/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /chorus/i }));
    expect(latest.lines.map((l) => l.text ?? l.label)).toEqual(['verse', 'chorus', 'Line 1', 'Line 2']);
  });

  it('inserts a section above the line', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 1' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /insert section above/i }));
    expect(latest.lines[0].type).toBe('section');
    expect(latest.lines).toHaveLength(4);
  });

  it('Delete asks to confirm and then removes that line', async () => {
    render(<Harness startActive={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 2' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /remove this line/i }));
    expect(latest.lines).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));
    await waitFor(() => expect(latest.lines.map((l) => l.text)).toEqual(['Line 1', 'Line 3']));
  });
});

describe('Line sheet targets', () => {
  it('keeps pointing at its line when another user inserts above it', () => {
    render(<Harness startActive={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 2' }));
    act(() => { latest.setLines([line(9), ...latest.lines]); });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /insert below/i }));
    expect(latest.lines.map((l) => l.text)).toEqual(['Line 10', 'Line 1', 'Line 2', '', 'Line 3']);
  });

  it('closes when its line disappears', async () => {
    render(<Harness startActive={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 2' }));
    act(() => { latest.setLines(latest.lines.filter((l) => l.id !== 'l1')); });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('Phone details', () => {
  it('the counterpart capture key does nothing on the phone', () => {
    render(<Harness />);
    const before = latest.lines;
    fireEvent.keyDown(window, { key: 'a' });
    expect(latest.lines).toBe(before);
  });

  it('removing all lyrics on the Sync tab moves to the Edit tab', async () => {
    render(<Harness />);
    act(() => { latest.setSyncMode(false); latest.setLines([]); });
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Edit' })).toHaveAttribute('aria-selected', 'true'));
  });
});

describe('Select mode', () => {
  const enterSelect = () => {
    openTools();
    fireEvent.click(within(tools()).getByRole('button', { name: /select lines/i }));
  };

  it('replaces the Mark row and shows reorder grips only while selecting', () => {
    render(<Harness />);
    const row = () => screen.getByRole('button', { name: 'Line 2' });
    expect(row().getAttribute('draggable')).toBe('false');
    enterSelect();
    expect(screen.queryByRole('button', { name: /mark line/i })).toBeNull();
    expect(row().getAttribute('draggable')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(screen.getByRole('button', { name: /mark line/i })).toBeInTheDocument();
    expect(row().getAttribute('draggable')).toBe('false');
  });

  it('a tap toggles the line instead of moving the cursor', () => {
    render(<Harness />);
    enterSelect();
    fireEvent.click(screen.getByRole('button', { name: 'Line 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Line 3' }));
    expect(screen.getByText('2 lines')).toBeInTheDocument();
    expect(latest.activeLineIndex).toBe(0);
    expect(latest.lines.every((l) => l.timestamp == null)).toBe(true);
  });

  it('shifts the selected lines earlier by the nudge amount', () => {
    render(<Harness initialLines={[line(0, { timestamp: 5 }), line(1, { timestamp: 8 }), line(2, { timestamp: 9 })]} />);
    enterSelect();
    fireEvent.click(screen.getByRole('button', { name: 'Line 2' }));
    fireEvent.click(screen.getByRole('button', { name: /^earlier$/i }));
    expect(latest.lines.map((l) => l.timestamp)).toEqual([5, 7.9, 9]);
  });

  it('tags the selected lines as a standard section', async () => {
    render(<Harness />);
    enterSelect();
    fireEvent.click(screen.getByRole('button', { name: 'Line 2' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tools' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /tag as section/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Chorus'));
    await waitFor(() => expect(latest.lines.some((l) => l.type === 'section' && /chorus/i.test(l.label ?? ''))).toBe(true));
    expect(latest.lines.filter((l) => l.type !== 'section')).toHaveLength(3);
  });

  it('the tag chooser opens directly and has a Back row to the selection options', async () => {
    render(<Harness />);
    enterSelect();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tools' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Line 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Line 3' }));
    fireEvent.click(screen.getByRole('button', { name: /tag as section/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Verse')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /back/i }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /tag as section/i })).toBeInTheDocument();
  });

  it('leaves Select mode after the selection is deleted', async () => {
    render(<Harness />);
    enterSelect();
    fireEvent.click(screen.getByRole('button', { name: 'Line 2' }));
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /mark line/i })).toBeInTheDocument());
    expect(latest.lines).toHaveLength(2);
  });

  it('has no row options button while selecting', () => {
    render(<Harness />);
    enterSelect();
    expect(screen.queryByRole('button', { name: /options for line/i })).toBeNull();
  });
});

describe('Edit tab', () => {
  const goEdit = () => fireEvent.click(screen.getByRole('tab', { name: 'Edit' }));

  it('edits the lyrics as text and keeps timestamps of unchanged lines', async () => {
    render(<Harness initialLines={[line(0, { timestamp: 4 }), line(1, { timestamp: 8 })]} />);
    goEdit();
    const box = screen.getByRole('textbox', { name: /paste|lyrics/i }) as HTMLTextAreaElement;
    expect(box.value).toContain('Line 1');
    fireEvent.change(box, { target: { value: `${box.value}\nLine 3` } });
    await act(async () => { fireEvent.click(within(screen.getByRole('tabpanel')).getByRole('button', { name: /^save$/i })); });
    expect(latest.lines.map((l) => l.text)).toEqual(['Line 1', 'Line 2', 'Line 3']);
    expect(latest.lines.map((l) => l.timestamp)).toEqual([4, 8, null]);
    expect(screen.getByRole('tab', { name: 'Sync' })).toHaveAttribute('aria-selected', 'true');
  });

  it('changes nothing when the text was not edited', async () => {
    const before = [line(0, { timestamp: 4 }), line(1, { timestamp: 8 })];
    render(<Harness initialLines={before} />);
    goEdit();
    fireEvent.click(screen.getByRole('tab', { name: 'Sync' }));
    expect(latest.lines).toEqual(before);
    expect(screen.getByRole('button', { name: /mark line/i })).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('edits one line: text, secondary text and a translation', () => {
    render(<Harness initialLines={[line(0, { timestamp: 4 }), line(1)]} />);
    goEdit();
    fireEvent.click(screen.getByRole('button', { name: /one line/i }));
    fireEvent.change(screen.getByLabelText('Lyrics'), { target: { value: 'Edited' } });
    fireEvent.change(screen.getByLabelText('Secondary lyrics'), { target: { value: 'Romaji' } });
    fireEvent.click(screen.getByRole('button', { name: /add translation/i }));
    fireEvent.change(screen.getByPlaceholderText('Translation'), { target: { value: 'Hello' } });
    fireEvent.click(within(screen.getByRole('tabpanel')).getByRole('button', { name: /^save$/i }));
    expect(latest.lines[0].text).toBe('Edited');
    expect(latest.lines[0].secondary).toBe('Romaji');
    expect(latest.lines[0].translations?.[0].text).toBe('Hello');
    expect(latest.lines[0].timestamp).toBe(4);
  });

  it('editing a line from its sheet gives the Mark cursor back on leaving the tab', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Options for line 1' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /edit text/i }));
    fireEvent.click(screen.getByRole('button', { name: /next line/i }));
    expect(latest.activeLineIndex).toBe(1);
    fireEvent.click(screen.getByRole('tab', { name: 'Sync' }));
    expect(latest.activeLineIndex).toBe(0);
  });

  it('keeps Save visible above the on-screen keyboard', () => {
    const vv = Object.assign(new EventTarget(), { height: 400, offsetTop: 0 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    render(<Harness />);
    goEdit();
    act(() => { vv.dispatchEvent(new Event('resize')); });
    const panel = screen.getByRole('tabpanel').firstElementChild as HTMLElement;
    expect(panel.style.paddingBottom).toBe('400px');
    expect(within(screen.getByRole('tabpanel')).getByRole('button', { name: /^save$/i })).toBeInTheDocument();
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
  });
});

describe('Header Save and the -/+ timestamp buttons beside Mark', () => {
  const stamped = () => [line(0, { timestamp: 1 }), line(1, { timestamp: 2 }), line(2)];

  it('Save is one tap away in the header, without opening the Tools sheet', () => {
    render(<Harness user={{ id: 'u1' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(handleManualSave).toHaveBeenCalledTimes(1);
  });

  it('a guest who taps the header Save is sent to sign in with the draft kept', async () => {
    render(<Harness user={undefined} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save' })); });
    expect(savePendingProject).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('where').textContent).toContain('/auth?action=signin');
  });

  it('there is no header Save inside a live session, where the server stores the shared doc', () => {
    const collab = {
      provider: null,
      me: { subject: 'u', name: 'Me', colorIndex: 0, role: 'editor', conn: 'c', clientId: 1 },
      locks: {},
    } as unknown as CollabLockInput;
    render(<Harness user={{ id: 'u1' }} collab={collab} activepublicId="abc123" />);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('- moves the line stamped just before the cursor earlier by the nudge step', () => {
    render(<Harness initialLines={stamped()} startActive={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move line 2 earlier by 0.1s' }));
    expect(latest.lines[1].timestamp).toBeCloseTo(1.9, 5);
    expect(latest.lines[0].timestamp).toBe(1);
    expect(latest.activeLineIndex).toBe(2);
  });

  it('+ moves it later, and marks nothing', () => {
    render(<Harness initialLines={stamped()} startActive={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move line 2 later by 0.1s' }));
    expect(latest.lines[1].timestamp).toBeCloseTo(2.1, 5);
    expect(latest.lines[2].timestamp).toBeNull();
  });

  it('moves the cursor line itself when the user has tapped a stamped row', () => {
    render(<Harness initialLines={stamped()} startActive={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move line 1 later by 0.1s' }));
    expect(latest.lines[0].timestamp).toBeCloseTo(1.1, 5);
  });

  it('is disabled, and says why, while no line is stamped yet', () => {
    render(<Harness />);
    const none = screen.getAllByRole('button', { name: 'No stamped line to move' });
    expect(none).toHaveLength(2);
    none.forEach((b) => expect(b).toBeDisabled());
  });

  it('a viewer gets no Mark row, so no nudge buttons either', () => {
    const collab = {
      provider: null,
      me: { subject: 'u', name: 'V', colorIndex: 0, role: 'viewer', conn: 'c', clientId: 1 },
      locks: {},
    } as unknown as CollabLockInput;
    render(<Harness initialLines={stamped()} startActive={2} collab={collab} />);
    expect(screen.queryByRole('button', { name: /^Move line/ })).toBeNull();
  });
});
