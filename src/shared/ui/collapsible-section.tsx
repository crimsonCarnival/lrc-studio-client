import * as React from 'react'
import { Icon } from '@/shared/ui/Icon'
import { cn } from '@/shared/utils/utils'

type CollapsibleSectionProps = {
  title: string
  /** Secondary line under the title, shown only while collapsed. */
  hint?: string
  /** Count of filled fields inside; rendered as a pill so collapsed content is not invisible. */
  filledCount?: number
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}

/**
 * A disclosure: header button plus the region it controls.
 *
 * Deliberately not `<details>`/`<summary>` — those cannot animate and style
 * inconsistently across browsers, and the button/region pair is what the
 * ARIA disclosure pattern expects anyway. No new dependency: the repo has no
 * accordion primitive and this is the only place that needs one so far.
 */
export function CollapsibleSection({
  title,
  hint,
  filledCount = 0,
  defaultOpen = false,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const reactId = React.useId()
  const regionId = `${reactId}-region`

  return (
    <div className={cn('shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={regionId}
        className="w-full flex items-center gap-2 py-2 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group"
      >
        <Icon
          name="chevron_right"
          size={16}
          className={cn(
            'text-zinc-500 transition-transform duration-200 shrink-0',
            open && 'rotate-90'
          )}
        />
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider group-hover:text-zinc-100 transition-colors">
          {title}
        </span>

        {filledCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold tabular-nums leading-none">
            {filledCount}
          </span>
        )}

        {!open && hint && (
          <span className="ml-auto text-[11px] text-zinc-500 truncate hidden sm:block">
            {hint}
          </span>
        )}
      </button>

      {/* Kept unmounted while closed: these are optional fields, and leaving
          them in the DOM would put them in the tab order behind a collapsed
          header. */}
      {open && (
        <div id={regionId} className="pt-1 flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  )
}
