import * as React from "react"
import { cn } from "@/shared/utils/utils"
import { Textarea } from "./textarea"

function FloatingTextarea({ className, label, value, error, onFocus, onBlur, ref, ...props }: React.ComponentProps<"textarea"> & { label: string; error?: boolean }) {
  const [isFocused, setIsFocused] = React.useState(false)

  const internalRef = React.useRef<HTMLTextAreaElement>(null)
  const combinedRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef

  const [hasValue, setHasValue] = React.useState(false)

  React.useEffect(() => {
    const el = combinedRef.current
    if (el) {
      setHasValue(!!el.value || !!value)
    }
  }, [value, combinedRef])

  return (
    <div className="relative group/floating w-full">
      <Textarea
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
          "h-[120px] lg:min-h-0 pt-8 pb-3 resize-none overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700/50 hover:scrollbar-thumb-zinc-600",
          className
        )}
      />
      <label
        className={cn(
          // Same label behaviour as FloatingInput: the field's own fill (bg-card) masks the ring.
          "absolute -translate-y-1/2 pointer-events-none rounded-sm bg-card px-1 -ml-1 left-4 transition-all duration-[var(--duration-state)] ease-state",
          isFocused || hasValue
            ? "top-0 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-subtle"
            : "top-[26px] text-[17px] font-medium text-subtle",
          (isFocused || hasValue) && isFocused && "text-primary-ink",
          (isFocused || hasValue) && error && "text-love-ink"
        )}
      >
        {label}
      </label>
    </div>
  )
}

export { FloatingTextarea }
