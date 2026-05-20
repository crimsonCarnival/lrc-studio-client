import useInputMethod from '@/shared/hooks/useInputMethod';

/**
 * Responsive layout wrapper for SharedProjectViewer
 * Desktop: full layout with Preview and Player stacked
 * Mobile: single-column layout with full-width content
 */
export function SharedProjectViewerLayout({
  isMobile,
  hasHeader,
  preview,
  player,
  ctaBanner,
  children,
}) {
  // If children provided (desktop), use them directly
  if (children && !isMobile) {
    return children;
  }

  // Mobile: single-column, stacked layout
  if (isMobile) {
    return (
      <div className={`min-h-screen lg:h-screen bg-zinc-950 relative overflow-x-hidden flex flex-col ${hasHeader ? 'pt-[60px] sm:pt-[72px] lg:pt-[88px]' : ''}`}>
        {/* Background blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
          <div className="absolute -top-40 -left-40 size-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-40 size-80 bg-accent-purple/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 size-96 bg-accent-blue/5 rounded-full blur-3xl" />
        </div>

        {/* Mobile single-column layout */}
        <div className="relative z-base flex-1 min-h-0 overflow-y-auto flex flex-col">
          {/* Preview takes full width */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {preview}
          </div>

          {/* Progress bar */}
          <div className="px-4 py-3 border-t border-zinc-800/50">
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `0%` }}
              />
            </div>
          </div>

          {/* Player section - sticky at bottom on mobile */}
          <div className="flex-shrink-0 w-full border-t border-zinc-700/50 bg-zinc-900/80 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
            <div className="w-full px-3 sm:px-4 py-2">
              {player}
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        {ctaBanner && (
          <div className="relative z-sticky w-full bg-gradient-to-r from-zinc-900/95 via-zinc-900 to-zinc-900/95 border-t border-zinc-700/50 backdrop-blur-md flex-shrink-0">
            {ctaBanner}
          </div>
        )}
      </div>
    );
  }

  // Desktop without children: render with proper layout
  return (
    <div className={`min-h-screen lg:h-screen bg-zinc-950 relative overflow-x-hidden flex flex-col ${hasHeader ? 'pt-[60px] sm:pt-[72px] lg:pt-[88px]' : ''}`}>
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        <div className="absolute -top-40 -left-40 size-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 size-80 bg-accent-purple/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 size-96 bg-accent-blue/5 rounded-full blur-3xl" />
      </div>

      {/* Preview section */}
      <div className="relative z-base flex-1 min-h-0 px-2 sm:px-4 lg:px-6 py-4 lg:pb-0 flex flex-col overflow-y-auto">
        {preview}
      </div>

      {/* Player section */}
      <div className="relative z-raised w-full border-t border-zinc-700/50 bg-zinc-900/80 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {player}
        </div>
      </div>

      {/* CTA Banner */}
      {ctaBanner && (
        <div className="relative z-sticky w-full bg-gradient-to-r from-zinc-900/95 via-zinc-900 to-zinc-900/95 border-t border-zinc-700/50 backdrop-blur-md">
          {ctaBanner}
        </div>
      )}
    </div>
  );
}
