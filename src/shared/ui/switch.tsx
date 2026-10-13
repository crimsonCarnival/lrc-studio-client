import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/shared/utils/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border-0 p-0 transition-colors duration-200 ease-state outline-none after:content-[''] after:absolute after:-inset-x-1 after:-inset-y-2 coarse:after:-inset-y-3.5 coarse:after:-inset-x-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus focus-visible:ring-0 aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-7 data-[size=default]:w-12 data-[size=sm]:h-5 data-[size=sm]:w-9 data-[state=checked]:bg-primary data-[state=unchecked]:bg-hl data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-knob shadow-[0_1px_3px_rgba(0,0,0,0.3)] ring-0 transition-transform duration-[220ms] ease-bounce data-[state=checked]:bg-primary-foreground group-data-[size=default]/switch:size-5 group-data-[size=default]/switch:data-[state=unchecked]:translate-x-1 group-data-[size=default]/switch:data-[state=checked]:translate-x-6 group-data-[size=sm]/switch:size-3.5 group-data-[size=sm]/switch:data-[state=unchecked]:translate-x-[3px] group-data-[size=sm]/switch:data-[state=checked]:translate-x-[19px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
