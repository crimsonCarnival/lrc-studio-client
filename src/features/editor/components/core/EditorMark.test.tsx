import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@ui/tooltip';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import Editor from './Editor';
import type { EditorLine } from '@/features/editor/editor.types';

// Desktop marking through the real Editor and useEditor.handleMark: the mark shortcut key
// and the per-row Mark button both honour the auto-advance setting, as the phone Mark does.
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

const advanceOff = { ...DEFAULT_SETTINGS, editor: { ...DEFAULT_SETTINGS.editor, autoAdvance: { enabled: false, skipBlank: false, mode: 'next' } } } as typeof DEFAULT_SETTINGS;

let latest: { lines: EditorLine[]; activeLineIndex: number } = { lines: [], activeLineIndex: 0 };

function Harness() {
  const [lines, setLines] = useState<EditorLine[]>(() => Array.from({ length: 3 }, (_, i) => ({ id: `l${i}`, text: `Line ${i + 1}`, timestamp: null })));
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  useEffect(() => { latest = { lines, activeLineIndex }; });
  return (
    <MemoryRouter>
      <TooltipProvider>
        <Editor
          lines={lines} setLines={setLines} syncMode setSyncMode={vi.fn()}
          activeLineIndex={activeLineIndex} setActiveLineIndex={setActiveLineIndex}
          playbackPosition={7.5} playerRef={{ current: null }}
          undo={vi.fn()} redo={vi.fn()} canUndo={false} canRedo={false} clearHistory={vi.fn()}
          editorMode="lrc" setEditorMode={vi.fn()} handleRemoveAllLyrics={vi.fn()} onNewProject={vi.fn()}
        />
      </TooltipProvider>
    </MemoryRouter>
  );
}

const pressMarkKey = () => fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' });
// The per-row Mark button on the cursor line; it is identified by its pin icon.
const clickRowMark = () => {
  const pin = document.querySelector('path[d^="M17.657 16.657"]');
  const button = pin?.closest('button');
  if (!button) throw new Error('per-row Mark button not found');
  fireEvent.click(button);
};

describe.each([
  ['the mark shortcut key', pressMarkKey],
  ['the per-row Mark button', clickRowMark],
])('desktop marking with %s', (_name, mark) => {
  // jsdom has no layout: give the list a viewport so the virtualizer mounts rows.
  const sizes = { clientHeight: 600, clientWidth: 1200, offsetHeight: 56, offsetWidth: 1200, scrollHeight: 4000 };
  const props = Object.keys(sizes) as (keyof typeof sizes)[];
  const saved = props.map((p) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, p));
  beforeEach(() => {
    mockSettings = DEFAULT_SETTINGS;
    props.forEach((p) => Object.defineProperty(HTMLElement.prototype, p, { configurable: true, get: () => sizes[p] }));
  });
  afterEach(() => {
    props.forEach((p, i) => { const d = saved[i]; if (d) Object.defineProperty(HTMLElement.prototype, p, d); });
  });

  it('advances when auto-advance is on', () => {
    render(<Harness />);
    mark();
    expect(latest.lines[0].timestamp).toBe(7.5);
    expect(latest.activeLineIndex).toBe(1);
  });

  it('stamps and stays on the line when auto-advance is off', () => {
    mockSettings = advanceOff;
    render(<Harness />);
    mark();
    expect(latest.lines[0].timestamp).toBe(7.5);
    expect(latest.activeLineIndex).toBe(0);
    expect(latest.lines[1].timestamp).toBeNull();
  });
});
