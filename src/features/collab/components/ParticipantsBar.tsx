import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collabColor } from '../collab-color'
import type { CollabMe, CollabParticipant } from '../collab.types'
import { usePresencePeers } from '../collab-presence-context'
import { getSession } from '../collab.service'
import { initialsOf, participantRows } from '../participants'

/**
 * Who is in the session: one row per person, each with their initials in their own colour,
 * their name, their role and whether they are online. Presence (awareness) gives the online
 * people; the owner also sees members who are not connected, from `collabSession.members`,
 * which the server answers only for the owner — everyone else sees who is online.
 */
export function ParticipantsBar({ me, publicId }: { me: CollabMe | null; publicId: string | null }) {
  const { t } = useTranslation()
  const peers = usePresencePeers()
  // Tagged with the session it was fetched for, so another session never shows these.
  const [fetched, setFetched] = useState<{ publicId: string; members: CollabParticipant[] | null } | null>(null)

  const isOwner = me?.role === 'owner'
  // Refetched when someone comes or goes, so a newly joined member is listed once they leave.
  const onlineKey = useMemo(() => [...new Set(peers.map((p) => p.subject))].sort().join('\n'), [peers])
  useEffect(() => {
    if (!isOwner || !publicId) return
    let cancelled = false
    getSession(publicId)
      .then((session) => { if (!cancelled) setFetched({ publicId, members: session?.members ?? null }) })
      // Offline members are extra information: on failure the bar still shows who is online.
      .catch(() => { if (!cancelled) setFetched(null) })
    return () => { cancelled = true }
  }, [isOwner, publicId, onlineKey])

  if (!me) return null
  const members = isOwner && fetched && fetched.publicId === publicId ? fetched.members : null
  const rows = participantRows(me, peers, members)
  return (
    <ul aria-label={t('collab.presence.participants')} className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-2 text-xs">
      {rows.map((p) => {
        const status = p.online ? t('collab.presence.online') : t('collab.presence.offline')
        return (
          <li
            key={p.subject}
            className={`flex max-w-64 items-center gap-1.5 rounded-full bg-raised py-0.5 pl-0.5 pr-2.5 text-foreground ${p.online ? '' : 'opacity-60'}`}
          >
            <span className="relative shrink-0">
              <span
                aria-hidden
                className="flex size-6 items-center justify-center rounded-full text-[10px] font-semibold leading-none text-background"
                style={{ backgroundColor: collabColor(p.colorIndex) }}
              >
                {initialsOf(p.name)}
              </span>
              <span
                aria-hidden
                title={status}
                className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-raised ${p.online ? 'bg-success' : 'bg-subtle'}`}
              />
            </span>
            <span className="truncate font-medium">{p.name}</span>
            {p.you && <span className="shrink-0 text-subtle">({t('collab.presence.you')})</span>}
            <span aria-hidden className="shrink-0 text-subtle">·</span>
            <span className="shrink-0 text-subtle">{t(`collab.presence.role.${p.role}`)}</span>
            <span className="sr-only">{status}</span>
          </li>
        )
      })}
    </ul>
  )
}
