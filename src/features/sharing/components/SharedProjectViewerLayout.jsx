
const BG_BLOBS = (
  <div className="fixed inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
    <div className="absolute -top-40 -left-40 size-96 bg-primary/5 rounded-full blur-3xl" />
    <div className="absolute top-1/3 -right-40 size-80 bg-accent-purple/5 rounded-full blur-3xl" />
    <div className="absolute -bottom-40 left-1/3 size-96 bg-accent-blue/5 rounded-full blur-3xl" />
  </div>
);

/**
 * Responsive layout wrapper for SharedProjectViewer.
 * The CTA banner sits between the AppHeader and content as a slim fixed strip.
 */
export function SharedProjectViewerLayout({
  isMobile,
  hasHeader,
  preview,
  player,
  ctaBanner,
  children,
}) {
  if (children && !isMobile) return children;

  // The CTA bar is ~36px tall. Total top padding = AppHeader height + CTA bar height.
  const topOffset = hasHeader
    ? ctaBanner ? 'pt-[96px] sm:pt-[108px] lg:pt-[124px]' : 'pt-[60px] sm:pt-[72px] lg:pt-[88px]'
    : ctaBanner ? 'pt-[36px]' : '';

  const ctaBar = ctaBanner && (
    <div
      className={`fixed left-0 right-0 z-[60] bg-zinc-950/95 border-b border-zinc-800/70 backdrop-blur-md ${
        hasHeader ? 'top-[60px] sm:top-[72px] lg:top-[88px]' : 'top-0'
      }`}
    >
      {ctaBanner}
    </div>
  );

  if (isMobile) {
    return (
      <div className={`min-h-screen bg-zinc-950 relative overflow-x-hidden flex flex-col ${topOffset}`}>
        {BG_BLOBS}
        {ctaBar}
        <div className="relative z-base flex-1 min-h-0 overflow-y-auto flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {preview}
          </div>
          <div className="flex-shrink-0 w-full border-t border-zinc-700/50 bg-zinc-900/80 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
            <div className="w-full px-3 sm:px-4 py-2">
              {player}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen lg:h-screen bg-zinc-950 relative overflow-x-hidden flex flex-col ${topOffset}`}>
      {BG_BLOBS}
      {ctaBar}
      <div className="relative z-base flex-1 min-h-0 px-2 sm:px-4 lg:px-6 py-4 lg:pb-0 flex flex-col overflow-y-auto">
        {preview}
      </div>
      <div className="relative z-raised w-full border-t border-zinc-700/50 bg-zinc-900/80 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {player}
        </div>
      </div>
    </div>
  );
}
