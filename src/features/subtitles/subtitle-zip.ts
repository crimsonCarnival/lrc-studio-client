import { strToU8, zipSync } from 'fflate';
import type { SubtitleFile } from './subtitle-bundle';

/** The files in one .zip, at its top level, as UTF-8 text. Loaded on demand: only an export needs it. */
export function zipSubtitleFiles(files: SubtitleFile[]): Uint8Array {
  return zipSync(Object.fromEntries(files.map((f) => [f.name, strToU8(f.content)])));
}
