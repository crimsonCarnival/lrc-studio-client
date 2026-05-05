import { useTranslation } from 'react-i18next';
import { useSettings } from '@/contexts/useSettings';
import { DEFAULT_SETTINGS } from '@/contexts/settingsDefaults';
import { useSettingsModal } from '@features/settings/hooks/useSettingsModal';
import { useScrollLock } from '@/hooks/useScrollLock';
import PlaybackSettings from './panels/PlaybackSettings';
import EditorSettings from './panels/EditorSettings';
import ExportSettings from './panels/ExportSettings';
import InterfaceSettings from './panels/InterfaceSettings';
import ShortcutsSettings from './panels/ShortcutsSettings';
import AdvancedSettings from './panels/AdvancedSettings';
import ProfileSettings from './panels/ProfileSettings';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { X, Headphones, FileText, Download, Monitor, Keyboard, SlidersHorizontal, User } from 'lucide-react';
import { Tip } from '@ui/tip';

const TABS = [
    { id: 'profile', labelKey: 'profile.title', icon: User },
    { id: 'playback', labelKey: 'settings.playback.label', icon: Headphones },
    { id: 'editor', labelKey: 'settings.editor.label', icon: FileText },
    { id: 'export', labelKey: 'settings.export.label', icon: Download },
    { id: 'interface', labelKey: 'settings.interface.label', icon: Monitor },
    { id: 'shortcuts', labelKey: 'settings.shortcuts.label', fallback: 'Shortcuts', icon: Keyboard },
    { id: 'advanced', labelKey: 'settings.advanced.label', icon: SlidersHorizontal },
];

function tabPanelClass(tabId, activeTab, searchTerm) {
    if (searchTerm) return 'flex flex-col';
    const isActive = activeTab === tabId;
    return `col-start-1 row-start-1 px-5 pt-4 pb-0 flex flex-col min-h-0 transition-all duration-200 ease-out ${isActive ? 'opacity-100 z-raised animate-tab-slide-in' : 'opacity-0 z-base pointer-events-none'
        }`;
}

function contentWrapperClass(searchTerm) {
    if (searchTerm) return '';
    return 'flex-1 min-h-0 overflow-y-auto settings-scroll pr-1 pb-4';
}

export default function SettingsModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const { settings: globalSettings, updateAllSettings } = useSettings();
    const {
        settings,
        activeTab,
        setActiveTab,
        searchTerm,
        setSearchTerm,
        position,
        handleMouseDown,
        updateSetting,
        validateShortcut,
        handleReset,
        handleApply,
    } = useSettingsModal(isOpen, onClose, globalSettings, updateAllSettings);

    useScrollLock(isOpen);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-modal-backdrop animate-fade-in"
                onClick={onClose}
            />
            {/* Modal */}
            <div className="fixed inset-0 z-modal flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="w-full max-w-2xl pointer-events-auto flex flex-col max-h-[85vh]"
                    style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
                >
                    <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-elevated w-full flex flex-col h-full animate-slide-up-fade overflow-hidden">
                        {/* Header (drag handle) */}
                        <div
                            className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-800/60 flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
                            onPointerDown={handleMouseDown}
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest shrink-0">
                                    {t('settings.title')}
                                </h3>
                                <Tip content={t('settings.searchTitle')}>
                                    <Input
                                        type="text"
                                        placeholder={t('settings.search')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="bg-zinc-800/50 border-zinc-700/60 text-zinc-200 placeholder-zinc-500 focus-visible:border-primary/50 w-full max-w-[200px] h-7 text-xs"
                                    />
                                </Tip>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 ml-4"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Tabs */}
                        {!searchTerm && (
                            <div className="flex w-full border-b border-zinc-800 flex-shrink-0 overflow-x-auto no-scrollbar" role="tablist">
                                {TABS.map((tab) => {
                                    const label = t(tab.labelKey) || tab.fallback || tab.id;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <Tip key={tab.id} content={label}>
                                            <button
                                                role="tab"
                                                aria-selected={isActive}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`relative flex flex-1 min-w-0 flex-col items-center gap-0.5 px-2 sm:px-3 py-2.5 text-[9px] sm:text-[10px] font-semibold whitespace-nowrap transition-all duration-200 outline-none -mb-px border-b-2 ${isActive
                                                        ? 'text-primary border-primary scale-105'
                                                        : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:border-zinc-600 hover:scale-105'
                                                    }`}
                                            >
                                                {tab.icon && <tab.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />}
                                            </button>
                                        </Tip>
                                    );
                                })}
                            </div>
                        )}

                        {/* Scrollable Content — CSS grid forces consistent height across all tabs */}
                        <div
                            className={`flex-1 min-h-0 ${searchTerm ? 'overflow-y-auto settings-scroll flex flex-col p-6' : 'grid'
                                }`}
                        >
                            <div className={tabPanelClass('profile', activeTab, searchTerm)}>
                                <div className={contentWrapperClass(searchTerm)}>
                                    <ProfileSettings searchTerm={searchTerm} />
                                </div>
                            </div>
                            <div className={tabPanelClass('playback', activeTab, searchTerm)}>
                                <div className={contentWrapperClass(searchTerm)}>
                                    <PlaybackSettings
                                        settings={settings}
                                        updateSetting={updateSetting}
                                        searchTerm={searchTerm}
                                    />
                                </div>
                            </div>
                            <div className={tabPanelClass('editor', activeTab, searchTerm)}>
                                <div className={contentWrapperClass(searchTerm)}>
                                    <EditorSettings
                                        settings={settings}
                                        updateSetting={updateSetting}
                                        searchTerm={searchTerm}
                                    />
                                </div>
                            </div>
                            <div className={tabPanelClass('export', activeTab, searchTerm)}>
                                <div className={contentWrapperClass(searchTerm)}>
                                    <ExportSettings
                                        settings={settings}
                                        updateSetting={updateSetting}
                                        searchTerm={searchTerm}
                                    />
                                </div>
                            </div>
                            <div className={tabPanelClass('interface', activeTab, searchTerm)}>
                                <div className={contentWrapperClass(searchTerm)}>
                                    <InterfaceSettings
                                        settings={settings}
                                        updateSetting={updateSetting}
                                        searchTerm={searchTerm}
                                    />
                                </div>
                            </div>
                            <div className={tabPanelClass('shortcuts', activeTab, searchTerm)}>
                                <div className={contentWrapperClass(searchTerm)}>
                                    <ShortcutsSettings
                                        settings={settings}
                                        updateSetting={updateSetting}
                                        searchTerm={searchTerm}
                                        validateShortcut={validateShortcut}
                                    />
                                </div>
                            </div>
                            <div className={tabPanelClass('advanced', activeTab, searchTerm)}>
                                <div className={contentWrapperClass(searchTerm)}>
                                    <AdvancedSettings
                                        settings={settings}
                                        updateSetting={updateSetting}
                                        searchTerm={searchTerm}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer — Reset & Apply */}
                        <div className="px-6 py-4 border-t border-zinc-800/60 flex-shrink-0 flex gap-3">
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700 font-medium text-sm rounded-xl h-10"
                            >
                                {t('settings.reset') || 'Reset to defaults'}
                            </Button>
                            {!settings.advanced?.autoSave?.enabled && (
                                <Button
                                    onClick={handleApply}
                                    className="flex-1 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-xl h-10"
                                >
                                    {t('settings.applyChanges') || 'Apply Changes'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
