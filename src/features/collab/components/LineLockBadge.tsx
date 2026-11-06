import { useTranslation } from 'react-i18next'
import { collabColor } from '../collab-color'
import type { LockHolderView } from '../collab.types'

/** Names who is editing a line. Sits on the row's top-right corner, over the content. */
export function LineLockBadge({ holder }: { holder: LockHolderView }) {
  const { t } = useTranslation()
  return (
    <span
      title={t('collab.locks.badge', { name: holder.name })}
      className="pointer-events-none absolute -top-2 right-3 z-10 flex max-w-[60%] items-center gap-1 rounded-pill bg-background px-2 py-0.5 text-[11px] font-semibold leading-none text-foreground"
      style={{ boxShadow: `0 0 0 1.5px ${collabColor(holder.colorIndex)}` }}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: collabColor(holder.colorIndex) }} />
      <span className="truncate">{holder.name}</span>
    </span>
  )
}
