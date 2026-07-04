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

const HeadphonesIcon = ({ className }: { className?: string }) => <Icon name="headphones" className={className} />;
const FileTextIcon = ({ className }: { className?: string }) => <Icon name="description" className={className} />;
const EyeIcon = ({ className }: { className?: string }) => <Icon name="visibility" className={className} />;
const ListChecksIcon = ({ className }: { className?: string }) => <Icon name="checklist" className={className} />;
const UserCircleIcon = ({ className }: { className?: string }) => <Icon name="account_circle" className={className} />;

const HELP_TABS = [
  { id: 'player', icon: HeadphonesIcon, labelKey: 'shortcuts.tabs.player' },
  { id: 'editor', icon: FileTextIcon,   labelKey: 'shortcuts.tabs.editor' },
  { id: 'preview', icon: EyeIcon,       labelKey: 'shortcuts.tabs.preview' },
  { id: 'sections', icon: ListChecksIcon, labelKey: 'editor.help.sectionsTab' },
  { id: 'singers', icon: UserCircleIcon, labelKey: 'editor.help.singersTab' },
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
        { keys: resolveShortcut(settings.shortcuts?.playPause?.[0] || 'Enter'),            desc: t('shortcuts.playPause') },
        { keys: resolveShortcut(settings.shortcuts?.seekBackward?.[0] || 'ArrowLeft'), desc: t('shortcuts.seekBackward', { val: seekTime }) },
        { keys: resolveShortcut(settings.shortcuts?.seekForward?.[0] || 'ArrowRight'), desc: t('shortcuts.seekForward', { val: seekTime }) },
        { keys: resolveShortcut(settings.shortcuts?.mute?.[0] || 'm'),                    desc: t('shortcuts.mute') },
        { keys: resolveShortcut(settings.shortcuts?.speedUp?.[0] || '+'),                  desc: t('shortcuts.speedUp') },
        { keys: resolveShortcut(settings.shortcuts?.speedDown?.[0] || '-'),                desc: t('shortcuts.speedDown') },
      ]},
    ],
    editor: [
      { section: t('editor.syncModeOnly'), items: [
        { keys: resolveShortcut(settings.shortcuts?.mark?.[0] || 'Space'),       desc: t('shortcuts.mark') },
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
        className="bg-zinc-900 border border-zinc-700 shadow-elevated p-0 max-w-sm w-full [&>button]:hidden"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{t('shortcuts.title')}</DialogTitle>
        <div className="flex flex-col">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800/60 cursor-grab active:cursor-grabbing select-none"
            onPointerDown={handleMouseDown}
          >
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">
              {t('shortcuts.title')}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            >
              <Icon name="close" size={16} />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex px-3 pt-2 gap-0.5 bg-zinc-950/40">
            {HELP_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-0.5 px-4 py-2 h-auto text-[10px] font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  <TabIcon className="size-3.5" />
                  {tk(tab.labelKey)}
                </Button>
              );
            })}
          </div>

          {/* Content */}
          <div className="px-5 pt-4 pb-5 space-y-5 overflow-y-auto max-h-[60vh]">
            {activeTab === 'sections' ? (
              <div className="text-zinc-300 text-sm space-y-4 leading-relaxed">
                <p>{t('editor.help.sectionsIntro')}</p>
                <ul className="list-disc pl-4 space-y-2 text-zinc-400">
                  <li>{t('editor.help.sectionsAuto')}</li>
                  <li>{t('editor.help.sectionsManual')}</li>
                  <li>{t('editor.help.sectionsDropdown')}</li>
                </ul>
              </div>
            ) : activeTab === 'singers' ? (
              <div className="text-zinc-300 text-sm space-y-4 leading-relaxed">
                <p>{t('editor.help.singersIntro')}</p>
                <ul className="list-disc pl-4 space-y-2 text-zinc-400">
                  <li>{t('editor.help.singersPaint')}</li>
                  <li>{t('editor.help.singersShortcuts')}</li>
                  <li>{t('editor.help.singersSplit')}</li>
                </ul>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.section}>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">
                    {group.section}
                  </p>
                  <div className="space-y-2">
                    {group.items.map((s) => (
                      <div key={s.desc} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-zinc-300">{s.desc}</span>
                        <KbdGroup>
                          {s.keys.map((k, i) => (
                            <span key={k} className="inline-flex items-center gap-1">
                              {i > 0 && <span className="text-zinc-600 text-[10px]">+</span>}
                              <Kbd>{k}</Kbd>
                            </span>
                          ))}
                        </KbdGroup>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
