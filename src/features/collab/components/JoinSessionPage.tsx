import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { LogoLoader } from '@ui/LogoLoader'
import { useAuthContext } from '@/features/auth/useAuthContext'
import { isApiError } from '@/types'
import { sessionPath } from '@/features/projects/project-path'
import { joinSession } from '../collab.service'

// Matches the server (collab.service MAX_NAME): 1-40 characters after trimming.
const nameSchema = z.string().trim().min(1).max(40)

// Server codes (POST /collab/join) -> a literal locale key, so `t()` stays typed.
const JOIN_ERROR_KEYS = {
  collab_link_invalid: 'collab.join.errors.invalid',
  collab_link_revoked: 'collab.join.errors.revoked',
  collab_guests_disabled: 'collab.join.errors.guestsDisabled',
  collab_kicked: 'collab.join.errors.kicked',
  collab_session_ended: 'collab.join.errors.ended',
  collab_invalid_name: 'collab.join.errors.invalidName',
  collab_session_full: 'collab.join.errors.full',
  forbidden: 'collab.join.errors.forbidden',
} as const

type JoinErrorKey =
  | (typeof JOIN_ERROR_KEYS)[keyof typeof JOIN_ERROR_KEYS]
  | 'collab.join.errors.rateLimited'
  | 'collab.join.errors.generic'

const isJoinCode = (code: string): code is keyof typeof JOIN_ERROR_KEYS => Object.hasOwn(JOIN_ERROR_KEYS, code)

/** The message for a failed join. Unknown codes fall back on the HTTP status, then a generic message. */
function joinErrorKey(err: unknown): JoinErrorKey {
  if (!isApiError(err)) return 'collab.join.errors.generic'
  if (err.code && isJoinCode(err.code)) return JOIN_ERROR_KEYS[err.code]
  if (err.status === 429) return 'collab.join.errors.rateLimited'
  // A ban or a cross-site refusal: the server sends no collab code, and retrying will not help.
  if (err.status === 403) return 'collab.join.errors.forbidden'
  return 'collab.join.errors.generic'
}

// These will not change by trying again.
const FINAL_ERRORS: ReadonlySet<JoinErrorKey> = new Set<JoinErrorKey>([
  'collab.join.errors.invalid',
  'collab.join.errors.revoked',
  'collab.join.errors.kicked',
  'collab.join.errors.ended',
  'collab.join.errors.full',
  'collab.join.errors.forbidden',
  'collab.join.errors.guestsDisabled',
])

/**
 * /join/:token. The token is a secret: it is never logged, never put in a toast or another URL,
 * and a successful join replaces this history entry so it is not left behind the back button.
 */
export default function JoinSessionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token } = useParams()
  const { user, loading } = useAuthContext()
  const signedIn = !!user && !user.isGuest
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(false)
  const [error, setError] = useState<JoinErrorKey | null>(null)
  const [joining, setJoining] = useState(false)
  const autoJoinedRef = useRef(false)

  const join = useCallback(async (guestName?: string) => {
    if (!token) return
    setJoining(true)
    setError(null)
    try {
      const res = await joinSession(token, guestName)
      navigate(sessionPath(res.publicId), { replace: true })
    } catch (err) {
      // Only the server's code is read; the error may echo the request, so it is not logged.
      const key = joinErrorKey(err)
      // A guest fixes the name in the form; a signed-in user has no field to fix, so it is an error screen.
      if (key === 'collab.join.errors.invalidName' && guestName !== undefined) setNameError(true)
      else setError(key)
      setJoining(false)
    }
  }, [token, navigate])

  // Signed-in users have a name already: join as soon as auth has settled.
  useEffect(() => {
    if (loading || !signedIn || autoJoinedRef.current) return
    autoJoinedRef.current = true
    void join()
  }, [loading, signedIn, join])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = nameSchema.safeParse(name)
    if (!parsed.success) {
      setNameError(true)
      return
    }
    setNameError(false)
    void join(parsed.data)
  }

  const retry = () => {
    if (signedIn) void join()
    else setError(null)
  }

  if (!token) return null

  const shell = (children: ReactNode) => (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">{children}</main>
  )

  if (loading || (signedIn && !error)) {
    return shell(
      <>
        <LogoLoader size={32} className="text-primary" />
        <p className="text-sm text-muted-foreground">{t('collab.join.joining')}</p>
      </>,
    )
  }

  if (error) {
    return shell(
      <>
        <h1 className="text-lg font-semibold text-foreground">{t('collab.join.title')}</h1>
        <p role="alert" className="max-w-md text-sm text-muted-foreground">{t(error)}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {error === 'collab.join.errors.guestsDisabled' && (
            <Button asChild><Link to="/auth/signin">{t('collab.join.signIn')}</Link></Button>
          )}
          {!FINAL_ERRORS.has(error) && (
            <Button onClick={retry}>{t('collab.join.tryAgain')}</Button>
          )}
          <Button variant="outline" onClick={() => navigate('/home')}>{t('collab.join.goHome')}</Button>
        </div>
      </>,
    )
  }

  // A guest: ask for a name.
  return shell(
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4 text-left" noValidate>
      <div className="text-center">
        <h1 className="text-lg font-semibold text-foreground">{t('collab.join.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('collab.join.body')}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="collab-join-name">{t('collab.join.nameLabel')}</Label>
        <Input
          id="collab-join-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('collab.join.namePlaceholder')}
          autoComplete="nickname"
          maxLength={40}
          autoFocus
          aria-invalid={nameError}
          aria-describedby={nameError ? 'collab-join-name-error' : undefined}
        />
        {nameError && <p id="collab-join-name-error" role="alert" className="text-xs text-destructive">{t('collab.join.nameInvalid')}</p>}
      </div>
      <Button type="submit" loading={joining} disabled={joining}>{joining ? t('collab.join.joining') : t('collab.join.submit')}</Button>
    </form>,
  )
}
