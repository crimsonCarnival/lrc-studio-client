import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { sessionPath } from '@/features/projects/project-path'
import { startSession } from './collab.service'

// Input that could edit the project: keys (typing, the mark key, shortcuts), text input, paste, drop.
const EDIT_EVENTS = ['keydown', 'keypress', 'beforeinput', 'paste', 'drop'] as const

const blockEvent = (e: Event) => {
  e.preventDefault()
  e.stopImmediatePropagation()
}

/**
 * The start flow: save, seed the session, move to its page. While it runs, editing is blocked:
 * the session is seeded from the stored project, so an edit made between the save and the move
 * would be lost. SessionStartShield takes pointer input; these capture listeners (on window,
 * so they run first) swallow keyboard and text input.
 */
export function useSessionStart(publicId: string | undefined, onBeforeStart?: () => Promise<boolean>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!starting) return
    const focused = document.activeElement
    if (focused instanceof HTMLElement) focused.blur()
    for (const type of EDIT_EVENTS) window.addEventListener(type, blockEvent, true)
    return () => {
      for (const type of EDIT_EVENTS) window.removeEventListener(type, blockEvent, true)
    }
  }, [starting])

  const start = async () => {
    if (starting || !publicId) return
    setStarting(true)
    try {
      if (onBeforeStart && !(await onBeforeStart())) {
        toast.error(t('collab.settings.startFailed'))
        setStarting(false)
        return
      }
      await startSession(publicId)
      navigate(sessionPath(publicId))
      setStarting(false)
    } catch {
      toast.error(t('collab.settings.startFailed'))
      setStarting(false)
    }
  }

  return { starting, start }
}
