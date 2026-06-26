import { Queue } from '@crimson-carnival/ds-js';
import type { UpdateProjectInput } from '@/types';

export interface SyncJob {
  projectId: string;
  payload: UpdateProjectInput;
  timestamp: number;
}

const MAX_JOBS = 100;

const queue = new Queue<SyncJob>();

export function enqueueSyncJob(job: SyncJob): void {
  if (queue.size >= MAX_JOBS) {
    // Drop oldest to make room
    queue.dequeue();
    console.warn('[sync-queue] overflow: oldest save dropped');
  }
  queue.enqueue(job);
}

export function getSyncQueueSize(): number {
  return queue.size;
}

export function isSyncQueueEmpty(): boolean {
  return queue.isEmpty();
}

export async function flushSyncQueue(
  patchFn: (projectId: string, payload: UpdateProjectInput) => Promise<unknown>
): Promise<void> {
  while (!queue.isEmpty()) {
    const job = queue.peek()!;
    // If patchFn throws, propagate — the job stays in queue for next reconnect
    await patchFn(job.projectId, job.payload);
    queue.dequeue();
  }
}
