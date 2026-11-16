import type { PrimaryGenre } from '@/features/editor/constants/genre-tags';

export type NameField = 'artist' | 'album';

export type NameSuggestion = { field: NameField; suggestion: string; confidence: number };

export type TitleSplit = { songName: string; artists: string[]; album: string | null };

export type Description = { language: string | null; genre: PrimaryGenre | null; tags: string[] };

export type SingerLabel = { lineIndex: number; singers: string[] };

/** `resetsAt` is an ISO timestamp for the next UTC day. */
export type HeavyUsage = { used: number; cap: number; remaining: number; resetsAt: string };
