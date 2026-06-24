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
        "lg:min-h-[100px] lg:px-2.5 lg:py-2 lg:text-sm",
        // Base classes
        "flex field-sizing-content w-full rounded-lg border border-input bg-transparent transition-colors outline-none placeholder:text-muted-foreground",
        // Focus & disabled
        "focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
        // Validation & dark mode
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
