// client/src/features/projects/components/LyricsStage.jsx
// Public-viewer lyrics renderer. Computes what PreviewViewport needs WITHOUT the
// editor's usePreview hook, owns the bounded scroll container, and adds the
// optional StageControls overlay. Borderless by design.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/useSettings';
import PreviewViewport from '@/features/preview/components/PreviewViewport';
import { computeCurrentIndex } from '@/features/preview/lyrics-position';
import {
  ACTIVE_FONT_SIZES, INACTIVE_FONT_SIZES,
  ACTIVE_SECONDARY_SIZES, INACTIVE_SECONDARY_SIZES,
  WRAPPER_SPACING, ACTIVE_MARGIN,
} from '@/features/preview/preview.styles';
import StageControls from './StageControls';

export default function LyricsStage({
  lines,
  playbackPosition,
  editorMode,
  playerRef,
  hasMedia,
  isPlaying,
  playbackSpeed,
}) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const [showTranslations, setShowTranslations] = useState(true);
  const [showFurigana, setShowFurigana] = useState(true);

  const currentIndex = useMemo(
    () => computeCurrentIndex(lines, playbackPosition, editorMode),
    [lines, playbackPosition, editorMode],
  );
  const hasSyncedLines = useMemo(() => lines.some((l) => l.timestamp != null), [lines]);
  const hasTranslations = useMemo(() => lines.some((l) => l.translation), [lines]);
  const hasFurigana = useMemo(
    () => lines.some((l) => l.furigana || l.words?.some((w) => w.reading)),
    [lines],
  );

  const sizeOption = settings.interface?.fontSize || 'normal';
  const spacingOption = settings.interface?.spacing || 'normal';

  const handleLineClick = (line) => {
    if (line.timestamp != null && playerRef?.current?.seek) {
      playerRef.current.seek(line.timestamp);
      playerRef.current.play();
    }
  };

  return (
    <div className="relative h-full px-3 sm:px-6">
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
