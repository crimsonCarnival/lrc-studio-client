import * as React from "react"
import { cn } from "@/shared/utils/utils"
import { Textarea } from "./textarea"

const FloatingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> & { label: string; error?: boolean }
>(({ className, label, value, error, onFocus, onBlur, ...props }, ref) => {
  const [isFocused, setIsFocused] = React.useState(false)

  const internalRef = React.useRef<HTMLTextAreaElement>(null)
  const combinedRef = (ref as React.MutableRefObject<HTMLTextAreaElement>) || internalRef

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
        className={cn(
          "w-full bg-transparent border border-zinc-700/50 text-zinc-100 focus:border-primary/60 focus:ring-0 rounded-xl transition-all px-4 pt-8 pb-3 h-[120px] resize-none overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700/50 hover:scrollbar-thumb-zinc-600",
          error && "border-destructive/50 focus:border-destructive/80",
          className
        )}
      />
      <label
        className={cn(
          "absolute top-4 text-sm text-zinc-500 pointer-events-none transition-all duration-200 ease-out left-4",
          (isFocused || hasValue) && "-top-[9px] px-1.5 text-[10px] uppercase tracking-wider text-primary font-bold bg-zinc-900 rounded-sm leading-none py-0.5 left-3",
          (isFocused || hasValue) && error && "text-destructive"
        )}
      >
        {label}
      </label>
    </div>
  )
})
FloatingTextarea.displayName = "FloatingTextarea"

export { FloatingTextarea }
