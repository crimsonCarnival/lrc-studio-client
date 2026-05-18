/**
 * Decorative background: grain noise overlay + radial gradient blobs.
 * Pure presentational — no props.
 */
export function AppBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      />
      <div className="absolute -top-40 -left-40 size-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -right-40 size-80 bg-accent-purple/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 left-1/3 size-96 bg-accent-blue/5 rounded-full blur-3xl" />
    </div>
  );
}
