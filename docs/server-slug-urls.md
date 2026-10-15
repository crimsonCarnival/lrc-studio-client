# Server prompt: slug URLs, account-name history

Paste the block below into the server repo's Claude Code session. The client side is already
implemented (`src/features/projects/project-path.ts`); this is what the server must provide.

---

## Prompt

We are moving project URLs on the web client from ids to readable slugs that include the owner's
account name. The client is done, but it requests the new `slug` field, so **this server work deploys first**.
Everything below must stay **backwards compatible**: old ids and old account names must keep
working.

### Target URLs (client, for reference)

| Page | URL |
|---|---|
| Public project | `/:accountName/projects/:slug-:publicId` e.g. `/32blunts/projects/radiohead-creep-k3x9a2c7qm` |
| Editor (owner only) | `/:accountName/projects/:slug-:publicId/edit` |
| Legacy (kept, redirects) | `/project/:publicId`, `/project/:publicId/edit` |
| Profile (unchanged) | `/profile/:accountName` |

`publicId` is the existing `nanoid(10)`. Its alphabet includes `-` and `_`, so the client always
takes the **last 10 characters** of the final path segment as the id. The slug and account name in
a URL are cosmetic: the client resolves the project by `publicId` alone and then redirects to the
canonical URL if either is stale. Lookups therefore never go through the slug, so old URLs keep
working after any rename with no slug-history table. The slug is nevertheless **stored** (section 3)
so the server can build URLs (OG, sitemap, emails, notifications) without recomputing, and so the
client can read the canonical value directly.

### 1. Slug algorithm (must match the client exactly)

Shared helper, e.g. `projectSlug(project)` and `projectPath(project)`:

```
slugify(input):
  s = input.normalize('NFD')
  s = s.replace(/[̀-ͯ]/g, '')      // Latin diacritics only. Do NOT strip U+3099/U+309A (kana dakuten)
  s = s.normalize('NFC').toLowerCase()
  s = s.replace(/['’]/g, '')                  // drop apostrophes: "don't" -> "dont"
  s = s.replace(/[^\p{L}\p{N}]+/gu, '-')      // keep letters/digits of ANY script (CJK, Cyrillic, ...)
  s = s.replace(/^-+|-+$/g, '')
  return s.slice(0, 60).replace(/-+$/g, '')

projectSlug(p) = slugify(`${artist} ${songName}`) || slugify(p.title) || ''
  artist = metadata.songArtist || metadata.songArtists[0] || ''
  songName = metadata.songName || ''

projectPath(p) = `/${encodeURIComponent(owner.accountName)}/projects/` +
                 encodeURIComponent(slug ? `${slug}-${publicId}` : publicId)
```

Add unit tests with these cases (they are the client's test vectors too):

- `"Beyoncé — Don't Hurt Yourself!"` -> `beyonce-dont-hurt-yourself`
- `"Canción del Mariachi"` -> `cancion-del-mariachi`
- `"米津玄師 ありがとう"` -> `米津玄師-ありがとう`, and `"が"` -> `が`
- `"!!!"` -> `""`
- `"word ".repeat(40)` -> at most 60 chars, no trailing `-`
- artist `Radiohead`, song `Creep`, id `k3x9a2c7qm` -> `/32blunts/projects/radiohead-creep-k3x9a2c7qm`

### 2. Open Graph and share links

`GET /og/project/:publicId` currently unfurls and redirects to `/project/:publicId`. Change it to:

- Look up the project by `publicId` (unchanged).
- Redirect (302) to the canonical `projectPath(...)` on the web origin, preserving the query
  string (`?s=` seek, `?list=` etc.).
- Use the canonical URL for `og:url` and `<link rel="canonical">`.
- Keep `/og/project/:publicId` itself working forever; it is what existing shared links point at.

Anything else that builds a web URL to a project (sitemap, emails, notification payloads, Discord
or other webhooks) should use `projectPath` too. Grep for `/project/` in the server.

### 3. Stored slug: column, maintenance and migration

- Add `projects.slug` (text, `NOT NULL`, default `''` only during the migration; no unique index:
  the `publicId` suffix already makes the URL unique). Expose it as `Project.slug: String!` in
  GraphQL. The client already requests `slug` on `publicProject`, so **deploy the server before
  the client** or that query fails validation.
- The stored value is exactly `projectSlug(project)` from section 1. Recompute and store it in the
  same transaction whenever `title`, `metadata.songName` or `metadata.songArtist(s)` changes
  (create, update, autosave, clone/fork, import, upload-driven title changes). It is derived data:
  never accept `slug` as client input, and never freeze it on first save.
- Renames need no history: the client resolves by `publicId` and redirects to the current slug.
- **Migration (one-off, idempotent, batched):** fill `slug` for every existing project.
  1. `projectSlug(artist + song)`, else `projectSlug(title)`.
  2. If that is still empty (legacy blank projects): `projectSlug(upload.title || upload.fileName)`,
     else `untitled`. Also set `title` to the same fallback so the row satisfies the new rule
     below (log how many rows needed this).
  3. Process in batches of ~500 by `id`, safe to re-run, and run the same code path the app uses
     so the stored value cannot drift from the algorithm. Then add the `NOT NULL` constraint and
     drop the default.
  4. Add a test that runs the migration over fixtures: accents, CJK, kana with dakuten, empty
     metadata, empty title with an upload name, and a row that is already filled (unchanged).

### 4. A project must be nameable (validation)

An empty project must not be creatable. Rule, on **create and update**, on every entry point
(GraphQL `createProject` / `updateProject`, REST `POST /projects`, autosave, clone, import,
guest-claim, shared-project create):

> `projectSlug(project)` must be non-empty, i.e. at least one of `title`, `metadata.songName`,
> `metadata.songArtist` must contain a letter or digit after trimming and slugging.

- Fail with a GraphQL error `extensions.code = "project_identity_required"` (HTTP 400/422 on REST),
  message "A project needs a title, song name or artist".
- On update, only enforce it when the update would leave the project without an identity, so an
  unrelated edit to a legacy row is never blocked. Clearing the last of title/song/artist is
  rejected.
- Clone/fork inherits the source's title/metadata; if the source is somehow empty, apply the same
  fallback as the migration instead of failing the user's fork.
- Trim and cap server-side too (`title` 200, `songName` 500, `songArtist` 300) to match the client
  inputs.
- Tests: create with `{}`, `{title:'  '}`, `{title:'!!!'}` fails; `{title:'x'}`,
  `{metadata:{songArtist:'Radiohead'}}`, `{metadata:{songName:'Creep'}}` succeed; updating to blank
  fails; updating a legacy row's description succeeds.

### 5. Account-name history (renames must not break links)

Account names can be changed (`lastAccountNameChangedAt` already exists). Today an old name 404s.

- New table, e.g. `account_name_history(user_id, account_name_lower, changed_at)`, with a
  **unique index on `account_name_lower`**. Write a row for the *previous* name whenever
  `updateProfile` changes `accountName`. Backfill nothing.
- **A current account name always wins over a history row.** Reject a new/changed account name
  that collides with someone's *history* row, otherwise an old link would silently land on the
  wrong person. (If you prefer to allow reuse after N days, make that explicit and tested; the
  default is: never reuse.) Release the user's own old names if they switch back to one.
- `publicProfile(accountName: String!)`: resolve case-insensitively against current names, then
  against history. Return the user's **current** `accountName` in the payload. The client
  compares it with the URL param and redirects to `/profile/<current>` when they differ, so no
  server-side redirect is needed.
- Same resolution for `followList(accountName, ...)` and any other query that takes an
  `accountName` from a URL (playlists: `/:accountName/lists/:listId` too).
- Reserved names: confirm sign-up and rename validation already reject every top-level client
  route segment, because `/:accountName/projects/...` and `/:accountName` share the top level:
  `admin, auth, explore, feed, guide, home, leaderboard, library, login, notifications, profile,
  project, projects, register, reset-password, change-password, search, settings, share, u,
  uploads, verify-email, og, api`. Add any that are missing.

### 6. GraphQL

- Add `slug` to `Project` (see section 3) and return it everywhere a project is returned: the
  client prefers it over computing the slug itself.
- `publicProject(publicId)` already returns `user { accountName }` and
  `metadata { songName songArtist }`, which the client needs. Keep them. It must keep resolving by
  `publicId` **regardless of which account name or slug the client had in the URL**.
- Make sure every query the client uses to render project cards also returns what the link needs:
  `publicId`, `title`, `metadata { songName songArtist }` and the owner's `accountName` (feed,
  explore, search, playlists, notifications `target`). Where the owner isn't returned, the client
  falls back to `/project/:publicId`, which still works but costs an extra redirect hop.

### 7. Acceptance checks

1. `GET /og/project/<id>` redirects to `/<owner>/projects/<slug>-<id>` and keeps `?s=12`.
2. Rename the account `a` -> `b`: `publicProfile(accountName: "a")` returns the profile with
   `accountName: "b"`; nobody else can register `a`.
3. Change a project's song name: `slug` is recomputed in the same write, `publicProject(publicId)`
   still resolves by id, and the client's old URL opens it (client redirects).
4. Slug tests above pass; an account name equal to a reserved segment is rejected.
5. After the migration no project has an empty `slug`, and re-running it changes nothing.
6. Creating or blanking a project's title/song/artist is rejected with `project_identity_required`.
