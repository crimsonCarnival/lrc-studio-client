import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { SkeletonPlayer } from '@ui/skeleton';
import Player from '@features/player/Player';
import { useSettings } from '@/contexts/useSettings';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { GripVertical } from 'lucide-react';

/**
 * Docked player bar — desktop bottom, mobile above tab bar.
 * Hidden during setup phase but stays mounted to keep playerRef alive.
 */
export function AppPlayer({
  isReady,
  isProjectLoading,
  playerRef,
  mediaTitle,
  setMediaTitle,
  setIsPlaying,
  setPlaybackSpeed,
  handleTimeUpdate,
  handleDurationChange,
  handleMediaChange,
  handleYtUrlChange,
  handleCloudinaryUpload,
  restoredYtUrl,
  restoredCloudinaryUpload,
  restoredPosition,
  restoredSpeed,
  projectMetadata,
  lines,
  playbackPosition,
  syncMode,
  playerTop,
  lockLayout
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const { updateSetting } = useSettings();

  const [isDraggingPlayer, setIsDraggingPlayer] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  useEffect(() => {
    const handleWinResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleWinResize);
    return () => window.removeEventListener('resize', handleWinResize);
  }, []);

  const togglePosition = () => {
    updateSetting('interface.playerTop', !playerTop);
  };

  const positionClass = playerTop
    ? 'top-20 lg:top-[88px] bottom-auto'
    : 'bottom-20 lg:bottom-6 top-auto';

  const handleDragEnd = (event, info) => {
    setIsDraggingPlayer(false);
    const threshold = window.innerHeight / 2;
    const currentY = info.point.y;

    // If dragged to top half, set playerTop to true
    if (currentY < threshold && !playerTop) {
      updateSetting('interface.playerTop', true);
    } else if (currentY >= threshold && playerTop) {
      updateSetting('interface.playerTop', false);
    }
  };

  if (!isReady) return null;

  return (
    <motion.div
      drag={isDesktop && !lockLayout ? "y" : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragStart={() => setIsDraggingPlayer(true)}
      onDragEnd={handleDragEnd}
      className={`fixed inset-x-0 ${positionClass} z-[40] px-4 lg:px-6 pointer-events-none transition-all duration-500 ease-in-out`}
    >
      <div className={`max-w-[1600px] mx-auto w-full bg-zinc-900/95 backdrop-blur-lg border-2 ${isDraggingPlayer ? 'border-dashed border-primary/40' : 'border-zinc-700/50'} rounded-2xl shadow-elevated pointer-events-auto flex items-center justify-center min-h-[96px] lg:px-6 lg:py-4 relative group/player transition-colors`}>
        {/* Drag Handle - Hidden visually but functional */}
        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-300 z-50 cursor-grab active:cursor-grabbing bg-zinc-800 backdrop-blur-xl border border-zinc-600/50 rounded-xl p-2 shadow-2xl pointer-events-auto max-lg:hidden hover:scale-110 hover:border-primary/50 group/handle ${isDraggingPlayer ? 'hidden' : ''}`}>
          <GripVertical className="w-5 h-5 text-zinc-400 group-hover/handle:text-primary transition-colors" />
        </div>

        {/* Position Toggle Button (as a fallback/quick action) */}
        <button
          onClick={togglePosition}
          className={`absolute ${playerTop ? '-bottom-3' : '-top-3'} right-8 opacity-0 group-hover/player:opacity-100 transition-all duration-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 rounded-full p-1.5 shadow-lg text-zinc-400 hover:text-primary active:scale-95 pointer-events-auto z-50 ${isDraggingPlayer ? 'hidden' : ''}`}
          title={playerTop ? t('player.moveToBottom', 'Move to bottom') : t('player.moveToTop', 'Move to top')}
        >
          {playerTop ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          )}
        </button>
        {isProjectLoading && isReady ? (
          <SkeletonPlayer />
        ) : (
          <Player
            ref={playerRef}
            mediaTitle={mediaTitle}
            onPlayingChange={setIsPlaying}
            onSpeedChange={setPlaybackSpeed}
            onTitleChange={(newTitle) => {
              const isSetupPhase = location.pathname === '/project/new';
              if (
                isSetupPhase ||
                !mediaTitle ||
                mediaTitle === t('library.untitled') ||
                mediaTitle === 'Untitled'
              ) {
                setMediaTitle(newTitle);
              }
            }}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onMediaChange={handleMediaChange}
            onYtUrlChange={handleYtUrlChange}
            onCloudinaryUpload={handleCloudinaryUpload}
            initialYtUrl={restoredYtUrl}
            initialCloudinaryUpload={restoredCloudinaryUpload}
            initialSeek={restoredPosition}
            initialSpeed={restoredSpeed}
            projectMetadata={projectMetadata}
            lines={lines}
            playbackPosition={playbackPosition}
            syncMode={syncMode}
          />
        )}
      </div>
    </motion.div>
  );
}
