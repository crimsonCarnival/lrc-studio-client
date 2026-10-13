import React from "react"
import { cn } from "@/shared/utils/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none in-data-[slot=tooltip-content]:h-auto in-data-[slot=tooltip-content]:rounded-md in-data-[slot=tooltip-content]:bg-white/12 in-data-[slot=tooltip-content]:px-1.5 in-data-[slot=tooltip-content]:py-[3px] in-data-[slot=tooltip-content]:font-mono in-data-[slot=tooltip-content]:text-tip-foreground [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

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
