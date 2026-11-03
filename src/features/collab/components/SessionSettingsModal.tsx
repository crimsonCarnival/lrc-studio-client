import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import ResponsiveModal from '@/shared/ui/ResponsiveModal'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Switch } from '@ui/switch'
import { SegmentedControl } from '@ui/segmented-control'
import useConfirm from '@/shared/hooks/useConfirm'
import { isApiError } from '@/types'
import type { EditorLine } from '@/features/editor/editor.types'
import { collabColor } from '../collab-color'
import {
  createInvite, endSession, getSession, kickParticipant, revokeInvite, setGuestAccess, setRole,
} from '../collab.service'
import type { CollabParticipant, CollabRole, CollabSession, LockSnapshot } from '../collab.types'

type GrantableRole = Exclude<CollabRole, 'owner'>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  publicId: string
  provider: HocuspocusProvider | null
  locks: LockSnapshot
  lines: EditorLine[]
  /** Called once the session has been ended on the server. */
  onEnded: () => void
}

/** The token is a secret: this URL only ever lives in component state, never in a log, toast or route. */
const inviteUrl = (token: string) => `${window.location.origin}/join/${token}`

const SECTION = 'flex flex-col gap-2 border-t border-hl pt-4'
const HEADING = 'text-sm font-semibold text-foreground'
const ROLE_OPTIONS_KEYS = ['editor', 'viewer'] as const

// What a failed action says, unless the server's code has a message of its own.
type FailedKey =
  | 'collab.settings.invites.createFailed'
  | 'collab.settings.invites.revokeFailed'
  | 'collab.settings.guests.failed'
  | 'collab.settings.people.kickFailed'
  | 'collab.settings.people.roleFailed'

// Server codes (collab GraphQL extensions.code) with a more specific message than the action's own.
const CODE_KEYS = {
  collab_invite_limit: 'collab.settings.invites.limit',
  not_found: 'collab.settings.stale',
} as const

const isKnownCode = (code: string): code is keyof typeof CODE_KEYS => Object.hasOwn(CODE_KEYS, code)

const failureKey = (err: unknown, fallback: FailedKey) =>
  isApiError(err) && err.code && isKnownCode(err.code) ? CODE_KEYS[err.code] : fallback

/** Owner-only controls for a live session. The server re-checks every action. */
export function SessionSettingsModal({ open, onOpenChange, publicId, provider, locks, lines, onEnded }: Props) {
  const { t, i18n } = useTranslation()
  const [requestConfirm, confirmModal] = useConfirm()
  const [session, setSession] = useState<CollabSession | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  // The raw token, shown right after creating a link and never again.
  const [fresh, setFresh] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setSession(await getSession(publicId))
      setLoadFailed(false)
    } catch {
      setLoadFailed(true)
    }
  }, [publicId])

  useEffect(() => {
    if (!open) {
      // The link is shown once; closing the modal is the end of that once.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFresh(null)
      return
    }
    void refresh()
  }, [open, refresh])

  const guard = async (action: () => Promise<void>, failedKey: FailedKey) => {
    try {
      await action()
    } catch (err) {
      toast.error(t(failureKey(err, failedKey)))
    }
    // Refreshed after a failure too: a refused action usually means the list is out of date.
    await refresh()
  }

  const onCreateInvite = (role: GrantableRole) =>
    guard(async () => {
      setFresh(inviteUrl(await createInvite(publicId, role)))
    }, 'collab.settings.invites.createFailed')

  const onCopy = async () => {
    if (!fresh) return
    try {
      await navigator.clipboard.writeText(fresh)
      toast.success(t('collab.settings.invites.copied'))
    } catch {
      toast.error(t('collab.settings.invites.copyFailed'))
    }
  }

  // Kicking a guest revokes the invite link they joined with, which shuts out everyone else on it too.
  const kickBody = (m: CollabParticipant) => {
    if (!m.inviteId) return t('collab.settings.people.kickConfirmBody')
    const others = (session?.members ?? []).filter((x) => x.inviteId === m.inviteId && x.subject !== m.subject).length
    return others === 0
      ? t('collab.settings.people.kickConfirmBodyGuest')
      : t('collab.settings.people.kickConfirmBodyGuestShared', { count: others })
  }

  const onKick = (m: CollabParticipant) =>
    requestConfirm(
      kickBody(m),
      // guard refreshes afterwards, so a revoked link shows as revoked in the list.
      () => void guard(async () => {
        const res = await kickParticipant(publicId, m.subject)
        toast.success(t(res.revokedInviteId ? 'collab.settings.people.kickedLinkRevoked' : 'collab.settings.people.kicked', { name: m.name }))
      }, 'collab.settings.people.kickFailed'),
      { title: t('collab.settings.people.kickConfirmTitle', { name: m.name }), variant: 'danger' },
    )

  const onEnd = () =>
    requestConfirm(
      t('collab.settings.end.confirmBody'),
      async () => {
        try {
          await endSession(publicId)
          onOpenChange(false)
          onEnded()
        } catch {
          toast.error(t('collab.settings.end.failed'))
        }
      },
      { title: t('collab.settings.end.confirmTitle'), variant: 'danger' },
    )

  const forceUnlock = (lineId: string) => provider?.sendStateless(JSON.stringify({ t: 'force-unlock', lineId }))

  const people = session?.members.filter((m) => m.role !== 'owner') ?? []
  const held = Object.entries(locks)
  const lyricLines = lines.filter((l) => l.type !== 'section')
  const lineNumber = (lineId: string) => {
    const i = lyricLines.findIndex((l) => l.id === lineId)
    return i === -1 ? null : i + 1
  }
  const roleOptions = ROLE_OPTIONS_KEYS.map((value) => ({ value, label: t(`collab.presence.role.${value}`) }))

  return (
    <>
      <ResponsiveModal
        open={open}
        onOpenChange={onOpenChange}
        title={t('collab.settings.title')}
        description={t('collab.settings.description')}
        dialogProps={{ className: 'max-w-lg w-[92vw] max-h-[85vh] overflow-y-auto' }}
      >
        <div className="flex flex-col gap-4 text-sm">
          {loadFailed && (
            <p role="alert" className="text-destructive">{t('collab.settings.loadFailed')}</p>
          )}

          <section className="flex flex-col gap-2">
            <h3 className={HEADING}>{t('collab.settings.invites.title')}</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void onCreateInvite('editor')}>{t('collab.settings.invites.createEditor')}</Button>
              <Button variant="outline" onClick={() => void onCreateInvite('viewer')}>{t('collab.settings.invites.createViewer')}</Button>
            </div>
            {fresh && (
              <div className="flex flex-col gap-2 rounded-lg bg-raised p-3">
                <p className="text-xs text-muted-foreground">{t('collab.settings.invites.created')}</p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={fresh} onFocus={(e) => e.currentTarget.select()} aria-label={t('collab.settings.invites.copy')} />
                  <Button onClick={() => void onCopy()}>{t('collab.settings.invites.copy')}</Button>
                </div>
                <Button variant="ghost" className="self-end" onClick={() => setFresh(null)}>{t('collab.settings.invites.dismiss')}</Button>
              </div>
            )}
            {session && session.invites.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('collab.settings.invites.empty')}</p>
            )}
            <ul className="flex flex-col gap-1.5">
              {session?.invites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-2 rounded-lg bg-raised px-3 py-2">
                  <span className="min-w-0">
                    <span className="font-medium">{t(`collab.presence.role.${inv.role}`)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t('collab.settings.invites.createdOn', { date: new Date(inv.createdAt).toLocaleDateString(i18n.language) })}
                    </span>
                  </span>
                  {inv.revoked ? (
                    <span className="text-xs text-subtle">{t('collab.settings.invites.revoked')}</span>
                  ) : (
                    <Button variant="destructive" onClick={() => void guard(async () => { await revokeInvite(publicId, inv.id) }, 'collab.settings.invites.revokeFailed')}>
                      {t('collab.settings.invites.revoke')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {session && (
            <section className={SECTION}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p id="collab-guests-label" className={HEADING}>{t('collab.settings.guests.label')}</p>
                  <p className="text-xs text-muted-foreground">{t('collab.settings.guests.hint')}</p>
                </div>
                <Switch
                  aria-labelledby="collab-guests-label"
                  checked={session.allowGuests}
                  onCheckedChange={(next) => void guard(async () => { await setGuestAccess(publicId, next) }, 'collab.settings.guests.failed')}
                />
              </div>
            </section>
          )}

          <section className={SECTION}>
            <h3 className={HEADING}>{t('collab.settings.people.title')}</h3>
            {session && people.length === 0 && <p className="text-xs text-muted-foreground">{t('collab.settings.people.empty')}</p>}
            <ul className="flex flex-col gap-1.5">
              {people.map((m) => (
                <li key={m.subject} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-raised px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: collabColor(m.colorIndex) }} />
                    <span className="truncate font-medium">{m.name}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <SegmentedControl
                      label={t('collab.settings.people.role', { name: m.name })}
                      options={roleOptions}
                      value={m.role as GrantableRole}
                      onChange={(role) => void guard(async () => { await setRole(publicId, m.subject, role) }, 'collab.settings.people.roleFailed')}
                    />
                    <Button variant="destructive" onClick={() => onKick(m)}>{t('collab.settings.people.kick')}</Button>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={SECTION}>
            <h3 className={HEADING}>{t('collab.settings.locks.title')}</h3>
            {held.length === 0 && <p className="text-xs text-muted-foreground">{t('collab.settings.locks.empty')}</p>}
            <ul className="flex flex-col gap-1.5">
              {held.map(([lineId, holder]) => (
                <li key={lineId} className="flex items-center justify-between gap-2 rounded-lg bg-raised px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: collabColor(holder.colorIndex) }} />
                    <span className="truncate">
                      {t('collab.settings.locks.holder', { name: holder.name })}
                      {lineNumber(lineId) !== null && (
                        <span className="ml-2 text-xs text-muted-foreground">{t('collab.settings.locks.line', { n: lineNumber(lineId) })}</span>
                      )}
                    </span>
                  </span>
                  <Button variant="outline" onClick={() => forceUnlock(lineId)}>{t('collab.settings.locks.release')}</Button>
                </li>
              ))}
            </ul>
          </section>

          <section className={SECTION}>
            <Button variant="destructive" className="self-start" onClick={onEnd}>{t('collab.settings.end.button')}</Button>
          </section>
        </div>
      </ResponsiveModal>
      {confirmModal}
    </>
  )
}
