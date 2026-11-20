import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from '@ui/context-menu';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@ui/dropdown-menu';
import { contextMenuComponents, dropdownMenuComponents, type MenuComponents } from '@ui/menu-components';
import { Tip } from '@ui/tip';
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
export function MenuShortcut({ shortcut, fallback, danger = false }: { shortcut: string; fallback: string; danger?: boolean }) {
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

/** What a single line's menu can do; shared by right-click and the row's ⋯ button. */
type LineActions = {
  line: EditorLine;
  lineIndex: number;
  sectionLines?: EditorLine[];
  handleAddLine?: (i: number, line?: EditorLine | null, opts?: { before?: boolean }) => void;
  handleClearLine?: (i: number) => void;
  handleDeleteLine: (i: number) => void;
  /** Collab: someone else holds this line's lock. */
  deleteDisabled?: boolean;
  handleMoveToSection?: (indices: number[], target: number) => void;
  handleInsertSection?: (i: number) => void;
  handleAssignSinger?: (name: string, indices: number[], slot: number) => void;
  songArtists?: string[];
  handleToggleCounterpart?: (lineIndex: number) => void;
  /** Play from the line's timestamp; shown only once the line has one. */
  onPlayLine?: () => void;
  /** Opens the line's inline editor (for a section, its label). */
  onEditLine?: () => void;
};

interface Props extends LineActions {
  children: React.ReactNode;
  isSection: boolean;
  selectedLines: Set<number>;
  onToggleDepth?: (i: number) => void;
  /** Phone rows open the line sheet instead (see PhoneLineSheet). */
  disabled?: boolean;
  /** Items shown first, above the usual ones (words focus puts the line's own toolbar actions here). */
  leadingItems?: React.ReactNode;
}

function sectionTargets(sectionLines: EditorLine[] | undefined, lineIndex: number) {
  return (sectionLines || [])
    .map((l, i) => ({ line: l, index: i }))
    .filter(({ line: l, index }) => l.type === 'section' && index !== lineIndex);
}

/**
 * Singers are ticked, not picked: a line can have several, and the tick shows who is on it.
 * The menu stays open on a tick so a duet is two clicks in one visit.
 */
function SingerSub({ C, indices, allLines, handleAssignSinger, songArtists }: {
  C: MenuComponents;
  indices: number[];
  allLines: EditorLine[];
  handleAssignSinger?: LineActions['handleAssignSinger'];
  songArtists?: string[];
}) {
  const { t } = useTranslation();
  if (!handleAssignSinger || !songArtists?.length) return null;
  return (
    <C.Sub>
      <C.SubTrigger>
        <Icon name="person" />
        {t('editor.assignSingerToLines', { count: indices.length })}
      </C.SubTrigger>
      <C.SubContent>
        <C.Label>{t('editor.assignSingerHint')}</C.Label>
        {songArtists.map((artist) => (
          <C.CheckboxItem
            key={artist}
            checked={indices.length > 0 && indices.every((i) => allLines[i]?.singers?.includes(artist))}
            onSelect={(e: Event) => e.preventDefault()}
            onCheckedChange={() => toggleSingerOnLines(allLines, indices, artist, handleAssignSinger)}
          >
            {artist}
          </C.CheckboxItem>
        ))}
        <C.Separator />
        <C.Item onClick={() => clearSingersOnLines(allLines, indices, handleAssignSinger)}>
          <Icon name="person_off" />
          {t('editor.clearSingers')}
        </C.Item>
      </C.SubContent>
    </C.Sub>
  );
}

function MoveToSectionSub({ C, indices, sections, handleMoveToSection }: {
  C: MenuComponents;
  indices: number[];
  sections: ReturnType<typeof sectionTargets>;
  handleMoveToSection?: LineActions['handleMoveToSection'];
}) {
  const { t } = useTranslation();
  if (!handleMoveToSection || sections.length === 0) return null;
  return (
    <C.Sub>
      <C.SubTrigger>
        <Icon name="layers" />
        {t('editor.moveToSection')}
      </C.SubTrigger>
      <C.SubContent>
        {sections.map(({ line: sl, index }) => (
          <C.Item key={index} onClick={() => handleMoveToSection(indices, index)}>
            <Icon name="format_list_bulleted" />
            {formatSectionLabel(sl.label, t)}
          </C.Item>
        ))}
      </C.SubContent>
    </C.Sub>
  );
}

/**
 * One line's items, written once and rendered through either component set, so right-click
 * and the ⋯ button cannot drift apart (they had: the button lacked singers, counterparts and
 * the collab lock on delete).
 */
function LineMenuItems({
  C, line, lineIndex, sectionLines, handleAddLine, handleClearLine, handleDeleteLine, deleteDisabled = false,
  handleMoveToSection, handleInsertSection, handleAssignSinger, songArtists, handleToggleCounterpart,
  onPlayLine, onEditLine,
}: LineActions & { C: MenuComponents }) {
  const { t } = useTranslation();
  const text = line.text?.trim() ?? '';

  const copyText = () => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(t('editor.lineTextCopied')))
      .catch(() => {});
  };

  const hasLead = (onPlayLine && line.timestamp != null) || onEditLine || text;
  return (
    <>
      {hasLead && (
        <>
          {onPlayLine && line.timestamp != null && (
            <C.Item onClick={onPlayLine}>
              <Icon name="play_arrow" />
              {t('editor.words.playFromHere')}
            </C.Item>
          )}
          {onEditLine && (
            <C.Item onClick={onEditLine}>
              <Icon name="edit" />
              {t('editor.editLine')}
            </C.Item>
          )}
          {text && (
            <C.Item onClick={copyText}>
              <Icon name="content_copy" />
              {t('editor.copyLineText')}
            </C.Item>
          )}
          <C.Separator />
        </>
      )}
      {handleAddLine && (
        <>
          <C.Item onClick={() => handleAddLine(lineIndex, null, { before: true })}>
            <Icon name="vertical_align_top" />
            {t('editor.insertLineAbove')}
          </C.Item>
          <C.Item onClick={() => handleAddLine(lineIndex)}>
            <Icon name="vertical_align_bottom" />
            {t('editor.insertLineBelow')}
            <MenuShortcut shortcut="addLine" fallback="Ctrl+Enter" />
          </C.Item>
          <C.Item onClick={() => handleAddLine(lineIndex, { ...line, id: crypto.randomUUID() })}>
            <Icon name="post_add" />
            {t('editor.duplicateLine')}
            <MenuShortcut shortcut="duplicateLine" fallback="Ctrl+D" />
          </C.Item>
        </>
      )}
      {handleInsertSection && (
        <C.Item onClick={() => handleInsertSection(lineIndex - 1)}>
          <Icon name="layers" />
          {t('editor.insertSectionAbove')}
        </C.Item>
      )}
      <C.Separator />
      <MoveToSectionSub C={C} indices={[lineIndex]} sections={sectionTargets(sectionLines, lineIndex)} handleMoveToSection={handleMoveToSection} />
      <SingerSub C={C} indices={[lineIndex]} allLines={sectionLines ?? []} handleAssignSinger={handleAssignSinger} songArtists={songArtists} />
      {handleToggleCounterpart && (
        <C.Item onClick={() => handleToggleCounterpart(lineIndex)}>
          <Icon name="queue_music" />
          {line.adLibOf != null ? t('editor.unmarkCounterpart') : t('editor.markCounterpart')}
        </C.Item>
      )}
      {/* Gold: the timestamp is lost, but undo brings it back. */}
      {line.timestamp != null && handleClearLine && (
        <C.Item variant="warning" onClick={() => handleClearLine(lineIndex)}>
          <Icon name="ink_eraser" />
          {t('editor.clearTimestamp')}
        </C.Item>
      )}
      <C.Separator />
      <C.Item variant="destructive" disabled={deleteDisabled} onClick={() => handleDeleteLine(lineIndex)}>
        <Icon name="delete" />
        {t('editor.removeLine')}
        <MenuShortcut shortcut="deleteLine" fallback="Delete" danger />
      </C.Item>
    </>
  );
}

/** The row's visible ⋯ button: the pointer- and keyboard-reachable way to the right-click items. */
export function EditorLineMenuButton({ className, ...actions }: LineActions & { className?: string }) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <Tip content={t('editor.lineOptions')}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('editor.lineOptions')}
            onClick={(e) => e.stopPropagation()}
            className={className}
          >
            <Icon name="more_horiz" size={16} />
          </button>
        </DropdownMenuTrigger>
      </Tip>
      {/* Portalled, but still a React child of the row: keep clicks from reaching its handlers. */}
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <LineMenuItems C={dropdownMenuComponents} {...actions} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EditorLineContextMenu({
  children,
  isSection,
  selectedLines,
  onToggleDepth,
  disabled = false,
  leadingItems,
  ...actions
}: Props) {
  const { t } = useTranslation();
  const { line, lineIndex, sectionLines, handleAddLine, handleClearLine, handleDeleteLine, deleteDisabled = false, handleMoveToSection, handleAssignSinger, songArtists, onEditLine } = actions;
  const C = contextMenuComponents;

  const isMultiSelect = selectedLines.size > 1 && selectedLines.has(lineIndex);
  const selectedCount = selectedLines.size;
  const isRoot = line.depth === 0;

  let content: ReactNode;
  if (isSection) {
    content = (
      <>
        <ContextMenuLabel>{t('editor.sectionDefault')}</ContextMenuLabel>
        {onEditLine && (
          <ContextMenuItem onClick={onEditLine}>
            <Icon name="edit" />
            {t('editor.renameSection')}
          </ContextMenuItem>
        )}
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
      </>
    );
  } else if (isMultiSelect) {
    const indices = [...selectedLines];
    content = (
      <>
        <ContextMenuLabel>{t('editor.selection.count', { count: selectedCount })}</ContextMenuLabel>
        {handleClearLine && (
          <ContextMenuItem variant="warning" onClick={() => selectedLines.forEach(i => handleClearLine(i))}>
            <Icon name="ink_eraser" />
            {t('editor.selection.clearTimestamps')}
          </ContextMenuItem>
        )}
        <MoveToSectionSub C={C} indices={indices} sections={sectionTargets(sectionLines, lineIndex)} handleMoveToSection={handleMoveToSection} />
        <SingerSub C={C} indices={indices} allLines={sectionLines ?? []} handleAssignSinger={handleAssignSinger} songArtists={songArtists} />
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" disabled={deleteDisabled} onClick={() => indices.forEach(i => handleDeleteLine(i))}>
          <Icon name="delete" />
          {t('editor.selection.removeN', { count: selectedCount })}
          <MenuShortcut shortcut="deleteLine" fallback="Delete" danger />
        </ContextMenuItem>
      </>
    );
  } else {
    content = (
      <>
        {leadingItems && (
          <>
            {leadingItems}
            <ContextMenuSeparator />
          </>
        )}
        <LineMenuItems C={C} {...actions} />
      </>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={disabled}>{children}</ContextMenuTrigger>
      <ContextMenuContent>{content}</ContextMenuContent>
    </ContextMenu>
  );
}
