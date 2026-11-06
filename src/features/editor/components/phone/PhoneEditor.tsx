import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { usePhoneEditorChrome } from '@/app/layout/phone-editor-chrome';
import PhoneSyncTab from './PhoneSyncTab';
import PhoneMarkBar from './PhoneMarkBar';
import PhonePlayerStrip from './PhonePlayerStrip';

export type PhoneSaveState = 'saving' | 'saved' | 'failed' | 'unsaved';

export type PhoneEditorProps = {
  title: string;
  /** Null inside a live session, where the server stores the shared doc. */
  saveState: PhoneSaveState | null;
  /** The Visibility chip, or null when the project's visibility is not this user's to change. */
  visibility: ReactNode;
  onBack?: () => void;
  /** The lyric list: the editor's own VirtualizedLineList, wired exactly as on desktop. */
  list: ReactNode;
  banner?: ReactNode;
  /** Switches the workspace to the preview. */
  onShowPreview?: () => void;
  /** Opens the raw-text lyrics editor (the Edit tab's stand-in until it gets its own view). */
  onEditText?: () => void;
  onAddMedia?: () => void;
  mark: {
    onMark: () => void;
    onUndo: () => void;
    canUndo: boolean;
    label: string;
    disabled: boolean;
  } | null;
};

type PhoneTab = 'sync' | 'edit';

const TAB_BTN = 'relative flex-1 h-11 text-[15px] font-semibold transition-colors duration-[var(--duration-state)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus';

/**
 * The editor below `lg`: compact header, Sync / Edit / Preview tabs, then the tab body.
 * Holds no editor state of its own; Editor owns it all through useEditor and passes the
 * pieces in, so marking here is the same handleMark the desktop uses.
 */
export default function PhoneEditor({
  title, saveState, visibility, onBack, list, banner, onShowPreview, onEditText, onAddMedia, mark,
}: PhoneEditorProps) {
  const { t } = useTranslation();
  usePhoneEditorChrome();
  const [tab, setTab] = useState<PhoneTab>('sync');

  const saveLabel = saveState === 'saving' ? t('project.saving')
    : saveState === 'saved' ? t('project.saved')
      : saveState === 'failed' ? t('project.saveFailed')
        : saveState === 'unsaved' ? t('editor.statusUnsaved') : null;

  const tabButton = (id: PhoneTab | 'preview', label: string, onSelect: (() => void) | undefined) => {
    const selected = tab === id;
    return (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={selected}
        onClick={onSelect}
        className={`${TAB_BTN} ${selected ? 'text-foreground' : 'text-subtle hover:text-foreground'}`}
      >
        {label}
        {selected && <span aria-hidden className="absolute inset-x-6 bottom-0 h-[3px] rounded-pill bg-primary" />}
      </button>
    );
  };

  return (
    <div data-phone-editor className="flex flex-1 min-h-0 flex-col overflow-hidden px-safe animate-fade-in">
      <header className="flex shrink-0 items-center gap-1 border-b border-zinc-800 px-1.5 pt-safe h-14 box-content">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label={t('common.backToHome')}
            className="size-11 lg:size-11 shrink-0 text-foreground/80"
          >
            <Icon name="arrow_back" size={22} />
          </Button>
        )}
        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-[15px] font-semibold leading-tight">{title || t('library.untitled')}</h1>
          {saveLabel && (
            <p
              role="status"
              className={`truncate text-xs leading-tight ${saveState === 'saved' ? 'text-foam' : saveState === 'failed' ? 'text-love-ink' : 'text-subtle'}`}
            >
              {saveLabel}
            </p>
          )}
        </div>
        {visibility}
        {/* The Tools sheet opens from here once it exists (mobile redesign, task 4). */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('common.moreActions')}
          className="size-11 lg:size-11 shrink-0 text-foreground/80"
        >
          <Icon name="more_vert" size={22} />
        </Button>
      </header>

      <div role="tablist" aria-label={t('editor.phone.tabs')} className="flex shrink-0 border-b border-zinc-800">
        {tabButton('sync', t('editor.sync'), () => setTab('sync'))}
        {tabButton('edit', t('editor.edit'), () => setTab('edit'))}
        {onShowPreview && tabButton('preview', t('editor.preview'), onShowPreview)}
      </div>

      {tab === 'sync' ? (
        <PhoneSyncTab
          list={list}
          banner={banner}
          player={<PhonePlayerStrip onAddMedia={onAddMedia} />}
          markBar={mark ? <PhoneMarkBar {...mark} /> : undefined}
        />
      ) : (
        <div role="tabpanel" className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4 overflow-y-auto px-6 pb-safe text-center">
          <p className="max-w-sm text-[15px] text-subtle">{t('editor.phone.editPlaceholder')}</p>
          {onEditText && (
            <Button onClick={onEditText} className="h-11 gap-2 px-5 font-semibold text-zinc-950 bg-primary hover:bg-primary-dim">
              <Icon name="edit" size={18} />
              {t('editor.backToEdit')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
