import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShortcutsSettings } from '../../hooks/useShortcutsSettings';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';

import EditorShortcuts from './shortcuts/EditorShortcuts';
import PlayerShortcuts from './shortcuts/PlayerShortcuts';
import PreviewShortcuts from './shortcuts/PreviewShortcuts';

const SHORTCUT_KEYS = [
  'mark', 'nudgeLeft', 'nudgeRight', 'addLine', 'deleteLine',
  'clearTimestamp', 'switchMode', 'deselect', 'showHelp',
  'playPause', 'seekBackward', 'seekForward', 'mute', 'speedUp', 'speedDown',
  'toggleTranslation', 'addSecondary', 'addTranslation',
];

interface ShortcutsSettingsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: { shortcuts?: Record<string, string[] | undefined>; [key: string]: any };
  updateSetting: (path: string, value: unknown) => void;
  searchTerm?: string;
  validateShortcut: (value: string, key: string) => boolean;
}

export default function ShortcutsSettings({ settings, updateSetting, searchTerm, validateShortcut }: ShortcutsSettingsProps) {
  const { t } = useTranslation();
  const { handleShortcutChange } = useShortcutsSettings(updateSetting);
  const [subTab, setSubTab] = useState('editor');

  const conflictMap = useMemo(() => {
    const byValue: Record<string, string[]> = {};
    SHORTCUT_KEYS.forEach((k) => {
      const v = settings.shortcuts?.[k]?.[0];
      if (!v) return;
      if (!byValue[v]) byValue[v] = [];
      byValue[v].push(k);
    });
    const result: Record<string, string> = {};
    Object.values(byValue).forEach((keys) => {
      if (keys.length > 1) {
        keys.forEach((k) => {
          result[k] = keys.reduce<string[]>((acc, other) => {
            // Every SHORTCUT_KEYS id has a settings.shortcuts.<id>Label key.
            if (other !== k) acc.push((t as (key: string) => string)(`settings.shortcuts.${other}Label`));
            return acc;
          }, []).join(', ');
        });
      }
    });
    return result;
  }, [settings.shortcuts, t]);

  const SUB_TABS = [
    { id: 'editor',  iconName: 'keyboard',    label: t('settings.editor.label') },
    { id: 'player',  iconName: 'headphones',  label: t('settings.shortcuts.playerSection') },
    { id: 'preview', iconName: 'visibility',  label: t('settings.shortcuts.previewSection') },
  ];

  // When searching, show all; otherwise show only the active sub-tab
  const show = (id: string) => !!searchTerm || subTab === id;

  const sharedProps = {
    settings,
    searchTerm,
    handleShortcutChange,
    validateShortcut,
    conflictMap,
    updateSetting,
  };

  return (
    <>
      {/* Sub-tab bar — hidden during search */}
      {!searchTerm && (
        <div className="flex gap-0.5 mb-4 bg-secondary/40 rounded-xl p-1">
          {SUB_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 p-2 h-auto text-[10px] font-medium rounded-lg transition-colors ${
                subTab === tab.id
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Icon name={tab.iconName} size={14} />
              {tab.label}
            </Button>
          ))}
        </div>
      )}

      {show('editor') && <EditorShortcuts {...sharedProps} />}
      {show('player') && <PlayerShortcuts {...sharedProps} />}
      {show('preview') && <PreviewShortcuts {...sharedProps} />}
    </>
  );
}
