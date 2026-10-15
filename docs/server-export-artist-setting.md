# Server prompt: `includeFeaturedInTitle` as a user export setting

Paste the block below into the server repo's Claude Code session. The client already ships the option
("Include featured artists in the title (`[ti:]`)") but has to keep it in `localStorage`, because the user
settings schema has no field for it. Once this lands, the client moves the preference to the server so it
follows the user across devices, like the other export settings.

---

## Prompt

Add one boolean to the user's **export settings**: `includeFeaturedInTitle`. It is the persisted form of the
`includeFeaturedInTitle` flag `POST /lyrics/compile/lrc` already accepts (see `docs/featured-artists-api.md` §5).
When on, `[ti:]` in an exported LRC is `Title (feat. A & B)`; when off (the default) it is the plain title and
`[ar:]` alone lists every artist. It must be **backwards compatible**: a client that does not know the field
keeps working and gets the old behaviour.

### 1. Storage and schema

- `src/modules/settings/settings.model.ts`: next to `includeMetadata` / `stripEmptyLines` in the export
  sub-schema add `includeFeaturedInTitle: Boolean`. **No default stored and no migration**: an absent value
  means `false`. Existing documents stay valid as they are.
- `src/graphql/schema/settings.schema.ts`: add `includeFeaturedInTitle: Boolean` to **both** the export settings
  `type` (around the `defaultFilenamePattern` / `includeMetadata` / `stripEmptyLines` fields at ~line 93) and the
  matching `input` (~line 247). Resolvers return `false` when the stored value is missing, so the field is
  effectively non-null for readers while staying optional for writers.
- Whatever builds the effective settings (defaults merge, `updateSettings` partial merge, any allow-list or
  whitelist of settable keys, settings export/import, admin or audit views) must know the new key. Grep for
  `includeMetadata` and `stripEmptyLines` and add the new field **everywhere those two appear**.
- A partial update that omits the field leaves the stored value alone (same rule as the other export settings).
  Only `true` / `false` are valid; reject anything else with the usual validation error.

### 2. Use it in LRC export

In `POST /lyrics/compile/lrc` (`src/modules/lyrics/lyrics.controller.ts`):

- If the request body **has** `includeFeaturedInTitle`, it wins, `true` or `false`. This keeps every existing
  caller and the contract default (`false`) unchanged.
- If it is **omitted** and the request is authenticated, use the user's saved
  `settings.export.includeFeaturedInTitle`. Unauthenticated requests and users without the setting get `false`.
- It only changes `[ti:]` when `metadata.artists` has featured credits, exactly as today.

### 3. Tests

- Settings: reading a user with no stored value returns `false`; `updateSettings` with `true` persists and
  returns `true`; an update that omits it keeps the stored value; a non-boolean is rejected.
- Lyrics: body `true` + featured credits -> `Title (feat. A & B)`; body `false` while the user setting is `true`
  -> plain title; body omitted + user setting `true` -> `(feat. …)`; body omitted + no setting -> plain title;
  unauthenticated + omitted -> plain title.
- Schema: the new field is selectable on the export settings type and accepted in the input.

### 4. Docs

Update `docs/featured-artists-api.md` §5 (the `includeFeaturedInTitle` bullet) to say the default now comes from
the user's export setting when the field is omitted, and list `settings.export.includeFeaturedInTitle` with the
other export settings.

### 5. Acceptance

1. A new user: `settings { export { includeFeaturedInTitle } }` is `false`.
2. After `updateSettings(export: { includeFeaturedInTitle: true })`, the same query is `true` and a compile
   request that omits the flag writes `Title (feat. A & B)` in `[ti:]`.
3. An existing client that never sends the field sees no change.
4. Nothing else in the user's settings changes; no data migration was run.

---

## Client follow-up (after the server ships)

`src/features/artists/include-featured-setting.ts` is the only place that knows where the preference lives.
Switch it to `settings.export.includeFeaturedInTitle`:

1. Add the field to `src/features/settings/settings-defaults.ts` (`export`: `includeFeaturedInTitle: false`), to the
   `export` fields in `src/features/settings/services/settings.service.ts`, and to `src/types/graphql.ts`.
2. Read and write it through `useSettings()` / `updateSetting('export.includeFeaturedInTitle', value)` in
   `useIncludeFeaturedInTitle`; keep `getIncludeFeaturedInTitle` for the download buttons by reading the same setting.
3. One-time migration: if `localStorage['lrc:export:includeFeaturedInTitle']` is `'1'` and the server value is not
   set, save `true` and delete the key.
4. Drop the "kept in this browser" comments in `ExportSettings.tsx` and the store.
