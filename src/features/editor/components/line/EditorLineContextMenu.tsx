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
import { formatSectionLabel } from '@features/editor/constants/sectionTypes';
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
          <ContextMenuLabel>{t('editor.selection.count', { count: selectedCount, defaultValue: '{{count}} lines' })}</ContextMenuLabel>
          {handleClearLine && (
            <ContextMenuItem onClick={() => selectedLines.forEach(i => handleClearLine!(i))}>
              <Icon name="ink_eraser" />
              {t('editor.selection.clearTimestamps', 'Clear timestamps')}
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
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={() => [...selectedLines].forEach(i => handleDeleteLine(i))}>
            <Icon name="delete" />
            {t('editor.selection.removeN', { count: selectedCount, defaultValue: 'Remove {{count}} lines' })}
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
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAddLine(lineIndex, { ...line, id: crypto.randomUUID() })}>
              <Icon name="post_add" />
              {t('editor.duplicateLine')}
            </ContextMenuItem>
          </>
        )}
        {handleInsertSection && (
          <ContextMenuItem onClick={() => handleInsertSection(lineIndex)}>
            <Icon name="layers" />
            {t('editor.insertSectionAbove')}
          </ContextMenuItem>
        )}
        {line.timestamp != null && handleClearLine && (
          <ContextMenuItem onClick={() => handleClearLine(lineIndex)}>
            <Icon name="ink_eraser" />
            {t('editor.clearTimestamp')}
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
                <ContextMenuItem key={index} onClick={() => handleMoveToSection([lineIndex], index)}>
                  <Icon name="format_list_bulleted" />
                  {formatSectionLabel(sl.label, t)}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={() => handleDeleteLine(lineIndex)}>
          <Icon name="delete" />
          {t('editor.removeLine')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
