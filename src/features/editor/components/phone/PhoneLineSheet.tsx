import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ActionDrawer, { DrawerItem } from '@/shared/ui/ActionDrawer';
import { formatSectionLabel } from '@/features/editor/constants/section-types';
import type { EditorLine } from '@/features/editor/editor.types';

export type PhoneLineSheetProps = {
  open: boolean;
  onClose: () => void;
  /** One line (its options) or the current selection (singers and sections only). */
  indices: number[];
  lines: EditorLine[];
  singers: string[];
  nudgeFine: number;
  nudgeCoarse: number;
  /** Collab: someone else holds the line's lock. */
  deleteDisabled?: boolean;
  onShift: (index: number, delta: number) => void;
  onClearTimestamp: (index: number) => void;
  onDelete: (index: number) => void;
  onAddLine: (index: number, line?: EditorLine | null, opts?: { before?: boolean }) => void;
  onInsertSection: (afterIndex: number) => void;
  onToggleDepth?: (index: number) => void;
  onAssignSinger: (name: string, indices: number[], slot: number) => void;
  onMoveToSection: (indices: number[], sectionIndex: number) => void;
  onEditText: (index: number) => void;
  onToggleCounterpart?: (index: number) => void;
  onBulkSingTogether?: () => void;
  onBulkSplitSingers?: () => void;
};

type View = 'main' | 'singer' | 'section';

/**
 * The options for one line, opened by long-press or the row's "more" button; also the
 * singer / section chooser for a selection. Every row calls a handler Editor already passes
 * the desktop context menu. It marks nothing and never moves the cursor.
 */
export default function PhoneLineSheet(p: PhoneLineSheetProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('main');
  const isSelection = p.indices.length > 1;
  const index = p.indices[0];
  const line = index != null ? p.lines[index] : undefined;

  const close = () => {
    setView('main');
    p.onClose();
  };
  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  if (!line) return <ActionDrawer isOpen={false} onClose={close} />;

  const isSection = line.type === 'section';
  const sections = p.lines
    .map((l, i) => ({ l, i }))
    .filter(({ l, i }) => l.type === 'section' && !p.indices.includes(i));
  const title = isSelection ? t('editor.selection.count', { count: p.indices.length })
    : isSection ? t('editor.phone.line.sectionTitle')
      : t('editor.lineDrawerTitle', { n: p.lines.slice(0, index).filter((l) => l.type !== 'section').length + 1 });
  const timed = line.timestamp != null;
  const back = (
    <DrawerItem iconName="chevron_left" label={t('common.back')} onClick={() => setView('main')} />
  );

  const body = view === 'singer' ? (
    <>
      {back}
      {p.singers.map((name) => (
        <DrawerItem key={name} iconName="person" label={name} onClick={run(() => p.onAssignSinger(name, p.indices, 0))} />
      ))}
      <DrawerItem iconName="person_off" label={t('editor.clearSingers')} onClick={run(() => p.onAssignSinger('', p.indices, 0))} />
    </>
  ) : view === 'section' ? (
    <>
      {back}
      {sections.map(({ l, i }) => (
        <DrawerItem key={i} iconName="format_list_bulleted" label={formatSectionLabel(l.label, t)} onClick={run(() => p.onMoveToSection(p.indices, i))} />
      ))}
    </>
  ) : isSelection ? (
    <>
      {p.singers.length > 0 && <DrawerItem iconName="person" label={t('editor.assignSingerToLines', { count: p.indices.length })} onClick={() => setView('singer')} />}
      {sections.length > 0 && <DrawerItem iconName="layers" label={t('editor.moveToSection')} onClick={() => setView('section')} />}
      {p.onBulkSingTogether && p.singers.length > 1 && <DrawerItem iconName="group" label={t('editor.duetMode')} onClick={run(p.onBulkSingTogether)} />}
      {p.onBulkSplitSingers && p.singers.length > 1 && <DrawerItem iconName="call_split" label={t('editor.splitMode')} onClick={run(p.onBulkSplitSingers)} />}
    </>
  ) : isSection ? (
    <>
      <DrawerItem iconName="vertical_align_bottom" label={t('editor.insertLineBelow')} onClick={run(() => p.onAddLine(index))} />
      {p.onToggleDepth && (
        <DrawerItem
          iconName={line.depth === 0 ? 'expand_more' : 'expand_less'}
          label={line.depth === 0 ? t('editor.sections.demote') : t('editor.sections.promote')}
          onClick={run(() => p.onToggleDepth?.(index))}
        />
      )}
      <DrawerItem iconName="delete" variant="danger" label={t('editor.deleteSection')} disabled={p.deleteDisabled} onClick={run(() => p.onDelete(index))} />
    </>
  ) : (
    <>
      <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">{t('editor.phone.line.nudge')}</p>
      <div role="group" aria-label={t('editor.phone.line.nudge')} className="grid grid-cols-2 gap-1">
        {([
          [-p.nudgeCoarse, 'earlierBig', p.nudgeCoarse],
          [p.nudgeCoarse, 'laterBig', p.nudgeCoarse],
          [-p.nudgeFine, 'earlierBig', p.nudgeFine],
          [p.nudgeFine, 'laterBig', p.nudgeFine],
        ] as const).map(([delta, key, amount], n) => (
          <DrawerItem
            key={n}
            iconName={delta < 0 ? 'chevron_left' : 'chevron_right'}
            label={key === 'earlierBig' ? t('editor.phone.line.earlierBig', { amount }) : t('editor.phone.line.laterBig', { amount })}
            disabled={!timed}
            onClick={() => p.onShift(index, delta)}
          />
        ))}
      </div>
      {timed && <DrawerItem iconName="ink_eraser" variant="danger" label={t('editor.clearTimestamp')} onClick={run(() => p.onClearTimestamp(index))} />}
      <DrawerItem iconName="edit" label={t('editor.phone.line.editText')} onClick={run(() => p.onEditText(index))} />
      <DrawerItem iconName="vertical_align_top" label={t('editor.insertLineAbove')} onClick={run(() => p.onAddLine(index, null, { before: true }))} />
      <DrawerItem iconName="vertical_align_bottom" label={t('editor.insertLineBelow')} onClick={run(() => p.onAddLine(index))} />
      <DrawerItem iconName="content_copy" label={t('editor.duplicateLine')} onClick={run(() => p.onAddLine(index, { ...line, id: crypto.randomUUID() }))} />
      <DrawerItem iconName="layers" label={t('editor.insertSectionAbove')} onClick={run(() => p.onInsertSection(index - 1))} />
      {p.singers.length > 0 && <DrawerItem iconName="person" label={t('editor.assignSingerToLines', { count: 1 })} onClick={() => setView('singer')} />}
      {sections.length > 0 && <DrawerItem iconName="folder_open" label={t('editor.moveToSection')} onClick={() => setView('section')} />}
      {p.onToggleCounterpart && (
        <DrawerItem
          iconName="queue_music"
          label={line.adLibOf != null ? t('editor.unmarkCounterpart') : t('editor.markCounterpart')}
          onClick={run(() => p.onToggleCounterpart?.(index))}
        />
      )}
      <DrawerItem iconName="delete" variant="danger" label={t('editor.removeLine')} disabled={p.deleteDisabled} onClick={run(() => p.onDelete(index))} />
    </>
  );

  return (
    <ActionDrawer isOpen={p.open} onClose={close} title={title}>
      {/* Keyed by view so the focus lands on the first row of each page. */}
      <div key={view}>{body}</div>
    </ActionDrawer>
  );
}
