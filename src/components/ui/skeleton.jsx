import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }) {
  return (
    <div className={cn("skeleton rounded-lg", className)} {...props} />
  );
}

export function Spinner({ className, size = 16 }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

/* ─── Library / UploadsLibrary item skeleton ────────────────────────── */
/* Mirrors: 9×9 source icon | title + badge | meta row | date */
export function SkeletonCard({ className }) {
  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40", className)}>
      <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-4 w-10 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-2.5 w-14" />
      </div>
    </div>
  );
}

/* ─── Library list skeleton (header + cards) ────────────────────────── */
/* Mirrors: ← back btn | TITLE | "N files" count */
export function SkeletonList({ count = 3, className }) {
  return (
    <div className={cn("flex flex-col h-full animate-fade-in", className)}>
      <div className="flex items-center gap-3 mb-5">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-3.5 w-20 rounded" />
        <Skeleton className="h-3 w-14 ml-auto rounded" />
      </div>
      <div className="flex-1 space-y-2">
        {Array.from({ length: count }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

/* ─── SetupScreen: full two-panel skeleton ──────────────────────────── */
/* Mirrors: title + icon → grid(audio panel, lyrics panel) */
export function SkeletonSetup({ className }) {
  return (
    <div className={cn("flex-1 flex flex-col items-center justify-center px-4 py-8 animate-fade-in", className)}>
      <div className="w-full max-w-3xl">
        {/* Title area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-800/60 mb-4">
            <Skeleton className="w-7 h-7 rounded" />
          </div>
          <Skeleton className="h-7 w-48 mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Audio Panel skeleton */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            {/* File upload area */}
            <div className="rounded-xl border-2 border-dashed border-zinc-700/40 px-3 py-4 flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-2.5 w-2/5" />
              </div>
            </div>
            {/* Divider */}
            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 h-px bg-zinc-800" />
              <Skeleton className="h-2.5 w-20" />
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            {/* YouTube input area */}
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-xl" />
              <Skeleton className="h-9 w-20 rounded-xl" />
            </div>
          </div>

          {/* Lyrics Panel skeleton */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Textarea placeholder */}
            <Skeleton className="flex-1 min-h-[140px] rounded-xl" />
            {/* Import file button */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-700/40">
              <Skeleton className="w-3.5 h-3.5 rounded flex-shrink-0" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16 ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SetupScreen: media item row skeleton ──────────────────────────── */
/* Mirrors: 7×7 icon | title + duration */
export function SkeletonMediaItem({ className }) {
  return (
    <div className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-zinc-700/40", className)}>
      <Skeleton className="w-7 h-7 rounded-md flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
    </div>
  );
}

/* ─── Editor panel skeleton ─────────────────────────────────────────── */
/* Mirrors: toolbar (title + mode toggle + buttons) → line items */
export function SkeletonEditor({ className }) {
  return (
    <div className={cn("glass rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col h-full animate-fade-in", className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Skeleton className="h-5 w-16" />
          <div className="flex gap-0.5">
            <Skeleton className="h-7 w-10 rounded-lg" />
            <Skeleton className="h-7 w-10 rounded-lg" />
            <Skeleton className="h-7 w-10 rounded-lg" />
          </div>
          <Skeleton className="h-5 w-8 rounded" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </div>
      {/* Line items */}
      <div className="flex-1 space-y-1.5">
        {[85, 100, 70, 90, 60, 95, 75, 80].map((w, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-lg bg-zinc-800/30">
            <Skeleton className="h-4 w-12 flex-shrink-0" />
            <Skeleton className="h-4 flex-1" style={{ maxWidth: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Preview panel skeleton ────────────────────────────────────────── */
/* Mirrors: header (PREVIEW + action btns) → centered lyric lines */
export function SkeletonPreview({ className }) {
  return (
    <div className={cn("glass rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col h-full animate-fade-in", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </div>
      {/* Lines — centered like the real preview */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Skeleton className="h-5 w-3/5 rounded opacity-40" />
        <Skeleton className="h-7 w-4/5 rounded" />
        <Skeleton className="h-5 w-2/3 rounded opacity-40" />
        <Skeleton className="h-5 w-1/2 rounded opacity-30" />
      </div>
    </div>
  );
}

/* ─── Player skeleton ───────────────────────────────────────────────── */
/* Mirrors: artwork/title → play controls + timeline → volume/options */
export function SkeletonPlayer({ className }) {
  return (
    <div className={cn("h-14 lg:h-[72px] flex items-center justify-between px-2 sm:px-4 lg:px-0 w-full animate-fade-in gap-4", className)}>
      {/* Left: Artwork and title */}
      <div className="flex items-center gap-3 w-[120px] sm:w-[180px] lg:w-[240px] flex-shrink-0">
        <Skeleton className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex-shrink-0" />
        <div className="flex-col gap-1.5 hidden sm:flex flex-1">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      
      {/* Center: Controls and timeline */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1.5 max-w-2xl px-2">
        <div className="flex items-center gap-3 lg:gap-4">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-9 h-9 lg:w-10 lg:h-10 rounded-full" />
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-5 h-5 rounded-full" />
        </div>
        <div className="w-full flex items-center gap-2 hidden lg:flex">
          <Skeleton className="h-2.5 w-8 flex-shrink-0" />
          <Skeleton className="h-1.5 flex-1 rounded-full" />
          <Skeleton className="h-2.5 w-8 flex-shrink-0" />
        </div>
      </div>
      
      {/* Right: Volume and options */}
      <div className="flex items-center justify-end gap-3 w-[120px] sm:w-[180px] lg:w-[240px] flex-shrink-0">
        <Skeleton className="w-5 h-5 rounded-md hidden lg:block" />
        <Skeleton className="w-20 h-1.5 rounded-full hidden lg:block" />
        <Skeleton className="w-5 h-5 rounded-md hidden lg:block" />
      </div>
    </div>
  );
}
