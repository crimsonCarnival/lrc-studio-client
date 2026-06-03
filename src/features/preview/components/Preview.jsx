import { useRef, useEffect, useState, useCallback } from 'react';
import { projects } from '@/app/api';
import { createPortal } from 'react-dom';
import { usePreview } from '../hooks/usePreview';
import ExportPanel from './ExportPanel';
import PreviewPasteArea from './PreviewPasteArea';
import PreviewViewport from './PreviewViewport';
import { Button } from '@ui/button';
import {
  Popover,
  PopoverContent,
  PopoverItem,
  PopoverTrigger,
} from '@ui/popover';
import { Tip } from '@ui/tip';
import { SharePanel } from '@features/sharing/components/ShareModal';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { Eye, Share2, X, Lock, LockOpen, BookOpen, Plus } from 'lucide-react';
import { ThemedShineBorder } from '@ui/themed-shine-border';

export default function Preview(props) {
  // Accept activeProjectId and project as props
  const { activeProjectId, project } = props;

  // Privacy state for sharing (default public)
  const [isPublic, setIsPublic] = useState(project?.public ?? true);
  const [forksEnabled, setForksEnabled] = useState(project?.forksEnabled !== false);
  useEffect(() => {
    if (project && typeof project.public === 'boolean') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPublic(project.public);
    }
    if (project) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForksEnabled(project.forksEnabled !== false);
    }
  }, [project]);

  const handlePrivacyChange = async (newPrivacy) => {
    const newIsPublic = newPrivacy === 'public';
    setIsPublic(newIsPublic);
    if (activeProjectId) {
      try {
        await projects.patch(activeProjectId, { public: newIsPublic });
      } catch {
        setIsPublic(!newIsPublic);
      }
    }
  };

  const handleForksEnabledChange = async (enabled) => {
    setForksEnabled(enabled);
    if (activeProjectId) {
      try {
        await projects.setForksEnabled(activeProjectId, enabled);
      } catch {
        setForksEnabled(!enabled);
      }
    }
  };
  const {
    t,
    settings,
    pastingType,
    setPastingType,
    pasteText,
    setPasteText,
    exportFilename,
    setExportFilename,
    showExportPanel,
    setShowExportPanel,
    includeTranslations,
    setIncludeTranslations,
    includeSecondary,
    setIncludeSecondary,
    includeWordTimestamps,
    setIncludeWordTimestamps,
    includeMetadata,
    setIncludeMetadata,
    showTranslationsInPreview,
    setShowTranslationsInPreview,
    showFuriganaInPreview,
    setShowFuriganaInPreview,
    wasCopied,
    metadata,
    setMetadata,
    sizeOption,
    spacingOption,
    activeFontSizes,
    inactiveFontSizes,
    activeSecondarySizes,
    inactiveSecondarySizes,
    wrapperSpacing,
    activeMargin,
    currentIndex,
    hasSyncedLines,
    hasTranslations,
    hasSecondary,
    hasWords,
    hasFurigana,
    handleSavePaste,
    handleLineClick,
    handleExport,
    handleCopy,
  } = usePreview(props);

  const { lines, playbackPosition, duration, exportToUrl, isSharedProject, sharedReadOnly, setSharedReadOnly, editorMode, shareModal, setShareModal, hasMedia, viewerMode, isPlaying, playbackSpeed } = props;

  const shareTriggerRef = useRef(null);
  const sharePanelRef = useRef(null);
  const [shareAnchor, setShareAnchor] = useState(null);

  // Close panel on outside click
  useEffect(() => {
    if (!shareModal) return;
    const handler = (e) => {
      if (shareTriggerRef.current?.contains(e.target)) return;
      if (sharePanelRef.current?.contains(e.target)) return;
      setShareModal(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
    // setShareModal is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareModal]);

  const handleShareToggle = useCallback(() => {
    if (shareModal) {
      setShareModal(null);
      setShareAnchor(null);
      return;
    }
    if (shareTriggerRef.current) {
      const rect = shareTriggerRef.current.getBoundingClientRect();
      setShareAnchor({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    exportToUrl();
  }, [shareModal, setShareModal, exportToUrl]);

  const { user } = useAuthContext();

  return (
    <>
      <div className="lg:glass relative lg:rounded-2xl lg:overflow-hidden rounded-none p-3 sm:p-5 flex flex-col flex-1 animate-fade-in min-h-0">
        <ThemedShineBorder />
        {/* Header */}
        <div className={`flex items-center ${viewerMode ? 'justify-end' : 'justify-between'} mb-2 sm:mb-4 gap-2 sm:gap-4 relative z-raised`}>
          {!viewerMode && (
            <h2 className="text-xs sm:text-sm font-semibold tracking-widest text-zinc-400 flex items-center gap-2 overflow-hidden flex-1 pb-1">
              <span className="uppercase shrink-0 text-xs sm:text-sm flex items-center gap-1.5">
                <Eye className="size-3.5" />
                {t('preview.title')}
              </span>
            </h2>
          )}
          {hasSyncedLines && (
            <div className="relative flex items-center gap-1 text-zinc-300">
              {hasFurigana && (
                <Tip content={t('preview.furigana', 'Furigana')}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowFuriganaInPreview((v) => !v)}
                    className={`flex-shrink-0 transition-colors ${showFuriganaInPreview ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                  >
                    <BookOpen className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={1.8} />
                  </Button>
                </Tip>
              )}
              {/* Share button - restricted to logged in users */}
              {user && (
                <Tip content={shareModal ? t('share.close') : (isSharedProject ? t('share.viewingShared') : t('app.shareProject'))}>
                  {viewerMode ? (
                    <div className="flex items-center justify-center size-8 rounded-lg text-primary bg-primary/10">
                      <Share2 className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={1.8} />
                    </div>
                  ) : (
                    <Button
                      ref={shareTriggerRef}
                      variant="ghost"
                      size="icon"
                      onClick={handleShareToggle}
                      className={`flex-shrink-0 transition-colors ${isSharedProject
                        ? 'text-primary bg-primary/10 hover:bg-primary/20'
                        : shareModal
                          ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                    >
                      {shareModal
                        ? <X className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={2} />
                        : <Share2 className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={1.8} />
                      }
                    </Button>
                  )}
                </Tip>
              )}
              {/* Lock/unlock toggle for shared projects */}
              {isSharedProject && !viewerMode && (
                <Tip content={sharedReadOnly ? t('share.readOnlyTitle') : t('share.editingTitle')}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSharedReadOnly?.(!sharedReadOnly)}
                    className={`flex-shrink-0 ${sharedReadOnly ? 'text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20' : 'text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20'}`}
                  >
                    {sharedReadOnly
                      ? <Lock className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={1.8} />
                      : <LockOpen className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={1.8} />
                    }
                  </Button>
                </Tip>
              )}
              {hasTranslations && (
                <Tip content={t('preview.toggleTranslations') || 'Toggle Translations'}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowTranslationsInPreview(!showTranslationsInPreview)}
                    className={`flex-shrink-0 ${showTranslationsInPreview ? 'text-primary hover:text-primary-dim bg-zinc-800/50 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                  >
                    <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  </Button>
                </Tip>
              )}
              <div className="relative">
                <Tip content={t('export.title') || 'Export File'}>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-export-toggle
                    onClick={() => setShowExportPanel(!showExportPanel)}
                    className={`flex-shrink-0 ${showExportPanel ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                  >
                    {showExportPanel ? (
                      <X className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={2} />
                    ) : (
                      <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </Button>
                </Tip>
              </div>

              {/* Menu */}
              {!viewerMode && !sharedReadOnly && (
                <Popover>
                  <Tip content={t('preview.addTrack', 'Add track')} side="bottom">
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
                      >
                        <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
                      </Button>
                    </PopoverTrigger>
                  </Tip>
                  <PopoverContent className="w-36 sm:w-48" align="end">
                    <PopoverItem
                      onClick={() => { setPastingType('secondary'); setPasteText(lines.map(l => l.secondary || '').join('\n')); }}
                      className="sm:text-sm"
                    >
                      {t('preview.secondaryLyrics')}
                    </PopoverItem>
                    <PopoverItem
                      onClick={() => { setPastingType('translation'); setPasteText(lines.map(l => l.translation || '').join('\n')); }}
                      className="sm:text-sm"
                    >
                      {t('preview.translation')}
                    </PopoverItem>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>

        {/* Viewport */}
        {showExportPanel ? (
          <ExportPanel
            showExportPanel={showExportPanel}
            setShowExportPanel={setShowExportPanel}
            exportFilename={exportFilename}
            setExportFilename={setExportFilename}
            metadata={metadata}
            setMetadata={setMetadata}
            includeTranslations={includeTranslations}
            setIncludeTranslations={setIncludeTranslations}
            includeSecondary={includeSecondary}
            setIncludeSecondary={setIncludeSecondary}
            includeWordTimestamps={includeWordTimestamps}
            setIncludeWordTimestamps={setIncludeWordTimestamps}
            includeMetadata={includeMetadata}
            setIncludeMetadata={setIncludeMetadata}
            hasTranslations={hasTranslations}
            hasSecondary={hasSecondary}
            hasWords={hasWords}
            hasFurigana={hasFurigana}
            wasCopied={wasCopied}
            handleExport={handleExport}
            handleCopy={handleCopy}
          />
        ) : pastingType ? (
          <PreviewPasteArea
            pastingType={pastingType}
            setPastingType={setPastingType}
            pasteText={pasteText}
            setPasteText={setPasteText}
            handleSavePaste={handleSavePaste}
          />
        ) : (
          <PreviewViewport
            lines={lines}
            currentIndex={currentIndex}
            hasSyncedLines={hasSyncedLines}
            playbackPosition={playbackPosition}
            handleLineClick={handleLineClick}
            showTranslationsInPreview={showTranslationsInPreview}
            showFuriganaInPreview={showFuriganaInPreview}
            sizeOption={sizeOption}
            spacingOption={spacingOption}
            activeSecondarySizes={activeSecondarySizes}
            inactiveSecondarySizes={inactiveSecondarySizes}
            activeFontSizes={activeFontSizes}
            inactiveFontSizes={inactiveFontSizes}
            activeMargin={activeMargin}
            wrapperSpacing={wrapperSpacing}
            settings={settings}
            editorMode={editorMode}
            t={t}
            hasMedia={hasMedia}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
          />
        )}
      </div>
      {shareModal && shareAnchor && createPortal(
        <div
          ref={sharePanelRef}
          style={{ position: 'fixed', top: shareAnchor.top, right: shareAnchor.right }}
          className="z-overlay w-80 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-elevated animate-fade-in"
        >
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <div className="size-6 rounded-lg bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center flex-shrink-0">
              <Share2 className="size-3 text-white" strokeWidth={2} />
            </div>
            <span className="text-xs font-bold text-zinc-100">{t('share.title', 'Share Project')}</span>
          </div>
          <SharePanel
            {...shareModal}
            isPublic={isPublic}
            onPrivacyChange={handlePrivacyChange}
            forksEnabled={forksEnabled}
            onForksEnabledChange={activeProjectId ? handleForksEnabledChange : undefined}
            playbackPosition={playbackPosition}
            duration={duration}
          />
        </div>,
        document.body
      )}
    </>
  );
}
