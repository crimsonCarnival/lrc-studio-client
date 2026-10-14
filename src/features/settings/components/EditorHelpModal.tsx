import { useState, useEffect } from 'react';
import useDraggable from '@/shared/hooks/useDraggable';
import { useScrollLock } from '@/shared/hooks/useScrollLock';
import { useTranslation } from 'react-i18next';
import { Kbd, KbdGroup } from '@ui/kbd';
import { useSettings } from '@/features/settings/useSettings';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogTitle } from '@ui/dialog';
import { Icon } from '@/shared/ui/Icon';
import { KEY_SYMBOLS } from '@features/settings/key-symbols';
import { matchKey } from '@/shared/utils/keyboard';

const SYMBOLS = KEY_SYMBOLS as Record<string, string>;

// Split a shortcut string like 'Ctrl+M' into display parts ['Ctrl', 'M']
const resolveShortcut = (shortcut: string): string[] => {
  if (shortcut === '+') return [SYMBOLS['+'] ?? '+'];
  if (shortcut.endsWith('++')) {
    const parts = shortcut.slice(0, -2).split('+');
    parts.push('+');
    return parts.map((k) => SYMBOLS[k] ?? k);
  }
  return shortcut.split('+').map((k) => SYMBOLS[k] ?? k);
};

const HELP_TABS = [
  { id: 'player',   iconName: 'headphones',    labelKey: 'shortcuts.tabs.player' },
  { id: 'editor',   iconName: 'description',   labelKey: 'shortcuts.tabs.editor' },
  { id: 'preview',  iconName: 'visibility',    labelKey: 'shortcuts.tabs.preview' },
  { id: 'sections', iconName: 'checklist',     labelKey: 'editor.help.sectionsTab' },
  { id: 'singers',  iconName: 'account_circle', labelKey: 'editor.help.singersTab' },
];

interface HelpItem {
  keys: string[];
  desc: string;
}

interface HelpGroup {
  section: string;
  items: HelpItem[];
}

export default function EditorHelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  // Tab label keys are dynamic; bypass strict key checking.
  const tk = t as (key: string) => string;
  const { settings } = useSettings();
  const { position, handleMouseDown } = useDraggable(isOpen);
  const [activeTab, setActiveTab] = useState('player');
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' ||
        matchKey(e, settings.shortcuts?.showHelp?.[0] || '?')
      ) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, settings.shortcuts?.showHelp]);

  const resolveModifier = (key: string) => [SYMBOLS[key] ?? key];

  const seekTime = settings.playback?.seekTime ?? 5;
  const nudge = settings.editor?.nudge?.default || 0.1;

  const tabContent: Record<string, HelpGroup[]> = {
    player: [
      { section: t('shortcuts.sections.playback'), items: [
        { keys: resolveShortcut(settings.shortcuts?.playPause?.[0] || 'Space'),            desc: t('shortcuts.playPause') },
        { keys: resolveShortcut(settings.shortcuts?.seekBackward?.[0] || 'ArrowLeft'), desc: t('shortcuts.seekBackward', { val: seekTime }) },
        { keys: resolveShortcut(settings.shortcuts?.seekForward?.[0] || 'ArrowRight'), desc: t('shortcuts.seekForward', { val: seekTime }) },
        { keys: resolveShortcut(settings.shortcuts?.mute?.[0] || 'm'),                    desc: t('shortcuts.mute') },
        { keys: resolveShortcut(settings.shortcuts?.speedUp?.[0] || '+'),                  desc: t('shortcuts.speedUp') },
        { keys: resolveShortcut(settings.shortcuts?.speedDown?.[0] || '-'),                desc: t('shortcuts.speedDown') },
      ]},
    ],
    editor: [
      { section: t('editor.syncModeOnly'), items: [
        { keys: resolveShortcut(settings.shortcuts?.mark?.[0] || 'Enter'),       desc: t('shortcuts.mark') },
        { keys: resolveShortcut(settings.shortcuts?.nudgeLeft?.[0] || 'Alt+ArrowLeft'),  desc: t('shortcuts.nudgeLeft', { val: nudge }) },
        { keys: resolveShortcut(settings.shortcuts?.nudgeRight?.[0] || 'Alt+ArrowRight'), desc: t('shortcuts.nudgeRight', { val: nudge }) },
      ]},
      { section: t('shortcuts.selection.title'), items: [
        { keys: [...resolveModifier(settings.shortcuts?.rangeSelect?.[0] || 'Shift'), t('shortcuts.selection.click')],  desc: t('shortcuts.selection.rangeSelect') },
        { keys: [...resolveModifier(settings.shortcuts?.toggleSelect?.[0] || 'Ctrl'), t('shortcuts.selection.click')], desc: t('shortcuts.selection.toggleSelect') },
        { keys: resolveShortcut(settings.shortcuts?.deselect?.[0] || 'Escape'),    desc: t('shortcuts.selection.deselect') },
        { keys: resolveShortcut(settings.shortcuts?.deleteLine?.[0] || 'Delete'),   desc: t('shortcuts.selection.deleteSelected') },
        { keys: [t('shortcuts.selection.dblClick')],                                            desc: t('shortcuts.selection.editLine') },
      ]},
      { section: t('common.global'), items: [
        { keys: ['Ctrl', 'Z'],                                                        desc: t('shortcuts.undo') },
        { keys: ['Ctrl', 'Y'],                                                        desc: t('shortcuts.redo') },
        { keys: resolveShortcut(settings.shortcuts?.showHelp?.[0] || '?'),           desc: t('shortcuts.help') },
      ]},
    ],
    preview: [
      { section: t('shortcuts.sections.preview'), items: [
        { keys: resolveShortcut(settings.shortcuts?.toggleTranslation?.[0] || 't'),  desc: t('shortcuts.toggleTranslation') },
        { keys: resolveShortcut(settings.shortcuts?.addSecondary?.[0] || 'Shift+H'), desc: t('shortcuts.addSecondary') },
        { keys: resolveShortcut(settings.shortcuts?.addTranslation?.[0] || 'Shift+T'), desc: t('shortcuts.addTranslation') },
      ]},
    ],
  };

  const groups = tabContent[activeTab] || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-background border-0 inset-ring inset-ring-hl rounded-[var(--radius-card)] shadow-elevated p-0 max-w-[720px] w-[calc(100vw-2rem)] [&>button]:hidden"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{t('shortcuts.title')}</DialogTitle>
        <div className="flex flex-col w-full min-w-0">
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 pt-5 pb-3 cursor-grab active:cursor-grabbing select-none"
            onPointerDown={handleMouseDown}
          >
            <h3 className="font-heading text-[22px] font-bold tracking-[-0.02em] text-foreground">
              {t('shortcuts.title')}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={t('common.close')}
              className="size-10 lg:size-10 -mr-2"
            >
              <Icon name="close" size={20} />
            </Button>
          </div>

          {/* Tabs: text only, the open one ringed in iris (redesign sheet 15). */}
          <div role="tablist" aria-label={t('shortcuts.title')} className="flex gap-1 overflow-x-auto no-scrollbar min-w-0 border-b border-hl px-5 pb-3.5">
            {HELP_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant="ghost"
                  size={null}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-10 shrink-0 rounded-[10px] px-3.5 text-[15px] coarse:h-11 ${
                    isActive
                      ? 'bg-raised text-foreground inset-ring-[1.5px] inset-ring-iris hover:bg-raised hover:text-foreground'
                      : 'text-subtle hover:bg-transparent hover:text-foreground'
                  }`}
                >
                  {tk(tab.labelKey)}
                </Button>
              );
            })}
          </div>

          {/* Content */}
          <div className="px-6 pt-5 pb-6 overflow-y-auto max-h-[60vh] min-w-0">
            {activeTab === 'sections' ? (
              <div className="text-foreground text-base space-y-4 leading-relaxed">
                <p>{t('editor.help.sectionsIntro')}</p>
                <ul className="list-disc pl-4 space-y-2 text-subtle">
                  <li>{t('editor.help.sectionsAuto')}</li>
                  <li>{t('editor.help.sectionsManual')}</li>
                  <li>{t('editor.help.sectionsDropdown')}</li>
                </ul>
              </div>
            ) : activeTab === 'singers' ? (
              <div className="text-foreground text-base space-y-4 leading-relaxed">
                <p>{t('editor.help.singersIntro')}</p>
                <ul className="list-disc pl-4 space-y-2 text-subtle">

                  <li>{t('editor.help.singersShortcuts')}</li>
                  <li>{t('editor.help.singersSplit')}</li>
                </ul>
              </div>
            ) : (
              // Groups sit side by side when there is room, so a tab rarely needs to scroll.
              <div className="grid gap-x-12 gap-y-5 sm:grid-cols-2">
                {groups.map((group) => (
                  <div key={group.section}>
                    <p className="mb-1.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase">
                      {group.section}
                    </p>
                    <div>
                      {group.items.map((s) => (
                        <div key={s.desc} className="flex min-h-[38px] items-center justify-between gap-3">
                          <span className="text-base text-foreground">{s.desc}</span>
                          <KbdGroup className="shrink-0">
                            {s.keys.map((k, i) => (
                              <span key={k} className="inline-flex items-center gap-1">
                                {i > 0 && <span className="font-mono text-[11px] text-subtle">+</span>}
                                <Kbd>{k}</Kbd>
                              </span>
                            ))}
                          </KbdGroup>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
