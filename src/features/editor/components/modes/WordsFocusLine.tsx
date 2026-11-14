import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ComponentProps, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Tip } from '@ui/tip';
import {
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@ui/context-menu';
import { Icon } from '@/shared/ui/Icon';
import ResponsiveModal from '@/shared/ui/ResponsiveModal';
import { serializeToRubyMarkup } from '@/shared/utils/furigana';
import { validateLineSingers } from '@features/editor/utils/sections';
import type { EditorLine } from '@/features/editor/editor.types';
import type EditorLineItem from '../line/EditorLineItem';
import { EditorLineContextMenu, MenuShortcut } from '../line/EditorLineContextMenu';
import LineTextEditingForm from '../line/LineTextEditingForm';
import { usePresenceActions, useRemoteActiveLines } from '@/features/collab/collab-presence-context';
import { RemotePointers } from '@/features/collab/components/RemotePointers';
import { pointerOnRow } from '@/features/collab/components/find-row';
import { collabColor } from '@/features/collab/collab-color';
import { openContextMenuAt } from './WordsFocus';

type LineItemProps = ComponentProps<typeof EditorLineItem>;

/** What the focused line hands the timeline inside it. */
export interface WordsFocusLineApi {
  /** Opens the line's text editor (the old pill's pencil, or a double-click on a word). */
  editLine: () => void;
  /** Opens the line's context menu under `anchor` (the ⋮ next to the line's controls). */
  openLineMenu: (anchor: HTMLElement) => void;
}

type WordsFocusLineProps = Pick<LineItemProps,
  | 'settings' | 'selectedLines' | 'playerRef' | 'projectSingers' | 'songArtists'
  | 'editingLineIndex' | 'setEditingLineIndex' | 'editingText' | 'setEditingText'
  | 'editingSecondary' | 'setEditingSecondary' | 'editingTranslations' | 'setEditingTranslations'
  | 'editingSingers' | 'setEditingSingers' | 'handleSaveLineText'
  | 'handleAddLine' | 'handleClearLine' | 'handleDeleteLine' | 'handleMoveToSection' | 'handleInsertSection'
  | 'handleAssignSinger' | 'handleToggleCounterpart' | 'handleMark' | 'shiftTime' | 'onToggleLineMode'
> & {
  lines: EditorLine[];
  /** The cursor line: the only line words focus shows. */
  lineIndex: number;
  /** The line's body: the word timeline. */
  children: (api: WordsFocusLineApi) => ReactNode;
};

function getSingers(line: EditorLine): string[] {
  return line.singers || [];
}

/**
 * The line words focus works on. Everything the line row's toolbar and ⋯ menu offered lives in
 * its context menu now (right-click anywhere on the line, or the ⋮ button), so the timeline can
 * take the whole height. Not a list row: there is nothing above or below it to reorder against,
 * so it has no drag, hover or gesture handling and no virtualizer around it.
 */
export const WordsFocusLine = memo(function WordsFocusLine({
  lines,
  lineIndex: i,
  settings,
  selectedLines,
  playerRef,
  projectSingers,
  songArtists,
  editingLineIndex,
  setEditingLineIndex,
  editingText,
  setEditingText,
  editingSecondary,
  setEditingSecondary,
  editingTranslations,
  setEditingTranslations,
  editingSingers,
  setEditingSingers,
  handleSaveLineText,
  handleAddLine,
  handleClearLine,
  handleDeleteLine,
  handleMoveToSection,
  handleInsertSection,
  handleAssignSinger,
  handleToggleCounterpart,
  handleMark,
  shiftTime,
  onToggleLineMode,
  children,
}: WordsFocusLineProps) {
  const { t } = useTranslation();
  const line = lines[i];
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editingLineIndex === i) {
      const timer = setTimeout(() => editInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [editingLineIndex, i]);

  const editLine = useCallback(() => {
    if (!line) return;
    setEditingLineIndex(i);
    setEditingText(serializeToRubyMarkup(line.words) || line.text || '');
    setEditingSecondary(line.secondary || '');
    setEditingTranslations(line.translations ? [...line.translations] : []);
    setEditingSingers([...getSingers(line), '', '', '', ''].slice(0, 4));
  }, [line, i, setEditingLineIndex, setEditingText, setEditingSecondary, setEditingTranslations, setEditingSingers]);

  const openLineMenu = useCallback((anchor: HTMLElement) => openContextMenuAt(frameRef.current, anchor), []);
  const api = useMemo(() => ({ editLine, openLineMenu }), [editLine, openLineMenu]);

  const handlePlayLine = useCallback(() => {
    const player = playerRef?.current;
    if (line?.timestamp == null || !player?.seek) return;
    player.seek(line.timestamp);
    player.play?.();
  }, [line?.timestamp, playerRef]);

  // Collab presence (inert outside a session): the pointer is a fraction of this line's content
  // box, as the line list's is of its row, so it lands on the same lyric in either view.
  const presence = usePresenceActions();
  const remoteActive = useRemoteActiveLines();
  const lineId = line?.id;
  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!presence || !lineId || (e.pointerType !== 'mouse' && e.pointerType !== 'pen')) return;
    const el = frameRef.current;
    if (!el) return;
    const { clientX, clientY } = e;
    presence.setPointer(() => pointerOnRow(el, lineId, clientX, clientY));
  }, [presence, lineId]);
  const handlePointerLeave = useCallback(() => presence?.setPointer(null), [presence]);

  if (!line || line.type === 'section') return null;

  const remoteHere = line.id != null ? remoteActive?.[line.id] : undefined;
  const invalidSingers = validateLineSingers(lines, i);
  const nudge = settings.editor?.nudge?.default || 0.1;
  const fine = settings.editor?.nudge?.fine || 0.01;

  // What the line row's toolbar held: mark, play, nudge, edit, and the sing-together switch.
  const leadingItems = (
    <>
      <ContextMenuItem onClick={() => handleMark?.()}>
        <Icon name="bookmark_add" />
        {t('editor.mark')}
        <MenuShortcut shortcut="mark" fallback="Enter" />
      </ContextMenuItem>
      {line.timestamp != null && (
        <ContextMenuItem onClick={handlePlayLine}>
          <Icon name="play_arrow" />
          {t('editor.words.playLine')}
        </ContextMenuItem>
      )}
      {line.timestamp != null && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Icon name="swap_horiz" />
            {t('editor.nudgeLine', { delta: `±${nudge}` })}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {[-nudge, nudge, -fine, fine].map((delta) => (
              // Stays open, so a line can be walked into place a step at a time.
              <ContextMenuItem key={delta} onSelect={(e) => e.preventDefault()} onClick={() => shiftTime?.(i, delta)}>
                <Icon name={delta < 0 ? 'chevron_left' : 'chevron_right'} />
                {t('editor.nudgeLine', { delta: `${delta > 0 ? '+' : ''}${delta}` })}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
      <ContextMenuItem onClick={editLine}>
        <Icon name="edit" />
        {t('editor.editLine')}
      </ContextMenuItem>
      {(line.singers?.length ?? 0) >= 2 && onToggleLineMode && (
        <ContextMenuItem
          onClick={() => {
            const mode = line.mode === 'duet' ? 'split' : 'duet';
            const next: EditorLine = {
              ...line,
              mode,
              words: mode === 'duet' ? line.words?.map(({ singerIndex: _si, ...w }) => w) : line.words,
            };
            onToggleLineMode(i, next);
          }}
        >
          <Icon name="group" />
          {line.mode === 'duet' ? t('editor.splitMode') : t('editor.duetMode')}
        </ContextMenuItem>
      )}
    </>
  );

  return (
    <EditorLineContextMenu
      line={line}
      lineIndex={i}
      isSection={false}
      selectedLines={selectedLines}
      sectionLines={lines}
      handleAddLine={handleAddLine as (i: number, line?: EditorLine | null, opts?: { before?: boolean }) => void}
      handleClearLine={handleClearLine}
      handleDeleteLine={handleDeleteLine}
      handleMoveToSection={handleMoveToSection as unknown as (indices: number[], target: number) => void}
      handleInsertSection={handleInsertSection}
      handleAssignSinger={handleAssignSinger}
      songArtists={songArtists}
      handleToggleCounterpart={handleToggleCounterpart}
      leadingItems={leadingItems}
    >
      <div
        ref={frameRef}
        data-line-id={presence && line.id != null ? line.id : undefined}
        className="relative flex min-h-0 flex-1 flex-col"
        onPointerMove={presence ? handlePointerMove : undefined}
        onPointerLeave={presence ? handlePointerLeave : undefined}
      >
        {remoteHere && (
          <Tip content={t('collab.presence.onLine', { name: remoteHere.name })}>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-30 rounded-[var(--radius-card)] border border-dashed"
              style={{ borderColor: collabColor(remoteHere.colorIndex) }}
            />
          </Tip>
        )}
        {presence && <RemotePointers scrollRef={frameRef} />}
        {invalidSingers.length > 0 && (
          <Tip content={t('editor.invalidSingersWarning', { names: invalidSingers.join(', ') })}>
            <span className="absolute -top-5 right-1 z-30 text-[11px] text-warning select-none">⚠ {invalidSingers.join(', ')}</span>
          </Tip>
        )}
        {children(api)}
        <ResponsiveModal
          open={editingLineIndex === i}
          onOpenChange={(open) => {
            if (!open) {
              handleSaveLineText(i, editingText, editingSecondary, editingTranslations, editingSingers);
              setEditingLineIndex(null);
            }
          }}
          title={t('editor.editLine')}
        >
          <div className="pt-2">
            <LineTextEditingForm
              ref={editInputRef}
              lineIndex={i}
              editingText={editingText}
              setEditingText={setEditingText}
              editingSecondary={editingSecondary}
              setEditingSecondary={setEditingSecondary}
              editingTranslations={editingTranslations as ComponentProps<typeof LineTextEditingForm>['editingTranslations']}
              setEditingTranslations={setEditingTranslations as ComponentProps<typeof LineTextEditingForm>['setEditingTranslations']}
              editingSingers={editingSingers}
              setEditingSingers={setEditingSingers}
              handleSaveLineText={handleSaveLineText}
              setEditingLineIndex={setEditingLineIndex}
              songArtists={songArtists}
              projectSingers={projectSingers}
            />
          </div>
        </ResponsiveModal>
      </div>
    </EditorLineContextMenu>
  );
});
