import { Deque } from '@crimson-carnival/ds-js'

export interface PlaybackEntry {
  url: string
  title: string
  type: 'local' | 'youtube' | 'url'
}

const CAPACITY = 50
const deque = new Deque<PlaybackEntry>()

let navigatingBack = false

export function pushPlaybackEntry(entry: PlaybackEntry): void {
  if (navigatingBack) {
    navigatingBack = false
    return  // skip re-push during back navigation — track is already in history
  }
  deque.pushBack(entry)
  if (deque.size > CAPACITY) deque.popFront()
}

export function popPrevEntry(): PlaybackEntry | undefined {
  if (deque.size < 2) return undefined
  navigatingBack = true
  deque.popBack()              // remove current from history
  return deque.peekBack()      // peek the previous — do NOT pop it
}

export function peekCurrentEntry(): PlaybackEntry | undefined {
  return deque.peekBack()
}

export function getPlaybackHistorySize(): number {
  return deque.size
}

export function clearPlaybackHistory(): void {
  deque.clear()
}
