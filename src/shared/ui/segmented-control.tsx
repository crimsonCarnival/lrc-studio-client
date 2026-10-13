import type { ReactNode } from "react"

import { cn } from "@/shared/utils/utils"
import { Button } from "@ui/button"
import { Tip } from "@ui/tip"

type SegmentedOption<T extends string | number> = {
  value: T
  label: ReactNode
  /** Accessible name when the label is an icon or abbreviation. */
  ariaLabel?: string
  /**
   * Not selectable right now. Uses aria-disabled rather than `disabled` so the
   * tooltip explaining why can still open (a disabled button emits no pointer events).
   */
  disabled?: boolean
  tip?: ReactNode
}

type SegmentedControlProps<T extends string | number> = {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name for the whole group. */
  label: string
  /**
   * "toggle" (default): a group of aria-pressed buttons.
   * "tabs": a tablist of aria-selected tabs, for switching between views.
   */
  semantics?: "toggle" | "tabs"
  /** Monospace numerals, for values like 0.5× or 1.25×. */
  mono?: boolean
  className?: string
}

// Single-choice picker. In "toggle" mode every segment stays a plain tab stop,
// matching the toggle buttons it replaces.
function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
  semantics = "toggle",
  mono,
  className,
}: SegmentedControlProps<T>) {
  const tabs = semantics === "tabs"
  return (
    <div
      role={tabs ? "tablist" : "group"}
      aria-label={label}
      className={cn("inline-flex gap-0.5 rounded-[14px] bg-background p-1 inset-ring inset-ring-hl", className)}
    >
      {options.map((option) => {
        const active = option.value === value
        const segment = (
          <Button
            key={option.tip ? undefined : option.value}
            type="button"
            variant="ghost"
            size={null}
            role={tabs ? "tab" : undefined}
            aria-selected={tabs ? active : undefined}
            aria-pressed={tabs ? undefined : active}
            aria-disabled={option.disabled || undefined}
            aria-label={option.ariaLabel}
            onClick={() => {
              if (!option.disabled) onChange(option.value)
            }}
            className={cn(
              "h-10 rounded-[10px] px-[18px] text-base text-subtle hover:bg-transparent hover:text-foreground",
              mono && "px-3.5 font-mono text-[13px] font-medium",
              active && "bg-raised text-foreground inset-ring-[1.5px] inset-ring-primary hover:bg-raised",
              option.disabled && "cursor-not-allowed opacity-40 hover:text-subtle"
            )}
          >
            {option.label}
          </Button>
        )
        return option.tip ? (
          <Tip key={option.value} content={option.tip}>
            {segment}
          </Tip>
        ) : (
          segment
        )
      })}
    </div>
  )
}

export { SegmentedControl }
export type { SegmentedOption }
