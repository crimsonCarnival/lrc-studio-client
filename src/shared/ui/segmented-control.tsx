import { useRef, useState, type ReactNode } from "react"

import { cn } from "@/shared/utils/utils"
import { Button } from "@ui/button"
import { Popover, PopoverAnchor, PopoverContent } from "@ui/popover"
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
  /**
   * Shown in a popover anchored to the option when a disabled option is clicked or
   * activated by keyboard. Reachable on touch, unlike `tip`. onChange is never called.
   */
  disabledDetail?: ReactNode
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
      className={cn("inline-flex gap-0.5 rounded-[calc(var(--radius)*1.4)] bg-background p-1 inset-ring inset-ring-hl", className)}
    >
      {options.map((option) => (
        <Segment key={option.value} option={option} value={value} onChange={onChange} tabs={tabs} mono={mono} />
      ))}
    </div>
  )
}

type SegmentProps<T extends string | number> = {
  option: SegmentedOption<T>
  value: T
  onChange: (value: T) => void
  tabs: boolean
  mono?: boolean
}

function Segment<T extends string | number>({ option, value, onChange, tabs, mono }: SegmentProps<T>) {
  const [detailOpen, setDetailOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const outsideInteractionRef = useRef(false)
  const hasDetail = Boolean(option.disabled && option.disabledDetail)
  const active = option.value === value
  const segment = (
    <Button
      ref={buttonRef}
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
        else if (hasDetail) {
          outsideInteractionRef.current = false
          setDetailOpen(true)
        }
      }}
      className={cn(
        "h-10 rounded-[calc(var(--radius)*1)] px-[18px] text-base text-subtle hover:bg-transparent hover:text-foreground",
        mono && "px-3.5 font-mono text-[13px] font-medium",
        active && "bg-raised text-foreground inset-ring-[1.5px] inset-ring-primary hover:bg-raised",
        option.disabled && "cursor-not-allowed opacity-40 hover:text-subtle"
      )}
    >
      {option.label}
    </Button>
  )
  const tipped = option.tip ? <Tip content={option.tip}>{segment}</Tip> : segment
  if (!hasDetail) return tipped
  // The tooltip keeps its trigger on the button; the popover is anchored to a wrapper
  // instead of sharing the trigger, so the two Radix primitives never fight over one node.
  return (
    <Popover open={detailOpen} onOpenChange={setDetailOpen}>
      <PopoverAnchor asChild>
        <span className="inline-flex">{tipped}</span>
      </PopoverAnchor>
      <PopoverContent
        align="center"
        className="p-3 text-sm"
        // Mirrors Radix: focus only returns when the user did not move it elsewhere.
        onInteractOutside={() => {
          outsideInteractionRef.current = true
        }}
        // No PopoverTrigger exists, so Radix has nothing to return focus to.
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          if (!outsideInteractionRef.current) buttonRef.current?.focus()
        }}
        // A link inside the detail navigates away; close explicitly rather than rely on unmounting.
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setDetailOpen(false)
        }}
      >
        {option.disabledDetail}
      </PopoverContent>
    </Popover>
  )
}

export { SegmentedControl }
export type { SegmentedOption }
