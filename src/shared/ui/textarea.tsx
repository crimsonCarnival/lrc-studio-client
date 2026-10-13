import * as React from "react"

import { cn } from "@/shared/utils/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        // Mobile-first sizing (44px+ touch target)
        "min-h-[120px] px-4 py-3 text-base",
        // Desktop sizing
        "lg:min-h-[100px] lg:px-4 lg:py-3 lg:text-base md:text-base",
        // Field look (redesign sheet 05): ring is an inset shadow so it can thicken on focus
        // without shifting layout.
        "flex field-sizing-content w-full rounded-[var(--radius-control)] border-0 bg-card font-medium leading-snug text-foreground inset-ring inset-ring-hl transition-shadow duration-[var(--duration-state)] ease-state outline-none placeholder:text-faint hover:inset-ring-faint",
        // Focus & disabled
        "focus-visible:ring-0 focus-visible:inset-ring-2 focus-visible:inset-ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        // Validation
        "aria-invalid:ring-0 aria-invalid:inset-ring-2 aria-invalid:inset-ring-love",
        className
      )}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
