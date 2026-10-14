import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/shared/utils/utils"
import { Icon } from '@/shared/ui/Icon'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // Unchecked is an empty outlined box, checked a filled accent one with the check cut
        // out of it (redesign sheet 16). The ::after widens the hit area without growing the box.
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[5px] border-0 bg-transparent inset-ring-[1.5px] inset-ring-faint transition-[background-color,box-shadow] duration-[var(--duration-state)] outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 hover:inset-ring-subtle focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:inset-ring-love data-checked:bg-primary data-checked:text-primary-foreground data-checked:inset-ring-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <Icon name="check" size={14} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
