import * as React from "react"

import { cn } from "@/shared/utils/utils"

function Input({ className, type, ref, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      ref={ref}
      data-slot="input"
      className={cn(
        // Mobile-first sizing (44px+ touch target)
        "h-11 px-4 text-base",
        // Desktop sizing
        "lg:h-8 lg:px-2.5 lg:text-sm",
        // Base classes
        "w-full min-w-0 rounded-lg border border-input bg-transparent py-1 transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground",
        // Focus & disabled
        "focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Validation & dark mode
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
