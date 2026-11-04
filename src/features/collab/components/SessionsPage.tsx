import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@ui/button'
import { LogoLoader } from '@ui/LogoLoader'
import { Icon } from '@/shared/ui/Icon'
import ResponsiveModal from '@/shared/ui/ResponsiveModal'
import { useAuthContext } from '@/features/auth/useAuthContext'
import { useSettings } from '@/features/settings/useSettings'
import { formatTimeAgo } from '@/features/notifications/time-ago'
import { projectsService } from '@/features/projects/services/projects.service'
import { projectDisplayName, sessionPath } from '@/features/projects/project-path'
import { artistDisplay } from '@/features/artists/artist-credits'
import type { Project } from '@/types'
import { endSession, listMySessions, startSession } from '../collab.service'
import type { CollabSessionSummary } from '../collab.types'

const PROJECT_LIMIT = 100

type Tk = (k: string, o?: Record<string, unknown>) => string

function SessionRow({ session, onOpen, onEnded }: { session: CollabSessionSummary; onOpen: () => void; onEnded: () => void }) {
  const { t, i18n } = useTranslation()
  const tk = t as Tk
  const { settings } = useSettings()
  const [ending, setEnding] = useState(false)
  const name = projectDisplayName({ title: session.title, metadata: { songName: session.songName, songArtist: session.songArtist } }) || t('collab.sessions.untitled')

  async function onEnd() {
    if (!window.confirm(t('collab.sessions.endConfirm'))) return
    setEnding(true)
    try {
      await endSession(session.publicId)
      onEnded()
    } catch {
      toast.error(t('collab.sessions.endFailed'))
      setEnding(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60">
      <div className="flex flex-col gap-1 flex-[1_1_220px] min-w-0">
        <span className="font-semibold text-zinc-100 truncate">{name}</span>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold">{tk(`collab.presence.role.${session.role}`)}</span>
          <span>{tk('collab.sessions.members', { count: session.memberCount })}</span>
          <span>{t('collab.sessions.active', { time: formatTimeAgo(session.lastActivityAt, t, settings.advanced?.timezone, i18n.language) })}</span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {session.role === 'owner' && (
          <Button type="button" variant="outline" size="sm" disabled={ending} onClick={() => void onEnd()}>
            {ending ? t('collab.sessions.ending') : t('collab.sessions.end')}
          </Button>
        )}
        <Button type="button" size="sm" onClick={onOpen}>{t('collab.sessions.open')}</Button>
      </div>
    </li>
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
  const [sessions, setSessions] = useState<CollabSessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [picking, setPicking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setSessions(await listMySessions())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (signedIn) void load()
  }, [signedIn, load])

  const liveIds = useMemo(() => new Set(sessions.filter((s) => s.role === 'owner').map((s) => s.publicId)), [sessions])

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>
  if (!signedIn) return <Navigate to="/auth/login" replace />

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">{t('collab.sessions.title')}</h1>
            <p className="text-sm text-zinc-500">{t('collab.sessions.subtitle')}</p>
          </div>
          <Button type="button" onClick={() => setPicking(true)} className="gap-2">
            <Icon name="add" size={16} />
            {t('collab.sessions.new')}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><LogoLoader size={32} /></div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-zinc-500">{t('collab.sessions.loadError')}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>{t('collab.sessions.retry')}</Button>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-zinc-500 py-12 text-center">{t('collab.sessions.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <SessionRow key={s.publicId} session={s} onOpen={() => navigate(sessionPath(s.publicId))} onEnded={() => void load()} />
            ))}
          </ul>
        )}
      </div>
      <NewSessionModal
        open={picking}
        onOpenChange={setPicking}
        liveIds={liveIds}
        onStarted={(publicId) => navigate(sessionPath(publicId))}
      />
    </div>
  )
}
