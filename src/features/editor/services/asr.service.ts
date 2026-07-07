import { request } from '@/app/api.client';

export type StampResultDto = {
  index: number;
  timestamp: number | null;
  endTime: number | null;
  confidence: number;
  status: 'matched' | 'partial' | 'low' | 'none';
  words: Array<{ word: string; time: number | null }> | null;
};

export type AsrJobDto = { jobId: string; phase: string; result?: StampResultDto[]; errorCode?: string };

type LinePayload = { index: number; text: string };

export function startStamp(params: { lines: LinePayload[]; uploadId?: string; youtubeUrl?: string; fuzzyTolerance?: number }): Promise<{ jobId: string }> {
  return request<{ jobId: string }>('/asr/stamp', {
    method: 'POST',
    body: JSON.stringify(params),
  }) as Promise<{ jobId: string }>;
}

export function startStampWithFile(params: { lines: LinePayload[]; file: File; fuzzyTolerance?: number }): Promise<{ jobId: string }> {
  const form = new FormData();
  // Order matters: the server reads payload from file.fields, which busboy only
  // populates for fields that arrive BEFORE the file part in the stream.
  form.append('payload', JSON.stringify({ lines: params.lines, fuzzyTolerance: params.fuzzyTolerance }));
  form.append('file', params.file);
  return request<{ jobId: string }>('/asr/stamp/upload', { method: 'POST', body: form }) as Promise<{ jobId: string }>;
}

export function getStampJob(jobId: string): Promise<AsrJobDto> {
  return request<AsrJobDto>(`/asr/jobs/${jobId}`) as Promise<AsrJobDto>;
}

export async function cancelStampJob(jobId: string): Promise<void> {
  await request(`/asr/jobs/${jobId}/cancel`, { method: 'POST' });
}

/**
 * Fetch the cached audio buffer from a completed YouTube ASR job.
 * Returns a Blob suitable for creating an object URL for WaveSurfer.
 */
export async function getJobAudio(jobId: string): Promise<Blob> {
  const res = await fetch(`/api/asr/jobs/${jobId}/audio`, {
    headers: { Authorization: `Bearer ${(await import('@/app/api')).getAccessToken() ?? ''}` },
  });
  if (!res.ok) throw new Error('asr_audio_not_available');
  return res.blob();
}
