import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Headphones, FileText, Download, Monitor, Keyboard, SlidersHorizontal, User } from 'lucide-react';
import { useSettings } from '@/features/settings/useSettings';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { DEFAULT_SETTINGS } from '@/features/settings/settings-defaults';
import PlaybackSettings from './panels/PlaybackSettings';
import EditorSettings from './panels/EditorSettings';
import ExportSettings from './panels/ExportSettings';
import InterfaceSettings from './panels/InterfaceSettings';
import ShortcutsSettings from './panels/ShortcutsSettings';
import AdvancedSettings from './panels/AdvancedSettings';
import ProfileSettings from './panels/ProfileSettings';
import { Button } from '@ui/button';

function SettingsPanelContent({ activeTab, settings, updateSetting, validateShortcut, isGuest, userId }) {
  switch (activeTab) {
    case 'profile':   return <ProfileSettings key={userId} />;
    case 'playback':  return <PlaybackSettings settings={settings} updateSetting={updateSetting} />;
    case 'editor':    return <EditorSettings settings={settings} updateSetting={updateSetting} />;
    case 'export':    return <ExportSettings settings={settings} updateSetting={updateSetting} />;
    case 'interface': return <InterfaceSettings settings={settings} updateSetting={updateSetting} />;
    case 'shortcuts': return <ShortcutsSettings settings={settings} updateSetting={updateSetting} validateShortcut={validateShortcut} />;
    case 'advanced':  return <AdvancedSettings settings={settings} updateSetting={updateSetting} isGuest={isGuest} />;
    default:          return null;
  }
}

const TABS = [
  { id: 'profile', labelKey: 'profile.title', icon: User, authOnly: true },
  { id: 'playback', labelKey: 'settings.playback.label', icon: Headphones },
  { id: 'editor', labelKey: 'settings.editor.label', icon: FileText },
  { id: 'export', labelKey: 'settings.export.label', icon: Download },
  { id: 'interface', labelKey: 'settings.interface.label', icon: Monitor },
  { id: 'shortcuts', labelKey: 'settings.shortcuts.label', fallback: 'Shortcuts', icon: Keyboard },
  { id: 'advanced', labelKey: 'settings.advanced.label', icon: SlidersHorizontal },
];

const SHORTCUT_KEYS = [
  'mark','nudgeLeft','nudgeRight','addLine','deleteLine','clearTimestamp',
  'switchMode','nudgeLeftFine','nudgeRightFine','deselect','showHelp',
  'playPause','seekForward','seekBackward','mute','speedUp','speedDown',
  'addSecondary','addTranslation','toggleTranslation',
];

export default function SettingsPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { settings: globalSettings, updateAllSettings } = useSettings();

  const isGuest = !user || user.isGuest;
  const visibleTabs = TABS.filter(t => !t.authOnly || !isGuest);

  const defaultTab = visibleTabs[0]?.id || 'playback';
  const activeTab = visibleTabs.find(t => t.id === tab)?.id || defaultTab;

  const [settings, setSettings] = useState(globalSettings || DEFAULT_SETTINGS);
  const autoSaveRef = useRef(null);

  const setTab = (id) => navigate(`/settings/${id}`, { replace: true });

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const keys = key.split('.');
      const next = JSON.parse(JSON.stringify(prev));
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!cur[keys[i]]) cur[keys[i]] = {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      if (next.advanced?.autoSave?.enabled || prev.advanced?.autoSave?.enabled) {
        autoSaveRef.current = next;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (autoSaveRef.current) {
      updateAllSettings(autoSaveRef.current);
      autoSaveRef.current = null;
    }
  });

  const validateShortcut = useCallback((newKey, currentKeyName) => {
    const reserved = ['Ctrl+Z', 'Ctrl+Y', 'Ctrl+Shift+Z'];
    if (reserved.some(r => r.toLowerCase() === newKey.toLowerCase())) return false;
    for (const k of SHORTCUT_KEYS) {
      if (k !== currentKeyName && new Set(settings.shortcuts?.[k] || []).has(newKey)) return false;
    }
    return true;
  }, [settings.shortcuts]);

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    if (settings.advanced?.autoSave?.enabled || DEFAULT_SETTINGS.advanced?.autoSave?.enabled) {
      updateAllSettings(DEFAULT_SETTINGS);
    }
  }, [settings.advanced?.autoSave?.enabled, updateAllSettings]);

  const handleApply = useCallback(() => {
    updateAllSettings(settings);
  }, [settings, updateAllSettings]);


  return (
    <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
      {/* Mobile/tablet header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 lg:hidden border-b border-zinc-800/60 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full size-9 shrink-0"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-base font-semibold text-zinc-100 tracking-tight">
          {t('settings.title')}
        </h1>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-52 border-r border-zinc-800/60 flex-shrink-0 py-6 px-3 gap-1">
          <div className="flex items-center gap-2 px-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full size-8 shrink-0"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              {t('settings.title')}
            </h1>
          </div>
          {visibleTabs.map(tab => {
            const label = t(tab.labelKey) || tab.fallback || tab.id;
            const isActive = activeTab === tab.id;
            return (
              <div key={tab.id}>
                <button
                  onClick={() => setTab(tab.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left w-full ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <tab.icon className={`size-4 shrink-0 ${isActive ? 'text-primary' : 'text-zinc-500'}`} />
                  {label}
                </button>
              </div>
            );
          })}
        </aside>

        {/* Mobile/tablet: horizontal scrollable tab bar */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="lg:hidden flex overflow-x-auto no-scrollbar border-b border-zinc-800/60 flex-shrink-0 px-2 pt-1">
            {visibleTabs.map(tab => {
              const label = t(tab.labelKey) || tab.fallback || tab.id;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all -mb-px ${
                    isActive
                      ? 'text-primary border-primary'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  <tab.icon className="size-3.5 shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Panel content */}
          <div className="flex-1 min-h-0 overflow-y-auto settings-scroll">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <SettingsPanelContent
                activeTab={activeTab}
                settings={settings}
                updateSetting={updateSetting}
                validateShortcut={validateShortcut}
                isGuest={isGuest}
                userId={user?.id}
              />

              {/* Footer actions */}
              {activeTab !== 'profile' && (
                <div className="mt-8 pt-6 border-t border-zinc-800/40 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700 font-medium text-sm rounded-xl h-10"
                  >
                    {t('settings.reset') || 'Reset to defaults'}
                  </Button>
                  {!settings.advanced?.autoSave?.enabled && (
                    <Button
                      onClick={handleApply}
                      className="bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-xl h-10 px-6"
                    >
                      {t('settings.applyChanges') || 'Apply'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
