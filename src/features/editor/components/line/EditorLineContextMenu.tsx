import { useTranslation } from 'react-i18next';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuLabel,
  ContextMenuCheckboxItem,
} from '@ui/context-menu';
import { Icon } from '@/shared/ui/Icon';
import { Kbd, KbdGroup } from '@ui/kbd';
import { shortcutParts } from '@features/settings/key-symbols';
import { useSettings } from '@/features/settings/useSettings';
import { formatSectionLabel } from '@features/editor/constants/section-types';
import { toggleSingerOnLines, clearSingersOnLines } from '@features/editor/utils/sections';

// Shortcut keys at the end of a menu row: smaller and quieter than a key cap in body text,
// and hidden where there is no keyboard.
const KEYS = 'ml-auto pl-3 coarse:hidden';
const KEY = 'h-[22px] min-w-[22px] text-[11px] text-subtle';

/**
 * The key for a menu row, as the viewer has it bound. Mounted only while the menu is open, so the
 * hundreds of rows that carry this menu do not each re-render on every settings change.
 */
function MenuShortcut({ shortcut, fallback, danger = false }: { shortcut: string; fallback: string; danger?: boolean }) {
  const { settings } = useSettings();
  const binding: string = settings.shortcuts?.[shortcut]?.[0] || fallback;
  return (
    <KbdGroup className={KEYS}>
      {shortcutParts(binding).map((cap, i) => (
        <Kbd key={i} className={`${KEY}${danger ? ' text-love-ink' : ''}`}>{cap.trim() || cap}</Kbd>
      ))}
    </KbdGroup>
  );
}
import type { EditorLine } from '@/features/editor/editor.types';

interface Props {
  children: React.ReactNode;
  line: EditorLine;
  lineIndex: number;
  isSection: boolean;
  selectedLines: Set<number>;
  sectionLines?: EditorLine[];
  handleAddLine?: (i: number, line?: EditorLine | null, opts?: { before?: boolean }) => void;
  handleClearLine?: (i: number) => void;
  handleDeleteLine: (i: number) => void;
  /** Collab: someone else holds this line's lock. */
  deleteDisabled?: boolean;
  handleMoveToSection?: (indices: number[], target: number) => void;
  handleInsertSection?: (i: number) => void;
  onToggleDepth?: (i: number) => void;
  handleAssignSinger?: (name: string, indices: number[], slot: number) => void;
  songArtists?: string[];
  handleToggleCounterpart?: (lineIndex: number) => void;
  /** Phone rows open the line sheet instead (see PhoneLineSheet). */
  disabled?: boolean;
}

export function EditorLineContextMenu({
  children,
  line,
  lineIndex,
  isSection,
  selectedLines,
  sectionLines,
  handleAddLine,
  handleClearLine,
  handleDeleteLine,
  deleteDisabled = false,
  handleMoveToSection,
  handleInsertSection,
  onToggleDepth,
  handleAssignSinger,
  songArtists,
  handleToggleCounterpart,
  disabled = false,
}: Props) {
  const { t } = useTranslation();

  const isMultiSelect = selectedLines.size > 1 && selectedLines.has(lineIndex);
  const selectedCount = selectedLines.size;

  const sections = (sectionLines || [])
    .map((l, i) => ({ line: l, index: i }))
    .filter(({ line: l, index }) => l.type === 'section' && index !== lineIndex);

  const isRoot = line.depth === 0;

  // Singers are ticked, not picked: a line can have several, and the tick shows who is on it.
  // The menu stays open on a tick so a duet is two clicks in one visit.
  const allLines = sectionLines ?? [];
  const singerItems = (indices: number[]) => handleAssignSinger && songArtists && songArtists.length > 0 && (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <Icon name="person" />
        {t('editor.assignSingerToLines', { count: indices.length })}
      </ContextMenuSubTrigger>
      <ContextMenuSubContent>
        <ContextMenuLabel>{t('editor.assignSingerHint')}</ContextMenuLabel>
        {songArtists.map((artist) => (
          <ContextMenuCheckboxItem
            key={artist}
            checked={indices.length > 0 && indices.every((i) => allLines[i]?.singers?.includes(artist))}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggleSingerOnLines(allLines, indices, artist, handleAssignSinger)}
          >
            {artist}
          </ContextMenuCheckboxItem>
        ))}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => clearSingersOnLines(allLines, indices, handleAssignSinger)}>
          <Icon name="person_off" />
          {t('editor.clearSingers')}
        </ContextMenuItem>
      </ContextMenuSubContent>
    </ContextMenuSub>
  );

  if (isSection) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild disabled={disabled}>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>{t('editor.sectionDefault')}</ContextMenuLabel>
          {handleAddLine && (
            <ContextMenuItem onClick={() => handleAddLine(lineIndex)}>
              <Icon name="vertical_align_bottom" />
              {t('editor.insertLineBelow')}
            </ContextMenuItem>
          )}
          {onToggleDepth && (
            <ContextMenuItem onClick={() => onToggleDepth(lineIndex)}>
              {isRoot ? <Icon name="expand_more" /> : <Icon name="expand_less" />}
              {isRoot ? t('editor.sections.demote') : t('editor.sections.promote')}
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" disabled={deleteDisabled} onClick={() => handleDeleteLine(lineIndex)}>
            <Icon name="delete" />
            {t('editor.deleteSection')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  if (isMultiSelect) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild disabled={disabled}>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>{t('editor.selection.count', { count: selectedCount})}</ContextMenuLabel>
          {handleClearLine && (
            <ContextMenuItem variant="warning" onClick={() => selectedLines.forEach(i => handleClearLine!(i))}>
              <Icon name="ink_eraser" />
              {t('editor.selection.clearTimestamps')}
            </ContextMenuItem>
          )}
          {handleMoveToSection && sections.length > 0 && (
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Icon name="layers" />
                {t('editor.moveToSection')}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {sections.map(({ line: sl, index }) => (
                  <ContextMenuItem key={index} onClick={() => handleMoveToSection([...selectedLines], index)}>
                    <Icon name="format_list_bulleted" />
                    {formatSectionLabel(sl.label, t)}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
          {singerItems([...selectedLines])}
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" disabled={deleteDisabled} onClick={() => [...selectedLines].forEach(i => handleDeleteLine(i))}>
            <Icon name="delete" />
            {t('editor.selection.removeN', { count: selectedCount})}
            <MenuShortcut shortcut="deleteLine" fallback="Delete" danger />
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={disabled}>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {handleAddLine && (
          <>
            <ContextMenuItem onClick={() => handleAddLine(lineIndex, null, { before: true })}>
              <Icon name="vertical_align_top" />
              {t('editor.insertLineAbove')}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAddLine(lineIndex)}>
              <Icon name="vertical_align_bottom" />
              {t('editor.insertLineBelow')}
              <MenuShortcut shortcut="addLine" fallback="Ctrl+Enter" />
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAddLine(lineIndex, { ...line, id: crypto.randomUUID() })}>
              <Icon name="content_copy" />
              {t('editor.duplicateLine')}
              <MenuShortcut shortcut="duplicateLine" fallback="Ctrl+D" />
            </ContextMenuItem>
          </>
        )}
        {handleInsertSection && (
          <ContextMenuItem onClick={() => handleInsertSection(lineIndex - 1)}>
            <Icon name="layers" />
            {t('editor.insertSectionAbove')}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        {handleMoveToSection && sections.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Icon name="layers" />
              {t('editor.moveToSection')}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {sections.map(({ line: sl, index }) => (
                <ContextMenuItem key={index} onClick={() => handleMoveToSection([lineIndex], index)}>
                  <Icon name="format_list_bulleted" />
                  {formatSectionLabel(sl.label, t)}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        {singerItems([lineIndex])}
        {handleToggleCounterpart && (
          <ContextMenuItem onClick={() => handleToggleCounterpart(lineIndex)}>
            <Icon name="queue_music" />
            {line.adLibOf != null ? t('editor.unmarkCounterpart') : t('editor.markCounterpart')}
          </ContextMenuItem>
        )}
        {/* Gold: the timestamp is lost, but undo brings it back. */}
        {line.timestamp != null && handleClearLine && (
          <ContextMenuItem variant="warning" onClick={() => handleClearLine(lineIndex)}>
            <Icon name="ink_eraser" />
            {t('editor.clearTimestamp')}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" disabled={deleteDisabled} onClick={() => handleDeleteLine(lineIndex)}>
          <Icon name="delete" />
          {t('editor.removeLine')}
          <MenuShortcut shortcut="deleteLine" fallback="Delete" danger />
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
