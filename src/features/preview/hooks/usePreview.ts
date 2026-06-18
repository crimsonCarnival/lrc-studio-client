import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Dispatch, SetStateAction, RefObject } from 'react';
import type { TFunction } from 'i18next';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/useSettings';
import { downloadLRC } from '@/shared/utils/lrc';
import { lyrics } from '@/app/api';
import { matchKey } from '@/shared/utils/keyboard';
import { computeCurrentIndex } from '../lyrics-position';
import {
  ACTIVE_FONT_SIZES, INACTIVE_FONT_SIZES,
  ACTIVE_SECONDARY_SIZES, INACTIVE_SECONDARY_SIZES,
  WRAPPER_SPACING, ACTIVE_MARGIN,
} from '../preview.styles';
import type { EditorLine } from '@/features/editor/services/editor.service';
import type { AppSettings } from '@/features/settings/settings.types';
import type { ProjectMetadata, PlayerHandle } from '@/shared/hooks/useAppState';

interface UsePreviewParams {
  lines: EditorLine[];
  setLines: Dispatch<SetStateAction<EditorLine[]>>;
  playbackPosition: number;
  playerRef: RefObject<PlayerHandle | null>;
  duration?: number;
  mediaTitle?: string;
  editorMode: string;
  projectMetadata?: ProjectMetadata;
}

export interface UsePreviewResult {
  t: TFunction;
  settings: AppSettings;
  showMenu: boolean;
  setShowMenu: Dispatch<SetStateAction<boolean>>;
  pastingType: string | null;
  setPastingType: Dispatch<SetStateAction<string | null>>;
  pasteText: string;
  setPasteText: Dispatch<SetStateAction<string>>;
  exportFilename: string;
  setExportFilename: Dispatch<SetStateAction<string>>;
  showExportPanel: boolean;
  setShowExportPanel: Dispatch<SetStateAction<boolean>>;
  includeTranslations: boolean;
  setIncludeTranslations: Dispatch<SetStateAction<boolean>>;
  includeSecondary: boolean;
  setIncludeSecondary: Dispatch<SetStateAction<boolean>>;
  includeWordTimestamps: boolean;
  setIncludeWordTimestamps: Dispatch<SetStateAction<boolean>>;
  includeMetadata: boolean;
  setIncludeMetadata: Dispatch<SetStateAction<boolean>>;
  showTranslationsInPreview: boolean;
  setShowTranslationsInPreview: Dispatch<SetStateAction<boolean>>;
  showFuriganaInPreview: boolean;
  setShowFuriganaInPreview: Dispatch<SetStateAction<boolean>>;
  wasCopied: boolean;
  sizeOption: string;
  spacingOption: string;
  activeFontSizes: unknown;
  inactiveFontSizes: unknown;
  activeSecondarySizes: unknown;
  inactiveSecondarySizes: unknown;
  wrapperSpacing: unknown;
  activeMargin: unknown;
  currentIndex: number;
  hasSyncedLines: boolean;
  hasTranslations: boolean;
  hasSecondary: boolean;
  hasWords: boolean;
  hasFurigana: boolean;
  translationLanguages: (string | null)[];
  activeTranslationIndex: number;
  setActiveTranslationIndex: Dispatch<SetStateAction<number>>;
  handleSavePaste: () => void;
  handleLineClick: (line: EditorLine) => void;
  handleExport: () => Promise<void>;
  handleCopy: () => Promise<void>;
}

// The hook is called with the host component's full props bag; we accept it as
// unknown and narrow to the fields we use.
export function usePreview(rawProps: unknown): UsePreviewResult {
  const { lines, setLines, playbackPosition, playerRef, duration, mediaTitle, editorMode, projectMetadata } = rawProps as UsePreviewParams;
  const { t } = useTranslation();
  const { settings } = useSettings();

  const [showMenu, setShowMenu] = useState(false);
  const [pastingType, setPastingType] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');

  const [exportFilename, setExportFilename] = useState(() =>
    settings.export?.defaultFilenamePattern === 'media' && mediaTitle ? mediaTitle : 'lyrics'
  );
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [includeTranslations, setIncludeTranslations] = useState(false);
  const [includeSecondary, setIncludeSecondary] = useState(true);
  const [includeWordTimestamps, setIncludeWordTimestamps] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [showTranslationsInPreview, setShowTranslationsInPreview] = useState(true);
  const [activeTranslationIndex, setActiveTranslationIndex] = useState(0);
  const [showFuriganaInPreview, setShowFuriganaInPreview] = useState(true);
  const [wasCopied, setWasCopied] = useState(false);

  // Build LRC metadata automatically from projectMetadata
  const metadata = useMemo(() => {
    if (!projectMetadata) return {};
    const artists = Array.isArray(projectMetadata.songArtists) && projectMetadata.songArtists.length > 0
      ? projectMetadata.songArtists.join(', ')
      : (projectMetadata.songArtist || '');
    return {
      ti: projectMetadata.songName || '',
      ar: artists,
      al: projectMetadata.songAlbum || '',
      lg: projectMetadata.songLanguage || '',
    };
  }, [projectMetadata]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settings.export?.defaultFilenamePattern === 'media' && mediaTitle) { setExportFilename(mediaTitle); }
    else if (settings.export?.defaultFilenamePattern === 'fixed') { setExportFilename('lyrics'); }
  }, [settings.export?.defaultFilenamePattern, mediaTitle]);

  const sizeOption = settings.interface?.fontSize || 'normal';
  const spacingOption = settings.interface?.spacing || 'normal';

  const syncedIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].timestamp != null) {
        indices.push(i);
      }
    }
    return indices;
  }, [lines]);

  const currentIndex = useMemo(
    () => computeCurrentIndex(lines, playbackPosition, editorMode),
    [lines, playbackPosition, editorMode],
  );

  const hasSyncedLines = syncedIndices.length > 0;
  const { hasTranslations, hasSecondary, hasWords, hasFurigana } = useMemo(() => {
    let _hasTranslations = false;
    let _hasSecondary = false;
    let _hasWords = false;
    let _hasFurigana = false;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!_hasTranslations && (l.translations?.length ?? 0) > 0) _hasTranslations = true;
      if (!_hasSecondary && l.secondary) _hasSecondary = true;
      if (!_hasWords && (l.words?.length ?? 0) > 0) _hasWords = true;
      if (!_hasFurigana && (l.furigana || l.words?.some((w) => w.reading))) _hasFurigana = true;

      // Early exit if we found everything
      if (_hasTranslations && _hasSecondary && _hasWords && _hasFurigana) break;
    }

    return {
      hasTranslations: _hasTranslations,
      hasSecondary: _hasSecondary,
      hasWords: _hasWords,
      hasFurigana: _hasFurigana,
    };
  }, [lines]);

  // Collect unique translation languages from the lines
  const translationLanguages = useMemo(() => {
    const langs: (string | null)[] = [];
    for (const line of lines) {
      const translations = line.translations || [];
      for (let i = 0; i < translations.length; i++) {
        if (!langs[i]) {
          langs[i] = translations[i]?.language || null;
        }
      }
    }
    return langs;
  }, [lines]);

  // ——— Preview keyboard shortcuts ———
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (pastingType) return; // paste panel open — don't intercept
      if (matchKey(e, settings.shortcuts?.toggleTranslation?.[0] || 't')) {
        e.preventDefault();
        setShowTranslationsInPreview((prev) => !prev);
      } else if (matchKey(e, settings.shortcuts?.addSecondary?.[0] || 'Shift+H')) {
        e.preventDefault();
        setPastingType('secondary');
        setPasteText(lines.map((l) => l.secondary || '').join('\n'));
      } else if (matchKey(e, settings.shortcuts?.addTranslation?.[0] || 'Shift+T')) {
        e.preventDefault();
        setPastingType('translation');
        setPasteText(lines.map((l) => l.translations?.[activeTranslationIndex]?.text || '').join('\n'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settings.shortcuts, lines, pastingType, activeTranslationIndex]);

  const handleSavePaste = () => {
    if (!pastingType) return;
    const newTexts = pasteText.split('\n');
    if (pastingType === 'translation') {
      setLines((prev) =>
        prev.map((l, i) => {
          const newText = newTexts[i]?.trim() ?? '';
          const existing = l.translations ? [...l.translations] : [];
          const slot = existing[activeTranslationIndex] ?? {};
          existing[activeTranslationIndex] = { ...slot, text: newText };
          return { ...l, translations: existing.filter((tr) => tr.text?.trim()) };
        })
      );
    } else {
      setLines((prev) =>
        prev.map((l, i) => ({
          ...l,
          [pastingType]: newTexts[i] !== undefined ? newTexts[i].trim() : (l as Record<string, unknown>)[pastingType],
        }))
      );
    }
    setPastingType(null);
    setPasteText('');
    setShowMenu(false);
  };

  const handleLineClick = (line: EditorLine) => {
    if (line.timestamp != null && playerRef?.current?.seek) {
      playerRef.current.seek(line.timestamp);
      playerRef.current.play?.();
    }
  };

  const prepareExportLines = useCallback((inputLines: EditorLine[]) => {
    let result = inputLines;
    if (settings.export?.stripEmptyLines) {
      result = result.filter((l) => l.type === 'section' || l.text?.trim() !== '');
    }
    if (settings.export?.normalizeTimestamps) {
      result = result.toSorted((a, b) => {
        if (a.timestamp == null && b.timestamp == null) return 0;
        if (a.timestamp == null) return 1;
        if (b.timestamp == null) return -1;
        return a.timestamp - b.timestamp;
      });
    }
    return result;
  }, [settings.export?.stripEmptyLines, settings.export?.normalizeTimestamps]);

  const applyIncludeFlags = useCallback((inputLines: EditorLine[]) => {
    return inputLines.map((l) => {
      const newLine = { ...l };
      if (!includeWordTimestamps && newLine.words) {
        // If we don't want word timestamps, but we HAVE words,
        // we must keep the words if they have readings (for furigana export).
        // We just nullify the times so they don't show up as <mm:ss.xx>
        newLine.words = newLine.words.map((w) => ({ ...w, time: null }));
      }
      return newLine;
    });
  }, [includeWordTimestamps]);

  const handleExport = useCallback(async () => {
    const name = (exportFilename || 'lyrics').trim();
    const exportLines = applyIncludeFlags(prepareExportLines(lines));

    try {
      let content = '';
      if (settings.export?.downloadFormat === 'srt') {
        const result = await lyrics.compileSrt({
          lines: exportLines,
          duration,
          includeTranslations,
          lineEndings: settings.export?.lineEndings,
          srtConfig: settings.editor?.srt,
          includeSecondary,
          exportTranslationIndex: activeTranslationIndex,
        }) as { output: string };
        content = result.output;
        downloadLRC(content, `${name}.srt`);
      } else {
        const filteredMetadata = includeMetadata ? metadata : {};
        const result = await lyrics.compileLrc({
          lines: exportLines,
          includeTranslations,
          precision: settings.editor?.timestampPrecision,
          metadata: filteredMetadata,
          lineEndings: settings.export?.lineEndings,
          exportTranslationIndex: activeTranslationIndex,
          includeSecondary,
          wordPrecision: settings.export?.wordTimestampPrecision,
        }) as { output: string };
        content = result.output;
        downloadLRC(content, `${name}.lrc`);
      }

      setShowExportPanel(false);
      toast.success(t('export.success') || 'File downloaded');
    } catch (err) {
      console.error('Export failed', err);
      toast.error(t('export.failed') || 'Export failed');
    }
  }, [
    exportFilename, lines, settings, duration, includeTranslations,
    includeSecondary, includeMetadata, metadata, t,
    applyIncludeFlags, prepareExportLines, activeTranslationIndex
  ]);

  const handleCopy = useCallback(async () => {
    const exportLines = applyIncludeFlags(prepareExportLines(lines));

    try {
      let content = '';
      if (settings.export?.copyFormat === 'srt') {
        const result = await lyrics.compileSrt({
          lines: exportLines,
          duration,
          includeTranslations,
          lineEndings: settings.export?.lineEndings,
          srtConfig: settings.editor?.srt,
          includeSecondary,
          exportTranslationIndex: activeTranslationIndex,
        }) as { output: string };
        content = result.output;
      } else {
        const filteredMetadata = includeMetadata ? metadata : {};
        const result = await lyrics.compileLrc({
          lines: exportLines,
          includeTranslations,
          precision: settings.editor?.timestampPrecision,
          metadata: filteredMetadata,
          lineEndings: settings.export?.lineEndings,
          exportTranslationIndex: activeTranslationIndex,
          includeSecondary,
          wordPrecision: settings.export?.wordTimestampPrecision,
        }) as { output: string };
        content = result.output;
      }

      await navigator.clipboard.writeText(content);
      setWasCopied(true);
      setTimeout(() => setWasCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
      toast.error(t('export.copyFailed') || 'Failed to copy to clipboard');
    }
  }, [
    lines, settings, duration, includeTranslations,
    includeSecondary, includeMetadata, metadata, t,
    applyIncludeFlags, prepareExportLines, activeTranslationIndex
  ]);

  return {
    t,
    settings,
    showMenu,
    setShowMenu,
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
    sizeOption,
    spacingOption,
    activeFontSizes: ACTIVE_FONT_SIZES,
    inactiveFontSizes: INACTIVE_FONT_SIZES,
    activeSecondarySizes: ACTIVE_SECONDARY_SIZES,
    inactiveSecondarySizes: INACTIVE_SECONDARY_SIZES,
    wrapperSpacing: WRAPPER_SPACING,
    activeMargin: ACTIVE_MARGIN,
    currentIndex,
    hasSyncedLines,
    hasTranslations,
    hasSecondary,
    hasWords,
    hasFurigana,
    translationLanguages,
    activeTranslationIndex,
    setActiveTranslationIndex,
    handleSavePaste,
    handleLineClick,
    handleExport,
    handleCopy,
  };
}
