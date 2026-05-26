import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Headphones, FileText, Download, Monitor, Keyboard, SlidersHorizontal, User, ShieldCheck, Link2, History, Search, X } from 'lucide-react';
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
import SecuritySettings from './panels/SecuritySettings';
import ConnectionsSettings from './panels/ConnectionsSettings';
import ChangesHistorySettings from './panels/ChangesHistorySettings';
import { Button } from '@ui/button';

function SettingsPanelContent({ activeTab, settings, updateSetting, validateShortcut, isGuest, userId, focusCard, searchTerm }) {
  switch (activeTab) {
    case 'profile':     return <ProfileSettings key={userId} searchTerm={searchTerm} />;
    case 'security':    return <SecuritySettings focusCard={focusCard} searchTerm={searchTerm} />;
    case 'connections': return <ConnectionsSettings searchTerm={searchTerm} />;
    case 'history':     return <ChangesHistorySettings searchTerm={searchTerm} />;
    case 'playback':    return <PlaybackSettings settings={settings} updateSetting={updateSetting} searchTerm={searchTerm} />;
    case 'editor':      return <EditorSettings settings={settings} updateSetting={updateSetting} searchTerm={searchTerm} />;
    case 'export':      return <ExportSettings settings={settings} updateSetting={updateSetting} searchTerm={searchTerm} />;
    case 'interface':   return <InterfaceSettings settings={settings} updateSetting={updateSetting} searchTerm={searchTerm} />;
    case 'shortcuts':   return <ShortcutsSettings settings={settings} updateSetting={updateSetting} validateShortcut={validateShortcut} searchTerm={searchTerm} />;
    case 'advanced':    return <AdvancedSettings settings={settings} updateSetting={updateSetting} isGuest={isGuest} searchTerm={searchTerm} />;
    default:            return null;
  }
}

const TABS = [
  // Account & Identity
  { id: 'profile', labelKey: 'profile.tabs.account', icon: User, authOnly: true, group: 'account', searchable: true },
  { id: 'security', labelKey: 'profile.sections.security', icon: ShieldCheck, authOnly: true, group: 'account', searchable: true },
  { id: 'connections', labelKey: 'profile.tabs.connections', icon: Link2, authOnly: true, group: 'account', searchable: true },
  { id: 'history', labelKey: 'profile.tabs.history', icon: History, authOnly: true, group: 'account', searchable: true },

  // App Preferences
  { id: 'playback', labelKey: 'settings.playback.label', icon: Headphones, group: 'preferences', searchable: true },
  { id: 'editor', labelKey: 'settings.editor.label', icon: FileText, group: 'preferences', searchable: true },
  { id: 'export', labelKey: 'settings.export.label', icon: Download, group: 'preferences', searchable: true },
  { id: 'interface', labelKey: 'settings.interface.label', icon: Monitor, group: 'preferences', searchable: true },

  // Advanced
  { id: 'shortcuts', labelKey: 'settings.shortcuts.label', fallback: 'Shortcuts', icon: Keyboard, group: 'advanced', searchable: true },
  { id: 'advanced', labelKey: 'settings.advanced.label', icon: SlidersHorizontal, group: 'advanced', searchable: true },
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
  const location = useLocation();
  const { t } = useTranslation();
  
  const searchParams = new URLSearchParams(location.search);
  const focusCard = searchParams.get('focus');
  const { user } = useAuthContext();
  const { settings: globalSettings, updateAllSettings } = useSettings();

  const isGuest = !user || user.isGuest;
  const visibleTabs = TABS.filter(tab => !tab.authOnly || !isGuest);

  const defaultTab = visibleTabs[0]?.id || 'playback';
  const activeTab = visibleTabs.find(entry => entry.id === tab)?.id || defaultTab;

  const [settings, setSettings] = useState(globalSettings || DEFAULT_SETTINGS);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasResults, setHasResults] = useState(true);
  const panelRef = useRef(null);
  const autoSaveRef = useRef(null);
  const savedSettingsRef = useRef(globalSettings || DEFAULT_SETTINGS);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const pendingNavRef = useRef(null);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettingsRef.current);

  const setTab = (id) => {
    setSearchTerm('');
    navigate(`/settings/${id}`, { replace: true });
  };

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

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !settings.advanced?.autoSave?.enabled) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, settings.advanced?.autoSave?.enabled]);

  useLayoutEffect(() => {
    if (!searchTerm) {
      setHasResults(true);
      return;
    }
    const sections = panelRef.current?.querySelectorAll('.settings-section');
    setHasResults(sections ? sections.length > 0 : true);
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
    savedSettingsRef.current = DEFAULT_SETTINGS;
    updateAllSettings(DEFAULT_SETTINGS);
  }, [updateAllSettings]);

  const handleApply = useCallback(() => {
    updateAllSettings(settings);
    savedSettingsRef.current = settings;
  }, [settings, updateAllSettings]);

  const guardedNavigate = useCallback((target) => {
    if (isDirty && !settings.advanced?.autoSave?.enabled) {
      pendingNavRef.current = target;
      setShowLeaveModal(true);
    } else {
      navigate(target);
    }
  }, [isDirty, settings.advanced?.autoSave?.enabled, navigate]);

  const activeTabMeta = visibleTabs.find(entry => entry.id === activeTab);

  const isSearchable = activeTabMeta?.searchable ?? false;

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-fade-in">

      {/* Page-level header — spans full width above sidebar and content */}
      <div className="flex items-center gap-3 px-4 h-13 py-2.5 border-b border-zinc-800/60 flex-shrink-0 bg-background/95 backdrop-blur-sm z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => guardedNavigate(-1)}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full size-8 shrink-0"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mr-auto">
          {t('settings.title')}
        </h1>
        {isSearchable && (
          <div className="relative w-48 sm:w-64 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 pointer-events-none z-10" />
            <input
              type="text"
              placeholder={t('settings.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 bg-zinc-900/60 border border-zinc-800 rounded-full pl-8 pr-7 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-52 border-r border-zinc-800/60 flex-shrink-0 py-5 px-3 gap-1">
          {visibleTabs.map((tab, idx) => {
            const label = t(tab.labelKey) || tab.fallback || tab.id;
            const isActive = activeTab === tab.id;
            const showDivider = idx > 0 && visibleTabs[idx - 1].group !== tab.group;
            return (
              <div key={tab.id}>
                {showDivider && <hr className="my-2 border-zinc-800/60" />}
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

        {/* Mobile/tablet: horizontal scrollable tab bar + content */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="lg:hidden flex overflow-x-auto no-scrollbar border-b border-zinc-800/60 flex-shrink-0 px-2 pt-1 items-center">
            {visibleTabs.map((tab, idx) => {
              const label = t(tab.labelKey) || tab.fallback || tab.id;
              const isActive = activeTab === tab.id;
              const showDivider = idx > 0 && visibleTabs[idx - 1].group !== tab.group;
              return (
                <div key={tab.id} className="flex items-center">
                  {showDivider && <div className="w-px h-4 mx-2 bg-zinc-800/60 shrink-0" />}
                  <button
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
                </div>
              );
            })}
          </div>

          {/* Panel content */}
          <div className="flex-1 min-h-0 flex flex-col relative">
            <div className="flex-1 min-h-0 overflow-y-auto settings-scroll pb-28">
              <div ref={panelRef} className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {isSearchable && searchTerm && !hasResults && (
                  <p className="text-sm text-zinc-500 text-center py-16">{t('settings.searchNoResults')}</p>
                )}
                <SettingsPanelContent
                  activeTab={activeTab}
                  settings={settings}
                  updateSetting={updateSetting}
                  validateShortcut={validateShortcut}
                  isGuest={isGuest}
                  userId={user?.id}
                  focusCard={focusCard}
                  searchTerm={isSearchable ? searchTerm : ''}
                />
              </div>
            </div>

            {/* Sticky footer actions — only shown when there are unsaved changes */}
            {isDirty && !settings.advanced?.autoSave?.enabled && (
              <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
                <div className="max-w-md mx-auto bg-zinc-900/90 backdrop-blur border border-zinc-800/60 rounded-2xl shadow-xl p-3 flex gap-3 pointer-events-auto items-center justify-end animate-fade-in-up">
                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 font-medium text-sm rounded-xl h-9 px-4"
                  >
                    {t('settings.reset')}
                  </Button>
                  <Button
                    onClick={handleApply}
                    className="bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-xl h-9 px-6"
                  >
                    {t('settings.applyChanges')}
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation guard modal */}
            {showLeaveModal && (
              <div className="fixed inset-0 z-popover flex items-center justify-center">
                <button
                  type="button"
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
                  onClick={() => setShowLeaveModal(false)}
                />
                <div className="relative z-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                  <h3 className="text-base font-semibold text-zinc-100 mb-2">{t('confirm.unsavedChangesTitle')}</h3>
                  <p className="text-sm text-zinc-400 mb-6">{t('confirm.unsavedChangesMessage')}</p>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => { handleApply(); setShowLeaveModal(false); navigate(pendingNavRef.current); }}
                      className="w-full bg-primary text-zinc-950 hover:bg-primary-dim font-semibold"
                    >
                      {t('settings.applyChanges')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setShowLeaveModal(false); navigate(pendingNavRef.current); }}
                      className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      {t('common.discardAndLeave')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowLeaveModal(false)}
                      className="w-full text-zinc-400 hover:text-zinc-200"
                    >
                      {t('confirm.cancel')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
