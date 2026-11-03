import { useTranslation } from 'react-i18next'
import { collabColor } from '../collab-color'
import type { CollabMe } from '../collab.types'
import { usePresencePeers } from '../collab-presence-context'

/** Who is in the session, each in their own colour. */
export function ParticipantsBar({ me }: { me: CollabMe | null }) {
  const { t } = useTranslation()
  const peers = usePresencePeers()
  if (!me) return null
  const people = [
    { key: 'me', name: me.name, colorIndex: me.colorIndex, role: me.role, you: true },
    ...peers.map((p) => ({ key: String(p.clientId), name: p.name, colorIndex: p.colorIndex, role: p.role, you: false })),
  ]
  return (
    <ul aria-label={t('collab.presence.participants')} className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-2 text-xs">
      {people.map((p) => (
        <li
          key={p.key}
          title={t(`collab.presence.role.${p.role}`)}
          className="flex max-w-48 items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-foreground"
          style={{ boxShadow: `inset 0 0 0 1.5px ${collabColor(p.colorIndex)}` }}
        >
          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: collabColor(p.colorIndex) }} />
          <span className="truncate font-medium">{p.name}</span>
          {p.you && <span className="shrink-0 text-subtle">({t('collab.presence.you')})</span>}
        </li>
      ))}
    </ul>
  )
}
