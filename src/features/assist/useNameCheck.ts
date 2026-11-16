import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { checkNames } from './assist.service';
import type { NameField } from './assist.types';

const DEBOUNCE_MS = 400;
/** Server bounds (assist.schema.ts name-check): a longer value is rejected as a whole. */
const MAX_TITLE = 500;
const MAX_ARTIST = 300;
const MAX_ALBUM = 500;
const FIELD_MAX: Record<NameField, number> = { artist: MAX_ARTIST, album: MAX_ALBUM };

/** Values the person declined, remembered per (field, value) until the page reloads. */
export const keptNames = new Set<string>();
const keptKey = (field: NameField, value: string) => `${field}\u0000${value}`;

type Params = { field: NameField; value: string; title: string; enabled: boolean };

/**
 * Call `check()` on blur and `cancel()` on refocus. `check` waits 400 ms, then asks once per
 * distinct value; empty values (or an empty title, which the server rejects), the value last
 * checked and kept values are skipped. A failed request quietly yields no suggestion and may be
 * retried for the same value.
 */
export function useNameCheck({ field, value, title, enabled }: Params) {
  const [found, setFound] = useState<{ value: string; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastChecked = useRef<string | null>(null);
  const latest = useRef({ field, value, title, enabled });
  useLayoutEffect(() => { latest.current = { field, value, title, enabled }; });

  useEffect(() => () => clearTimeout(timer.current), []);

  const check = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const { field: f, value: v, title: ti, enabled: on } = latest.current;
      const trimmed = v.trim();
      const cleanTitle = ti.trim().slice(0, MAX_TITLE);
      if (!on || !cleanTitle || !trimmed || trimmed === lastChecked.current || keptNames.has(keptKey(f, trimmed))) return;
      lastChecked.current = trimmed;
      checkNames({ title: cleanTitle, [f]: trimmed.slice(0, FIELD_MAX[f]) })
        .then((all) => {
          const hit = all.find((s) => s.field === f && s.suggestion.trim() && s.suggestion !== trimmed);
          if (hit && latest.current.value.trim() === trimmed) setFound({ value: trimmed, text: hit.suggestion });
        })
        .catch(() => { if (lastChecked.current === trimmed) lastChecked.current = null; });
    }, DEBOUNCE_MS);
  }, []);

  // Back in the field means more typing: a pending request for the half-typed value must not go out.
  const cancel = useCallback(() => clearTimeout(timer.current), []);

  const keep = useCallback(() => {
    keptNames.add(keptKey(field, value.trim()));
    setFound(null);
  }, [field, value]);

  // Editing the field makes an old suggestion stale.
  const suggestion = found && found.value === value.trim() ? found.text : null;
  return { suggestion, check, cancel, keep };
}
