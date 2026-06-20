import { request } from '@/app/api.client';
import type { EditorLine } from './editor.service';
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

interface CompileLrcParams {
  lines: unknown[];
  includeTranslations?: boolean;
  precision?: number | string;
  metadata?: unknown;
  lineEndings?: string;
  includeSecondary?: boolean;
  wordPrecision?: number | string;
  exportTranslationIndex?: number;
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

  async compileLrc({ lines, includeTranslations, precision, metadata, lineEndings, includeSecondary, wordPrecision, exportTranslationIndex = 0 }: CompileLrcParams): Promise<unknown> {
    try {
      return await request('/lyrics/compile/lrc', {
        method: 'POST',
        body: JSON.stringify({ lines, includeTranslations, precision, metadata, lineEndings, includeSecondary, wordPrecision, exportTranslationIndex }),
      });
    } catch {
      const output = localCompileLRC(lines as EditorLine[], includeTranslations, precision as 'hundredths' | 'thousandths' | undefined, metadata as Parameters<typeof localCompileLRC>[3], lineEndings as 'lf' | 'crlf' | undefined, includeSecondary, wordPrecision as string | undefined, exportTranslationIndex);
      return { output, format: 'lrc' };
    }
  },

  async compileSrt({ lines, duration, includeTranslations, lineEndings, srtConfig, includeSecondary, exportTranslationIndex = 0 }: CompileSrtParams): Promise<unknown> {
    try {
      return await request('/lyrics/compile/srt', {
        method: 'POST',
        body: JSON.stringify({ lines, duration, includeTranslations, lineEndings, srtConfig, includeSecondary, exportTranslationIndex }),
      });
    } catch {
      const output = localCompileSRT(lines as EditorLine[], duration ?? 0, includeTranslations, lineEndings as 'lf' | 'crlf' | undefined, srtConfig as Parameters<typeof localCompileSRT>[4], includeSecondary, exportTranslationIndex);
      return { output, format: 'srt' };
    }
  },

  async inferEndTimes({ lines, duration, srtConfig }: InferEndTimesParams): Promise<unknown> {
    try {
      return await request('/lyrics/infer-end-times', {
        method: 'POST',
        body: JSON.stringify({ lines, duration, srtConfig }),
      });
    } catch (err) {
      if (isNetworkError(err)) {
        const result = localInferEndTimes(lines as EditorLine[], duration ?? 0, srtConfig as Parameters<typeof localInferEndTimes>[2]);
        return { lines: result };
      }
      throw err;
    }
  },
};

// ——— Editor operations ———

interface MarkParams {
  lines: unknown[];
  activeLineIndex: number;
  time: number;
  editorMode: string;
  activeWordIndex?: number;
  stampTarget?: string;
  awaitingEndMark?: boolean;
  focusedTimestamp?: number | null;
  settings?: unknown;
}

export const editorService = {
  async mark({ lines, activeLineIndex, time, editorMode, activeWordIndex, stampTarget, awaitingEndMark, focusedTimestamp, settings }: MarkParams): Promise<unknown> {
    return request('/editor/mark', {
      method: 'POST',
      body: JSON.stringify({ lines, activeLineIndex, time, editorMode, activeWordIndex, stampTarget, awaitingEndMark, focusedTimestamp, settings }),
    });
  },

  async bulkShift({ lines, selectedIndices, delta }: { lines: unknown[]; selectedIndices: number[]; delta: number }): Promise<unknown> {
    return request('/editor/bulk-shift', {
      method: 'POST',
      body: JSON.stringify({ lines, selectedIndices, delta }),
    });
  },

  async globalOffset({ lines, delta }: { lines: unknown[]; delta: number }): Promise<unknown> {
    return request('/editor/global-offset', {
      method: 'POST',
      body: JSON.stringify({ lines, delta }),
    });
  },

  async clearAll({ lines, isSrt, isWords }: { lines: unknown[]; isSrt?: boolean; isWords?: boolean }): Promise<unknown> {
    return request('/editor/clear-all', {
      method: 'POST',
      body: JSON.stringify({ lines, isSrt, isWords }),
    });
  },

  async clearLine({ lines, index, isSrt, isWords }: { lines: unknown[]; index: number; isSrt?: boolean; isWords?: boolean }): Promise<unknown> {
    return request('/editor/clear-line', {
      method: 'POST',
      body: JSON.stringify({ lines, index, isSrt, isWords }),
    });
  },

  async detectDuplicates({ lines, threshold }: { lines: unknown[]; threshold?: number }): Promise<unknown> {
    return request('/editor/detect-duplicates', {
      method: 'POST',
      body: JSON.stringify({ lines, threshold }),
    });
  },
};
