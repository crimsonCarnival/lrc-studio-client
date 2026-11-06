import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { collabColor } from '../collab-color'
import type { CollabPeer } from '../collab.types'
import { usePresencePeers } from '../collab-presence-context'
import { findRow } from './find-row'

type LinesPointer = Extract<NonNullable<CollabPeer['pointer']>, { area: 'lines' }>
// The name tag sits this far right of the arrow tip (Tailwind ml-3).
const LABEL_OFFSET_PX = 12
const onLines = (p: CollabPeer): p is CollabPeer & { pointer: LinesPointer } => p.pointer?.area === 'lines'

/**
 * Other participants' pointers over the lyric rows. Render inside the list's positioned
 * content box (the element the rows are absolutely placed in).
 *
 * A pointer is anchored to a line and a fraction of that row, so it stays on the right
 * lyric whatever size the other person's window is. Pixel positions are resolved here from
 * the row's own element and written straight to the DOM, so scrolling or a re-measure moves
 * them without a React render. A line the virtualiser has unmounted has no element, so its
 * pointer is hidden until the row scrolls back.
 */
export function RemotePointers({ scrollRef }: { scrollRef: RefObject<HTMLElement | null> }) {
  const { t } = useTranslation()
  const peers = usePresencePeers().filter(onLines)
  const layerRef = useRef<HTMLDivElement>(null)

  const place = () => {
    const layer = layerRef.current
    if (!layer) return
    const layerRect = layer.getBoundingClientRect()
    for (const el of layer.querySelectorAll<HTMLElement>('[data-pointer-of]')) {
      const row = findRow(layer, el.dataset.pointerLine ?? '')
      if (!row) {
        el.style.visibility = 'hidden'
        continue
      }
      const r = row.getBoundingClientRect()
      const x = r.left - layerRect.left + Number(el.dataset.x) * r.width
      const y = r.top - layerRect.top + Number(el.dataset.y) * r.height
      el.style.transform = `translate(${x}px, ${y}px)`
      // Near the right edge the name tag goes to the left of the arrow, so it stays inside
      // the (clipped) layer instead of being cut off.
      const label = el.querySelector<HTMLElement>('[data-pointer-label]')
      if (label) {
        const flip = x + LABEL_OFFSET_PX + label.offsetWidth > layerRect.width
        label.style.transform = flip ? `translateX(calc(-100% - ${LABEL_OFFSET_PX + 2}px))` : ''
      }
      el.style.visibility = 'visible'
    }
  }
  const placeRef = useRef(place)
  useLayoutEffect(() => {
    placeRef.current = place
    place()
  })

  useLayoutEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        placeRef.current()
      })
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [scrollRef])

  return (
    // Clipped: whatever a peer sends, a pointer never widens the list into a horizontal scroll.
    <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {peers.map((p) => (
        <div
          key={p.clientId}
          data-pointer-of={p.clientId}
          data-pointer-line={p.pointer.lineId}
          data-x={p.pointer.xRatio}
          data-y={p.pointer.yRatio}
          title={t('collab.presence.pointer', { name: p.name })}
          className="invisible absolute left-0 top-0 transition-transform duration-75 ease-linear"
          style={{ color: collabColor(p.colorIndex) }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" className="drop-shadow">
            <path d="M1 1l4.5 11 1.8-4.2L12 6z" fill="currentColor" />
          </svg>
          <span
            data-pointer-label
            className="-mt-1 ml-3 block max-w-40 truncate whitespace-nowrap rounded-pill px-1.5 py-0.5 text-[10px] font-semibold leading-none text-background"
            style={{ backgroundColor: collabColor(p.colorIndex) }}
          >
            {p.name}
          </span>
        </div>
      ))}
    </div>
  )
}
