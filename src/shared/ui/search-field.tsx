import * as React from "react"

import { cn } from "@/shared/utils/utils"
import { Button } from "@ui/button"
import { LogoLoader } from "@ui/LogoLoader"
import { Icon } from "@/shared/ui/Icon"
import { SEARCH_SHORTCUT_ATTR, isSearchShortcut, pickShortcutTarget } from "@/shared/utils/search-shortcut"

type SearchFieldProps = Omit<React.ComponentProps<"input">, "type" | "value" | "onChange" | "aria-label"> & {
  value: string
  onValueChange: (value: string) => void
  /** Accessible name; the field has no visible label. */
  label: string
  /** When given, a clear button appears while there is text. */
  clearLabel?: string
  /** Runs instead of `onValueChange("")` when the clear button is pressed. */
  onClear?: () => void
  /**
   * "/" focuses the field from anywhere outside a text input. On by default.
   * "fallback" yields to any other search field on the page (used by the app header,
   * which is present next to page-level search boxes). `false` opts out.
   */
  focusShortcut?: boolean | "fallback"
  /** Toolbar size (40px, smaller text) instead of the 44px default. */
  compact?: boolean
  /** Shows a spinner at the end while a request is in flight. */
  busy?: boolean
  /** Replaces the magnifier, e.g. a provider logo. */
  leading?: React.ReactNode
  className?: string
}

// Pill search box: icon, input, and either a spinner, a clear button or the "/" hint.
function SearchField({
  value,
  onValueChange,
  label,
  clearLabel,
  onClear,
  focusShortcut = true,
  compact,
  busy,
  leading,
  className,
  ref,
  ...props
}: SearchFieldProps) {
  const innerRef = React.useRef<HTMLInputElement>(null)
  const inputRef = (ref as React.RefObject<HTMLInputElement | null> | undefined) ?? innerRef

  React.useEffect(() => {
    if (!focusShortcut) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isSearchShortcut(e)) return
      const input = inputRef.current
      if (!input || pickShortcutTarget(input.ownerDocument) !== input) return
      e.preventDefault()
      input.focus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [focusShortcut, inputRef])

  const shortcutRole = focusShortcut === "fallback" ? "fallback" : focusShortcut ? "primary" : undefined

  return (
    <div
      className={cn(
        "flex min-w-0 items-center rounded-full bg-card text-subtle inset-ring inset-ring-hl transition-shadow duration-[var(--duration-state)] ease-state hover:inset-ring-faint focus-within:inset-ring-2 focus-within:inset-ring-primary",
        compact ? "h-10 gap-2 px-3.5" : "h-11 gap-2.5 px-4",
        className
      )}
    >
      {leading ?? <Icon name="search" size={compact ? 16 : 18} className="shrink-0" />}
      <input
        {...props}
        {...(shortcutRole ? { [SEARCH_SHORTCUT_ATTR]: shortcutRole } : {})}
        ref={inputRef}
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          // focus-visible:ring-0 cancels the app-wide focus ring: the pill around the input
          // already shows focus, and a second ring inside it is noise.
          "min-w-0 flex-1 appearance-none bg-transparent font-medium text-foreground outline-none placeholder:text-faint focus-visible:ring-0 [&::-webkit-search-cancel-button]:hidden",
          compact ? "text-sm" : "text-base"
        )}
      />
      {busy ? (
        <LogoLoader size={compact ? 14 : 16} className="shrink-0" />
      ) : clearLabel && value ? (
        <Button
          type="button"
          variant="ghost"
          size={null}
          aria-label={clearLabel}
          onClick={() => (onClear ? onClear() : onValueChange(""))}
          className="size-7 shrink-0 rounded-full"
        >
          <Icon name="close" size={16} />
        </Button>
      ) : (
        // No physical keyboard on touch devices, so the hint would only be noise there.
        shortcutRole && <kbd className="shrink-0 rounded-md bg-raised px-1.5 py-0.5 font-mono text-[11px] leading-none coarse:hidden">/</kbd>
      )}
    </div>
  )
}

export { SearchField }
