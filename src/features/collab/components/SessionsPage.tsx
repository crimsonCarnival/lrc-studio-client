import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@ui/button'
import { LogoLoader } from '@ui/LogoLoader'
import { Icon } from '@/shared/ui/Icon'
import ResponsiveModal from '@/shared/ui/ResponsiveModal'
import ConfirmModal from '@/shared/ui/ConfirmModal'
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar'
import { cn } from '@/shared/utils/utils'
import { useAuthContext } from '@/features/auth/useAuthContext'
import { useSettings } from '@/features/settings/useSettings'
import { formatTimeAgo } from '@/features/notifications/time-ago'
import { projectsService } from '@/features/projects/services/projects.service'
import { projectDisplayName, sessionPath } from '@/features/projects/project-path'
import { artistDisplay } from '@/features/artists/artist-credits'
import type { Project } from '@/types'
import { createInvite, endSession, startSession } from '../collab.service'
import type { CollabMemberPreview, CollabSessionSummary } from '../collab.types'
import { useMySessions } from '../hooks/useMySessions'

const PROJECT_LIMIT = 100
const RECENT_COUNT = 4
const inviteUrl = (token: string) => `${window.location.origin}/join/${token}`

type Tk = (k: string, o?: Record<string, unknown>) => string

function sessionName(session: Pick<CollabSessionSummary, 'title' | 'songName' | 'songArtist'>, fallback: string) {
  return projectDisplayName({ title: session.title, metadata: { songName: session.songName, songArtist: session.songArtist } }) || fallback
}

/** Overlapping member avatars, coloured like their cursors in the session. */
function MemberStack({ members }: { members: CollabMemberPreview[] }) {
  return (
    <span className="flex" aria-hidden="true">
      {members.map((m, i) => (
        <span
          key={`${m.name}-${i}`}
          title={m.name}
          className={cn('size-[26px] shrink-0 overflow-hidden rounded-full ring-2 ring-raised', i > 0 && '-ml-2')}
          style={{ backgroundColor: `var(--color-collab-${m.colorIndex})` }}
        >
          {m.avatarUrl
            ? <img src={m.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
            : <span className="grid size-full place-items-center font-heading text-[11px] font-bold text-white">{(m.name || '?')[0].toUpperCase()}</span>}
        </span>
      ))}
    </span>
  )
}

function SessionCover({ coverImage, className }: { coverImage: string | null; className?: string }) {
  return (
    <span className={cn('relative block shrink-0 overflow-hidden bg-primary-soft', className)}>
      {coverImage
        ? <img src={coverImage} alt="" className="absolute inset-0 size-full object-cover" />
        : <Icon name="music_note" size={28} className="absolute inset-0 m-auto text-primary-ink/60" />}
    </span>
  )
}

function SessionRow({ session, onOpen, onAskEnd }: { session: CollabSessionSummary; onOpen: () => void; onAskEnd: () => void }) {
  const { t, i18n } = useTranslation()
  const tk = t as Tk
  const { settings } = useSettings()
  const [inviting, setInviting] = useState(false)
  const [copied, setCopied] = useState(false)
  const name = sessionName(session, t('collab.sessions.untitled'))
  const isOwner = session.role === 'owner'

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2500)
    return () => window.clearTimeout(id)
  }, [copied])

  // A fresh editor link each time: the server keeps only a hash, so an old one can't be shown again.
  async function onInvite() {
    setInviting(true)
    try {
      const token = await createInvite(session.publicId, 'editor')
      await navigator.clipboard.writeText(inviteUrl(token))
      setCopied(true)
      toast.success(t('collab.sessions.inviteCopied'))
    } catch {
      toast.error(t('collab.sessions.inviteFailed'))
    } finally {
      setInviting(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] bg-raised p-4 inset-ring inset-ring-hl">
      <span className="relative">
        <SessionCover coverImage={session.coverImage} className="size-[72px] rounded-[var(--radius-control)]" />
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-[calc(var(--radius)*0.6)] bg-black/75 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          <span className="size-1.5 rounded-full bg-love" />
          {t('collab.sessions.liveBadge')}
        </span>
      </span>
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-heading text-lg font-semibold text-foreground">{name}</h3>
          <span className={cn('rounded-[calc(var(--radius)*0.8)] px-2 py-0.5 text-[11px] font-semibold', isOwner ? 'bg-primary-soft text-primary-ink' : 'bg-hl text-foreground')}>
            {tk(`collab.presence.role.${session.role}`)}
          </span>
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
          {session.members.length > 0 && <MemberStack members={session.members} />}
          <span>{tk('collab.sessions.members', { count: session.memberCount })}</span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-love shadow-[0_0_0_4px_color-mix(in_srgb,var(--love)_22%,transparent)]" aria-hidden="true" />
            {t('collab.sessions.active', { time: formatTimeAgo(session.lastActivityAt, t, settings.advanced?.timezone, i18n.language) })}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {isOwner && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={inviting}
            onClick={() => void onInvite()}
            aria-label={t('collab.sessions.inviteLabel', { name })}
            className="gap-1.5"
          >
            <Icon name={copied ? 'check' : 'link'} size={16} />
            {copied ? t('collab.sessions.copied') : t('collab.sessions.invite')}
          </Button>
        )}
        {isOwner && (
          <Button type="button" variant="outline" size="sm" onClick={onAskEnd} className="text-love-ink">
            {t('collab.sessions.end')}
          </Button>
        )}
        <Button type="button" size="sm" onClick={onOpen} className="gap-1.5">
          {t('collab.sessions.open')}
          <Icon name="arrow_forward" size={16} />
        </Button>
      </div>
    </li>
  )
}

/** No live sessions: what a session is, and the user's recent projects to start one on. */
function SessionsIntro({ onStart, starting }: { onStart: (publicId: string) => void; starting: string | null }) {
  const { t, i18n } = useTranslation()
  const { settings } = useSettings()
  const [projects, setProjects] = useState<Project[] | null>(null)

  useEffect(() => {
    let cancelled = false
    projectsService.list(RECENT_COUNT * 3, 0)
      .then((list) => { if (!cancelled) setProjects(list.filter((p) => !p.readOnly).slice(0, RECENT_COUNT)) })
      .catch(() => { if (!cancelled) setProjects([]) })
    return () => { cancelled = true }
  }, [])

  const steps = [
    { title: t('collab.sessions.intro.step1Title'), body: t('collab.sessions.intro.step1Body') },
    { title: t('collab.sessions.intro.step2Title'), body: t('collab.sessions.intro.step2Body') },
    { title: t('collab.sessions.intro.step3Title'), body: t('collab.sessions.intro.step3Body') },
  ]

  return (
    <>
      <section aria-labelledby="sessions-intro" className="flex flex-col gap-6 rounded-[var(--radius-card)] bg-raised p-6 inset-ring inset-ring-hl sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Icon name="group" size={26} />
          </span>
          <div className="min-w-0 flex-[1_1_300px]">
            <h2 id="sessions-intro" className="font-heading text-2xl font-bold text-foreground">{t('collab.sessions.intro.title')}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-subtle">{t('collab.sessions.intro.body')}</p>
          </div>
        </div>
        <ol className="flex flex-wrap gap-5 border-t border-hl pt-5">
          {steps.map((step, i) => (
            <li key={step.title} className="flex min-w-0 flex-[1_1_200px] items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-ink">{i + 1}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-[13px] text-subtle">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {projects === null ? (
        <div className="flex justify-center py-8"><LogoLoader size={24} /></div>
      ) : projects.length > 0 && (
        <section aria-labelledby="sessions-recent" className="flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="sessions-recent" className="font-heading text-xl font-semibold text-foreground">{t('collab.sessions.recent.title')}</h2>
            <Link to="/library" className="text-[13px] font-medium text-primary-ink hover:text-foreground">{t('collab.sessions.recent.library')}</Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-4">
            {projects.map((p) => {
              const name = projectDisplayName({ title: p.title, metadata: { songName: p.metadata?.songName, songArtist: artistDisplay(p.metadata) } }) || t('collab.sessions.untitled')
              const edited = p.contentUpdatedAt ?? p.updatedAt
              return (
                <li key={p.publicId} className="flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-raised inset-ring inset-ring-hl">
                  <SessionCover coverImage={p.coverImage ?? p.upload?.uploadUrl ?? null} className="aspect-[16/10] w-full" />
                  <div className="flex flex-col gap-2.5 px-3.5 pb-3.5 pt-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-foreground">{name}</p>
                      {edited && (
                        <p className="mt-0.5 text-xs text-subtle">
                          {t('collab.sessions.recent.edited', { time: formatTimeAgo(edited, t, settings.advanced?.timezone, i18n.language) })}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={starting !== null}
                      onClick={() => onStart(p.publicId)}
                      aria-label={t('collab.sessions.recent.startLabel', { name })}
                    >
                      {starting === p.publicId ? <LogoLoader size={12} /> : t('collab.sessions.recent.start')}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}

/** The owner's projects, to pick the one a new session is about. */
function NewSessionModal({ open, onOpenChange, liveIds, onStarted }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  liveIds: Set<string>
  onStarted: (publicId: string) => void
}) {
  const { t } = useTranslation()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [starting, setStarting] = useState<string | null>(null)

  useEffect(() => {
    if (!open || projects) return
    let cancelled = false
    projectsService.list(PROJECT_LIMIT, 0)
      .then((list) => { if (!cancelled) setProjects(list) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [open, projects])

  const named = useMemo(() => (projects ?? []).map((p) => ({
    p,
    name: projectDisplayName({ title: p.title, metadata: { songName: p.metadata?.songName, songArtist: artistDisplay(p.metadata) } }) || t('collab.sessions.untitled'),
  })), [projects, t])
  const q = query.trim().toLowerCase()
  const shown = q ? named.filter((n) => n.name.toLowerCase().includes(q)) : named

  async function start(publicId: string) {
    setStarting(publicId)
    try {
      await startSession(publicId)
      onStarted(publicId)
    } catch {
      toast.error(t('collab.settings.startFailed'))
      setStarting(null)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('collab.sessions.pick.title')}
      description={t('collab.sessions.pick.description')}
      dialogProps={{ className: 'max-w-lg w-[92vw] max-h-[85vh] overflow-y-auto' }}
    >
      <div className="flex flex-col gap-3 text-sm">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('collab.sessions.pick.search')}
          aria-label={t('collab.sessions.pick.search')}
          className="h-10 rounded-lg border border-zinc-800 bg-transparent px-3 text-foreground placeholder:text-subtle"
        />
        {error ? (
          <p role="alert" className="text-destructive">{t('collab.sessions.pick.loadError')}</p>
        ) : !projects ? (
          <div className="flex justify-center py-8"><LogoLoader size={24} /></div>
        ) : projects.length === 0 ? (
          <p className="text-zinc-500 py-6 text-center">{t('collab.sessions.pick.empty')}</p>
        ) : shown.length === 0 ? (
          <p className="text-zinc-500 py-6 text-center">{t('collab.sessions.pick.noMatch')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {shown.map(({ p, name }) => (
              <li key={p.publicId} className="flex items-center gap-3 rounded-xl border border-zinc-800/60 px-3 py-2">
                <span className="flex-1 min-w-0 truncate font-medium text-zinc-100">{name}</span>
                {liveIds.has(p.publicId) && <span className="text-[11px] font-semibold text-success">{t('collab.sessions.pick.live')}</span>}
                <Button type="button" size="sm" disabled={starting !== null} onClick={() => void start(p.publicId)}>
                  {starting === p.publicId ? <LogoLoader size={12} /> : liveIds.has(p.publicId) ? t('collab.sessions.open') : t('collab.sessions.pick.start')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ResponsiveModal>
  )
}

/** /sessions: the live sessions the user owns or joined, and where new ones are started. */
export default function SessionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuthContext()
  const signedIn = !!user && !user.isGuest
  const { sessions, loading, error, refresh } = useMySessions()
  const [picking, setPicking] = useState(false)
  const [ending, setEnding] = useState<CollabSessionSummary | null>(null)
  const [endBusy, setEndBusy] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)

  const liveIds = useMemo(() => new Set(sessions.filter((s) => s.role === 'owner').map((s) => s.publicId)), [sessions])

  async function confirmEnd() {
    if (!ending) return
    setEndBusy(true)
    try {
      await endSession(ending.publicId)
      setEnding(null)
      void refresh()
    } catch {
      toast.error(t('collab.sessions.endFailed'))
    } finally {
      setEndBusy(false)
    }
  }

  async function startOn(publicId: string) {
    setStarting(publicId)
    try {
      await startSession(publicId)
      void refresh()
      navigate(sessionPath(publicId))
    } catch {
      toast.error(t('collab.settings.startFailed'))
      setStarting(null)
    }
  }

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>
  // Same sign-in entry as the feed and the bottom bar.
  if (!signedIn) return <Navigate to="/auth?action=signin" replace />

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-7 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex max-w-[560px] flex-col gap-1.5">
            <h1 className="font-heading text-[32px] font-bold leading-tight text-foreground">{t('collab.sessions.title')}</h1>
            {sessions.length > 0 && <p className="text-sm leading-relaxed text-subtle">{t('collab.sessions.subtitle')}</p>}
          </div>
          <Button type="button" variant={sessions.length > 0 ? 'default' : 'outline'} onClick={() => setPicking(true)} className="gap-2">
            <Icon name="add" size={16} />
            {t('collab.sessions.new')}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><LogoLoader size={32} /></div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-subtle">{t('collab.sessions.loadError')}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>{t('collab.sessions.retry')}</Button>
          </div>
        ) : sessions.length === 0 ? (
          <SessionsIntro onStart={(id) => void startOn(id)} starting={starting} />
        ) : (
          <>
            <section aria-labelledby="sessions-live" className="flex flex-col gap-3">
              <h2 id="sessions-live" className="text-[13px] font-semibold uppercase tracking-[0.06em] text-subtle">
                {t('collab.sessions.liveNow', { count: sessions.length })}
              </h2>
              <ul className="flex flex-col gap-3">
                {sessions.map((s) => (
                  <SessionRow key={s.publicId} session={s} onOpen={() => navigate(sessionPath(s.publicId))} onAskEnd={() => setEnding(s)} />
                ))}
              </ul>
            </section>
            <p className="flex items-start gap-3 rounded-[var(--radius-card)] bg-hl/50 px-5 py-4 text-[13px] leading-relaxed text-subtle">
              <Icon name="info" size={20} className="shrink-0 text-primary-ink" />
              {t('collab.sessions.joinedHint')}
            </p>
          </>
        )}
      </div>
      <NewSessionModal
        open={picking}
        onOpenChange={setPicking}
        liveIds={liveIds}
        onStarted={(publicId) => { void refresh(); navigate(sessionPath(publicId)) }}
      />
      <ConfirmModal
        isOpen={ending !== null}
        title={ending ? t('collab.sessions.endTitle', { name: sessionName(ending, t('collab.sessions.untitled')) }) : undefined}
        message={ending ? t('collab.sessions.endBody', { count: ending.memberCount }) : undefined}
        confirmText={endBusy ? t('collab.sessions.ending') : t('collab.sessions.end')}
        onConfirm={() => void confirmEnd()}
        onCancel={() => { if (!endBusy) setEnding(null) }}
      />
    </div>
  )
}
