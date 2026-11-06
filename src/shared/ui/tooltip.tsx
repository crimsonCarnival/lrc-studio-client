"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@/shared/utils/utils"

// Radix throws when a Tooltip has no provider above it. <Tip> sits on many small controls that can
// render outside AppProviders (portals, isolated tests), so it checks this and supplies its own then.
const HasTooltipProvider = React.createContext(false)

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <HasTooltipProvider.Provider value>
      <TooltipPrimitive.Provider
        data-slot="tooltip-provider"
        delayDuration={delayDuration}
        {...props}
      />
    </HasTooltipProvider.Provider>
  )
}

/** Wraps `children` in a provider unless one already exists above. */
function EnsureTooltipProvider({ children }: { children: React.ReactNode }) {
  return React.useContext(HasTooltipProvider) ? <>{children}</> : <TooltipProvider>{children}</TooltipProvider>
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-overlay flex w-fit max-w-sm origin-(--radix-tooltip-content-transform-origin) items-center gap-2.5 rounded-[calc(var(--radius)*1)] bg-tip px-3 py-2 text-[15px] font-medium text-tip-foreground shadow-md break-words whitespace-normal data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-overlay size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[calc(var(--radius)*0.2)] bg-tip fill-tip" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { EnsureTooltipProvider, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
