import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collabColor } from '../collab-color'
import { usePresencePeers } from '../collab-presence-context'
import { extrapolate } from '../useAwareness'

const TICK_MS = 100

/**
 * Where other participants' players are, over a seek bar (waveform or YouTube progress bar).
 * Render inside the bar's positioned box; `duration` is the local track length. Clicking a
 * marker seeks only the local player: nobody else's playback, and nothing in the doc, changes.
 * Their pointer over the waveform is drawn here too, as a faint line.
 */
export function RemotePlayheads({ duration, onSeek }: { duration: number; onSeek?: (time: number) => void }) {
  const { t } = useTranslation()
  const peers = usePresencePeers()
  const animate = duration > 0 && peers.some((p) => p.playhead?.playing)
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    if (!animate) return
    const id = setInterval(() => setTick(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [animate])

  if (!(duration > 0)) return null
  // Only a playing playhead moves, and only then does the tick matter.
  const now = animate ? tick : 0

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {peers.map((p) => {
        const ptr = p.pointer?.area === 'waveform' ? p.pointer : null
        const time = p.playhead ? extrapolate(p.playhead, p.receivedAt, p.playhead.playing ? now : p.receivedAt) : null
        const color = collabColor(p.colorIndex)
        return (
          <div key={p.clientId}>
            {ptr && ptr.time >= 0 && ptr.time <= duration && (
              <span
                aria-hidden
                className="absolute inset-y-0 w-px opacity-50"
                style={{ left: `${(ptr.time / duration) * 100}%`, backgroundColor: color }}
              />
            )}
            {time !== null && time >= 0 && time <= duration && (
              <button
                type="button"
                title={t('collab.presence.playhead', { name: p.name })}
                aria-label={t('collab.presence.playhead', { name: p.name })}
                className={`group pointer-events-auto absolute inset-y-0 w-3 -translate-x-1/2 cursor-pointer ${p.playhead?.playing ? 'transition-[left] duration-100 ease-linear' : ''}`}
                style={{ left: `${(time / duration) * 100}%` }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onSeek?.(time)
                }}
              >
                <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-sm" style={{ backgroundColor: color }} />
                <span
                  className="absolute left-1/2 top-0 hidden -translate-x-1/2 whitespace-nowrap rounded-pill px-1.5 py-0.5 text-[10px] font-semibold leading-none text-background group-hover:block group-focus-visible:block"
                  style={{ backgroundColor: color }}
                >
                  {p.name}
                </span>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
