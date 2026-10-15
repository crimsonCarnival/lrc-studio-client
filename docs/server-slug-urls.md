# Server prompt: slug URLs, account-name history

Paste the block below into the server repo's Claude Code session. The client side is already
implemented (`src/features/projects/project-path.ts`); this is what the server must provide.

---

## Prompt

We are moving project URLs on the web client from ids to readable slugs that include the owner's
account name. The client is done and ships first, so everything below must stay **backwards
compatible**: old ids and old account names must keep working.

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
canonical URL if either is stale. That is what makes slug history work, so **do not add slug
columns or a slug lookup** for projects.

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

### 3. Account-name history (renames must not break links)

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

### 4. GraphQL

- `publicProject(publicId)` already returns `user { accountName }` and
  `metadata { songName songArtist }`, which the client needs. Keep them. It must keep resolving by
  `publicId` **regardless of which account name or slug the client had in the URL**.
- Make sure every query the client uses to render project cards also returns what the link needs:
  `publicId`, `title`, `metadata { songName songArtist }` and the owner's `accountName` (feed,
  explore, search, playlists, notifications `target`). Where the owner isn't returned, the client
  falls back to `/project/:publicId`, which still works but costs an extra redirect hop.

### 5. Acceptance checks

1. `GET /og/project/<id>` redirects to `/<owner>/projects/<slug>-<id>` and keeps `?s=12`.
2. Rename the account `a` -> `b`: `publicProfile(accountName: "a")` returns the profile with
   `accountName: "b"`; nobody else can register `a`.
3. Change a project's song name: `publicProject(publicId)` is unchanged and the client's old URL
   still opens it (client redirects).
4. Slug tests above pass; an account name equal to a reserved segment is rejected.
5. No schema change for project slugs.
