// Public-viewer lyrics renderer. Computes what PreviewViewport needs WITHOUT the
// editor's usePreview hook, owns the bounded scroll container, and adds the
// optional StageControls overlay. Borderless by design.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/useSettings';
import PreviewViewportRaw from '@/features/preview/components/PreviewViewport';
import { computeCurrentIndex } from '@/features/preview/lyrics-position';
import {
  ACTIVE_FONT_SIZES, INACTIVE_FONT_SIZES,
  ACTIVE_SECONDARY_SIZES, INACTIVE_SECONDARY_SIZES,
  WRAPPER_SPACING, ACTIVE_MARGIN,
} from '@/features/preview/preview.styles';
import StageControls from './StageControls';

// PreviewViewport is still untyped JS; cast until it is migrated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PreviewViewport = PreviewViewportRaw as any;

interface StageLine {
  timestamp?: number | null;
  translations?: unknown[];
  furigana?: string;
  words?: { reading?: string }[];
  [key: string]: unknown;
}

interface PlayerHandle {
  seek?: (time: number) => void;
  play?: () => void;
}

interface LyricsStageProps {
  lines: StageLine[];
  playbackPosition: number;
  editorMode?: string;
  playerRef?: { current?: PlayerHandle | null };
  hasMedia?: boolean;
  isPlaying?: boolean;
  playbackSpeed?: number;
}

export default function LyricsStage({
  lines,
  playbackPosition,
  editorMode,
  playerRef,
  hasMedia,
  isPlaying,
  playbackSpeed,
}: LyricsStageProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const [showTranslations, setShowTranslations] = useState(true);
  const [showFurigana, setShowFurigana] = useState(true);

  const currentIndex = useMemo(
    () => computeCurrentIndex(lines, playbackPosition, editorMode),
    [lines, playbackPosition, editorMode],
  );
  const hasSyncedLines = useMemo(() => lines.some((l) => l.timestamp != null), [lines]);
  const hasTranslations = useMemo(() => lines.some((l) => (l.translations?.length ?? 0) > 0), [lines]);
  const hasFurigana = useMemo(
    () => lines.some((l) => l.furigana || l.words?.some((w) => w.reading)),
    [lines],
  );

  const sizeOption = settings.interface?.fontSize || 'normal';
  const spacingOption = settings.interface?.spacing || 'normal';

  const handleLineClick = (line: StageLine) => {
    if (line.timestamp != null && playerRef?.current?.seek) {
      playerRef.current.seek(line.timestamp);
      playerRef.current.play?.();
    }
  };

  return (
    <div className="relative h-full flex flex-col px-3 sm:px-6">
      <StageControls
        t={t}
        hasFurigana={hasFurigana}
        hasTranslations={hasTranslations}
        showFurigana={showFurigana}
        setShowFurigana={setShowFurigana}
        showTranslations={showTranslations}
        setShowTranslations={setShowTranslations}
      />
      <PreviewViewport
        lines={lines}
        currentIndex={currentIndex}
        hasSyncedLines={hasSyncedLines}
        playbackPosition={playbackPosition}
        handleLineClick={handleLineClick}
        showTranslationsInPreview={showTranslations}
        showFuriganaInPreview={showFurigana}
        sizeOption={sizeOption}
        spacingOption={spacingOption}
        activeSecondarySizes={ACTIVE_SECONDARY_SIZES}
        inactiveSecondarySizes={INACTIVE_SECONDARY_SIZES}
        activeFontSizes={ACTIVE_FONT_SIZES}
        inactiveFontSizes={INACTIVE_FONT_SIZES}
        activeMargin={ACTIVE_MARGIN}
        wrapperSpacing={WRAPPER_SPACING}
        settings={settings}
        editorMode={editorMode}
        t={t}
        hasMedia={hasMedia}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
      />
    </div>
  );
}
