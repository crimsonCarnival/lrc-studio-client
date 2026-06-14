/**
 * LRC / SRT utilities — format timestamps, compile, parse, download.
 */

import { serializeToRubyMarkup, parseRubyMarkup } from './furigana';

const KNOWN_LRC_META_KEYS = new Set(['ti','ar','al','au','by','lg','re','ve','length','offset','tool','id','hash','album']);

/** No-op kept for call-site compatibility; DB is clean, no migration needed. */
export function migrateLine(line) { return line; }
export function migrateLines(lines) { return lines; }

/**
 * Splits an artist string on commas, feat./ft./featuring, ×, &, "and", "vs", "/".
 * Preserves original casing. Returns deduplicated, non-empty names.
 */
export function splitArtists(raw) {
  if (!raw?.trim()) return [];
  const seen = new Set();
  const result = [];
  for (const part of raw.split(/\s*(?:,|feat\.?|ft\.?|featuring|×|\bx\b|&|\band\b|\/|vs\.?)\s*/i)) {
    const value = part.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function parseSectionText(raw) {
  const colonIdx = raw.indexOf(':');
  if (colonIdx !== -1) {
    return { label: raw.slice(0, colonIdx).trim(), singer: raw.slice(colonIdx + 1).trim() || undefined };
  }
  return { label: raw.trim(), singer: undefined };
}

/**
 * Build the secondary (furigana/romaji) text for a line.
 * If the line has words with readings, serialize to {word|reading} markup.
 * If the line has secondaryWords with timestamps, serialize with <mm:ss.xx> tokens.
 * Otherwise fall back to line.secondary.
 * @param {{ secondary?: string, secondaryWords?: Array, words?: Array }} line
 * @returns {string|null}
 */
function buildSecondaryText(line, wordPrecision) {
  if (line.secondaryWords?.length && line.secondaryWords.some(w => w.time != null)) {
    return formatWordsToLrc(line.secondaryWords, wordPrecision);
  }
  if (line.words?.some(w => w.reading)) {
    return serializeToRubyMarkup(line.words);
  }
  return line.secondary || null;
}

/**
 * Format an array of {word, time} into LRC inline word-timestamp text.
 * E.g. "<00:05.12>Hello <00:05.56>world"
 */
function formatWordsToLrc(words, precision = 'hundredths') {
  const cjk = (ch) => { const c = ch?.codePointAt(0) ?? 0; return (c >= 0x3000 && c <= 0x9FFF) || (c >= 0xF900 && c <= 0xFAFF) || (c >= 0xFF00 && c <= 0xFFEF) || (c >= 0x20000 && c <= 0x2FA1F); };
  return words.map((w, i, arr) => {
    const ts = w.time != null ? formatWordTimestamp(w.time, precision) : '';
    const token = `${ts}${w.word}`;
    const next = arr[i + 1];
    if (!next) return token;
    const lastChar = w.word.slice(-1);
    const firstChar = next.word.slice(0, 1);
    return cjk(lastChar) || cjk(firstChar) ? token : token + ' ';
  }).join('');
}

function formatWordTimestamp(seconds, precision = 'hundredths') {
  if (seconds == null) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mm = String(mins).padStart(2, '0');
  const decimals = precision === 'thousandths' ? 3 : 2;
  const padLen = decimals + 3;
  const ss = secs.toFixed(decimals).padStart(padLen, '0');
  return `<${mm}:${ss}>`;
}

/**
 * Formats a number of seconds into LRC timestamp format [mm:ss.xx] or [mm:ss.xxx]
 * @param {number} seconds
 * @param {'hundredths'|'thousandths'} precision
 * @returns {string}
 */
export function formatTimestamp(seconds, precision = 'hundredths') {
  if (seconds == null || isNaN(seconds) || seconds < 0) {
    return precision === 'thousandths' ? '00:00.000' : '00:00.00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mm = String(mins).padStart(2, '0');
  const decimals = precision === 'thousandths' ? 3 : 2;
  const padLen = decimals + 3; // "ss." + decimals
  const ss = secs.toFixed(decimals).padStart(padLen, '0');
  return `${mm}:${ss}`;
}


/**
 * Sanitizes a string for use inside LRC bracket tags.
 * @param {string} s
 * @returns {string}
 */
function sanitizeLrcTag(s) {
  if (typeof s !== 'string') return String(s || '');
  return s.replace(/[[\]]/g, '');
}

/**
 * Compiles an array of { text, timestamp } into a valid .lrc string
 * @param {Array} lines
 * @param {boolean} includeTranslations
 * @param {'hundredths'|'thousandths'} precision
 * @param {object} metadata
 * @param {'lf'|'crlf'} lineEndings
 * @returns {string}
 */

export function compileLRC(lines, includeTranslations = false, precision = 'hundredths', metadata = {}, lineEndings = 'lf', includeSecondary = false, wordPrecision, exportTranslationIndex = 0, includeSections = true) {
  const wp = wordPrecision || precision;
  let header = '';
  if (metadata.ti) header += `[ti:${sanitizeLrcTag(metadata.ti)}]\n`;
  if (metadata.ar) header += `[ar:${sanitizeLrcTag(metadata.ar)}]\n`;
  if (metadata.al) header += `[al:${sanitizeLrcTag(metadata.al)}]\n`;
  if (metadata.au) header += `[au:${sanitizeLrcTag(metadata.au)}]\n`;
  if (metadata.by) header += `[by:${sanitizeLrcTag(metadata.by)}]\n`;
  if (metadata.lg) header += `[lg:${sanitizeLrcTag(metadata.lg)}]\n`;
  if (metadata.re) header += `[re:${sanitizeLrcTag(metadata.re)}]\n`;
  if (metadata.ve) header += `[ve:${sanitizeLrcTag(metadata.ve)}]\n`;

  const body = lines
    .flatMap((line) => {
      // Section marker
      if (line.type === 'section') {
        if (!includeSections) return [];
        const isRoot = line.depth === 0;
        const prefix = isRoot ? '##' : '#';
        const singerPart = line.singers?.length
          ? ': ' + line.singers.join(' & ')
          : line.singer ? ': ' + line.singer : '';
        const comment = `${prefix} ${line.label}${singerPart}`;
        if (line.timestamp != null) return [`[${formatTimestamp(line.timestamp, precision)}] ${comment}`];
        return [comment];
      }

      if (line.timestamp != null) {
        const ts = line.timestamp;
        const result = [];
        let mainLyric = null;
        if (line.words?.some(w => w.reading)) {
          mainLyric = serializeToRubyMarkup(line.words);
        } else if (line.words?.length) {
          mainLyric = formatWordsToLrc(line.words, wp);
        } else {
          mainLyric = line.text;
        }
        result.push(`[${formatTimestamp(ts, precision)}] ${mainLyric}`);

        if (includeSecondary && line.secondary) {
          result.push(`[${formatTimestamp(ts, precision)}] ${line.secondary}`);
        }

        // Translation: use translations array, fall back to legacy translation field
        if (includeTranslations) {
          const translationText = line.translations?.[exportTranslationIndex]?.text ?? null;
          if (translationText) result.push(`[${formatTimestamp(ts, precision)}] ${translationText}`);
        }
        return result;
      }
      return [line.text || ''];
    })
    .join('\n');

  let result = header + body;
  return lineEndings === 'crlf' ? result.replace(/\n/g, '\r\n') : result;
}

/**
 * Parses inline word-level timestamp tokens from LRC line text.
 * Format: <mm:ss.xx>word or <mm:ss.xxx>word
 * @param {string} text
 * @returns {Array<{word: string, time: number}>}
 */
function parseWordTimestamps(text) {
  const re = /<(\d{1,2}):(\d{2}\.\d{2,3})>([^<]*)/g;
  const words = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    const time = parseInt(match[1], 10) * 60 + parseFloat(match[2]);
    const word = match[3].trimEnd();
    if (word) words.push({ word, time });
  }
  // Split CJK word groups into individual characters, distributing timestamps.
  // Latin/ASCII runs are kept as whole tokens.
  const hasCJK = words.some(w => /[\u3000-\u9FFF\uF900-\uFAFF]/.test(w.word));
  if (hasCJK && words.length > 0) {
    const expanded = [];
    const isCJKChar = (ch) => /[\u3000-\u9FFF\uF900-\uFAFF]/.test(ch);
    words.forEach((w, wi) => {
      const codePoints = [...w.word].filter(ch => ch.trim());
      // If the token has no CJK characters, keep it as-is (e.g. Latin words)
      if (!codePoints.some(isCJKChar)) {
        expanded.push(w);
        return;
      }
      // Single character — push directly
      if (codePoints.length <= 1) {
        expanded.push(w);
        return;
      }
      // Mixed token: split CJK chars individually, keep Latin runs intact
      const nextTime = words[wi + 1]?.time;
      const duration = nextTime != null ? nextTime - w.time : null;
      // Build sub-tokens (CJK individually, Latin as runs)
      const subTokens = [];
      let ci = 0;
      while (ci < codePoints.length) {
        const ch = codePoints[ci];
        if (isCJKChar(ch)) {
          subTokens.push(ch);
          ci++;
        } else {
          let j = ci;
          while (j < codePoints.length && !isCJKChar(codePoints[j])) j++;
          subTokens.push(codePoints.slice(ci, j).join(''));
          ci = j;
        }
      }
      subTokens.forEach((token, si) => {
        const t = duration != null
          ? w.time + (duration * si / subTokens.length)
          : w.time + si * 0.1;
        expanded.push({ word: token, time: parseFloat(t.toFixed(3)) });
      });
    });
    return expanded;
  }
  return words;
}



/**
 * Triggers a browser download of the given text content as a file.
 * @param {string} content
 * @param {string} filename
 */
export function downloadLRC(content, filename = 'lyrics.lrc') {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats a number of seconds into SRT timestamp format HH:MM:SS,mmm
 * @param {number} seconds
 * @returns {string}
 */
function formatSrtTimestamp(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '00:00:00,000';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  const h = String(hrs).padStart(2, '0');
  const m = String(mins).padStart(2, '0');
  const s = String(secs).padStart(2, '0');
  const msStr = String(ms).padStart(3, '0');
  return `${h}:${m}:${s},${msStr}`;
}

/**
 * Compiles an array of { text, timestamp } into a valid .srt string
 * @param {Array} lines
 * @param {number} duration
 * @param {boolean} includeTranslations
 * @param {'lf'|'crlf'} lineEndings
 * @param {object} srtConfig
 * @returns {string}
 */

export function compileSRT(lines, duration, includeTranslations = false, lineEndings = 'lf', srtConfig = {}, includeSecondary = false, exportTranslationIndex = 0) {
  const minGap = srtConfig.minSubtitleGap || 0.05;
  const defaultDur = srtConfig.defaultSubtitleDuration || 5;

  // Section markers are skipped in SRT
  const synced = lines.filter((l) => l.timestamp != null && l.type !== 'section');
  if (synced.length === 0) return '';

  const body = synced.map((line, i) => {
    const start = line.timestamp;
    let end;
    if (line.endTime != null) {
      end = line.endTime;
    } else {
      const nextLine = synced[i + 1];
      if (nextLine && nextLine.timestamp != null) {
        end = Math.max(start + minGap, nextLine.timestamp - minGap);
      } else if (duration) {
        end = Math.min(start + defaultDur, duration);
      } else {
        end = start + defaultDur;
      }
    }

    // Build all lines for this timestamp
    const linesForThisTimestamp = [];
    // Main lyric
    linesForThisTimestamp.push(line.text);
    // Secondary lyric
    if (includeSecondary) {
      const sec = buildSecondaryText(line);
      if (sec) linesForThisTimestamp.push(sec);
    }
    // Translation
    if (includeTranslations) {
      const translationText = line.translations?.[exportTranslationIndex]?.text ?? null;
      if (translationText) linesForThisTimestamp.push(translationText);
    }

    return `${i + 1}\n${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}\n${linesForThisTimestamp.join('\n')}\n`;
  }).join('\n');

  return lineEndings === 'crlf' ? body.replace(/\n/g, '\r\n') : body;
}

const generateId = () => {
  try {
    return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11);
  } catch {
    return Math.random().toString(36).slice(2, 11);
  }
};

/**
 * Parses an LRC or SRT file into an array of line objects.
 * @param {string} content
 * @param {string} filename
 * @returns {Array<{text: string, timestamp: number|null, endTime?: number, secondary?: string, translation?: string, id: string}>}
 */
export function parseLrcSrtFile(content, filename, options = {}) {
  const isSrt = filename.toLowerCase().endsWith('.srt');
  const parsedLines = [];
  
  if (isSrt) {
    const blocks = content.replace(/\r\n/g, '\n').split('\n\n');
    blocks.forEach(block => {
      const parts = block.trim().split('\n');
      if (parts.length >= 3) {
        const timeMatch = parts[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        if (timeMatch) {
          const h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const s = parseInt(timeMatch[3], 10);
          const ms = parseInt(timeMatch[4], 10);
          const timestamp = h * 3600 + m * 60 + s + ms / 1000;
          
          const eh = parseInt(timeMatch[5], 10);
          const em = parseInt(timeMatch[6], 10);
          const es = parseInt(timeMatch[7], 10);
          const ems = parseInt(timeMatch[8], 10);
          const endTime = eh * 3600 + em * 60 + es + ems / 1000;
          
          // SRT multi-line text is joined as plain text by default
          const textLines = parts.slice(2);
          const text = textLines.join('\n');

          parsedLines.push({ text, timestamp, endTime, secondary: '', translation: '', id: generateId() });
        }
      }
    });
  } else {
    const lrcLines = content.replace(/\r\n/g, '\n').split('\n');
    lrcLines.forEach(line => {
      let remaining = line.trim();
      const tsStepRe = /^\[(\d{1,2}):(\d{2}\.\d{2,3})\]/;
      const collectedTs = [];
      let step;
      while ((step = remaining.match(tsStepRe))) {
        collectedTs.push(parseInt(step[1], 10) * 60 + parseFloat(step[2]));
        remaining = remaining.slice(step[0].length);
      }
      if (collectedTs.length > 0) {
        const rawText = remaining.trim();
        collectedTs.sort((a, b) => a - b);
        const [primary] = collectedTs;

        // Root section: ## Label or ## Label: Singer(s)
        if (rawText.startsWith('##')) {
          const inner = rawText.slice(2).trim();
          const { label, singer } = parseSectionText(inner);
          if (label) {
            const singers = singer ? singer.split(/\s*[&,]\s*/).map(s => s.trim()).filter(Boolean) : undefined;
            parsedLines.push({ type: 'section', depth: 0, label, singers, timestamp: primary, id: generateId() });
            return;
          }
        }

        // Child section: # Label or # Label: Singer
        if (rawText.startsWith('#')) {
          const inner = rawText.slice(1).trim();
          const { label, singer } = parseSectionText(inner);
          if (label) {
            const singers = singer ? singer.split(/\s*[&,]\s*/).map(s => s.trim()).filter(Boolean) : undefined;
            parsedLines.push({ type: 'section', depth: 1, label, singers, timestamp: primary, id: generateId() });
            return;
          }
        }

        const words = parseWordTimestamps(rawText);
        const text = rawText.replace(/<\d{1,2}:\d{2}\.\d{2,3}>/g, '').trim();
        const entry = { text, timestamp: primary, id: generateId() };
        if (words.length > 0) entry.words = words;
        parsedLines.push(entry);
      } else if (remaining !== '') {
        // No timestamp: root section ## or child section #
        if (remaining.startsWith('##')) {
          const inner = remaining.slice(2).trim();
          const { label, singer } = parseSectionText(inner);
          if (label) {
            const singers = singer ? singer.split(/\s*[&,]\s*/).map(s => s.trim()).filter(Boolean) : undefined;
            parsedLines.push({ type: 'section', depth: 0, label, singers, timestamp: null, id: generateId() });
            return;
          }
        }
        if (remaining.startsWith('#')) {
          const inner = remaining.slice(1).trim();
          const { label, singer } = parseSectionText(inner);
          if (label) {
            const singers = singer ? singer.split(/\s*[&,]\s*/).map(s => s.trim()).filter(Boolean) : undefined;
            parsedLines.push({ type: 'section', depth: 1, label, singers, timestamp: null, id: generateId() });
            return;
          }
        }
        // [Label] or [Label: Singer] with non-metadata key
        const bracketSection = remaining.match(/^\[([^:[\]\n]+?)(?::\s*([^\]\n]*))?\]$/);
        if (bracketSection && !KNOWN_LRC_META_KEYS.has(bracketSection[1].trim().toLowerCase())) {
          const label = bracketSection[1].trim();
          const singer = bracketSection[2]?.trim() || undefined;
          const singers = singer ? singer.split(/\s*(?:&|,|\band\b)\s*/i).map(s => s.trim()).filter(Boolean) : undefined;
          parsedLines.push({ type: 'section', depth: 1, label, singers, timestamp: null, id: generateId() });
          return;
        }
        // Plain text line (skip known LRC metadata tags)
        if (!/^\[[^\]]*:[^\]]*\]/.test(remaining)) {
          parsedLines.push({ text: remaining.trim(), timestamp: null, id: generateId() });
        }
      } else if (options.preserveEmptyLines) {
        parsedLines.push({ text: '', timestamp: null, id: generateId() });
      }
    });
  }
  
  // Merge duplicate timestamps (for LRC bilingual files) using a Map for O(n) lookup
  const mergedLines = [];
  const timestampMap = new Map();

  for (const line of parsedLines) {
    // Section markers are never merged — push directly
    if (line.type === 'section' || line.timestamp == null) {
      mergedLines.push(line);
      continue;
    }

    const key = Math.round(line.timestamp * 100); // group within 0.01s
    if (timestampMap.has(key)) {
      const existingIndex = timestampMap.get(key);
      const existing = mergedLines[existingIndex];
      // Skip merge if existing is a section marker
      if (existing.type === 'section') {
        mergedLines.push({ ...line });
        continue;
      }
      if (!existing.secondary) {
        // 2nd same-ts line: treat as secondary (romaji / furigana markup)
        const secWords = parseWordTimestamps(line.text);
        if (secWords.length > 0) {
          existing.secondaryWords = secWords;
          existing.secondary = line.text.replace(/<\d{1,2}:\d{2}\.\d{2,3}>/g, '').trim();
        } else if (/\{[^|{]+\|[^}]+\}/.test(line.text)) {
          const { plainText, segments } = parseRubyMarkup(line.text);
          existing.secondary = plainText;
          if (!existing.words?.length) {
            existing.words = segments.flatMap(s => {
              if (!s.text.trim()) return [];
              return [{ word: s.text, reading: s.reading || undefined, time: null }];
            });
          } else {
            const oldWords = [...existing.words];
            const newWords = [];
            let oldIdx = 0;
            for (const seg of segments) {
              const segText = seg.text;
              if (!segText) continue;
              let consumed = '';
              let firstTime = null;
              while (oldIdx < oldWords.length && consumed.length < segText.length) {
                const w = oldWords[oldIdx];
                if (firstTime === null) firstTime = w.time;
                consumed += w.word;
                oldIdx++;
              }
              newWords.push({ word: segText, reading: seg.reading || undefined, time: firstTime });
            }
            if (oldIdx < oldWords.length) newWords.push(...oldWords.slice(oldIdx));
            existing.words = newWords;
          }
        } else {
          existing.secondary = line.text;
        }
      } else {
        // 3rd+ same-ts line: push to translations array
        if (!existing.translations) existing.translations = [];
        existing.translations.push({ text: line.text });
      }
    } else {
      const idx = mergedLines.length;
      mergedLines.push({ ...line });
      timestampMap.set(key, idx);
    }
  }

  return mergedLines;
}

/**
 * Infers end times for lines that don't have them.
 * Uses the next line's start time (minus a tiny gap) or a default duration for the last line.
 * @param {Array} lines
 * @param {number} duration - total media duration
 * @param {object} srtConfig
 * @returns {Array} new array with endTime populated
 */
export function inferEndTimes(lines, duration, srtConfig = {}) {
  const minGap = srtConfig.minSubtitleGap || 0.05;
  const defaultDur = srtConfig.defaultSubtitleDuration || 5;

  return lines.map((line, i) => {
    // If already has an endTime, keep it
    if (line.endTime != null) return line;
    // If no start time, nothing to infer
    if (line.timestamp == null) return line;

    // Find the next synced line after this one
    let nextStart = null;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].timestamp != null) {
        nextStart = lines[j].timestamp;
        break;
      }
    }

    let endTime;
    if (nextStart != null) {
      endTime = Math.max(line.timestamp + minGap, nextStart - minGap);
    } else if (duration) {
      // Cap at start + defaultDur, but not beyond the track duration
      endTime = Math.min(line.timestamp + defaultDur, duration);
    } else {
      endTime = line.timestamp + defaultDur;
    }

    return { ...line, endTime };
  });
}
