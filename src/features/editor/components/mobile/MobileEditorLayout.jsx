import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Music, Mic2, Eye } from 'lucide-react';
// eslint-disable-next-line no-unused-vars -- motion used as JSX namespace: <motion.div>
import { AnimatePresence, motion } from 'framer-motion';
import SyncModeTab from './SyncModeTab';
import LyricsModeTab from './LyricsModeTab';
import PreviewModeTab from './PreviewModeTab';
import { applyMark } from '@features/editor/services/editor.service';

const TAB_TRANSITION = {
  duration: 0.15, // 150ms
  ease: 'easeInOut',
};

const TAB_VARIANTS = {
  enter: { opacity: 0, scale: 0.98, y: 10 },
  center: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: -10 },
};

export default function MobileEditorLayout({
  activeLineIndex,
  setActiveLineIndex,
  lines,
  setLines,
  playbackPosition,
  playerRef,
  duration,
  isPlaying,
  syncMode,
  editorMode,
}) {
  const { t } = useTranslation();
  const [activeMode, setActiveMode] = useState('sync');

  const modes = [
    { id: 'sync', label: t('editor.sync') || 'Sync', icon: Music },
    { id: 'lyrics', label: t('editor.lyrics') || 'Lyrics', icon: Mic2 },
    { id: 'preview', label: t('editor.preview') || 'Preview', icon: Eye },
  ];

  const handleModeChange = (modeId) => {
    setActiveMode(modeId);
  };

  const linesRef = useRef(lines);
  const activeLineIndexRef = useRef(activeLineIndex);
  const editorModeRef = useRef(editorMode);
  useLayoutEffect(() => { linesRef.current = lines; }, [lines]);
  useLayoutEffect(() => { activeLineIndexRef.current = activeLineIndex; }, [activeLineIndex]);
  useLayoutEffect(() => { editorModeRef.current = editorMode; }, [editorMode]);

  // Handle editor:mark events from the mobile mark button and the player's mark button
  useEffect(() => {
    if (!syncMode) return;
    const handler = () => {
      const time = playerRef?.current?.getCurrentTime?.() ?? 0;
      const result = applyMark({
        lines: linesRef.current,
        activeLineIndex: activeLineIndexRef.current,
        time,
        editorMode: editorModeRef.current || 'lrc',
        settings: {},
        forceAdvance: true,
      });
      setLines(result.nextLines);
      if (result.nextActiveLineIndex != null) {
        setActiveLineIndex(result.nextActiveLineIndex);
      }
    };
    window.addEventListener('editor:mark', handler);
    return () => window.removeEventListener('editor:mark', handler);
  }, [syncMode, playerRef, setLines, setActiveLineIndex]);

  const handleEditLine = (lineIndex, newText) => {
    const updatedLines = [...lines];
    updatedLines[lineIndex] = { ...updatedLines[lineIndex], text: newText };
    setLines(updatedLines);
  };

  return (
    <div className="flex flex-col h-full max-lg:pb-20 overflow-hidden" data-testid="mobile-editor-layout">
      {/* Sticky mode tabs at top */}
      <div className="sticky top-0 z-40 flex border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur-md">
        {modes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleModeChange(id)}
            className={`flex-1 flex items-center justify-center gap-2 h-12 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeMode === id
                ? 'text-primary border-primary'
                : 'text-zinc-400 border-transparent hover:text-zinc-300'
            }`}
            aria-selected={activeMode === id}
          >
            <Icon className="size-4 flex-shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Scrollable content area */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeMode}
          variants={TAB_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          transition={TAB_TRANSITION}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
        >
          {activeMode === 'sync' && (
            <div data-testid="sync-mode-tab">
              <SyncModeTab
                playbackPosition={playbackPosition}
                lines={lines}
                activeLineIndex={activeLineIndex}
                setActiveLineIndex={setActiveLineIndex}
                playerRef={playerRef}
                duration={duration}
              />
            </div>
          )}

          {activeMode === 'lyrics' && (
            <div data-testid="lyrics-mode-tab">
              <LyricsModeTab
                lines={lines}
                activeLineIndex={activeLineIndex}
                setActiveLineIndex={setActiveLineIndex}
                onEditLine={handleEditLine}
              />
            </div>
          )}

          {activeMode === 'preview' && (
            <div data-testid="preview-mode-tab">
              <PreviewModeTab
                lines={lines}
                activeLineIndex={activeLineIndex}
                isPlaying={isPlaying}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Action bar at bottom would be added here as a fixed footer */}
    </div>
  );
}
