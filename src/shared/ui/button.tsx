import React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/shared/utils/utils"
import useHapticFeedback from "@/shared/hooks/useHapticFeedback"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-transparent bg-clip-padding text-xs font-semibold whitespace-nowrap transition-[background-color,box-shadow,color,transform] duration-[var(--duration-state)] ease-state select-none focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-focus active:not-aria-[haspopup]:scale-[.97] disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-button-top hover:bg-primary-hover active:bg-primary-press active:shadow-button-press disabled:bg-primary-off disabled:text-subtle disabled:shadow-none",
        outline:
          "bg-raised text-foreground inset-ring inset-ring-hl hover:bg-overlay hover:inset-ring-faint active:bg-background aria-expanded:bg-overlay aria-expanded:inset-ring-faint disabled:bg-transparent disabled:text-faint",
        secondary:
          "bg-raised text-foreground inset-ring inset-ring-hl hover:bg-overlay hover:inset-ring-faint active:bg-background aria-expanded:bg-overlay aria-expanded:inset-ring-faint disabled:bg-transparent disabled:text-faint",
        ghost:
          "bg-transparent text-foreground hover:bg-primary-soft hover:text-primary-ink aria-expanded:bg-primary-soft aria-expanded:text-primary-ink disabled:text-faint",
        destructive:
          "bg-transparent text-love-ink inset-ring inset-ring-love-soft hover:bg-love-soft hover:inset-ring-love-ink active:bg-love-soft disabled:text-faint disabled:inset-ring-hl",
        link: "text-primary underline-offset-4 hover:underline disabled:opacity-50",
        sync:
          "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25 hover:border-primary/50 disabled:opacity-50",
        warning:
          "bg-warning/10 text-warning border-warning/30 hover:bg-warning/20 disabled:opacity-50",
      },
      size: {
        default:
          "h-12 px-4 text-base gap-1.5 lg:h-8 lg:px-2.5 lg:text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-10 coarse:h-11 px-3 text-sm gap-1 rounded-[min(var(--radius-md),10px)] lg:h-6 lg:px-2 lg:text-caption in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-11 px-3.5 text-sm gap-1 rounded-[min(var(--radius-md),12px)] lg:h-7 lg:px-2.5 lg:text-body-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 px-4 text-base gap-1.5 lg:h-9 lg:px-2.5 lg:text-body-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-12 lg:size-8",
        "icon-xs":
          "size-10 coarse:size-11 rounded-[min(var(--radius-md),10px)] lg:size-6 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-11 rounded-[min(var(--radius-md),12px)] lg:size-7 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-12 lg:size-9",
      },
    },
    compoundVariants: [
      {
        variant: "ghost",
        size: ["icon", "icon-xs", "icon-sm", "icon-lg"],
        className:
          "text-subtle hover:bg-raised hover:text-foreground aria-pressed:bg-primary-soft aria-pressed:text-primary-ink",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Indeterminate busy state: equalizer bars replace the icon. Stays focusable, ignores clicks. */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const { trigger: haptic } = useHapticFeedback()

  const triggerWithHaptic = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      e.preventDefault()
      return
    }
    haptic("light")
    onClick?.(e)
  }

  // Slot.Root needs exactly one child element, so under asChild the children pass through
  // untouched (even a `false` sibling breaks it) and the bars only render for real <button>s.
  const content = asChild ? (
    children
  ) : (
    <>
      {loading && (
        <span className="eq-bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
      {children}
    </>
  )

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }), loading && "cursor-progress [&_svg]:hidden [&_.material-symbols-outlined]:hidden")}
      onClick={triggerWithHaptic}
      {...props}
    >
      {content}
    </Comp>
  )
}

export { Button }
