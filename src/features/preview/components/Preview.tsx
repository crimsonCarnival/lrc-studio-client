import { useRef, useEffect, useState, useCallback } from 'react';
import { projects } from '@/app/api';
import { createPortal } from 'react-dom';
import { usePreview } from '../hooks/usePreview';
import type { UsePreviewResult } from '../hooks/usePreview';
import ExportPanel from './ExportPanel';
import PreviewPasteArea from './PreviewPasteArea';
import PreviewViewport from './PreviewViewport';
import PublicPlaybackBar from '@/features/projects/components/PublicPlaybackBar';
import { useHeaderSlot } from '@/shared/hooks/useHeaderSlot';
import type { EditorLine } from '@/features/editor/services/editor.service';
import type { PlayerSlot } from '@/features/player/hooks/usePlayerSlot';
import { Button } from '@ui/button';
import {
  Popover,
  PopoverContent,
  PopoverItem,
  PopoverSeparator,
  PopoverTrigger,
} from '@ui/popover';
import { Tip } from '@ui/tip';
import { Checkbox } from '@ui/checkbox';
import { SegmentedControl } from '@ui/segmented-control';

// Spelled out as literals: the icon font is subset by scanning the source for icon names.
const ALIGN_ICON = { left: 'format_align_left', center: 'format_align_center', right: 'format_align_right' } as const;
import { SharePanel } from '@features/sharing/components/ShareModal';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { Icon } from '@/shared/ui/Icon';
import { useSettings } from '@/features/settings/useSettings';
import { artistRoster } from '@/features/artists/artist-credits';

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
  /** Imperative player handle — forwarded to SharePanel to read the A-B loop. */
  playerRef?: { current?: { getLoop?: () => { a: number | null; b: number | null } } | null };
  isPlaying?: boolean;
  playbackSpeed?: number;
  /** This is the workspace's visible view (it stays mounted while hidden). */
  active?: boolean;
  /** Switches the workspace back to the editor. */
  onShowEditor?: () => void;
  /** Opens the public project page; absent until the project has been saved. */
  onViewPublic?: () => void;
  /** Moves the editor cursor, used to send the user to the first untimed line. */
  setActiveLineIndex?: (index: number) => void;
  /** When 'preview', this panel owns the player dock (editor is hidden). */
  playerSlot?: PlayerSlot;
  [key: string]: unknown;
}

export default function Preview(props: PreviewProps) {
  // Accept activepublicId and project as props
  const { activepublicId, project, playerSlot } = props;
  // Pre-split song artists (when driven by a project) — threaded into PreviewViewport
  // so its singer roster matches the editor pane. See buildSingerRoster.
  const songArtists = props.projectMetadata ? artistRoster(props.projectMetadata as Parameters<typeof artistRoster>[0]) : undefined;
  // Custom per-singer hex overrides — same source AppRouter threads into editorProps,
  // so Preview resolves the same colors as the Editor for a given singer.
  const singerColors = (props.projectMetadata as { singerColors?: string[] } | undefined)?.singerColors;
  const { updateSetting } = useSettings();

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

  // True while the visibility change is on its way to the server: the publish button
  // shows it as in flight instead of claiming the new state early.
  const [privacyPending, setPrivacyPending] = useState(false);
  const handlePrivacyChange = async (newPrivacy: string) => {
    const newIsPublic = newPrivacy === 'public';
    setIsPublic(newIsPublic);
    if (activepublicId) {
      setPrivacyPending(true);
      try {
        await projects.patch(activepublicId, { public: newIsPublic } as Parameters<typeof projects.patch>[1]);
      } catch {
        setIsPublic(!newIsPublic);
      } finally {
        setPrivacyPending(false);
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
    includeFeaturedInTitle,
    setIncludeFeaturedInTitle,
    hasFeaturedArtists,
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
    hasWordTimes,
    hasFurigana,
    exportFormat,
    setExportFormat,
    exportOffset,
    setExportOffset,
    exportFileName,
    exportText,
    exportPreviewLoading,
    exportPreviewFailed,
    showTimestamps,
    setShowTimestamps,
    showSections,
    setShowSections,
    wordHighlight,
    setWordHighlight,
    followPlayback,
    setFollowPlayback,
    lineStats,
    songInfo,
    handleSavePaste,
    handleLineClick,
    handleExport,
    handleCopy,
  }: UsePreviewResult = usePreview(props);

  const { lines, playbackPosition, duration, exportToUrl, isSharedProject, sharedReadOnly, setSharedReadOnly, editorMode, shareModal, setShareModal, hasMedia, viewerMode, isPlaying, playbackSpeed, playerRef, onShowEditor, onViewPublic, setActiveLineIndex, active = true } = props;

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

  // "Finish marking": back to the editor with the cursor on the first untimed line.
  const goToFirstUntimed = useCallback(() => {
    if (lineStats.firstUntimedIndex < 0) return;
    setShowExportPanel(false);
    setActiveLineIndex?.(lineStats.firstUntimedIndex);
    onShowEditor?.();
  }, [lineStats.firstUntimedIndex, setShowExportPanel, setActiveLineIndex, onShowEditor]);

  // The editor's Export button opens this dialog without switching views.
  useEffect(() => {
    const open = () => setShowExportPanel(true);
    window.addEventListener('preview:open-export', open);
    return () => window.removeEventListener('preview:open-export', open);
  }, [setShowExportPanel]);

  const statusSlot = useHeaderSlot('status', active);
  const centerSlot = useHeaderSlot('center', active);
  const actionsSlot = useHeaderSlot('actions', active);

  const subtitle = [songInfo.title, songInfo.artist].filter(Boolean).join(' · ');
  const alignment = settings.interface?.previewAlignment || 'left';
  const canPublish = !!activepublicId && !viewerMode && !isSharedProject;
  const untimedCount = lineStats.total - lineStats.timed;

  const viewToggles = [
    { key: 'timestamps', label: t('preview.showTimestamps'), checked: showTimestamps, set: setShowTimestamps },
    { key: 'sections', label: t('preview.showSections'), checked: showSections, set: setShowSections },
    { key: 'words', label: t('preview.wordHighlight'), checked: wordHighlight, set: setWordHighlight },
    { key: 'follow', label: t('preview.followPlayback'), checked: followPlayback, set: setFollowPlayback },
  ];

  const cardClass = 'rounded-[var(--radius-card)] bg-background inset-ring inset-ring-hl px-5 py-[18px] flex flex-col gap-2';
  const captionClass = 'text-sm font-semibold text-subtle';
  const checkboxClass = 'size-[22px] rounded-md';
  const toggleRowClass = 'flex items-center gap-3 min-h-9 coarse:min-h-11 text-base font-medium text-foreground cursor-pointer';

  const translationChips = hasTranslations && (
    <div className="flex flex-wrap items-center gap-1.5">
      {translationLanguages.map((lang, idx) => {
        const on = showTranslationsInPreview && activeTranslationIndex === idx;
        return (
          <button
            key={idx}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (on) {
                setShowTranslationsInPreview(false);
              } else {
                setActiveTranslationIndex(idx);
                setShowTranslationsInPreview(true);
              }
            }}
            className={`min-h-7 coarse:min-h-11 px-2.5 rounded-full border text-[11px] font-semibold tracking-wide transition-colors ${on ? 'bg-primary/20 text-primary border-primary/40' : 'bg-zinc-800 text-foreground/65 border-zinc-700 hover:text-foreground'}`}
          >
            {lang || `T${idx + 1}`}
          </button>
        );
      })}
    </div>
  );

  const viewToggleList = (
    <>
      {viewToggles.map((toggle) => (
        <label key={toggle.key} className={toggleRowClass}>
          <Checkbox checked={toggle.checked} onCheckedChange={(c) => toggle.set(c === true)} className={checkboxClass} />
          {toggle.label}
        </label>
      ))}
      {hasFurigana && (
        <label className={toggleRowClass}>
          <Checkbox checked={showFuriganaInPreview} onCheckedChange={(c) => setShowFuriganaInPreview(c === true)} className={checkboxClass} />
          {t('preview.furigana')}
        </label>
      )}
    </>
  );

  return (
    <>
      {/* The workspace header (see AppHeader) hosts this screen's back button, title and actions */}
      {statusSlot && onShowEditor && createPortal(
        <Button
          variant="outline"
          onClick={onShowEditor}
          aria-label={t('preview.backToEditor')}
          className="h-10 lg:h-10 coarse:h-11 px-3.5 lg:px-3.5 gap-2 rounded-[10px] border-zinc-800 bg-transparent text-[13px] lg:text-[13px] font-semibold text-foreground"
        >
          <Icon name="chevron_left" size={18} />
          <span className="max-sm:hidden">{t('preview.backToEditor')}</span>
        </Button>,
        statusSlot,
      )}
      {centerSlot && createPortal(
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-sm font-bold text-foreground">{t('preview.title')}</span>
          {subtitle && <span className="max-w-[36vw] truncate text-xs text-foreground/65">{subtitle}</span>}
        </div>,
        centerSlot,
      )}
      {actionsSlot && createPortal(
        <>
          {onViewPublic && (
            <Button
              variant="outline"
              onClick={onViewPublic}
              className="max-md:hidden h-10 lg:h-10 coarse:h-11 px-3.5 lg:px-3.5 rounded-[10px] border-zinc-800 bg-transparent text-[13px] lg:text-[13px] font-semibold text-foreground"
            >
              {t('preview.viewAsPublic')}
            </Button>
          )}
          {!viewerMode && !isSharedProject && (
            <Tip content={canPublish ? (isPublic ? t('preview.unpublishTip') : t('preview.publishTip')) : t('preview.publishNeedsSave')}>
              <Button
                // aria-disabled keeps the tooltip reachable when the project is not saved yet.
                aria-disabled={!canPublish}
                aria-pressed={canPublish ? isPublic : undefined}
                loading={privacyPending}
                onClick={() => { if (canPublish) handlePrivacyChange(isPublic ? 'private' : 'public'); }}
                // Live is foam, not the accent: it is a state, and the accent is kept for the
                // action that gets you there. Hovering it offers the undo (redesign sheet 16).
                className={`group/publish h-10 lg:h-10 coarse:h-11 min-w-[124px] px-4 lg:px-4 gap-2 text-[15px] lg:text-[15px] ${!canPublish
                  ? 'bg-raised text-faint shadow-none cursor-not-allowed hover:bg-raised active:bg-raised'
                  : privacyPending
                    ? 'bg-primary-off text-subtle shadow-none hover:bg-primary-off'
                    : isPublic
                      ? 'bg-foam-soft text-foam-ink shadow-none inset-ring inset-ring-foam hover:bg-foam-soft active:bg-foam-soft'
                      : ''}`}
              >
                {privacyPending ? (
                  isPublic ? t('preview.publishing') : t('preview.unpublishing')
                ) : canPublish && isPublic ? (
                  <>
                    <Icon name="check" size={16} className="group-hover/publish:hidden group-focus-visible/publish:hidden" />
                    <span className="group-hover/publish:hidden group-focus-visible/publish:hidden">{t('preview.published')}</span>
                    <span className="hidden group-hover/publish:inline group-focus-visible/publish:inline">{t('preview.unpublish')}</span>
                  </>
                ) : t('preview.publish')}
              </Button>
            </Tip>
          )}
          <Popover>
            <Tip content={t('preview.moreActions')} side="bottom">
              <PopoverTrigger asChild>
                <Button
                  ref={shareTriggerRef}
                  data-tour="preview-share"
                  variant="outline"
                  size="icon"
                  aria-label={t('preview.moreActions')}
                  className="size-10 lg:size-10 coarse:size-11 rounded-[10px] border-zinc-800 bg-transparent text-foreground/65 hover:text-foreground"
                >
                  <Icon name="more_horiz" size={18} />
                </Button>
              </PopoverTrigger>
            </Tip>
            <PopoverContent className="w-64 p-1" align="end">
              <PopoverItem data-export-toggle onClick={() => setShowExportPanel(true)}>
                <Icon name="download" size={16} />
                {t('export.title')}
              </PopoverItem>
              {user && !viewerMode && (
                <PopoverItem onClick={handleShareToggle}>
                  <Icon name="share" size={16} />
                  {isSharedProject ? t('share.viewingShared') : t('app.shareProject')}
                </PopoverItem>
              )}
              {onViewPublic && (
                <PopoverItem onClick={onViewPublic} className="md:hidden">
                  <Icon name="public" size={16} />
                  {t('preview.viewAsPublic')}
                </PopoverItem>
              )}
              {isSharedProject && !viewerMode && (
                <PopoverItem onClick={() => setSharedReadOnly?.(!sharedReadOnly)}>
                  <Icon name={sharedReadOnly ? 'lock' : 'lock_open'} size={16} />
                  {sharedReadOnly ? t('share.readOnlyTitle') : t('share.editingTitle')}
                </PopoverItem>
              )}
              {!viewerMode && !sharedReadOnly && (
                <>
                  <PopoverSeparator />
                  <PopoverItem onClick={() => { setPastingType('secondary'); setPasteText(lines.map(l => l.secondary || '').join('\n')); }}>
                    <Icon name="add" size={16} />
                    {t('preview.secondaryLyrics')}
                  </PopoverItem>
                  <PopoverItem onClick={() => { setPastingType('translation'); setPasteText(lines.map(l => l.translations?.[activeTranslationIndex]?.text || '').join('\n')); }}>
                    <Icon name="add" size={16} />
                    {t('preview.translation')}
                  </PopoverItem>
                </>
              )}
              {/* Below lg the sidebar is not shown, so its options live here */}
              <div className="lg:hidden">
                <PopoverSeparator />
                <fieldset className="flex flex-col gap-1 px-2 py-1.5">
                  <legend className={`${captionClass} mb-1.5`}>{t('preview.show')}</legend>
                  {viewToggleList}
                </fieldset>
                {translationChips && <div className="px-2 pb-2">{translationChips}</div>}
              </div>
            </PopoverContent>
          </Popover>
        </>,
        actionsSlot,
      )}

      <div data-tour="preview-panel" className="flex flex-col flex-1 min-h-0 animate-fade-in">
        <div className="flex flex-1 min-h-0">
          <div className="flex flex-col flex-1 min-w-0 min-h-0 px-3 sm:px-8 pt-3 lg:pt-7">
            {/* Below lg the review card collapses into this banner */}
            {untimedCount > 0 && !pastingType && (
              <button
                type="button"
                onClick={goToFirstUntimed}
                className="lg:hidden mb-3 flex items-center gap-2 min-h-11 px-3 py-2.5 rounded-[10px] border border-warning/35 bg-warning/10 text-left text-[13px] font-medium text-foreground active:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <span className="flex-1">{t('preview.untimedJump', { count: untimedCount })}</span>
                <Icon name="arrow_forward" size={16} />
              </button>
            )}
            {pastingType ? (
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
                singerColors={singerColors}
                variant="review"
                showTimestamps={showTimestamps}
                showSections={showSections}
                wordHighlight={wordHighlight}
                followPlayback={followPlayback}
              />
            )}
          </div>

          <aside
            aria-label={t('preview.review')}
            className="lrc-scroll max-lg:hidden w-[300px] xl:w-[340px] shrink-0 min-h-0 overflow-y-auto flex flex-col gap-4 p-6 border-l border-zinc-800 bg-zinc-950/40"
          >
            <div className={cardClass}>
              <span className={captionClass}>{t('preview.review')}</span>
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-[28px] font-bold leading-none tabular-nums">{lineStats.timed}/{lineStats.total}</span>
                <span className="text-sm text-foreground/65">{t('preview.linesTimed')}</span>
              </div>
              <div
                role="progressbar"
                aria-label={t('preview.reviewProgress')}
                aria-valuemin={0}
                aria-valuemax={lineStats.total}
                aria-valuenow={lineStats.timed}
                className="h-1.5 rounded-full bg-zinc-800 overflow-hidden"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                  style={{ width: `${lineStats.total ? (lineStats.timed / lineStats.total) * 100 : 0}%` }}
                />
              </div>
              {untimedCount > 0 && (
                <button
                  type="button"
                  onClick={goToFirstUntimed}
                  className="self-start text-left text-[13px] font-semibold text-primary underline underline-offset-2 hover:text-primary-dim"
                >
                  {t('preview.goToFirstUntimed')} →
                </button>
              )}
            </div>

            <fieldset className={cardClass}>
              <legend className="sr-only">{t('preview.show')}</legend>
              <span aria-hidden className={captionClass}>{t('preview.show')}</span>
              {viewToggleList}
              {translationChips}
            </fieldset>

            <div className={cardClass}>
              <span className={captionClass}>{t('preview.alignment')}</span>
              {/* Icons instead of words: alignment is one of the few settings a glyph says better. */}
              <SegmentedControl<'left' | 'center' | 'right'>
                label={t('preview.alignment')}
                value={alignment as 'left' | 'center' | 'right'}
                onChange={(value) => updateSetting('interface.previewAlignment', value)}
                options={(['left', 'center', 'right'] as const).map((value) => ({
                  value,
                  ariaLabel: t(`preview.align.${value}`),
                  tip: t(`preview.align.${value}`),
                  label: <Icon name={ALIGN_ICON[value]} size={20} />,
                }))}
                className="flex w-full [&>button]:flex-1 [&>button]:px-0"
              />
            </div>
          </aside>
        </div>

        {/* This view owns the desktop player dock while it is showing */}
        {playerSlot === 'preview' && (
          <PublicPlaybackBar lines={lines as unknown as EditorLine[]} hasInitialMedia={!!hasMedia} docked minimal />
        )}
      </div>
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
        includeFeaturedInTitle={includeFeaturedInTitle}
        setIncludeFeaturedInTitle={setIncludeFeaturedInTitle}
        hasFeaturedArtists={hasFeaturedArtists}
        exportFormat={exportFormat}
        setExportFormat={setExportFormat}
        exportOffset={exportOffset}
        setExportOffset={setExportOffset}
        exportFileName={exportFileName}
        exportText={exportText}
        exportPreviewLoading={exportPreviewLoading}
        exportPreviewFailed={exportPreviewFailed}
        lineStats={lineStats}
        songInfo={songInfo}
        hasTranslations={hasTranslations}
        hasSecondary={hasSecondary}
        hasWordTimes={hasWordTimes}
        hasFurigana={hasFurigana}
        wasCopied={wasCopied}
        handleExport={handleExport}
        handleCopy={handleCopy}
        onGoToFirstUntimed={goToFirstUntimed}
      />
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
            playerRef={playerRef}
          />
        </div>,
        document.body
      )}
    </>
  );
}
