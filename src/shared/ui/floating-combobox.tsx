import * as React from 'react'
import { cn } from '@/shared/utils/utils'
import { Input } from './input'
import { ChevronDown } from 'lucide-react'

export interface ComboboxOption {
  value: string
  label?: string
}

interface FloatingComboboxProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  onSelect?: (value: string) => void
  options: ComboboxOption[]
  maxLength?: number
  className?: string
  error?: boolean
  /**
   * strict: typing filters options but only a dropdown selection commits the value.
   * On blur without a selection the display text reverts to the current value.
   * Use for fields where only preset options are valid (genre, language).
   */
  strict?: boolean
}

export function FloatingCombobox({
  id,
  label,
  value,
  onChange,
  onSelect,
  options,
  maxLength,
  className,
  error,
  strict = false,
}: FloatingComboboxProps) {
  const [focused, setFocused] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  // localText: what is shown in the input (may differ from value in strict mode while searching)
  const [localText, setLocalText] = React.useState(value)

  // Keep localText in sync when value changes externally
  React.useEffect(() => {
    if (!focused) setLocalText(value)
  }, [value, focused])

  const displayText = strict ? localText : value

  const filtered = React.useMemo(() => {
    const q = displayText.toLowerCase().trim()
    if (!q) return options.slice(0, 8)
    return options.filter((o) =>
      (o.label || o.value).toLowerCase().includes(q)
    ).slice(0, 8)
  }, [displayText, options])

  const showDropdown = open && filtered.length > 0
  const hasValue = !!displayText

  function commitSelect(opt: ComboboxOption) {
    onChange(opt.value)
    setLocalText(opt.value)
    onSelect?.(opt.value)
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleChange(raw: string) {
    if (strict) {
      setLocalText(raw)
      setOpen(true)
      setActiveIndex(-1)
      // In strict mode we do NOT call onChange here — only on selection
    } else {
      onChange(raw)
      setOpen(true)
      setActiveIndex(-1)
    }
  }

  function handleBlur() {
    setFocused(false)
    setTimeout(() => {
      setOpen(false)
      if (strict) {
        // Revert display text to the committed value if the user didn't pick anything
        setLocalText(value)
      }
    }, 150)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (e.key === 'ArrowDown') {
        setOpen(true)
        setActiveIndex(0)
        e.preventDefault()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        if (activeIndex >= 0 && filtered[activeIndex]) {
          e.preventDefault()
          commitSelect(filtered[activeIndex])
        }
        break
      case 'Escape':
        setOpen(false)
        setActiveIndex(-1)
        if (strict) setLocalText(value)
        break
    }
  }

  return (
    <div className={cn('relative group/floating w-full', className)}>
      <Input
        id={id}
        value={displayText}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          setFocused(true)
          if (strict) setLocalText('')
          setOpen(true)
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder=" "
        maxLength={maxLength}
        autoComplete="off"
        className={cn(
          'h-12 w-full bg-transparent border-zinc-700/50 text-zinc-100 focus:border-primary/60 focus:ring-0 rounded-xl transition-all px-4 pt-2 pr-9',
          error && 'border-destructive/50 focus:border-destructive/80'
        )}
      />
      <label
        className={cn(
          'absolute top-1/2 -translate-y-1/2 left-4 text-sm text-zinc-500 pointer-events-none transition-all duration-200 ease-out',
          (focused || hasValue || value) &&
            '-top-[2px] px-1.5 text-[10px] uppercase tracking-wider text-primary font-bold bg-zinc-900 rounded-sm leading-none py-0.5 left-3',
          (focused || hasValue || value) && error && 'text-destructive'
        )}
      >
        {label}
      </label>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600 pointer-events-none" />

      {showDropdown && (
        <div
          role="listbox"
          className="absolute z-50 top-[calc(100%+4px)] w-full bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-xl overflow-hidden"
        >
          {filtered.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault()
                commitSelect(opt)
              }}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm transition-colors',
                i === activeIndex
                  ? 'bg-primary/20 text-primary'
                  : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
                i < filtered.length - 1 && 'border-b border-zinc-800/60'
              )}
            >
              {opt.label || opt.value}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
