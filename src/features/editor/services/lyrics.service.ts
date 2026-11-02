import { request } from '@/app/api.client';
import { isApiError } from '@/types';
import type { EditorLine } from '@/features/editor/editor.types';
import { toArtistInput, type ArtistCredit } from '@/features/artists/artist-credits';
import {
  parseLrcSrtFile as localParse,
  compileLRC as localCompileLRC,
  compileSRT as localCompileSRT,
  inferEndTimes as localInferEndTimes,
} from '@/shared/utils/lrc';

// ——— Lyrics (parse/compile) — falls back to local utils when server is unreachable ———

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && err.message === 'Failed to fetch');
}

/**
 * The compile routes cap lines, text and word counts to bound synchronous work on the
 * server; a project past those caps gets a 400 `validation_error` on `lines`. The local
 * compiler has no such limit, so the export still works. Any other validation error is a
 * real bug and must surface.
 */
function exceedsServerLimits(err: unknown): boolean {
  return isApiError(err) && err.status === 400 && err.code === 'validation_error'
    && (err.body as { field?: string } | undefined)?.field === 'lines';
}

interface CompileLrcParams {
  lines: unknown[];
  includeTranslations?: boolean;
  precision?: number | string;
  metadata?: unknown;
  lineEndings?: string;
  includeSecondary?: boolean;
  wordPrecision?: number | string;
  exportTranslationIndex?: number;
  /** Credits for `[ar:]` (sent as `metadata.artists`); the server writes them with the shared formatter. */
  artists?: ArtistCredit[];
  /** `[ti:]` becomes `Title (feat. A & B)`. The server default is off. */
  includeFeaturedInTitle?: boolean;
}

interface CompileSrtParams {
  lines: unknown[];
  duration?: number;
  includeTranslations?: boolean;
  lineEndings?: string;
  srtConfig?: unknown;
  includeSecondary?: boolean;
  exportTranslationIndex?: number;
}

interface InferEndTimesParams {
  lines: unknown[];
  duration?: number;
  srtConfig?: unknown;
  /** The open project, for the admin task log. */
  publicId?: string | null;
}

export const lyricsService = {
  async parse(content: string, filename: string, options: Record<string, unknown> = {}): Promise<unknown> {
    try {
      return await request('/lyrics/parse', {
        method: 'POST',
        body: JSON.stringify({ content, filename, options }),
      });
    } catch (err) {
      if (isNetworkError(err)) {
        const lines = localParse(content, filename, options);
        return { lines, detectedFormat: filename.toLowerCase().endsWith('.srt') ? 'srt' : 'lrc', count: lines.length };
      }
      throw err;
    }
  },

  async compileLrc({ lines, includeTranslations, precision, metadata, lineEndings, includeSecondary, wordPrecision, exportTranslationIndex = 0, artists, includeFeaturedInTitle = false }: CompileLrcParams): Promise<unknown> {
    const hasCredits = !!artists && artists.length > 0;
    try {
      return await request('/lyrics/compile/lrc', {
        method: 'POST',
        body: JSON.stringify({
          lines, includeTranslations, precision, lineEndings, includeSecondary, wordPrecision, exportTranslationIndex,
          // `metadata.artists` overrides `metadata.ar`: the server writes `[ar:]` with the shared formatter.
          metadata: hasCredits ? { ...(metadata as object), artists: toArtistInput(artists) } : metadata,
          includeFeaturedInTitle: hasCredits && includeFeaturedInTitle,
        }),
      });
    } catch (err) {
      // A bare catch here used to swallow a 422 from the server's
      // artist-credit validator too, silently handing back a file that
      // skipped it. Only fall back on a genuine network failure, same as
      // `parse` above.
      if (!isNetworkError(err) && !exceedsServerLimits(err)) throw err;
      const output = localCompileLRC(lines as EditorLine[], includeTranslations, precision as 'hundredths' | 'thousandths' | undefined, metadata as Parameters<typeof localCompileLRC>[3], lineEndings as 'lf' | 'crlf' | undefined, includeSecondary, wordPrecision as string | undefined, exportTranslationIndex, true, {
        artists,
        includeFeaturedInTitle,
      });
      return { output, format: 'lrc' };
    }
  },

  async compileSrt({ lines, duration, includeTranslations, lineEndings, srtConfig, includeSecondary, exportTranslationIndex = 0 }: CompileSrtParams): Promise<unknown> {
    try {
      return await request('/lyrics/compile/srt', {
        method: 'POST',
        body: JSON.stringify({ lines, duration, includeTranslations, lineEndings, srtConfig, includeSecondary, exportTranslationIndex }),
      });
    } catch (err) {
      // Same reasoning as compileLrc: only fall back on a network failure,
      // not on a validation error the server deliberately rejected.
      if (!isNetworkError(err) && !exceedsServerLimits(err)) throw err;
      const output = localCompileSRT(lines as EditorLine[], duration ?? 0, includeTranslations, lineEndings as 'lf' | 'crlf' | undefined, srtConfig as Parameters<typeof localCompileSRT>[4], includeSecondary, exportTranslationIndex);
      return { output, format: 'srt' };
    }
  },

  async inferEndTimes({ lines, duration, srtConfig, publicId }: InferEndTimesParams): Promise<unknown> {
    try {
      return await request('/lyrics/infer-end-times', {
        method: 'POST',
        body: JSON.stringify({ lines, duration, srtConfig, publicId: publicId || undefined }),
      });
    } catch (err) {
      console.warn('Server inferEndTimes failed, falling back to local:', err);
      const result = localInferEndTimes(lines as EditorLine[], duration ?? 0, srtConfig as Parameters<typeof localInferEndTimes>[2]);
      return { lines: result };
    }
  },
};
