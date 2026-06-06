import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/features/settings/useSettings';
import { Button } from '@ui/button';
import { FloatingInput } from '@ui/floating-input';
import { Checkbox } from '@ui/checkbox';
import { Label } from '@ui/label';
import { Tip } from '@ui/tip';
import { ThemedShineBorder } from '@ui/themed-shine-border';

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
  hasTranslations,
  hasSecondary,
  hasWords,
  hasFurigana,
  wasCopied,
  handleExport,
  handleCopy
}) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const exportPanelRef = useRef(null);

  useEffect(() => {
    if (!showExportPanel) return;
    const handler = (e) => {
      if (
        exportPanelRef.current &&
        !exportPanelRef.current.contains(e.target) &&
        !e.target.closest('[data-export-toggle]')
      ) {
        setShowExportPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportPanel, setShowExportPanel]);

  if (!showExportPanel) return null;

  const format = settings.export?.downloadFormat || 'lrc';
  const hasExtras = hasSecondary || hasFurigana || hasTranslations || hasWords;

  return (
    <div
      ref={exportPanelRef}
      className="flex-1 min-h-0 flex flex-col animate-fade-in font-sans text-left"
    >
      <div className="relative flex-1 min-h-0 overflow-y-auto space-y-2 p-3 rounded-xl bg-zinc-900 border border-zinc-700">
        <ThemedShineBorder />

        {/* Filename + format */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <FloatingInput
              type="text"
              label={t('export.filename')}
              value={exportFilename}
              onChange={(e) => setExportFilename(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExport()}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus-visible:ring-primary/25 focus-visible:border-primary/50"
            />
          </div>
          <Tip content={t('export.formatTip')} side="top">
            <button
              type="button"
              onClick={() => navigate('/settings/export')}
              className="text-sm text-zinc-400 font-mono bg-zinc-800 px-2 py-1.5 rounded-lg border border-zinc-700/50 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              .{format}
            </button>
          </Tip>
        </div>

        {/* Metadata toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="include-metadata"
            checked={includeMetadata}
            onCheckedChange={setIncludeMetadata}
            className="border-zinc-600 bg-zinc-900 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label htmlFor="include-metadata" className="text-xs text-zinc-400 cursor-pointer">
            {t('export.includeMetadata', 'Include song metadata (title, artist, album)')}
          </Label>
        </div>

        {/* Extra content options */}
        {hasExtras ? (
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-zinc-700/30">
            {(hasSecondary || hasFurigana) && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-secondary-opt"
                  checked={includeSecondary}
                  onCheckedChange={setIncludeSecondary}
                  className="border-zinc-600 bg-zinc-900 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="include-secondary-opt" className="text-xs text-zinc-400 cursor-pointer">
                  {t('export.includeSecondaryLrc', 'Secondary lyrics')}
                  {hasFurigana && (
                    <span className="ml-1 text-[10px] text-zinc-600 font-mono">{'({kanji|furigana})'}</span>
                  )}
                </Label>
              </div>
            )}
            {hasTranslations && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-translations-opt"
                  checked={includeTranslations}
                  onCheckedChange={setIncludeTranslations}
                  className="border-zinc-600 bg-zinc-900 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="include-translations-opt" className="text-xs text-zinc-400 cursor-pointer">
                  {t('export.includeTranslationsLrc', 'Translations')}
                </Label>
              </div>
            )}
            {hasWords && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-words"
                  checked={includeWordTimestamps}
                  onCheckedChange={setIncludeWordTimestamps}
                  className="border-zinc-600 bg-zinc-900 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="include-words" className="text-xs text-zinc-400 cursor-pointer">
                  {t('export.includeWords', 'Word-by-word timestamps')}
                </Label>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-600 italic px-1">
            {t('export.noExtraContent')}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 w-full pt-2 flex-shrink-0">
        <Button
          variant="outline"
          onClick={handleCopy}
          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700 font-semibold text-sm h-9"
        >
          {wasCopied
            ? `${t('common.copied')} ${settings.export?.copyFormat?.toUpperCase() ?? 'LRC'}!`
            : t('preview.copyToClipboard')}
        </Button>
        <Button
          onClick={handleExport}
          className="flex-1 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm h-9"
        >
          {t('export.download')}
        </Button>
      </div>
    </div>
  );
}
