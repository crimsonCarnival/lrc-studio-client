import { useRef, useEffect } from 'react';
import { SkeletonPlayer } from '@ui/skeleton';
import PlayerControls from '@features/player/components/PlayerControls';

interface AppPlayerProps {
  isReady?: boolean;
  isPlayerMounted?: boolean;
  isProjectLoading?: boolean;
  playerTop?: boolean;
  onHeightChange?: (height: number) => void;
}

/**
 * Docked player bar — desktop bottom, mobile above tab bar.
 * Hidden during setup phase but stays mounted to keep the engine alive.
 * Media state is owned by PlayerEngineProvider (mounted above this in AppLayout).
 */
export function AppPlayer({
  isReady,
  isPlayerMounted,
  isProjectLoading,
  playerTop,
  onHeightChange,
}: AppPlayerProps) {
  const positionClass = playerTop
    ? 'lg:top-[88px] lg:bottom-auto bottom-14 top-auto'
    : 'bottom-14 lg:bottom-6 top-auto';

  const innerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = innerRef.current;
    if (!el || !onHeightChange) return;
    const observer = new ResizeObserver(([entry]) => {
      const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height;
      onHeightChange(Math.round(height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeightChange]);

  if (!isPlayerMounted) return null;

  return (
    <div
      className={`fixed inset-x-0 ${positionClass} z-player px-0 lg:px-6 pointer-events-none transition-all duration-500 ease-in-out ${isReady ? 'opacity-100' : 'opacity-0 translate-y-12'}`}
    >
      <div ref={innerRef} className={`max-w-[1600px] mx-auto w-full bg-zinc-900/95 backdrop-blur-lg max-lg:border-y lg:border-2 border-zinc-700/50 max-lg:rounded-none lg:rounded-2xl shadow-elevated ${isReady ? 'pointer-events-auto' : 'pointer-events-none'} flex flex-col lg:flex-row items-center justify-center lg:min-h-[80px] overflow-visible lg:px-6 py-2 lg:py-4 relative transition-all duration-500 ${isReady ? '' : 'scale-95'}`}>
        {isProjectLoading && isReady ? (
          <SkeletonPlayer />
        ) : (
          <PlayerControls variant="mobile" />
        )}
      </div>
    </div>
  );
}
