import { useTranslation } from 'react-i18next'
import type { ChangeEvent } from 'react'
import { Icon } from '@/shared/ui/Icon'
import { usePlayer } from '@/features/player/PlayerContext'
import { collabMediaToRestored, useCollabMedia } from '../useCollabMedia'
import { usePresencePeers } from '../collab-presence-context'
import type { CollabMe, CollabMeta } from '../collab.types'
import type * as Y from 'yjs'

/** Beyond this many seconds apart, two copies of a song are probably not the same recording. */
export const DURATION_MISMATCH_SECONDS = 1

function formatDuration(seconds: number): string {
  const s = Math.floor(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const FILE_BUTTON = 'inline-flex h-9 cursor-pointer items-center rounded-[var(--radius-control)] bg-primary px-3 font-semibold text-primary-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus hover:bg-primary-hover coarse:h-11'

type Props = {
  source: CollabMeta['media']['source']
  /** The owner's loaded media length, null when they are offline or have none. */
  ownerDuration: number | null
  /** This participant's loaded media length, null when none. */
  localDuration: number | null
  /** The player's own file input handler, so a copy loaded here behaves like any other local file. */
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Playback is private to each participant. When the session has no shared media (the owner
 * works from a file on their own device), everyone loads their own copy of the audio; this
 * asks for it and warns when the copy differs in length from the owner's.
 */
export function SharedAudioNotice({ source, ownerDuration, localDuration, onFileChange }: Props) {
  const { t } = useTranslation()
  if (source !== null) return null

  const mismatch = ownerDuration !== null && localDuration !== null
    && Math.abs(ownerDuration - localDuration) > DURATION_MISMATCH_SECONDS

  return (
    <div className="mx-4 mb-2 flex shrink-0 flex-col gap-2 rounded-lg bg-raised px-3 py-2 text-xs text-foreground">
      {localDuration === null && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t('collab.audio.title')}</p>
            <p className="text-muted-foreground">{t('collab.audio.body')}</p>
          </div>
          <label className={FILE_BUTTON}>
            {t('collab.audio.choose')}
            <input type="file" accept="audio/*,video/*" className="sr-only" onChange={onFileChange} />
          </label>
        </div>
      )}
      {mismatch && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p role="alert" className="flex min-w-0 flex-1 items-start gap-1.5 text-warning">
            <Icon name="warning" size={14} className="mt-0.5 shrink-0" />
            <span>{t('collab.audio.mismatch', { local: formatDuration(localDuration), owner: formatDuration(ownerDuration) })}</span>
          </p>
          {/* The wrong file is the likely cause: offer the same input again. */}
          <label className={FILE_BUTTON}>
            {t('collab.audio.chooseOther')}
            <input type="file" accept="audio/*,video/*" className="sr-only" onChange={onFileChange} />
          </label>
        </div>
      )}
    </div>
  )
}

/** Wires the notice to the doc, presence and the local player. Renders inside the session's providers. */
export function SessionAudioNotice({ doc, me }: { doc: Y.Doc | null; me: CollabMe | null }) {
  const media = useCollabMedia(doc)
  const peers = usePresencePeers()
  const { duration, hasMedia, mediaPopoverProps } = usePlayer()
  if (!media || !me) return null
  // The owner is the reference: they have nobody's length to compare against. Role is stamped by the server.
  const ownerDuration = me.role === 'owner' ? null : (peers.find((p) => p.role === 'owner')?.duration ?? null)
  // Media that fails validation is never loaded, so it counts as none: everyone is asked for a copy.
  const source = collabMediaToRestored(media) ? media.source : null
  return (
    <SharedAudioNotice
      source={source}
      ownerDuration={ownerDuration}
      localDuration={hasMedia && duration > 0 ? duration : null}
      onFileChange={mediaPopoverProps.onFileChange}
    />
  )
}
