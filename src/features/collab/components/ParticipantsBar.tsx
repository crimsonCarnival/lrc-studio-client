import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collabColor } from '../collab-color'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import type { CollabMe, CollabParticipant } from '../collab.types'
import { usePresencePeers } from '../collab-presence-context'
import { getSession } from '../collab.service'
import { initialsOf, participantRows, splitParticipants, type ParticipantRow } from '../participants'
import { Tip } from '@ui/tip'
import { LazyImage } from '@ui/LazyImage'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'

function ParticipantAvatar({ p }: { p: ParticipantRow }) {
  const { t } = useTranslation()
  const [imgError, setImgError] = useState(false)
  const hasAvatar = !!p.avatarUrl && !imgError

  const roleText = t(`collab.presence.role.${p.role}`)
  const tooltipContent = (
    <div className="flex flex-col text-xs leading-snug">
      <div className="flex items-center gap-1 font-semibold text-foreground">
        <span>{p.name}</span>
        {p.you && <span className="text-subtle font-normal">({t('collab.presence.you')})</span>}
      </div>
      <div className="flex items-center gap-1.5 text-subtle">
        <span>{roleText}</span>
        {!p.online && (
          <>
            <span>·</span>
            <span>{t('collab.presence.offline')}</span>
          </>
        )}
      </div>
    </div>
  )

  const accessibleLabel = `${p.name}${p.you ? ` (${t('collab.presence.you')})` : ''} - ${roleText}${p.online ? '' : ` (${t('collab.presence.offline')})`}`

  return (
    <li className="list-none">
      <Tip content={tooltipContent} side="bottom">
        <div
          tabIndex={0}
          aria-label={accessibleLabel}
          className={`relative size-8 shrink-0 rounded-full cursor-default select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${p.online ? '' : 'opacity-50'}`}
        >
          <div className="size-full overflow-hidden rounded-full ring-2 ring-zinc-950 bg-zinc-900 flex items-center justify-center">
            {hasAvatar ? (
              <LazyImage
                src={p.avatarUrl!}
                alt={p.name}
                onError={() => setImgError(true)}
                className="size-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-full items-center justify-center font-heading text-[11px] font-bold leading-none text-zinc-950"
                style={{ backgroundColor: collabColor(p.colorIndex) }}
              >
                {initialsOf(p.name)}
              </span>
            )}
          </div>
          <span
            aria-hidden
            className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-zinc-950 ${p.online ? 'bg-success' : 'bg-subtle'}`}
          />
          <span className="sr-only">{p.name}</span>
        </div>
      </Tip>
    </li>
  )
}

/**
 * Avatars for participants in the session: real avatar images when available,
 * initials in their collab color otherwise, with a status dot and hover tooltip
 * showing their name and rank.
 */
export function ParticipantsBar({
  me,
  publicId,
  provider,
  maxVisible,
}: {
  me: CollabMe | null
  publicId: string | null
  provider?: HocuspocusProvider | null
  /** Avatars shown before the rest collapse into a "+N" chip that lists them (phone header). */
  maxVisible?: number
}) {
  const { t } = useTranslation()
  const peers = usePresencePeers()
  // Tagged with the session it was fetched for, so another session never shows these.
  const [fetched, setFetched] = useState<{ publicId: string; members: CollabParticipant[] | null } | null>(null)
  const [kicked, setKicked] = useState<{ publicId: string; subjects: Set<string> } | null>(null)

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

  useEffect(() => {
    if (!provider) return
    const onStateless = ({ payload }: { payload: string }) => {
      try {
        const msg = JSON.parse(payload) as { t?: string; subject?: string }
        if (msg.t === 'kicked' && typeof msg.subject === 'string') {
          const kickedSubject = msg.subject
          setKicked((prev) => ({
            publicId: publicId ?? '',
            subjects: new Set([...(prev && prev.publicId === publicId ? prev.subjects : []), kickedSubject]),
          }))
          setFetched((prev) =>
            prev && prev.publicId === publicId
              ? { ...prev, members: prev.members ? prev.members.filter((m) => m.subject !== kickedSubject) : null }
              : prev,
          )
          if (isOwner && publicId) {
            void getSession(publicId)
              .then((session) => {
                setFetched({ publicId, members: session?.members ?? null })
              })
              .catch(() => {})
          }
        }
      } catch {
        // ignore malformed payloads
      }
    }
    provider.on('stateless', onStateless)
    return () => {
      provider.off('stateless', onStateless)
    }
  }, [provider, isOwner, publicId])

  if (!me) return null
  const members = isOwner && fetched && fetched.publicId === publicId ? fetched.members : null
  const kickedSubjects = kicked && kicked.publicId === publicId ? kicked.subjects : null
  const visiblePeers = kickedSubjects ? peers.filter((p) => !kickedSubjects.has(p.subject)) : peers
  const visibleMembers = members ? (kickedSubjects ? members.filter((m) => !kickedSubjects.has(m.subject)) : members) : null
  const rows = participantRows(me, visiblePeers, visibleMembers)

  const { shown, hidden } = splitParticipants(rows, maxVisible)

  return (
    <ul aria-label={t('collab.presence.participants')} className="flex shrink-0 items-center gap-1.5">
      {shown.map((p) => (
        <ParticipantAvatar key={p.subject} p={p} />
      ))}
      {hidden.length > 0 && (
        <li className="list-none">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t('collab.presence.more', { count: hidden.length })}
                className="flex size-11 items-center justify-center rounded-full text-[13px] font-semibold text-foreground/80 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                +{hidden.length}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 p-2">
              <ul aria-label={t('collab.presence.participants')} className="flex flex-col gap-1">
                {hidden.map((p) => (
                  <li key={p.subject} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-foreground">{p.name}{p.you ? ` (${t('collab.presence.you')})` : ''}</span>
                    <span className="shrink-0 text-xs text-subtle">
                      {t(`collab.presence.role.${p.role}`)}{p.online ? '' : ` · ${t('collab.presence.offline')}`}
                    </span>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </li>
      )}
    </ul>
  )
}
