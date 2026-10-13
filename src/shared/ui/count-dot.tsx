import { cn } from "@/shared/utils/utils"

/**
 * Unread-count dot pinned to the corner of an icon button (redesign sheet 06).
 * The parent must be `relative`. Renders nothing at zero.
 */
function CountDot({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-1.5 right-[5px] grid h-4 min-w-4 place-items-center rounded-full bg-love px-1 font-mono text-[10px] leading-none font-bold text-primary-foreground tabular-nums ring-2 ring-background",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}

export { CountDot }
