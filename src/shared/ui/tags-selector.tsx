import * as React from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/shared/ui/Icon'
import { cn } from '@/shared/utils/utils'
import {
  TAGS_CATALOG,
  TAG_GROUPS,
  GENRE_TAG_GROUPS,
  MAX_TAGS,
  type TagEntry,
  type PrimaryGenre,
} from '@features/editor/constants/genre-tags'

interface TagsSelectorProps {
  value: string[]
  onChange: (tags: string[]) => void
  genre?: string
  className?: string
}

export function TagsSelector({ value, onChange, genre, className }: TagsSelectorProps) {
  const { t } = useTranslation()
  // Tag group labels are dynamic keys; cast for the typed t().
  const tk = t as (key: string) => string
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({})

  const selected = React.useMemo(() => new Set(value), [value])
  const atMax = value.length >= MAX_TAGS
  const isDisabled = !genre

  const relevantTags = React.useMemo<TagEntry[]>(() => {
    if (!genre) return []
    const groups = GENRE_TAG_GROUPS[genre as PrimaryGenre] ?? Object.keys(TAG_GROUPS)
    return TAGS_CATALOG.filter((tag) => groups.includes(tag.group))
  }, [genre])

  const filtered = React.useMemo<TagEntry[]>(() => {
    const q = query.toLowerCase().trim()
    if (!q) return relevantTags
    return relevantTags.filter((tag) => tag.value.toLowerCase().includes(q))
  }, [relevantTags, query])

  const grouped = React.useMemo(() => {
    if (query.trim()) return null
    const map = new Map<string, TagEntry[]>()
    for (const tag of filtered) {
      if (!map.has(tag.group)) map.set(tag.group, [])
      map.get(tag.group)!.push(tag)
    }
    return map
  }, [filtered, query])

  function toggle(tagValue: string) {
    if (selected.has(tagValue)) {
      onChange(value.filter((v) => v !== tagValue))
    } else if (!atMax) {
      onChange([...value, tagValue])
    }
  }

  const trimmedQuery = query.trim()
  const canAddCustom =
    trimmedQuery.length >= 2 &&
    trimmedQuery.length <= 50 &&
    !atMax &&
    !selected.has(trimmedQuery) &&
    !TAGS_CATALOG.some((t) => t.value.toLowerCase() === trimmedQuery.toLowerCase())

  function addCustom() {
    if (!canAddCustom) return
    onChange([...value, trimmedQuery])
    setQuery('')
  }

  React.useEffect(() => {
    if (open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      const available = window.innerHeight - rect.bottom - 8
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 300),
        maxHeight: Math.max(180, available),
        zIndex: 9999,
      })
    }
  }, [open])

  React.useEffect(() => {
    if (open) {
      const id = setTimeout(() => searchRef.current?.focus(), 10)
      return () => clearTimeout(id)
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('')
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (
        !wrapperRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const hasTags = value.length > 0
  const isFilled = hasTags || open

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      {/* Trigger */}
      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !isDisabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
            e.preventDefault()
            setOpen((o) => !o)
          }
        }}
        className={cn(
          'relative flex min-h-[2.5rem] flex-wrap items-start gap-1 px-3 pt-5 pb-1.5 rounded-xl border transition-all cursor-pointer select-none',
          open
            ? 'border-primary/60 ring-1 ring-primary/20 bg-zinc-800/50'
            : 'border-zinc-700/50 bg-zinc-800/40 hover:border-zinc-600/60',
          isDisabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        )}
      >
        {/* Floating label */}
        <span
          className={cn(
            'absolute left-3 transition-all pointer-events-none select-none font-medium',
            isFilled
              ? 'top-1.5 text-[9px] uppercase tracking-wider text-zinc-500'
              : 'top-1/2 -translate-y-1/2 text-sm text-zinc-500',
          )}
        >
          {t('setup.tags')}
        </span>

        {/* Selected pills */}
        {hasTags &&
          value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary border border-primary/25"
            >
              {tag}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(value.filter((v) => v !== tag))
                }}
                className="hover:text-primary/60 transition-colors leading-none"
                aria-label={`Remove ${tag}`}
              >
                <Icon name="close" size={10} />
              </button>
            </span>
          ))}

        {/* Counter + chevron */}
        <div
          className={cn(
            'absolute right-2.5 flex items-center gap-1.5',
            hasTags ? 'top-2' : 'top-1/2 -translate-y-1/2',
          )}
        >
          {hasTags && (
            <span className={cn('text-[9px] tabular-nums', atMax ? 'text-amber-400' : 'text-zinc-500')}>
              {value.length}/{MAX_TAGS}
            </span>
          )}
          <Icon
            name="expand_more"
            size={14}
            className={cn('text-zinc-400 transition-transform duration-150', open && 'rotate-180')}
          />
        </div>
      </div>

      {/* Portal dropdown */}
      {open &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="rounded-xl border border-zinc-700/50 bg-zinc-900 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="shrink-0 p-2 border-b border-zinc-800/80">
              <div className="relative">
                <Icon name="search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                  placeholder={t('setup.tagsSearch')}
                  disabled={atMax && !query}
                  className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              {grouped ? (
                Array.from(grouped.entries()).map(([group, tags]) => (
                  <div key={group} className="mb-2.5 last:mb-0">
                    <p className="px-1 pb-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                      {tk(TAG_GROUPS[group] || group)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => {
                        const isSel = selected.has(tag.value)
                        return (
                          <button
                            key={tag.value}
                            type="button"
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={() => toggle(tag.value)}
                            disabled={!isSel && atMax}
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all',
                              isSel
                                ? 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25'
                                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700/60 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed',
                            )}
                          >
                            {tag.value}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              ) : filtered.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {filtered.map((tag) => {
                    const isSel = selected.has(tag.value)
                    return (
                      <button
                        key={tag.value}
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => toggle(tag.value)}
                        disabled={!isSel && atMax}
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all',
                          isSel
                            ? 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25'
                            : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700/60 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                      >
                        {tag.value}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="py-3 text-xs text-zinc-600 text-center">{t('setup.tagsNoResults')}</p>
              )}

              {canAddCustom && (
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={addCustom}
                  className="mt-2 w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 border border-dashed border-zinc-700/60 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                >
                  <Icon name="add" size={12} className="shrink-0" />
                  {t('setup.tagsAdd', { tag: trimmedQuery })}
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
