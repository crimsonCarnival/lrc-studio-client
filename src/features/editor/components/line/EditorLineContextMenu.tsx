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
} from '@ui/context-menu';
import { Icon } from '@/shared/ui/Icon';
import { Kbd, KbdGroup } from '@ui/kbd';
import { formatSectionLabel } from '@features/editor/constants/section-types';

// Shortcut keys at the end of a menu row: smaller and quieter than a key cap in body text,
// and hidden where there is no keyboard.
const KEYS = 'ml-auto pl-3 coarse:hidden';
const KEY = 'h-[22px] min-w-[22px] text-[11px] text-subtle';
import type { EditorLine } from '@/features/editor/services/editor.service';

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
  handleMoveToSection?: (indices: number[], target: number) => void;
  handleInsertSection?: (i: number) => void;
  onToggleDepth?: (i: number) => void;
  handleAssignSinger?: (name: string, indices: number[], slot: number) => void;
  songArtists?: string[];
  handleToggleCounterpart?: (lineIndex: number) => void;
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
  handleMoveToSection,
  handleInsertSection,
  onToggleDepth,
  handleAssignSinger,
  songArtists,
  handleToggleCounterpart,
}: Props) {
  const { t } = useTranslation();

  const isMultiSelect = selectedLines.size > 1 && selectedLines.has(lineIndex);
  const selectedCount = selectedLines.size;

  const sections = (sectionLines || [])
    .map((l, i) => ({ line: l, index: i }))
    .filter(({ line: l, index }) => l.type === 'section' && index !== lineIndex);

  const isRoot = line.depth === 0;

  if (isSection) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
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
          <ContextMenuItem variant="destructive" onClick={() => handleDeleteLine(lineIndex)}>
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
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
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
          {handleAssignSinger && songArtists && songArtists.length > 0 && (
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Icon name="person" />
                {t('editor.assignSingerToLines', { count: selectedCount})}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {songArtists.map(artist => (
                  <ContextMenuItem key={artist} onClick={() => handleAssignSinger(artist, [...selectedLines], 0)}>
                    <Icon name="person" />
                    {artist}
                  </ContextMenuItem>
                ))}
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => handleAssignSinger('', [...selectedLines], 0)}>
                  <Icon name="person_off" />
                  {t('editor.clearSingers')}
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={() => [...selectedLines].forEach(i => handleDeleteLine(i))}>
            <Icon name="delete" />
            {t('editor.selection.removeN', { count: selectedCount})}
            <KbdGroup className={KEYS}><Kbd className={`${KEY} text-love-ink`}>Del</Kbd></KbdGroup>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
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
              <KbdGroup className={KEYS}><Kbd className={KEY}>Alt</Kbd><Kbd className={KEY}>N</Kbd></KbdGroup>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAddLine(lineIndex, { ...line, id: crypto.randomUUID() })}>
              <Icon name="content_copy" />
              {t('editor.duplicateLine')}
              <KbdGroup className={KEYS}><Kbd className={KEY}>Ctrl</Kbd><Kbd className={KEY}>D</Kbd></KbdGroup>
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
        {handleAssignSinger && songArtists && songArtists.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Icon name="person" />
              {t('editor.assignSingerToLines', { count: 1})}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {songArtists.map(artist => (
                <ContextMenuItem key={artist} onClick={() => handleAssignSinger(artist, [lineIndex], 0)}>
                  <Icon name="person" />
                  {artist}
                </ContextMenuItem>
              ))}
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => handleAssignSinger('', [lineIndex], 0)}>
                <Icon name="person_off" />
                {t('editor.clearSingers')}
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
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
        <ContextMenuItem variant="destructive" onClick={() => handleDeleteLine(lineIndex)}>
          <Icon name="delete" />
          {t('editor.removeLine')}
          <KbdGroup className={KEYS}><Kbd className={`${KEY} text-love-ink`}>Del</Kbd></KbdGroup>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
