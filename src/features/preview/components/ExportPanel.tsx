import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { FloatingInput } from '@ui/floating-input';
import { Checkbox } from '@ui/checkbox';
import { Label } from '@ui/label';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/dialog';
import { Icon } from '@/shared/ui/Icon';
import { LogoLoader } from '@ui/LogoLoader';
import type { ExportFormat, LineStats } from '../hooks/usePreview';

interface ExportPanelProps {
  showExportPanel: boolean;
  setShowExportPanel: (v: boolean) => void;
  exportFilename: string;
  setExportFilename: (v: string) => void;
  includeTranslations: boolean;
  setIncludeTranslations: (v: boolean) => void;
  includeSecondary: boolean;
  setIncludeSecondary: (v: boolean) => void;
  includeWordTimestamps: boolean;
  setIncludeWordTimestamps: (v: boolean) => void;
  includeMetadata: boolean;
  setIncludeMetadata: (v: boolean) => void;
  includeFeaturedInTitle: boolean;
  setIncludeFeaturedInTitle: (v: boolean) => void;
  /** Only a project with featured artists is changed by the option, so it is only offered then. */
  hasFeaturedArtists: boolean;
  exportFormat: ExportFormat;
  setExportFormat: (format: ExportFormat) => void;
  /** Milliseconds, as typed. */
  exportOffset: string;
  setExportOffset: (v: string) => void;
  /** Filename with extension, exactly as it will be downloaded. */
  exportFileName: string;
  exportText: string | null;
  exportPreviewLoading: boolean;
  exportPreviewFailed: boolean;
  lineStats: LineStats;
  songInfo: { title: string; artist: string };
  hasTranslations?: boolean;
  hasSecondary?: boolean;
  hasWordTimes?: boolean;
  hasFurigana?: boolean;
  wasCopied?: boolean;
  handleExport: () => void;
  handleCopy: () => void;
  /** Closes the dialog and scrolls the preview to the first untimed line. */
  onGoToFirstUntimed: () => void;
}

type FormatChoice = 'lrc' | 'lrcEnhanced' | 'srt';

const SECTION_LABEL = 'text-xs font-bold uppercase tracking-[0.08em] text-foreground/65';
const CHECKBOX = 'size-[18px] border-zinc-600 bg-zinc-900 data-[state=checked]:bg-primary data-[state=checked]:border-primary';

function formatBytes(text: string, locale: string): string {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} KB`;
}

export default function ExportPanel({
  showExportPanel,
  setShowExportPanel,
  exportFilename,
  setExportFilename,
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
  exportFormat,
  setExportFormat,
  exportOffset,
  setExportOffset,
  exportFileName,
  exportText,
  exportPreviewLoading,
  exportPreviewFailed,
  lineStats,
  songInfo,
  hasTranslations,
  hasSecondary,
  hasWordTimes,
  hasFurigana,
  wasCopied,
  handleExport,
  handleCopy,
  onGoToFirstUntimed,
}: ExportPanelProps) {
  const { t, i18n } = useTranslation();
  const id = useId();

  // "Enhanced LRC" is LRC with the word-timestamp flag on, so the three cards
  // drive the two existing pieces of state rather than adding a third.
  const choice: FormatChoice = exportFormat === 'srt' ? 'srt' : includeWordTimestamps && hasWordTimes ? 'lrcEnhanced' : 'lrc';
  const choose = (next: FormatChoice) => {
    if (next === 'lrcEnhanced' && !hasWordTimes) return;
    setExportFormat(next === 'srt' ? 'srt' : 'lrc');
    if (next !== 'srt') setIncludeWordTimestamps(next === 'lrcEnhanced');
  };

  const formats: { value: FormatChoice; name: string; desc: string; disabled?: boolean }[] = [
    { value: 'lrc', name: t('export.formatLrc'), desc: t('export.formatLrcDesc') },
    {
      value: 'lrcEnhanced',
      name: t('export.formatLrcEnhanced'),
      desc: hasWordTimes ? t('export.formatLrcEnhancedDesc') : t('export.formatLrcEnhancedUnavailable'),
      disabled: !hasWordTimes,
    },
    { value: 'srt', name: t('export.formatSrt'), desc: t('export.formatSrtDesc') },
  ];

  const untimed = lineStats.total - lineStats.timed;
  const subtitle = [songInfo.title, songInfo.artist, t('export.lineCount', { count: lineStats.total })]
    .filter(Boolean)
    .join(' · ');

  return (
    <Dialog open={showExportPanel} onOpenChange={setShowExportPanel}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col gap-0 p-0 overflow-hidden rounded-[20px] sm:max-w-[960px] max-h-[calc(100dvh-2rem)] font-sans text-left select-none"
      >
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-5 border-b border-zinc-800">
          <div className="flex flex-col gap-1 min-w-0">
            <DialogTitle className="text-2xl font-bold leading-tight">{t('export.dialogTitle')}</DialogTitle>
            <DialogDescription className="text-[13px] text-foreground/65 truncate">{subtitle}</DialogDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowExportPanel(false)}
            aria-label={t('common.close')}
            className="size-10 lg:size-10 coarse:size-11 rounded-[10px] border-zinc-800 bg-transparent shrink-0"
          >
            <Icon name="close" size={18} />
          </Button>
        </div>

        <div className="lrc-scroll flex flex-wrap flex-1 min-h-0 overflow-y-auto">
          {/* Options */}
          <div className="flex-[1_1_360px] min-w-0 p-5 sm:p-6 flex flex-col gap-5 md:border-r border-zinc-800">
            <div role="radiogroup" aria-labelledby={`${id}-format`} className="flex flex-col gap-2">
              <span id={`${id}-format`} className={`${SECTION_LABEL} mb-1`}>{t('export.format')}</span>
              {formats.map((f) => {
                const selected = choice === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-disabled={f.disabled}
                    onClick={() => choose(f.value)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      selected ? 'border-primary bg-primary/10' : 'border-zinc-800 hover:border-zinc-700'
                    } ${f.disabled ? 'opacity-55 cursor-not-allowed' : ''}`}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 grid place-items-center size-[18px] shrink-0 rounded-full border-2 ${selected ? 'border-primary' : 'border-zinc-600'}`}
                    >
                      {selected && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-bold text-sm text-foreground">{f.name}</span>
                      <span className="text-xs text-foreground/65">{f.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3">
              <span className={SECTION_LABEL}>{t('export.options')}</span>

              <FloatingInput
                type="text"
                label={t('export.filename')}
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExport()}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus-visible:ring-primary/25 focus-visible:border-primary/50 select-text"
              />

              {/* Metadata tags only exist in LRC */}
              {exportFormat === 'lrc' && (
                <div className="flex items-center gap-2.5 min-h-6 coarse:min-h-11">
                  <Checkbox id={`${id}-meta`} checked={includeMetadata} onCheckedChange={(c) => setIncludeMetadata(c === true)} className={CHECKBOX} />
                  <Label htmlFor={`${id}-meta`} className="text-sm font-normal text-foreground cursor-pointer">{t('export.includeMetadata')}</Label>
                </div>
              )}
              {exportFormat === 'lrc' && hasFeaturedArtists && (
                <div className="flex items-center gap-2.5 min-h-6 coarse:min-h-11">
                  <Checkbox
                    id={`${id}-feat-title`}
                    checked={includeFeaturedInTitle}
                    disabled={!includeMetadata}
                    onCheckedChange={(c) => setIncludeFeaturedInTitle(c === true)}
                    aria-describedby={`${id}-feat-title-hint`}
                    className={CHECKBOX}
                  />
                  <div className="flex flex-col">
                    <Label htmlFor={`${id}-feat-title`} className="text-sm font-normal text-foreground cursor-pointer">{(t as (k: string) => string)('artists.export.includeFeaturedInTitle')}</Label>
                    <span id={`${id}-feat-title-hint`} className="text-xs text-foreground/65">{(t as (k: string) => string)('artists.export.includeFeaturedInTitleHint')}</span>
                  </div>
                </div>
              )}
              {(hasSecondary || hasFurigana) && (
                <div className="flex items-center gap-2.5 min-h-6 coarse:min-h-11">
                  <Checkbox id={`${id}-secondary`} checked={includeSecondary} onCheckedChange={(c) => setIncludeSecondary(c === true)} className={CHECKBOX} />
                  <Label htmlFor={`${id}-secondary`} className="text-sm font-normal text-foreground cursor-pointer">
                    {t('export.includeSecondaryLrc')}
                    {hasFurigana && <span className="ml-1 text-[11px] text-foreground/45 font-mono">{'({kanji|furigana})'}</span>}
                  </Label>
                </div>
              )}
              {hasTranslations && (
                <div className="flex items-center gap-2.5 min-h-6 coarse:min-h-11">
                  <Checkbox id={`${id}-translations`} checked={includeTranslations} onCheckedChange={(c) => setIncludeTranslations(c === true)} className={CHECKBOX} />
                  <Label htmlFor={`${id}-translations`} className="text-sm font-normal text-foreground cursor-pointer">{t('export.includeTranslationsLrc')}</Label>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`${id}-offset`} className="text-sm font-normal text-foreground">{t('export.globalOffset')}</Label>
                <span className="flex items-center gap-1.5">
                  <input
                    id={`${id}-offset`}
                    type="number"
                    inputMode="numeric"
                    step={10}
                    value={exportOffset}
                    onChange={(e) => setExportOffset(e.target.value)}
                    className="w-20 h-9 coarse:h-11 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 font-mono text-sm text-foreground select-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
                  />
                  <span className="text-xs text-foreground/65">ms</span>
                </span>
              </div>
            </div>

            {untimed > 0 && (
              <div role="status" className="flex gap-2.5 px-3.5 py-3 rounded-xl border border-warning/35 bg-warning/10 text-[13px] leading-snug text-foreground">
                <Icon name="warning" size={18} className="shrink-0 mt-px text-warning-dim dark:text-warning" />
                <span>
                  {t('export.untimedWarning', { count: untimed })}{' '}
                  <button type="button" onClick={onGoToFirstUntimed} className="font-semibold underline underline-offset-2 hover:text-primary">
                    {t('export.untimedAction')}
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* Live preview: the exact text Download and Copy will produce */}
          <div className="flex-[1_1_400px] min-w-0 p-5 sm:p-6 flex flex-col gap-3 bg-zinc-950/40">
            <div className="flex items-center justify-between gap-3">
              <span className={`${SECTION_LABEL} truncate`}>
                {t('export.previewLabel')} · <span className="normal-case tracking-normal">{exportFileName}</span>
              </span>
              <span className="text-xs text-foreground/65 shrink-0 tabular-nums" aria-live="polite">
                {exportText != null && formatBytes(exportText, i18n.resolvedLanguage || i18n.language)}
              </span>
            </div>
            <div className="relative flex-1 min-h-[220px] md:min-h-[320px]">
              <pre
                tabIndex={0}
                aria-label={t('export.previewLabel')}
                aria-busy={exportPreviewLoading}
                className={`lrc-scroll absolute inset-0 m-0 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-[12.5px] leading-[1.7] text-foreground/85 whitespace-pre select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-opacity ${exportPreviewLoading ? 'opacity-50' : ''}`}
              >
                {exportPreviewFailed ? t('export.previewFailed') : exportText}
              </pre>
              {exportPreviewLoading && exportText == null && (
                <div className="absolute inset-0 grid place-items-center" role="status" aria-label={t('export.previewLoading')}>
                  <LogoLoader size={22} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-zinc-800">
          <Button
            variant="ghost"
            onClick={() => setShowExportPanel(false)}
            className="h-11 lg:h-11 px-4 lg:px-4 text-sm lg:text-sm rounded-[10px] font-semibold text-foreground/65 hover:text-foreground"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            className="h-11 lg:h-11 px-4 lg:px-4 text-sm lg:text-sm rounded-[10px] bg-transparent border-zinc-700 font-semibold text-foreground"
          >
            {wasCopied ? t('common.copied') : t('export.copy')}
          </Button>
          <Button
            onClick={handleExport}
            className="h-11 lg:h-11 px-[18px] lg:px-[18px] text-sm lg:text-sm gap-2 rounded-[10px] bg-primary hover:bg-primary-dim text-zinc-950 font-bold"
          >
            <Icon name="download" size={18} />
            {t('export.downloadAs', { ext: exportFormat })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
