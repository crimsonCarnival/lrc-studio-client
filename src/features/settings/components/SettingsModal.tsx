import { useRef } from 'react';
import type { ComponentProps, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { LazyMotion, domAnimation, m as M, useScroll, useSpring } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useSettings } from '@/features/settings/useSettings';
import { useSettingsModal } from '@features/settings/hooks/useSettingsModal';
import { useScrollLock } from '@/shared/hooks/useScrollLock';
import useInputMethod from '@/shared/hooks/useInputMethod';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { ResponsiveModal } from '@/shared/ui/ResponsiveModal.jsx';
import PlaybackSettings from './panels/PlaybackSettings';
import EditorSettings from './panels/EditorSettings';
import ExportSettings from './panels/ExportSettings';
import InterfaceSettings from './panels/InterfaceSettings';
import ShortcutsSettings from './panels/ShortcutsSettings';
import AdvancedSettings from './panels/AdvancedSettings';
import ProfileSettings from './panels/ProfileSettings';
import BadgesSettings from './panels/BadgesSettings';
import NotificationsSettings from './panels/NotificationsSettings';
import PrivacySettings from './panels/PrivacySettings';
import SecuritySettings from './panels/SecuritySettings';
import ConnectionsSettings from './panels/ConnectionsSettings';
import ChangesHistorySettings from './panels/ChangesHistorySettings';
import CollapsibleSection from './CollapsibleSection';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Icon } from '@/shared/ui/Icon';

import { Tip } from '@ui/tip';
import type { AppSettings } from '@/features/settings/settings.types';
import type { AuthUser } from '@/features/auth/hooks/useAuth';

function ModalScrollProgress({ container }: { container: RefObject<HTMLElement | null> }) {
    const { scrollYProgress } = useScroll({ container });
    const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 50, restDelta: 0.001 });
    return (
        <LazyMotion features={domAnimation}>
            <M.div
                className="h-[2px] w-full flex-shrink-0 origin-left bg-gradient-to-r from-primary to-accent-blue"
                style={{ scaleX }}
            />
        </LazyMotion>
    );
}

interface SettingsTab {
  id: string;
  labelKey: string;
  iconName: string;
  authOnly?: boolean;
  group: string;
  fallback?: string;
}

const TABS: SettingsTab[] = [
  // Account & Identity
  { id: 'profile', labelKey: 'profile.tabs.account', iconName: 'person', authOnly: true, group: 'account' },
  { id: 'badges', labelKey: 'badges.showcase.editorTitle', fallback: 'Badges', iconName: 'military_tech', authOnly: true, group: 'account' },
  { id: 'notifications', labelKey: 'profile.notifications', fallback: 'Notifications', iconName: 'notifications', authOnly: true, group: 'account' },
  { id: 'privacy', labelKey: 'profile.privacy', fallback: 'Privacy', iconName: 'visibility_off', authOnly: true, group: 'account' },
  { id: 'security', labelKey: 'profile.sections.security', iconName: 'verified_user', authOnly: true, group: 'account' },
  { id: 'connections', labelKey: 'profile.tabs.connections', iconName: 'link', authOnly: true, group: 'account' },
  { id: 'history', labelKey: 'profile.tabs.history', iconName: 'history', authOnly: true, group: 'account' },

  // App Preferences
  { id: 'playback', labelKey: 'settings.playback.label', iconName: 'headphones', group: 'preferences' },
  { id: 'editor', labelKey: 'settings.editor.label', iconName: 'description', group: 'preferences' },
  { id: 'export', labelKey: 'settings.export.label', iconName: 'download', group: 'preferences' },
  { id: 'interface', labelKey: 'settings.interface.label', iconName: 'desktop_windows', group: 'preferences' },

  // Advanced
  { id: 'shortcuts', labelKey: 'settings.shortcuts.label', fallback: 'Shortcuts', iconName: 'keyboard', group: 'advanced' },
  { id: 'advanced', labelKey: 'settings.advanced.label', iconName: 'tune', group: 'advanced' },
];

// Typed i18next rejects arbitrary string keys; alias for dynamic tab labels.
type TkFn = (key: string) => string;
type ShortcutsSettingsProps = ComponentProps<typeof ShortcutsSettings>;

// Map tab ids to their labels for mobile collapsible sections
const getTabLabel = (tabId: string, t: TFunction): string => {
    const tab = TABS.find(x => x.id === tabId);
    if (!tab) return tabId;
    return (t as TkFn)(tab.labelKey) || tab.fallback || tab.id;
};

function tabPanelClass(tabId: string, activeTab: string, searchTerm: string): string {
    if (searchTerm) return 'flex flex-col';
    const isActive = activeTab === tabId;
    return `col-start-1 row-start-1 px-5 pt-4 pb-0 flex flex-col min-h-0 transition-all duration-200 ease-out ${isActive ? 'opacity-100 z-raised animate-tab-slide-in' : 'opacity-0 z-base pointer-events-none'
        }`;
}

function contentWrapperClass(searchTerm: string): string {
    if (searchTerm) return '';
    return 'flex-1 min-h-0 overflow-y-auto settings-scroll pr-1 pb-4';
}

type ShortcutValidator = (newKey: string, currentKeyName: string) => boolean;

interface SettingsPanelProps {
    t: TFunction;
    user: AuthUser | null;
    settings: AppSettings;
    activeTab: string;
    setActiveTab: (id: string) => void;
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    handleMouseDown: (e: ReactPointerEvent) => void;
    updateSetting: (path: string, value: unknown) => void;
    validateShortcut: ShortcutValidator;
    handleReset: () => void;
    handleApply: () => void;
    isGuest: boolean;
    visibleTabs: SettingsTab[];
    onClose: () => void;
}

// SettingsPanel component - handles all internal content and layout
function SettingsPanel({
    t,
    user,
    settings,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    handleMouseDown,
    updateSetting,
    validateShortcut,
    handleReset,
    handleApply,
    isGuest,
    visibleTabs,
    onClose,
}: SettingsPanelProps) {
    const inputMethod = useInputMethod();
    const isMobile = inputMethod === 'touch';

    const outerScrollRef = useRef<HTMLDivElement>(null);
    const contentScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

    /* eslint-disable react-hooks/refs */
    const activeContainerRef: RefObject<HTMLElement | null> = searchTerm
        ? outerScrollRef
        : { current: contentScrollRefs.current[activeTab] ?? null };
    /* eslint-enable react-hooks/refs */

    // Render mobile content
    const renderMobileContent = () => {
        return (
        <>
            {/* Search (optional for mobile) */}
            {!searchTerm && (
                <div className="px-4 pb-3 border-b border-zinc-800/60 flex-shrink-0">
                    <Input
                        type="text"
                        placeholder={t('settings.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700/60 text-zinc-200 placeholder-zinc-500 focus-visible:border-primary/50 w-full h-9 text-sm rounded-lg"
                    />
                </div>
            )}

            {/* Collapsible Sections Content */}
            <div ref={outerScrollRef} className="flex-1 min-h-0 overflow-y-auto settings-scroll p-4">
                <div className="flex flex-col gap-3">
                    {/* Profile Section */}
                    {!isGuest && (
                        <>
                            <CollapsibleSection
                                title={getTabLabel('profile', t)}
                                testId="settings-section-profile"
                                isOpen={activeTab === 'profile'}
                                onToggle={(isOpen) => isOpen && setActiveTab('profile')}
                            >
                                <ProfileSettings searchTerm={searchTerm} key={user?.id} />
                            </CollapsibleSection>

                            <CollapsibleSection
                                title={getTabLabel('security', t)}
                                testId="settings-section-security"
                                isOpen={activeTab === 'security'}
                                onToggle={(isOpen) => isOpen && setActiveTab('security')}
                            >
                                <SecuritySettings focusCard={undefined} />
                            </CollapsibleSection>

                            <CollapsibleSection
                                title={getTabLabel('connections', t)}
                                testId="settings-section-connections"
                                isOpen={activeTab === 'connections'}
                                onToggle={(isOpen) => isOpen && setActiveTab('connections')}
                            >
                                <ConnectionsSettings />
                            </CollapsibleSection>

                            <CollapsibleSection
                                title={getTabLabel('history', t)}
                                testId="settings-section-history"
                                isOpen={activeTab === 'history'}
                                onToggle={(isOpen) => isOpen && setActiveTab('history')}
                            >
                                <ChangesHistorySettings />
                            </CollapsibleSection>
                        </>
                    )}

                    {/* Playback Section */}
                    <CollapsibleSection
                        title={getTabLabel('playback', t)}
                        testId="settings-section-playback"
                        isOpen={activeTab === 'playback'}
                        onToggle={(isOpen) => isOpen && setActiveTab('playback')}
                    >
                        <PlaybackSettings
                            settings={settings}
                            updateSetting={updateSetting}
                            searchTerm={searchTerm}
                        />
                    </CollapsibleSection>

                    {/* Editor Section */}
                    <CollapsibleSection
                        title={getTabLabel('editor', t)}
                        testId="settings-section-editor"
                        isOpen={activeTab === 'editor'}
                        onToggle={(isOpen) => isOpen && setActiveTab('editor')}
                    >
                        <EditorSettings
                            settings={settings}
                            updateSetting={updateSetting}
                            searchTerm={searchTerm}
                        />
                    </CollapsibleSection>

                    {/* Export Section */}
                    <CollapsibleSection
                        title={getTabLabel('export', t)}
                        testId="settings-section-export"
                        isOpen={activeTab === 'export'}
                        onToggle={(isOpen) => isOpen && setActiveTab('export')}
                    >
                        <ExportSettings
                            settings={settings}
                            updateSetting={updateSetting}
                            searchTerm={searchTerm}
                        />
                    </CollapsibleSection>

                    {/* Interface Section */}
                    <CollapsibleSection
                        title={getTabLabel('interface', t)}
                        testId="settings-section-interface"
                        isOpen={activeTab === 'interface'}
                        onToggle={(isOpen) => isOpen && setActiveTab('interface')}
                    >
                        <InterfaceSettings
                            settings={settings}
                            updateSetting={updateSetting}
                            searchTerm={searchTerm}
                        />
                    </CollapsibleSection>

                    {/* Shortcuts Section */}
                    <CollapsibleSection
                        title={getTabLabel('shortcuts', t)}
                        testId="settings-section-shortcuts"
                        isOpen={activeTab === 'shortcuts'}
                        onToggle={(isOpen) => isOpen && setActiveTab('shortcuts')}
                    >
                        <ShortcutsSettings
                            settings={settings as unknown as ShortcutsSettingsProps['settings']}
                            updateSetting={updateSetting}
                            searchTerm={searchTerm}
                            validateShortcut={validateShortcut}
                        />
                    </CollapsibleSection>

                    {/* Advanced Section */}
                    <CollapsibleSection
                        title={getTabLabel('advanced', t)}
                        testId="settings-section-advanced"
                        isOpen={activeTab === 'advanced'}
                        onToggle={(isOpen) => isOpen && setActiveTab('advanced')}
                    >
                        <AdvancedSettings
                            settings={settings}
                            updateSetting={updateSetting}
                            searchTerm={searchTerm}
                            isGuest={isGuest}
                        />
                    </CollapsibleSection>
                </div>
            </div>

            {/* Footer — Reset & Apply */}
            <div className="p-4 border-t border-zinc-800/60 flex-shrink-0 flex gap-2">
                <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700 font-medium text-sm rounded-lg h-12"
                >
                    {t('settings.reset') || 'Reset'}
                </Button>
                {!settings.advanced?.autoSave?.enabled && (
                    <Button
                        onClick={handleApply}
                        className="flex-1 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-lg h-12"
                    >
                        {t('settings.applyChanges') || 'Apply'}
                    </Button>
                )}
            </div>
        </>
        );
    };

    // Render desktop content
    const renderDesktopContent = () => {
        return (
        <>
            {/* Header (drag handle) */}
            <div
                className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-800/60 flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
                onPointerDown={handleMouseDown}
                role="presentation"
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
                    <Icon name="close" size={16} />
                </Button>
            </div>

            {/* Tabs */}
            {!searchTerm && (
                <div className="flex w-full border-b border-zinc-800 flex-shrink-0 overflow-x-auto no-scrollbar" role="tablist">
                    {visibleTabs.map((tab, idx) => {
                        const label = (t as TkFn)(tab.labelKey) || tab.fallback || tab.id;
                        const isActive = activeTab === tab.id;
                        const showDivider = idx > 0 && visibleTabs[idx - 1].group !== tab.group;
                        return (
                            <div key={tab.id} className="flex flex-1 min-w-0 items-center">
                                {showDivider && <div className="w-px h-6 bg-zinc-800/60 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                    <Tip content={label}>
                                        <button
                                            role="tab"
                                            aria-selected={isActive}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`relative w-full flex flex-col items-center gap-0.5 px-2 sm:px-3 py-2.5 text-[9px] sm:text-[10px] font-semibold whitespace-nowrap transition-all duration-200 outline-none -mb-px border-b-2 ${isActive
                                                    ? 'text-primary border-primary scale-105'
                                                    : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:border-zinc-600 hover:scale-105'
                                                }`}
                                        >
                                            {tab.iconName && <Icon name={tab.iconName} size={16} className={`shrink-0 ${isActive ? 'text-primary' : ''}`} />}
                                        </button>
                                    </Tip>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Scroll progress bar — tracks active tab or search container */}
            <ModalScrollProgress
                key={searchTerm ? 'modal-search' : `modal-${activeTab}`}
                container={activeContainerRef}
            />

            {/* Scrollable Content — CSS grid forces consistent height across all tabs */}
            <div
                ref={outerScrollRef}
                className={`flex-1 min-h-0 ${searchTerm ? 'overflow-y-auto settings-scroll flex flex-col p-6' : 'grid'
                    }`}
            >
                <div className={tabPanelClass('profile', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.profile = el; }} className={contentWrapperClass(searchTerm)}>
                        <ProfileSettings searchTerm={searchTerm} key={user?.id} />
                    </div>
                </div>
                <div className={tabPanelClass('badges', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.badges = el; }} className={contentWrapperClass(searchTerm)}>
                        <BadgesSettings searchTerm={searchTerm} />
                    </div>
                </div>
                <div className={tabPanelClass('notifications', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.notifications = el; }} className={contentWrapperClass(searchTerm)}>
                        <NotificationsSettings searchTerm={searchTerm} />
                    </div>
                </div>
                <div className={tabPanelClass('privacy', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.privacy = el; }} className={contentWrapperClass(searchTerm)}>
                        <PrivacySettings searchTerm={searchTerm} />
                    </div>
                </div>
                <div className={tabPanelClass('security', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.security = el; }} className={contentWrapperClass(searchTerm)}>
                        <SecuritySettings focusCard={undefined} />
                    </div>
                </div>
                <div className={tabPanelClass('connections', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.connections = el; }} className={contentWrapperClass(searchTerm)}>
                        <ConnectionsSettings />
                    </div>
                </div>
                <div className={tabPanelClass('history', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.history = el; }} className={contentWrapperClass(searchTerm)}>
                        <ChangesHistorySettings />
                    </div>
                </div>
                <div className={tabPanelClass('playback', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.playback = el; }} className={contentWrapperClass(searchTerm)}>
                        <PlaybackSettings
                            settings={settings}
                            updateSetting={updateSetting}
                            searchTerm={searchTerm}
                        />
                    </div>
                </div>
                <div className={tabPanelClass('editor', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.editor = el; }} className={contentWrapperClass(searchTerm)}>
                        <EditorSettings
                            settings={settings}
                            updateSetting={updateSetting}
                            searchTerm={searchTerm}
                        />
                    </div>
                </div>
                <div className={tabPanelClass('export', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.export = el; }} className={contentWrapperClass(searchTerm)}>
                        <ExportSettings
                            settings={settings}
                            updateSetting={updateSetting}
                            searchTerm={searchTerm}
                        />
                    </div>
                </div>
                <div className={tabPanelClass('interface', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.interface = el; }} className={contentWrapperClass(searchTerm)}>
                        <InterfaceSettings
                            settings={settings}
                            updateSetting={updateSetting}
                            searchTerm={searchTerm}
                        />
                    </div>
                </div>
                <div className={tabPanelClass('shortcuts', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.shortcuts = el; }} className={contentWrapperClass(searchTerm)}>
                        <ShortcutsSettings
                            settings={settings as unknown as ShortcutsSettingsProps['settings']}
                            updateSetting={updateSetting}
                            searchTerm={searchTerm}
                            validateShortcut={validateShortcut}
                        />
                    </div>
                </div>
                <div className={tabPanelClass('advanced', activeTab, searchTerm)}>
                    <div ref={(el) => { contentScrollRefs.current.advanced = el; }} className={contentWrapperClass(searchTerm)}>
                        <AdvancedSettings
                            settings={settings}
                            updateSetting={updateSetting}
                            searchTerm={searchTerm}
                            isGuest={isGuest}
                        />
                    </div>
                </div>
            </div>

            {/* Footer — Reset & Apply */}
            <div className="px-6 py-4 border-t border-zinc-800/60 flex-shrink-0 flex gap-3">
                <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700 font-medium text-sm rounded-xl h-12"
                >
                    {t('settings.reset') || 'Reset to defaults'}
                </Button>
                {!settings.advanced?.autoSave?.enabled && (
                    <Button
                        onClick={handleApply}
                        className="flex-1 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-xl h-12"
                    >
                        {t('settings.applyChanges') || 'Apply Changes'}
                    </Button>
                )}
            </div>
        </>
        );
    };

    // Return mobile or desktop based on input method
    if (isMobile) {
        return renderMobileContent();
    }

    // Desktop layout with tabs
    return renderDesktopContent();
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: (open?: boolean) => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { t } = useTranslation();
    const { user } = useAuthContext();
    const { settings: globalSettings, updateAllSettings } = useSettings();
    const {
        settings,
        activeTab,
        setActiveTab,
        searchTerm,
        setSearchTerm,
        handleMouseDown,
        updateSetting,
        validateShortcut,
        handleReset,
        handleApply,
    } = useSettingsModal(isOpen, onClose, globalSettings, updateAllSettings);

    const isGuest = !user;

    // Guests cannot access Profile settings; filter it out
    const visibleTabs = isGuest ? TABS.filter((tab) => tab.id !== 'profile') : TABS;

    // If the modal is opened to 'profile' tab but the user is a guest, fallback to 'playback'
    if (isGuest && activeTab === 'profile') setActiveTab('playback');

    useScrollLock(isOpen);

    return (
        <ResponsiveModal
            open={isOpen}
            onOpenChange={onClose}
            title={t('settings.title')}
            dialogProps={{
                className: 'max-w-2xl',
            }}
            drawerProps={{
                showClose: true,
            }}
        >
            <SettingsPanel
                t={t}
                user={user}
                settings={settings}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                handleMouseDown={handleMouseDown}
                updateSetting={updateSetting}
                validateShortcut={validateShortcut}
                handleReset={handleReset}
                handleApply={handleApply}
                isGuest={isGuest}
                visibleTabs={visibleTabs}
                onClose={() => onClose(false)}
            />
        </ResponsiveModal>
    );
}
