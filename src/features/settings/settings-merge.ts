/**
 * Layers stored settings over a base (the defaults). Objects merge key by key; arrays and
 * scalars replace.
 *
 * `null` and `undefined` never replace a value. GraphQL answers `null` for every field the
 * server never stored, so a signed-in user's settings arrive full of nulls for whatever
 * they never changed; letting those through wiped the defaults (`showWaveform: true`
 * became null, which reads as off, while the settings page showed it on).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- settings are an arbitrary nested shape
export function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || target === null) return source ?? target;
  if (typeof source !== 'object' || source === null) return target;

  const output = { ...target };
  Object.keys(source).forEach(key => {
    const value = source[key];
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      output[key] = value; // Arrays overwrite
    } else if (typeof value === 'object') {
      output[key] = deepMerge(target[key], value);
    } else {
      output[key] = value;
    }
  });
  return output;
}
