import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@ui/tooltip';
import PhoneToolsSheet, { type PhoneToolsSheetProps } from './PhoneToolsSheet';

function handlers() {
  return {
    onClose: vi.fn(),
    autoStamp: { blocked: null, onStart: vi.fn() },
    onShiftAll: vi.fn(),
    onRedo: vi.fn(),
    onClearAllTimestamps: vi.fn(),
    onToggleUnmarked: vi.fn(),
    onFindLyrics: vi.fn(),
    onImport: vi.fn(),
    onEditText: vi.fn(),
    onSecondary: vi.fn(),
    onFurigana: vi.fn(),
    readingFormat: { katakana: false, onToggle: vi.fn() },
    onSelectLines: vi.fn(),
    onSetMode: vi.fn(),
    onSave: vi.fn(),
    onExport: vi.fn(),
    onProjectSettings: vi.fn(),
    onPublish: vi.fn(),
    onViewPublic: vi.fn(),
    onChangeSong: vi.fn(),
    onTakeTour: vi.fn(),
    onNewProject: vi.fn(),
    onRemoveAll: vi.fn(),
  };
}

function setup(over: Partial<PhoneToolsSheetProps> = {}) {
  const h = handlers();
  const props = {
    open: true, editorMode: 'lrc', hasLines: true, shiftAmount: 0.5, canRedo: true,
    unmarkedOnly: false, wordsLocked: false, ...h, ...over,
  } as PhoneToolsSheetProps;
  render(<TooltipProvider><PhoneToolsSheet {...props} /></TooltipProvider>);
  return h;
}

describe('PhoneToolsSheet', () => {
  type Case = [string, RegExp, (h: ReturnType<typeof handlers>) => ReturnType<typeof vi.fn>, unknown[]?];
  const table: Case[] = [
    ['Auto Stamp', /^auto stamp$/i, (h) => h.autoStamp.onStart],
    ['shift all earlier', /shift all earlier by 0\.5 s/i, (h) => h.onShiftAll, [-1]],
    ['shift all later', /shift all later by 0\.5 s/i, (h) => h.onShiftAll, [1]],
    ['redo', /^redo$/i, (h) => h.onRedo],
    ['clear all timestamps', /clear all timestamps/i, (h) => h.onClearAllTimestamps],
    ['unmarked filter', /show only unmarked lines/i, (h) => h.onToggleUnmarked],
    ['find lyrics', /search lyrics/i, (h) => h.onFindLyrics],
    ['import', /import lyrics/i, (h) => h.onImport],
    ['edit text', /edit lyrics text/i, (h) => h.onEditText],
    ['translate / secondary', /secondary|translat/i, (h) => h.onSecondary],
    ['furigana', /furigana/i, (h) => h.onFurigana],
    ['reading format', /katakana/i, (h) => h.readingFormat.onToggle],
    ['select lines', /select lines/i, (h) => h.onSelectLines],
    ['SRT mode', /SRT:/, (h) => h.onSetMode, ['srt']],
    ['Words mode', /Words$/, (h) => h.onSetMode, ['words']],
    ['save', /^save$/i, (h) => h.onSave],
    ['export', /^export lrc$/i, (h) => h.onExport],
    ['publish', /publish$/i, (h) => h.onPublish],
    ['public page', /view as public/i, (h) => h.onViewPublic],
    ['project settings', /project settings/i, (h) => h.onProjectSettings],
    ['change media', /change media/i, (h) => h.onChangeSong],
    ['take the tour', /take the tour/i, (h) => h.onTakeTour],
    ['new project', /new project/i, (h) => h.onNewProject],
    ['remove all', /remove all lyrics/i, (h) => h.onRemoveAll],
  ];

  it.each(table)('%s calls its handler exactly once and closes the sheet', (_name, label, pick, args) => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: label }));
    const fn = pick(h);
    expect(fn).toHaveBeenCalledTimes(1);
    if (args) expect(fn).toHaveBeenCalledWith(...args);
    expect(h.onClose).toHaveBeenCalledTimes(1);
  });

  it('is a labelled dialog whose rows are all at least 44px tall by class', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Tools' })).toBeInTheDocument();
    for (const b of screen.getAllByRole('button').filter((b) => b.className.includes('rounded-2xl'))) {
      expect(b.className).toContain('min-h-11');
    }
  });

  it('LRC is marked as the current mode', () => {
    setup();
    expect(screen.getByRole('button', { name: /LRC:/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /SRT:/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('hides entries the desktop hides', () => {
    setup({ onSave: undefined, onPublish: undefined, onViewPublic: undefined, onChangeSong: undefined, onSecondary: undefined, onFurigana: undefined, onProjectSettings: undefined });
    for (const name of [/^save$/i, /publish$/i, /view as public/i, /change media/i, /secondary|translat/i, /furigana/i, /project settings/i]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });

  it('disables Auto Stamp with the reason, and does not call it', () => {
    const h = setup({ autoStamp: { blocked: 'noAudio', onStart: vi.fn() } });
    const btn = screen.getByRole('button', { name: /auto stamp/i });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toHaveTextContent(/load or upload audio first/i);
    fireEvent.click(btn);
    expect(h.onClose).not.toHaveBeenCalled();
  });

  it('explains that a YouTube source needs an audio file when tab capture is unavailable', () => {
    setup({ autoStamp: { blocked: 'youtube', onStart: vi.fn() } });
    const btn = screen.getByRole('button', { name: /auto stamp/i });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toHaveTextContent(/add an audio file/i);
  });

  it('disables Redo when there is nothing to redo, and Words until a line is timed', () => {
    const h = setup({ canRedo: false, wordsLocked: true });
    expect(screen.getByRole('button', { name: /^redo$/i })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('button', { name: /^redo$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Words/ }));
    expect(h.onRedo).not.toHaveBeenCalled();
    expect(h.onSetMode).not.toHaveBeenCalled();
  });

  it('disables line-dependent entries on an empty project', () => {
    setup({ hasLines: false });
    for (const name of [/shift all earlier/i, /clear all timestamps/i, /select lines/i, /^export/i]) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('offers Start session, which closes the sheet first and runs once', () => {
    const onStart = vi.fn();
    const h = setup({ session: { live: false, starting: false, onStart, onManage: vi.fn() } });
    const btn = screen.getByRole('button', { name: /edit this project/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(h.onClose).toHaveBeenCalledTimes(1);
  });

  it('offers Manage session for a live session', () => {
    const onManage = vi.fn();
    setup({ session: { live: true, starting: false, onStart: vi.fn(), onManage } });
    fireEvent.click(screen.getByRole('button', { name: /manage session/i }));
    expect(onManage).toHaveBeenCalledTimes(1);
  });

  it('a double activation of an action runs it once', () => {
    const h = setup();
    const redo = screen.getByRole('button', { name: /^redo$/i });
    fireEvent.click(redo);
    fireEvent.click(redo);
    expect(h.onRedo).toHaveBeenCalledTimes(1);
  });

  it('offers Clear word timestamps in Words mode only', () => {
    const onClear = vi.fn();
    setup({ editorMode: 'words', onClearAllWordTimestamps: onClear });
    fireEvent.click(screen.getByRole('button', { name: /clear all word timestamps/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('hides Clear word timestamps outside Words mode', () => {
    setup({ editorMode: 'lrc', onClearAllWordTimestamps: vi.fn() });
    expect(screen.queryByRole('button', { name: /clear all word timestamps/i })).toBeNull();
  });
});
