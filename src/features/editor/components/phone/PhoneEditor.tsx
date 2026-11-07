import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
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
  /** The Edit tab body (PhoneEditTab). */
  edit?: ReactNode;
  /** Controlled tab. Without it the editor keeps the tab itself. */
  tab?: PhoneTab;
  onTabChange?: (tab: PhoneTab) => void;
  /** Opens the Tools sheet. Without it the header button stays inert. */
  onOpenTools?: () => void;
  /** Select mode: replaces the Mark row, so a selection never shares the thumb zone with Mark. */
  selectBar?: ReactNode;
  onAddMedia?: () => void;
  /**
   * Focus view, the alternate Sync presentation. Absent for a viewer (nothing to stamp), which
   * also hides the header toggle.
   */
  focus?: { on: boolean; onToggle: () => void; view: ReactNode; /** A sheet is open over it: nothing in the view may take a tap or focus. */ inert?: boolean };
  /** Session state the desktop header shows (participants), rendered beside the title. */
  sessionBar?: ReactNode;
  mark: {
    onMark: () => void;
    onUndo: () => void;
    canUndo: boolean;
    label: string;
    disabled: boolean;
  } | null;
};

export type PhoneTab = 'sync' | 'edit';

const TAB_BTN = 'relative flex-1 h-11 text-[15px] font-semibold transition-colors duration-[var(--duration-state)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus';

/**
 * The editor below `lg`: compact header, Sync / Edit / Preview tabs, then the tab body.
 * Holds no editor state of its own; Editor owns it all through useEditor and passes the
 * pieces in, so marking here is the same handleMark the desktop uses.
 */
export default function PhoneEditor({
  title, saveState, visibility, onBack, list, banner, onShowPreview, edit, tab: tabProp, onTabChange, onOpenTools,
  selectBar, onAddMedia, mark, focus, sessionBar,
}: PhoneEditorProps) {
  const { t } = useTranslation();
  usePhoneEditorChrome();
  const [innerTab, setInnerTab] = useState<PhoneTab>('sync');
  const tab = tabProp ?? innerTab;
  const setTab = (next: PhoneTab) => {
    setInnerTab(next);
    onTabChange?.(next);
  };

  const saveLabel = saveState === 'saving' ? t('project.saving')
    : saveState === 'saved' ? t('project.saved')
      : saveState === 'failed' ? t('project.saveFailed')
        : saveState === 'unsaved' ? t('editor.statusUnsaved') : null;

  // Sync and Edit are tabs over this screen, with roving focus. Preview leaves for another
  // view, so it is a plain button that sits in the same strip, never a tab.
  const baseId = useId();
  const tabIds = { sync: `${baseId}-sync`, edit: `${baseId}-edit` };
  const panelIds = { sync: `${baseId}-sync-panel`, edit: `${baseId}-edit-panel` };
  const tabRefs = useRef<Partial<Record<PhoneTab, HTMLButtonElement | null>>>({});
  const TABS: PhoneTab[] = ['sync', 'edit'];
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.indexOf(tab);
    const next = e.key === 'ArrowRight' ? TABS[(i + 1) % TABS.length]
      : e.key === 'ArrowLeft' ? TABS[(i - 1 + TABS.length) % TABS.length]
        : e.key === 'Home' ? TABS[0]
          : e.key === 'End' ? TABS[TABS.length - 1] : null;
    if (!next) return;
    e.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  };
  const tabButton = (id: PhoneTab, label: string) => {
    const selected = tab === id;
    return (
      <button
        key={id}
        ref={(el) => { tabRefs.current[id] = el; }}
        id={tabIds[id]}
        type="button"
        role="tab"
        aria-selected={selected}
        aria-controls={panelIds[id]}
        tabIndex={selected ? 0 : -1}
        onClick={() => setTab(id)}
        onKeyDown={onTabKeyDown}
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
        {sessionBar}
        {visibility}
        {focus && tab === 'sync' && !selectBar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={focus.onToggle}
            aria-pressed={focus.on}
            aria-label={t('editor.phone.focus.open')}
            className={`size-11 lg:size-11 shrink-0 ${focus.on ? 'bg-primary/15 text-primary hover:text-primary' : 'text-foreground/80'}`}
          >
            <Icon name="center_focus_strong" size={22} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('common.moreActions')}
          aria-haspopup="dialog"
          aria-disabled={onOpenTools ? undefined : 'true'}
          onClick={onOpenTools}
          className={`size-11 lg:size-11 shrink-0 ${onOpenTools ? 'text-foreground/80' : 'text-foreground/40'}`}
        >
          <Icon name="more_vert" size={22} />
        </Button>
      </header>

      <div className="flex shrink-0 border-b border-zinc-800">
        <div role="tablist" aria-label={t('editor.phone.tabs')} className="flex flex-[2_1_0%]">
          {tabButton('sync', t('editor.sync'))}
          {tabButton('edit', t('editor.edit'))}
        </div>
        {onShowPreview && (
          <button type="button" onClick={onShowPreview} className={`${TAB_BTN} text-subtle hover:text-foreground`}>
            {t('editor.preview')}
          </button>
        )}
      </div>

      {tab === 'sync' && focus?.on && !selectBar ? (
        <div role="tabpanel" id={panelIds.sync} aria-labelledby={tabIds.sync} inert={focus.inert} className="flex flex-1 min-h-0 flex-col">
          {focus.view}
        </div>
      ) : tab === 'sync' ? (
        <PhoneSyncTab
          id={panelIds.sync}
          labelledBy={tabIds.sync}
          list={list}
          banner={banner}
          player={<PhonePlayerStrip onAddMedia={onAddMedia} />}
          markBar={selectBar ?? (mark ? <PhoneMarkBar {...mark} /> : undefined)}
        />
      ) : (
        <div role="tabpanel" id={panelIds.edit} aria-labelledby={tabIds.edit} className="flex flex-1 min-h-0 flex-col">
          {edit}
        </div>
      )}
    </div>
  );
}
