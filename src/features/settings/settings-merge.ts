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

type SettingsTree = Record<string, unknown>;

/** Dotted paths of every leaf (scalar, null or array) in a nested settings diff. */
export function leafPaths(tree: SettingsTree, prefix: string[] = []): string[][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? leafPaths(value as SettingsTree, [...prefix, key])
      : [[...prefix, key]]
  );
}

function getAtPath(tree: SettingsTree, path: string[]): unknown {
  return path.reduce<unknown>((node, key) => (node as SettingsTree | undefined)?.[key], tree);
}

function nestAtPath(path: string[], value: unknown): SettingsTree {
  return path.reduceRight<unknown>((acc, key) => ({ [key]: acc }), value) as SettingsTree;
}

function setAtPath(tree: SettingsTree, path: string[], value: unknown): void {
  let cursor = tree;
  for (const key of path.slice(0, -1)) {
    cursor[key] = (cursor[key] && typeof cursor[key] === 'object' ? cursor[key] : {}) as SettingsTree;
    cursor = cursor[key] as SettingsTree;
  }
  cursor[path[path.length - 1]] = value;
}

const MAX_SPLIT_KEYS = 20;

/** graphql-js reports an unknown or mistyped input field as an error on the `$input` variable. */
function isInputRejection(err: unknown): boolean {
  const errors = (err as { graphqlErrors?: { message?: string }[] } | null)?.graphqlErrors;
  return Array.isArray(errors) && errors.some((e) => e.message?.startsWith('Variable "$input"'));
}

export type SettingsPushResult = {
  /** Server-known settings after the push: successful keys updated, failed keys left stale so the next diff re-sends them. */
  snapshot: SettingsTree;
  /** Dotted paths the server rejected (or that never reached it). */
  failed: string[];
};

/**
 * Sends a settings diff. The server validates the whole input as one GraphQL variable, so a
 * single key it rejects fails the request for every other key in it. When the server answered
 * with an input-validation error, the diff is retried one leaf at a time so the good keys
 * still persist; only the rejected ones stay out of the returned snapshot and are retried by
 * the next diff.
 */
export async function pushSettingsChanges(
  changes: SettingsTree,
  current: object,
  snapshot: SettingsTree | null,
  send: (input: SettingsTree) => Promise<unknown>
): Promise<SettingsPushResult> {
  try {
    await send(changes);
    return { snapshot: structuredClone(current) as SettingsTree, failed: [] };
  } catch (err) {
    const paths = leafPaths(changes);
    // Only an input-validation rejection is worth splitting: any other failure (network,
    // auth, server error) would fail every per-key retry the same way. A whole-tree diff
    // (no server snapshot yet) is not split either: ~150 sequential requests would eat the
    // per-IP GraphQL rate limit.
    if (!isInputRejection(err) || paths.length < 2 || paths.length > MAX_SPLIT_KEYS) {
      return { snapshot: snapshot ?? {}, failed: paths.map((p) => p.join('.')) };
    }
    const next = structuredClone(snapshot ?? {});
    const failed: string[] = [];
    for (const path of paths) {
      const value = getAtPath(current as SettingsTree, path);
      try {
        await send(nestAtPath(path, value));
        setAtPath(next, path, structuredClone(value));
      } catch {
        failed.push(path.join('.'));
      }
    }
    return { snapshot: next, failed };
  }
}
