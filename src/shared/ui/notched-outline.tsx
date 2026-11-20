import { cn } from "@/shared/utils/utils"

interface NotchedOutlineProps {
  /** The floating label's text: measured invisibly to size the gap. */
  label: string
  /** The label sits on the outline (focused or filled): open the gap. */
  raised: boolean
  focused?: boolean
  error?: boolean
  /** Where the label's text starts, in px from the field's left edge (16 normally, 48 with an icon). */
  labelLeft?: number
  className?: string
}

/**
 * The outline of a floating-label field, drawn as a <fieldset> whose <legend> cuts a gap
 * for the raised label. The label used to hide the ring by painting the field's fill behind
 * itself, which forced the field to be opaque; with a real gap the field can be transparent
 * (`bg-field`) and show whatever panel it sits on, in every theme.
 *
 * Sits over the control (pointer-events-none). The parent must be `relative` and carry
 * `group/floating`, which drives the hover colour.
 */
export function NotchedOutline({ label, raised, focused, error, labelLeft = 16, className }: NotchedOutlineProps) {
  return (
    <fieldset
      aria-hidden
      // top -5px: the legend is 11px tall and the border is drawn through its middle, so this
      // puts the border on the field's top edge. This padding plus the border starts the gap
      // ~4px before the label's text, where the old masking chip started.
      style={{ paddingLeft: labelLeft - 6 }}
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 -top-[5px] m-0 min-w-0 overflow-hidden pr-2 text-left",
        "rounded-[var(--radius-control)] border border-hl transition-colors duration-[var(--duration-state)] ease-state",
        !focused && !error && "group-hover/floating:border-faint",
        focused && "border-2 border-primary",
        error && "border-2 border-love",
        className
      )}
    >
      <legend
        className={cn(
          "invisible float-none block h-[11px] w-auto overflow-hidden whitespace-nowrap p-0",
          "text-[11px] font-semibold uppercase leading-none tracking-[0.08em]",
          raised
            ? "max-w-full transition-[max-width] duration-100 delay-50 ease-out"
            : "max-w-[0.01px] transition-[max-width] duration-50 ease-out"
        )}
      >
        {label ? <span className="inline-block px-[5px] opacity-0">{label}</span> : null}
      </legend>
    </fieldset>
  )
}
