import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import ActionDrawer, { DrawerItem } from '@/shared/ui/ActionDrawer';

export type PhoneToolsAutoStampBlock = 'noAudio' | 'running' | 'youtube' | null;
export type PhoneToolsMode = 'lrc' | 'srt' | 'words';

export type PhoneToolsSheetProps = {
  open: boolean;
  onClose: () => void;
  editorMode: string;
  hasLines: boolean;
  /** A session viewer: nothing that edits or saves. */
  readOnly?: boolean;
  /** Timing */
  autoStamp: { blocked: PhoneToolsAutoStampBlock; onStart: () => void };
  shiftAmount: number;
  onShiftAll: (direction: -1 | 1) => void;
  canRedo: boolean;
  onRedo: () => void;
  onClearAllTimestamps: () => void;
  /** Words mode only: the desktop's "Clear word timestamps". */
  onClearAllWordTimestamps?: () => void;
  unmarkedOnly: boolean;
  onToggleUnmarked: () => void;
  /** Lyrics */
  onFindLyrics: () => void;
  onImport: () => void;
  onEditText?: () => void;
  /** Absent unless the project has lyric lines in LRC mode. */
  onSecondary?: () => void;
  /** Absent unless some line contains kanji. */
  onFurigana?: () => void;
  onSelectLines: () => void;
  /** Absent unless the lyrics contain CJK text. */
  readingFormat?: { katakana: boolean; onToggle: () => void };
  /** Mode */
  wordsLocked: boolean;
  onSetMode: (mode: PhoneToolsMode) => void;
  /** Project. Each is absent where the desktop hides it (inside a session, someone else's project). */
  onSave?: () => void;
  saving?: boolean;
  onExport: () => void;
  onProjectSettings?: () => void;
  /**
   * The owner's Start / Manage session rows. Both close this sheet first: the start flow and
   * the settings modal live in Editor, outside the sheet, so they outlast it.
   */
  session?: { live: boolean; starting: boolean; onStart: () => void; onManage: () => void };
  onPublish?: () => void;
  onViewPublic?: () => void;
  onChangeSong?: () => void;
  onNewProject: () => void;
  onRemoveAll: () => void;
};

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="pb-2">
      <h4 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">{title}</h4>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

/**
 * Everything the desktop toolbar and its overflow menu offer, as one scrollable bottom sheet.
 * Holds no state and copies no logic: every row calls the handler Editor already passes the
 * desktop controls. Choosing a row closes the sheet first, then runs the handler once.
 */
export default function PhoneToolsSheet(p: PhoneToolsSheetProps) {
  const { t } = useTranslation();
  // The sheet stays mounted while it animates out; a second tap in that window must not repeat the action.
  const usedRef = useRef(false);
  useEffect(() => {
    if (p.open) usedRef.current = false;
  }, [p.open]);
  const run = (fn: () => void) => () => {
    if (usedRef.current) return;
    usedRef.current = true;
    p.onClose();
    fn();
  };
  const isWords = p.editorMode === 'words';

  const autoStampDescription = p.autoStamp.blocked === 'noAudio' ? t('editor.autoStamp.noAudio')
    : p.autoStamp.blocked === 'running' ? t('editor.autoStamp.running')
      : p.autoStamp.blocked === 'youtube' ? t('editor.phone.tools.autoStampYoutube') : undefined;

  return (
    <ActionDrawer isOpen={p.open} onClose={p.onClose} title={t('editor.phone.tools.title')}>
      {!p.readOnly && (<>
      <Group title={t('editor.phone.tools.timing')}>
        <DrawerItem
          iconName={isWords ? 'spellcheck' : 'auto_fix_high'}
          label={isWords ? t('editor.autoStamp.buttonWords') : t('editor.autoStamp.button')}
          description={autoStampDescription}
          disabled={p.autoStamp.blocked !== null}
          onClick={run(p.autoStamp.onStart)}
        />
        <DrawerItem
          iconName="keyboard_double_arrow_left"
          label={t('editor.phone.tools.shiftEarlier', { amount: p.shiftAmount })}
          disabled={!p.hasLines}
          onClick={run(() => p.onShiftAll(-1))}
        />
        <DrawerItem
          iconName="keyboard_double_arrow_right"
          label={t('editor.phone.tools.shiftLater', { amount: p.shiftAmount })}
          disabled={!p.hasLines}
          onClick={run(() => p.onShiftAll(1))}
        />
        <DrawerItem iconName="redo" label={t('editor.redo')} disabled={!p.canRedo} onClick={run(p.onRedo)} />
        <DrawerItem
          iconName="ink_eraser"
          label={t('editor.phone.tools.clearAll')}
          variant="danger"
          disabled={!p.hasLines}
          onClick={run(p.onClearAllTimestamps)}
        />
        {isWords && p.onClearAllWordTimestamps && (
          <DrawerItem
            iconName="ink_eraser"
            label={t('editor.clearWordTimestamps')}
            variant="danger"
            disabled={!p.hasLines}
            onClick={run(p.onClearAllWordTimestamps)}
          />
        )}
        <DrawerItem
          iconName="filter_list"
          label={p.unmarkedOnly ? t('editor.phone.tools.allLines') : t('editor.phone.tools.unmarkedOnly')}
          disabled={!p.hasLines}
          onClick={run(p.onToggleUnmarked)}
        />
      </Group>

      <Group title={t('editor.phone.tools.lyrics')}>
        <DrawerItem iconName="search" label={t('lyricsSearch.findLyrics')} onClick={run(p.onFindLyrics)} />
        <DrawerItem iconName="upload_file" label={t('editor.phone.tools.importLyrics')} onClick={run(p.onImport)} />
        {p.onEditText && <DrawerItem iconName="edit" label={t('editor.backToEdit')} onClick={run(p.onEditText)} />}
        {p.onSecondary && (
          <DrawerItem iconName="translate" label={t('editor.secondaryBulk.open')} onClick={run(p.onSecondary)} />
        )}
        {p.onFurigana && (
          <DrawerItem iconName="spellcheck" label={t('editor.furigana.open')} onClick={run(p.onFurigana)} />
        )}
        {p.readingFormat && (
          <DrawerItem
            iconName="translate"
            label={p.readingFormat.katakana ? t('editor.phone.tools.readingToHiragana') : t('editor.phone.tools.readingToKatakana')}
            onClick={run(p.readingFormat.onToggle)}
          />
        )}
        <DrawerItem iconName="checklist" label={t('editor.phone.tools.selectLines')} disabled={!p.hasLines} onClick={run(p.onSelectLines)} />
      </Group>

      <Group title={t('editor.phone.tools.mode')}>
        {([
          { value: 'lrc', icon: 'timer', label: t('editor.phone.tools.modeLrc') },
          { value: 'srt', icon: 'subtitles', label: t('editor.phone.tools.modeSrt') },
          { value: 'words', icon: 'lyrics', label: t('editor.modeWords') },
        ] as const).map(({ value, icon, label }) => {
          const locked = value === 'words' && p.wordsLocked;
          return (
            <DrawerItem
              key={value}
              iconName={icon}
              label={label}
              description={locked ? t('editor.modeWordsLocked') : undefined}
              pressed={p.editorMode === value}
              disabled={locked}
              onClick={run(() => p.onSetMode(value))}
            />
          );
        })}
      </Group>

      </>)}

      <Group title={t('editor.phone.tools.project')}>
        {p.onSave && !p.readOnly && (
          <DrawerItem
            iconName="save"
            label={p.saving ? t('project.saving') : t('project.save')}
            disabled={p.saving}
            onClick={run(p.onSave)}
          />
        )}
        <DrawerItem
          iconName="download"
          label={t('editor.exportAs', { format: p.editorMode === 'srt' ? 'SRT' : 'LRC' })}
          disabled={!p.hasLines}
          onClick={run(p.onExport)}
        />
        {p.onPublish && !p.readOnly && <DrawerItem iconName="public" label={t('project.publishAction')} onClick={run(p.onPublish)} />}
        {p.onViewPublic && <DrawerItem iconName="visibility" label={t('editor.viewAsPublic')} onClick={run(p.onViewPublic)} />}
        {p.onProjectSettings && <DrawerItem iconName="tune" label={t('editor.projectSettings')} onClick={run(p.onProjectSettings)} />}
        {p.session && (
          <DrawerItem
            iconName="group"
            label={p.session.live ? t('collab.settings.manage') : t('collab.settings.start')}
            disabled={p.session.starting}
            onClick={run(p.session.live ? p.session.onManage : p.session.onStart)}
          />
        )}
        {p.onChangeSong && !p.readOnly && <DrawerItem iconName="swap_horiz" label={t('player.changeSong')} onClick={run(p.onChangeSong)} />}
        {!p.readOnly && (
          <>
            <DrawerItem iconName="add" label={t('home.newProject')} onClick={run(p.onNewProject)} />
            <DrawerItem iconName="delete" label={t('editor.removeAll')} variant="danger" onClick={run(p.onRemoveAll)} />
          </>
        )}
      </Group>
    </ActionDrawer>
  );
}
