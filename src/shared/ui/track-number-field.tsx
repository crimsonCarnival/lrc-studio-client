import * as React from 'react'
import { cn } from '@/shared/utils/utils'

type TrackNumberFieldProps = {
  id?: string
  label: string
  ariaLabel: string
  number: string
  count: string
  onNumberChange: (v: string) => void
  onCountChange: (v: string) => void
  className?: string
}

const digits = (v: string) => v.replace(/\D/g, '').slice(0, 3)

/**
 * "3 / 12" as one control instead of two full-width fields.
 *
 * The two values stay separate in the data — this only changes how they are
 * presented, so nothing downstream has to know about the combined control.
 */
export function TrackNumberField({
  id,
  label,
  ariaLabel,
  number,
  count,
  onNumberChange,
  onCountChange,
  className,
}: TrackNumberFieldProps) {
  const reactId = React.useId()
  const groupId = id || reactId

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'relative h-12 flex items-center rounded-xl border border-zinc-700/50 bg-transparent px-3 gap-1 focus-within:border-primary/60 transition-colors',
        className
      )}
    >
      <span
        aria-hidden="true"
        className="text-[10px] uppercase tracking-wider text-primary font-bold bg-zinc-900 rounded-sm leading-none py-0.5 px-1.5 absolute -top-[2px] left-3"
      >
        {label}
      </span>

      <input
        id={`${groupId}-number`}
        aria-label={`${label} — #`}
        inputMode="numeric"
        value={number}
        onChange={(e) => onNumberChange(digits(e.target.value))}
        maxLength={3}
        className="w-10 bg-transparent text-center text-sm text-zinc-100 outline-none pt-2 tabular-nums placeholder:text-zinc-600"
        placeholder="—"
      />
      <span aria-hidden="true" className="text-zinc-600 pt-2 select-none">/</span>
      <input
        id={`${groupId}-count`}
        aria-label={`${label} — total`}
        inputMode="numeric"
        value={count}
        onChange={(e) => onCountChange(digits(e.target.value))}
        maxLength={3}
        className="w-10 bg-transparent text-center text-sm text-zinc-100 outline-none pt-2 tabular-nums placeholder:text-zinc-600"
        placeholder="—"
      />
    </div>
  )
}
