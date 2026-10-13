import * as React from "react"

import { cn } from "@/shared/utils/utils"
import { Button } from "@ui/button"
import { Icon } from "@/shared/ui/Icon"

type SearchFieldProps = Omit<React.ComponentProps<"input">, "type" | "value" | "onChange" | "aria-label"> & {
  value: string
  onValueChange: (value: string) => void
  /** Accessible name; the field has no visible label. */
  label: string
  /** When given, a clear button appears while there is text. */
  clearLabel?: string
  /** Press "/" anywhere outside a text field to focus this one. Enable on one field per page. */
  focusShortcut?: boolean
  className?: string
}

function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

// Pill search box: icon, input, and either a clear button or the "/" shortcut hint.
function SearchField({ value, onValueChange, label, clearLabel, focusShortcut, className, ref, ...props }: SearchFieldProps) {
  const innerRef = React.useRef<HTMLInputElement>(null)
  const inputRef = (ref as React.RefObject<HTMLInputElement | null> | undefined) ?? innerRef

  React.useEffect(() => {
    if (!focusShortcut) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || isTextTarget(e.target)) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [focusShortcut, inputRef])

  return (
    <div
      className={cn(
        "flex h-11 min-w-0 items-center gap-2.5 rounded-full bg-card px-4 text-subtle inset-ring inset-ring-hl transition-shadow duration-[var(--duration-state)] ease-state hover:inset-ring-faint focus-within:inset-ring-2 focus-within:inset-ring-primary",
        className
      )}
    >
      <Icon name="search" size={18} className="shrink-0" />
      <input
        {...props}
        ref={inputRef}
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="min-w-0 flex-1 appearance-none bg-transparent text-base font-medium text-foreground outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
      />
      {clearLabel && value ? (
        <Button type="button" variant="ghost" size={null} aria-label={clearLabel} onClick={() => onValueChange("")} className="size-7 shrink-0 rounded-full">
          <Icon name="close" size={16} />
        </Button>
      ) : (
        focusShortcut && <kbd className="shrink-0 rounded-md bg-raised px-1.5 py-0.5 font-mono text-[11px] leading-none">/</kbd>
      )}
    </div>
  )
}

export { SearchField }
