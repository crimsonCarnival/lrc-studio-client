import * as React from "react"
import { cn } from "@/shared/utils/utils"
import { Input } from "./input"

function FloatingInput({ className, label, value, error, hasIcon, onFocus, onBlur, ref, ...props }: React.ComponentProps<"input"> & { label: string; error?: boolean; hasIcon?: boolean }) {
  const [isFocused, setIsFocused] = React.useState(false)

  const internalRef = React.useRef<HTMLInputElement>(null)
  const combinedRef = (ref as React.RefObject<HTMLInputElement>) || internalRef

  const [hasValue, setHasValue] = React.useState(false)

  React.useEffect(() => {
    const el = combinedRef.current
    if (el) {
      setHasValue(!!el.value || !!value)
    }
  }, [value, combinedRef])

  const raised = isFocused || hasValue

  return (
    <div className="relative group/floating w-full">
      <Input
        {...props}
        value={value ?? ''}
        ref={combinedRef}
        onFocus={(e) => {
          setIsFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          setHasValue(!!e.target.value)
          onBlur?.(e)
        }}
        onChange={(e) => {
          setHasValue(!!e.target.value)
          props.onChange?.(e)
        }}
        placeholder=" "
        aria-invalid={error || undefined}
        className={cn(
          // The ring is an inset shadow, not a border, so the label can sit on top of it
          // and mask it with the field's own fill (bg-card) wherever it floats.
          "h-[52px] lg:h-[52px] rounded-[var(--radius-control)] border-0 bg-card px-4 lg:px-4 text-[17px] md:text-[17px] lg:text-[17px] font-medium text-foreground inset-ring inset-ring-hl",
          "transition-shadow duration-[var(--duration-state)] ease-state hover:inset-ring-faint",
          "focus-visible:border-transparent focus-visible:ring-0 focus-visible:inset-ring-2 focus-visible:inset-ring-primary",
          "aria-invalid:ring-0 aria-invalid:inset-ring-2 aria-invalid:inset-ring-love focus-visible:aria-invalid:inset-ring-love",
          hasIcon && "pl-12 lg:pl-12",
          className
        )}
      />
      <label
        // Without this the input has no accessible name at all: the label is
        // only positioned next to it visually, which a screen reader cannot see.
        htmlFor={props.id}
        className={cn(
          // top-[26px] is half of the input's fixed 52px, NOT top-1/2: the wrapper stretches
          // to the tallest cell in a grid row, and centring on it drops the label below
          // the field's own border.
          "absolute -translate-y-1/2 pointer-events-none rounded-sm bg-card px-1 -ml-1 transition-all duration-[var(--duration-state)] ease-state",
          hasIcon ? "left-12" : "left-4",
          raised
            ? "top-0 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-subtle"
            : "top-[26px] text-[17px] font-medium text-subtle",
          raised && isFocused && "text-primary-ink",
          raised && error && "text-love-ink"
        )}
      >
        {label}
      </label>
    </div>
  )
}

export { FloatingInput }
