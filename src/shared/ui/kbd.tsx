import React from "react"
import { cn } from "@/shared/utils/utils"

/** A key cap: raised surface with a heavier bottom edge, so it reads as a key and not a tag. */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-6 w-fit min-w-6 items-center justify-center gap-1 rounded-md bg-raised px-1.5 font-mono text-xs leading-none font-semibold text-foreground shadow-[inset_0_-2px_0_var(--hl),inset_0_0_0_1px_var(--hl)] select-none in-data-[slot=tooltip-content]:h-auto in-data-[slot=tooltip-content]:bg-white/12 in-data-[slot=tooltip-content]:px-1.5 in-data-[slot=tooltip-content]:py-[3px] in-data-[slot=tooltip-content]:text-tip-foreground in-data-[slot=tooltip-content]:shadow-none [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

/** Keys pressed together, e.g. Ctrl + D. In a menu row, pass `className="ml-auto"`. */
function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
