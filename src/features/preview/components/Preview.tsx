import { useRef, useEffect, useState, useCallback } from 'react';
import { projects } from '@/app/api';
import { createPortal } from 'react-dom';
import { usePreview } from '../hooks/usePreview';
import type { UsePreviewResult } from '../hooks/usePreview';
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
import { Icon } from '@/shared/ui/Icon';

interface PreviewLineLite {
  secondary?: string;
  translations?: { text?: string }[];
  [key: string]: unknown;
}

interface PreviewProps {
  activepublicId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project?: { public?: boolean; forksEnabled?: boolean; [key: string]: any };
  lines: PreviewLineLite[];
  playbackPosition: number;
  duration?: number;
  exportToUrl: () => void;
  isSharedProject?: boolean;
  sharedReadOnly?: boolean;
  setSharedReadOnly?: (v: boolean) => void;
  editorMode: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shareModal?: any;
  setShareModal: (v: unknown) => void;
  hasMedia?: boolean;
  viewerMode?: boolean;
  isPlaying?: boolean;
  playbackSpeed?: number;
  // Panel toggles relocated from the header (#12/#13): hide the preview, or
  // restore the editor when it's hidden.
  onHidePreview?: () => void;
  editorHidden?: boolean;
  onShowEditor?: () => void;
  [key: string]: unknown;
}

export default function Preview(props: PreviewProps) {
  // Accept activepublicId and project as props
  const { activepublicId, project } = props;
  // Pre-split song artists (when driven by a project) — threaded into PreviewViewport
  // so its singer roster matches the editor pane. See buildSingerRoster.
  const songArtists = (props.projectMetadata as { songArtists?: string[] } | undefined)?.songArtists;

  // Privacy state for sharing (default public)
  const [isPublic, setIsPublic] = useState(project?.public ?? true);
  const [forksEnabled, setForksEnabled] = useState(project?.forksEnabled !== false);
  useEffect(() => {
    if (project && typeof project.public === 'boolean') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPublic(project.public);
    }
    if (project) {
      setForksEnabled(project.forksEnabled !== false);
    }
  }, [project]);

  const handlePrivacyChange = async (newPrivacy: string) => {
    const newIsPublic = newPrivacy === 'public';
    setIsPublic(newIsPublic);
    if (activepublicId) {
      try {
        await projects.patch(activepublicId, { public: newIsPublic } as Parameters<typeof projects.patch>[1]);
      } catch {
        setIsPublic(!newIsPublic);
      }
    }
  };

  const handleForksEnabledChange = async (enabled: boolean) => {
    setForksEnabled(enabled);
    if (activepublicId) {
      try {
        await projects.setForksEnabled(activepublicId, enabled);
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
    translationLanguages,
    activeTranslationIndex,
    setActiveTranslationIndex,
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
  }: UsePreviewResult = usePreview(props);

  const { lines, playbackPosition, duration, exportToUrl, isSharedProject, sharedReadOnly, setSharedReadOnly, editorMode, shareModal, setShareModal, hasMedia, viewerMode, isPlaying, playbackSpeed, onHidePreview, editorHidden, onShowEditor } = props;

  const shareTriggerRef = useRef<HTMLButtonElement>(null);
  const sharePanelRef = useRef<HTMLDivElement>(null);
  const [shareAnchor, setShareAnchor] = useState<{ top: number; right: number } | null>(null);

  // Close panel on outside click
  useEffect(() => {
    if (!shareModal) return;
    const handler = (e: MouseEvent) => {
      if (shareTriggerRef.current?.contains(e.target as Node)) return;
      if (sharePanelRef.current?.contains(e.target as Node)) return;
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

        {/* Header */}
        <div className={`flex items-center ${viewerMode ? 'justify-end' : 'justify-between'} mb-2 sm:mb-4 gap-2 sm:gap-4 relative z-raised`}>
          {!viewerMode && (
            <h2 className="text-xs sm:text-sm font-semibold tracking-widest text-zinc-400 flex items-center gap-2 overflow-hidden flex-1 pb-1">
              <span className="uppercase shrink-0 text-xs sm:text-sm flex items-center gap-1.5">
                <Icon name="visibility" size={14} />
                {t('preview.title')}
              </span>
            </h2>
          )}
          {/* #13: restore the editor when it's hidden — always available on desktop */}
          {editorHidden && onShowEditor && (
            <Tip content={t('app.showEditor')}>
              <Button
                variant="ghost"
                size="icon"
                onClick={onShowEditor}
                aria-label={t('app.showEditor')}
                className="hidden lg:flex flex-shrink-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <Icon name="left_panel_open" size={20} />
              </Button>
            </Tip>
          )}
          {hasSyncedLines && (
            <div className="relative flex items-center gap-1 text-zinc-300">
              {hasFurigana && (
                <Tip content={t('preview.furigana')}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowFuriganaInPreview((v: boolean) => !v)}
                    className={`flex-shrink-0 transition-colors ${showFuriganaInPreview ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                  >
                    <Icon name="menu_book" size={20} />
                  </Button>
                </Tip>
              )}
              {/* #12: hide the preview — sits to the left of Share */}
              {onHidePreview && !viewerMode && (
                <Tip content={t('app.hidePreview')}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onHidePreview}
                    aria-label={t('app.hidePreview')}
                    className="hidden lg:flex flex-shrink-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  >
                    <Icon name="right_panel_close" size={20} />
                  </Button>
                </Tip>
              )}
              {/* Share button - restricted to logged in users */}
              {user && (
                <Tip content={shareModal ? t('share.close') : (isSharedProject ? t('share.viewingShared') : t('app.shareProject'))}>
                  {viewerMode ? (
                    <div className="flex items-center justify-center size-8 rounded-lg text-primary bg-primary/10">
                      <Icon name="share" size={20} />
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
                        ? <Icon name="close" size={20} />
                        : <Icon name="share" size={20} />
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
                      ? <Icon name="lock" size={20} />
                      : <Icon name="lock_open" size={20} />
                    }
                  </Button>
                </Tip>
              )}
              {hasTranslations && (
                <div className="flex items-center gap-1">
                  {translationLanguages.map((lang, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (activeTranslationIndex === idx && showTranslationsInPreview) {
                          setShowTranslationsInPreview(false);
                        } else {
                          setActiveTranslationIndex(idx);
                          setShowTranslationsInPreview(true);
                        }
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide transition-colors ${
                        showTranslationsInPreview && activeTranslationIndex === idx
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/40 hover:text-zinc-300'
                      }`}
                    >
                      {lang || `T${idx + 1}`}
                    </button>
                  ))}
                </div>
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
                      <Icon name="close" size={20} />
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
                  <Tip content={t('preview.addTrack')} side="bottom">
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
                      >
                        <Icon name="add" size={20} />
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
                      onClick={() => { setPastingType('translation'); setPasteText(lines.map(l => l.translations?.[activeTranslationIndex]?.text || '').join('\n')); }}
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
            activeTranslationIndex={activeTranslationIndex}
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
            songArtists={songArtists}
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
              <Icon name="share" size={12} className="text-white" />
            </div>
            <span className="text-xs font-bold text-zinc-100">{t('share.title')}</span>
          </div>
          <SharePanel
            {...shareModal}
            isPublic={isPublic}
            onPrivacyChange={handlePrivacyChange}
            forksEnabled={forksEnabled}
            onForksEnabledChange={activepublicId ? handleForksEnabledChange : undefined}
            playbackPosition={playbackPosition}
            duration={duration}
          />
        </div>,
        document.body
      )}
    </>
  );
}
