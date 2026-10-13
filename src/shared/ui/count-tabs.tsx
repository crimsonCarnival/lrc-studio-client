import type { ReactNode } from "react"

import { cn } from "@/shared/utils/utils"
import { Button } from "@ui/button"

type CountTab<T extends string> = {
  value: T
  label: ReactNode
  /** Shown as a chip after the label. Omit for a plain tab. */
  count?: number
}

type CountTabsProps<T extends string> = {
  tabs: readonly CountTab<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name for the group. */
  label: string
  className?: string
}

/**
 * Underlined filter tabs with a count chip (redesign sheet 06). They filter the list below
 * rather than swap panels, so they are aria-pressed buttons, not a tablist.
 */
function CountTabs<T extends string>({ tabs, value, onChange, label, className }: CountTabsProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("flex gap-5 overflow-x-auto hide-scrollbar", className)}>
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <Button
            key={tab.value}
            type="button"
            variant="ghost"
            size={null}
            aria-pressed={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              // -mb-px lets the active underline sit on the parent's bottom rule.
              "-mb-px h-12 gap-2 rounded-none border-0 border-b-2 border-transparent px-1 text-[17px] text-subtle hover:bg-transparent hover:text-foreground active:scale-100",
              active && "border-iris text-foreground"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "grid h-5 min-w-[22px] place-items-center rounded-full px-1.5 font-mono text-xs font-medium tabular-nums",
                  active ? "bg-primary-soft text-primary-ink" : "bg-raised text-subtle",
                  // An empty bucket recedes so the eye lands on tabs that have something.
                  tab.count === 0 && "opacity-55"
                )}
              >
                {tab.count}
              </span>
            )}
          </Button>
        )
      })}
    </div>
  )
}

export { CountTabs }
export type { CountTab }
