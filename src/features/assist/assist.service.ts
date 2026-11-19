import { request } from '@/app/api.client';
import type { Description, HeavyUsage, NameField, NameSuggestion, SingerLabel, TitleSplit } from './assist.types';

const post = <T>(path: string, body: unknown) =>
  request<T>(`/assist/${path}`, { method: 'POST', body: JSON.stringify(body) });

/** `field` limits the check to that field; the other value (the artist of an album) is context. */
export async function checkNames(input: { title: string; artist?: string; album?: string; field?: NameField }): Promise<NameSuggestion[]> {
  const res = await post<{ suggestions: NameSuggestion[] }>('name-check', input);
  return res?.suggestions ?? [];
}

export async function splitTitle(title: string): Promise<TitleSplit> {
  const res = await post<TitleSplit>('title-split', { title });
  if (!res) throw new Error('assist_empty');
  return res;
}

export async function describeSong(input: { title?: string; artist?: string; lines: string[] }): Promise<Description> {
  const res = await post<Description>('describe', input);
  if (!res) throw new Error('assist_empty');
  return res;
}

export async function romanize(input: { lines: string[]; language?: string }): Promise<{ lines: string[]; usage: HeavyUsage }> {
  const res = await post<{ lines: string[]; usage: HeavyUsage }>('romanize', input);
  if (!res) throw new Error('assist_empty');
  return res;
}

export async function labelSingers(input: { lines: string[]; roster: string[] }): Promise<{ labels: SingerLabel[]; usage: HeavyUsage }> {
  const res = await post<{ labels: SingerLabel[]; usage: HeavyUsage }>('singers', input);
  if (!res) throw new Error('assist_empty');
  return res;
}

export async function getUsage(): Promise<HeavyUsage> {
  const res = await request<HeavyUsage>('/assist/usage');
  if (!res) throw new Error('assist_empty');
  return res;
}
