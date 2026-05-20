import { useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, useScroll, useSpring } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
import CollapsibleSection from './CollapsibleSection';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { X, Headphones, FileText, Download, Monitor, Keyboard, SlidersHorizontal, User } from 'lucide-react';
import { Tip } from '@ui/tip';

function ModalScrollProgress({ container }) {
    const { scrollYProgress } = useScroll({ container });
    const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 50, restDelta: 0.001 });
    return (
        <motion.div
            className="h-[2px] w-full flex-shrink-0 origin-left bg-gradient-to-r from-primary to-accent-blue"
            style={{ scaleX }}
        />
    );
}

const TABS = [
    { id: 'profile', labelKey: 'profile.title', icon: User },
    { id: 'playback', labelKey: 'settings.playback.label', icon: Headphones },
    { id: 'editor', labelKey: 'settings.editor.label', icon: FileText },
    { id: 'export', labelKey: 'settings.export.label', icon: Download },
    { id: 'interface', labelKey: 'settings.interface.label', icon: Monitor },
    { id: 'shortcuts', labelKey: 'settings.shortcuts.label', fallback: 'Shortcuts', icon: Keyboard },
    { id: 'advanced', labelKey: 'settings.advanced.label', icon: SlidersHorizontal },
];

// Map tab ids to their labels for mobile collapsible sections
const getTabLabel = (tabId, t) => {
    const tab = TABS.find(t => t.id === tabId);
    if (!tab) return tabId;
    return t(tab.labelKey) || tab.fallback || tab.id;
};

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

// SettingsPanel component - handles all internal content and layout
function SettingsPanel({
    t,
    user,
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
    isGuest,
    visibleTabs,
    onClose,
}) {
    const inputMethod = useInputMethod();
    const isMobile = inputMethod === 'touch';

    const outerScrollRef = useRef(null);
    const contentScrollRefs = useRef({});

    const activeContainerRef = searchTerm
        ? outerScrollRef
        : { current: contentScrollRefs.current[activeTab] ?? null };

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
            <div ref={outerScrollRef} className="flex-1 min-h-0 overflow-y-auto settings-scroll px-4 py-4">
                <div className="flex flex-col gap-3">
                    {/* Profile Section */}
                    {!isGuest && (
                        <CollapsibleSection
                            title={getTabLabel('profile', t)}
                            testId="settings-section-profile"
                            isOpen={activeTab === 'profile'}
                            onToggle={(isOpen) => isOpen && setActiveTab('profile')}
                        >
                            <ProfileSettings searchTerm={searchTerm} key={user?.id} />
                        </CollapsibleSection>
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
                            settings={settings}
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
            <div className="px-4 py-4 border-t border-zinc-800/60 flex-shrink-0 flex gap-2">
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
                    <X className="size-4" />
                </Button>
            </div>

            {/* Tabs */}
            {!searchTerm && (
                <div className="flex w-full border-b border-zinc-800 flex-shrink-0 overflow-x-auto no-scrollbar" role="tablist">
                    {visibleTabs.map((tab) => {
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
                                    {tab.icon && <tab.icon className={`size-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />}
                                </button>
                            </Tip>
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
                            settings={settings}
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

export default function SettingsModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const { user } = useAuthContext();
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
                position={position}
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
