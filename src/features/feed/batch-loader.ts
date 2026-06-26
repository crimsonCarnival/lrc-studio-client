import { Queue } from '@crimson-carnival/ds-js'

export type LoadJobType = 'project' | 'user' | 'activity'

export interface LoadJob {
  id: string
  type: LoadJobType
  resolve: (loaded: boolean) => void
}

const BATCH_SIZE = 20
const DEBOUNCE_MS = 50

const queue = new Queue<LoadJob>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null

type BatchHandler = (jobs: LoadJob[]) => Promise<void>
let handler: BatchHandler | null = null

export function registerBatchHandler(fn: BatchHandler): void {
  handler = fn
}

export function enqueueLoad(job: LoadJob): void {
  queue.enqueue(job)
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    debounceTimer = null
    if (!handler || queue.isEmpty()) return
    const batch: LoadJob[] = []
    while (!queue.isEmpty() && batch.length < BATCH_SIZE) {
      batch.push(queue.dequeue()!)
    }
    await handler(batch)
  }, DEBOUNCE_MS)
}
