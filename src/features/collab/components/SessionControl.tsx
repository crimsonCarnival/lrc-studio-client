import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@ui/button'
import { Icon } from '@/shared/ui/Icon'
import { LogoLoader } from '@ui/LogoLoader'
import { sessionPath } from '@/features/projects/project-path'
import type { EditorLine } from '@/features/editor/editor.types'
import { startSession } from '../collab.service'
import type { CollabLockInput } from '../collab.types'
import { SessionSettingsModal } from './SessionSettingsModal'

/** Owner-only: which project the control is for, whether its session is live, and what to do after ending it. */
export type SessionOwnerControl = {
  publicId: string
  live: boolean
  onEnded: () => void
}

type Props = {
  owner: SessionOwnerControl
  collab?: CollabLockInput
  lines: EditorLine[]
  /** Saves pending solo edits first: the session starts from the stored project. */
  onBeforeStart?: () => void | Promise<void>
}

/** "Start session" on a saved project, "Manage session" (and its modal) inside one. */
export function SessionControl({ owner, collab, lines, onBeforeStart }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [open, setOpen] = useState(false)

  const start = async () => {
    setStarting(true)
    try {
      await onBeforeStart?.()
      await startSession(owner.publicId)
      navigate(sessionPath(owner.publicId))
    } catch {
      toast.error(t('collab.settings.startFailed'))
      setStarting(false)
    }
  }

  const label = owner.live ? t('collab.settings.manage') : starting ? t('collab.settings.starting') : t('collab.settings.start')

  return (
    <>
      <Button
        variant="outline"
        disabled={starting}
        // The text is hidden below `sm`; the icon alone needs a name.
        aria-label={label}
        onClick={() => (owner.live ? setOpen(true) : void start())}
        className="ml-2 h-9 lg:h-9 coarse:h-11 px-3.5 lg:px-3.5 gap-2 rounded-lg shrink-0 text-[13px] lg:text-[13px] font-semibold"
      >
        {starting ? <LogoLoader size={16} /> : <Icon name="group" size={16} />}
        <span className="hidden sm:inline whitespace-nowrap">{label}</span>
      </Button>
      {owner.live && (
        <SessionSettingsModal
          open={open}
          onOpenChange={setOpen}
          publicId={owner.publicId}
          provider={collab?.provider ?? null}
          locks={collab?.locks ?? {}}
          lines={lines}
          onEnded={owner.onEnded}
        />
      )}
    </>
  )
}
