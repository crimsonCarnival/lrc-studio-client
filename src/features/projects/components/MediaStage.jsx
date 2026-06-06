// client/src/features/projects/components/MediaStage.jsx
// The "video slot": a fixed-height stage with the project cover blurred behind
// the lyrics. Flush edges (no rounding) so it doesn't look like a card inside
// the page. Children render over the ambient layer.
export default function MediaStage({ cover, children }) {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 'clamp(320px, 55vh, 640px)' }}
    >
      {/* Ambient cover or gradient fallback */}
      {cover ? (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-40"
          style={{ backgroundImage: `url(${cover})` }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-primary/25 to-accent-purple/10" />
      )}
      <div aria-hidden className="absolute inset-0 bg-background/60" />

      {/* Top/bottom edge fades */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background to-transparent z-raised" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent z-raised" />

      {/* Lyrics layer (children own their own scroll container) */}
      <div className="relative z-base h-full">{children}</div>
    </div>
  );
}
