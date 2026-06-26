import { Deque } from '@crimson-carnival/ds-js'

export interface PlaybackEntry {
  url: string
  title: string
  type: 'local' | 'youtube' | 'url'
}

const CAPACITY = 50
const deque = new Deque<PlaybackEntry>()

export function pushPlaybackEntry(entry: PlaybackEntry): void {
  deque.pushBack(entry)
  if (deque.size > CAPACITY) deque.popFront()
}

export function popPrevEntry(): PlaybackEntry | undefined {
  return deque.popBack()
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
