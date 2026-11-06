import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ComponentProps, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Tip } from '@ui/tip';
import ResponsiveModal from '@/shared/ui/ResponsiveModal';
import { serializeToRubyMarkup } from '@/shared/utils/furigana';
import { validateLineSingers } from '@features/editor/utils/sections';
import type { EditorLine, EditorWord } from '@/features/editor/editor.types';
import type EditorLineItem from '../line/EditorLineItem';
import { EditorLineContextMenu } from '../line/EditorLineContextMenu';
import LineActionToolbar from '../line/LineActionToolbar';
import LineTextEditingForm from '../line/LineTextEditingForm';
import { WordsModeChips } from './WordsModeColumn';
import { usePresenceActions, useRemoteActiveLines } from '@/features/collab/collab-presence-context';
import { RemotePointers } from '@/features/collab/components/RemotePointers';
import { pointerOnRow } from '@/features/collab/components/find-row';
import { collabColor } from '@/features/collab/collab-color';

type LineItemProps = ComponentProps<typeof EditorLineItem>;

type WordsFocusLineProps = Pick<LineItemProps,
  | 'settings' | 'selectedLines' | 'focusedTimestamp' | 'setFocusedTimestamp' | 'activeWordIndex'
  | 'handleSetActiveWordIndex' | 'handleClearWordTimestamp' | 'onWordMenu' | 'onLineMenu' | 'stampTarget'
  | 'playerRef' | 'projectSingers' | 'singerColors' | 'songArtists'
  | 'editingLineIndex' | 'setEditingLineIndex' | 'editingText' | 'setEditingText'
  | 'editingSecondary' | 'setEditingSecondary' | 'editingTranslations' | 'setEditingTranslations'
  | 'editingSingers' | 'setEditingSingers' | 'handleSaveLineText'
  | 'handleAddLine' | 'handleClearLine' | 'handleDeleteLine' | 'handleMoveToSection' | 'handleInsertSection'
  | 'handleAssignSinger' | 'handleToggleCounterpart' | 'handleMark' | 'shiftTime' | 'onToggleLineMode'
> & {
  lines: EditorLine[];
  /** The cursor line: the only line words focus shows. */
  lineIndex: number;
  /** Word being sung while the line plays; null when paused. */
  playingWordIndex: number | null;
};

function getSingers(line: EditorLine): string[] {
  return line.singers || [];
}

/**
 * The line words focus works on. Not a list row: there is nothing above or below it to
 * reorder against, hover between or swipe through, so it has no drag, hover or gesture
 * handling and no virtualizer around it. Moving between lines is the sidebar's job.
 */
export const WordsFocusLine = memo(function WordsFocusLine({
  lines,
  lineIndex: i,
  playingWordIndex,
  settings,
  selectedLines,
  focusedTimestamp,
  setFocusedTimestamp,
  activeWordIndex,
  handleSetActiveWordIndex,
  handleClearWordTimestamp,
  onWordMenu,
  onLineMenu,
  stampTarget = 'both',
  playerRef,
  projectSingers,
  singerColors,
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
}: WordsFocusLineProps) {
  const { t } = useTranslation();
  const line = lines[i];
  const editInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingLineIndex === i) {
      const timer = setTimeout(() => editInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [editingLineIndex, i]);

  // Singers of the section this line sits in, which the chips colour words by.
  const activeSingers = useMemo(() => {
    // The cursor can sit past the end for a render: lines shrink under it in a session.
    for (let k = Math.min(i, lines.length) - 1; k >= 0; k--) {
      if (lines[k].type === 'section') return lines[k].singers;
    }
    return undefined;
  }, [lines, i]);

  // This line is always the cursor line, so a word click only seeks and moves the word cursor.
  const handleWordClick = useCallback((e: ReactMouseEvent, w: EditorWord, wi: number, isSecondary?: boolean) => {
    e.stopPropagation();
    if (w.time != null && playerRef?.current?.seek) {
      playerRef.current.seek(w.time);
      if (settings.playback?.seekPlays && playerRef.current.play) playerRef.current.play();
    }
    handleSetActiveWordIndex(wi);
    setFocusedTimestamp({ lineIndex: i, type: isSecondary ? 'secondaryWord' : 'word', wordIndex: wi });
  }, [playerRef, settings.playback?.seekPlays, handleSetActiveWordIndex, setFocusedTimestamp, i]);

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
  const frameRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lineId = line?.id;
  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!presence || !lineId || (e.pointerType !== 'mouse' && e.pointerType !== 'pen')) return;
    const el = contentRef.current;
    if (!el) return;
    const { clientX, clientY } = e;
    presence.setPointer(() => pointerOnRow(el, lineId, clientX, clientY));
  }, [presence, lineId]);
  const handlePointerLeave = useCallback(() => presence?.setPointer(null), [presence]);

  if (!line || line.type === 'section') return null;

  const remoteHere = line.id != null ? remoteActive?.[line.id] : undefined;

  const invalidSingers = validateLineSingers(lines, i);

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
    >
      <div
        ref={frameRef}
        className="group relative flex items-start gap-2 min-h-14 px-3 py-2.5 rounded-[calc(var(--radius)*1.4)]"
        onPointerMove={presence ? handlePointerMove : undefined}
        onPointerLeave={presence ? handlePointerLeave : undefined}
      >
        {remoteHere && (
          <Tip content={t('collab.presence.onLine', { name: remoteHere.name })}>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 rounded-[calc(var(--radius)*1.4)] border border-dashed"
              style={{ borderColor: collabColor(remoteHere.colorIndex) }}
            />
          </Tip>
        )}
        {presence && <RemotePointers scrollRef={frameRef} />}
        <div
          ref={contentRef}
          data-line-id={presence && line.id != null ? line.id : undefined}
          className="flex-1 min-w-0 flex flex-col gap-2 overflow-x-hidden pb-0.5 mt-0.5 select-text"
          onDoubleClick={() => {
            setEditingLineIndex(i);
            setEditingText(serializeToRubyMarkup(line.words) || line.text || '');
            setEditingSecondary(line.secondary || '');
            setEditingTranslations(line.translations ? [...line.translations] : []);
            setEditingSingers([...getSingers(line), '', '', '', ''].slice(0, 4));
          }}
        >
          <WordsModeChips
            line={line as ComponentProps<typeof WordsModeChips>['line']}
            lineIndex={i}
            isActive
            isMobile={false}
            settings={settings}
            focusedTimestamp={focusedTimestamp ?? null}
            stampTarget={stampTarget}
            activeWordIndex={activeWordIndex}
            handleWordClick={handleWordClick as ComponentProps<typeof WordsModeChips>['handleWordClick']}
            handleClearWordTimestamp={handleClearWordTimestamp as ComponentProps<typeof WordsModeChips>['handleClearWordTimestamp']}
            onWordMenu={onWordMenu}
            songSingers={projectSingers}
            singerColors={singerColors}
            activeSingers={activeSingers}
            playingWordIndex={playingWordIndex}
          />
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
        {invalidSingers.length > 0 && (
          <Tip content={t('editor.invalidSingersWarning', { names: invalidSingers.join(', ') })}>
            <span className="text-warning text-[10px] shrink-0 select-none">⚠</span>
          </Tip>
        )}
        {(line.singers?.length ?? 0) >= 2 && onToggleLineMode && (
          <Tip content={t('editor.toggleSingMode')}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const mode = line.mode === 'duet' ? 'split' : 'duet';
                const next: EditorLine = {
                  ...line,
                  mode,
                  words: mode === 'duet' ? line.words?.map(({ singerIndex: _si, ...w }) => w) : line.words,
                };
                onToggleLineMode(i, next);
              }}
              className="text-zinc-600 hover:text-primary text-xs px-1 shrink-0 select-none"
              aria-label={t('editor.toggleSingMode')}
            >
              {line.mode === 'duet' ? t('editor.duetMode') : t('editor.splitMode')}
            </button>
          </Tip>
        )}
        <LineActionToolbar
          line={line as ComponentProps<typeof LineActionToolbar>['line']}
          lineIndex={i}
          isActive
          isSynced={line.timestamp != null}
          editorMode="words"
          settings={settings}
          editingLineIndex={editingLineIndex}
          setEditingLineIndex={setEditingLineIndex}
          setEditingText={setEditingText}
          setEditingSecondary={setEditingSecondary}
          setEditingTranslations={setEditingTranslations as ComponentProps<typeof LineActionToolbar>['setEditingTranslations']}
          setEditingSingers={setEditingSingers}
          serializeToRubyMarkup={serializeToRubyMarkup}
          handleInsertSection={handleInsertSection}
          handleMoveToSection={handleMoveToSection as ComponentProps<typeof LineActionToolbar>['handleMoveToSection']}
          sectionLines={lines as ComponentProps<typeof LineActionToolbar>['sectionLines']}
          handleAssignSinger={handleAssignSinger}
          songArtists={songArtists}
          handleMark={handleMark as ComponentProps<typeof LineActionToolbar>['handleMark']}
          playerRef={playerRef as ComponentProps<typeof LineActionToolbar>['playerRef']}
          onPlayLine={handlePlayLine}
          shiftTime={shiftTime}
          handleAddLine={handleAddLine as ComponentProps<typeof LineActionToolbar>['handleAddLine']}
          handleClearLine={handleClearLine as ComponentProps<typeof LineActionToolbar>['handleClearLine']}
          handleDeleteLine={handleDeleteLine}
          selectedLines={selectedLines}
          isMobile={false}
          onLineMenu={onLineMenu}
          stampTarget={stampTarget}
          activeWordIndex={activeWordIndex}
          focusedTimestamp={focusedTimestamp}
        />
      </div>
    </EditorLineContextMenu>
  );
});
