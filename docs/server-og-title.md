# Server prompt: project link-preview title "Song – Artist, Synced by owner | LRC Studio"

Paste the block below into the server repo's Claude Code session. The web client now sets the **tab title** of a
project page to this format; the server must produce the same text for link previews, so pasting the normal link
and the `/og/project/:id` link look alike.

---

## Prompt

Change the **project** title in the Open Graph metadata to:

```
<Song> – <Artist>, Synced by <accountName> | LRC Studio
```

Examples: `Creep – Radiohead, Synced by 32blunts | LRC Studio`; Spanish: `Creep – Radiohead, Sincronizado por 32blunts | LRC Studio`.

### Where

`buildProjectMeta` in `src/modules/og/og.meta.service.ts` (today it builds `${subject} – ${artist}${strings.titleSuffix}`).
Both `GET /og/meta?path=…` (used by the web client's crawler proxy for `/:account/projects/:slug-:id`, `/project/:id`
and the `/edit` variants) and `GET /og/project/:publicId` go through it, so one change covers both. Apply it to
`title`, and anywhere the same string feeds `og:title`, `twitter:title`, `<title>` and `og:image:alt`'s subject
(the image alt keeps using the plain subject).

### Rules

- `<Song>` is `songName`, falling back to the project `title`, then the site name. `<Artist>` is the derived display string
  `metadata.songArtist` (already `A feat. B`), unchanged. Keep the en dash `–` as the song/artist separator.
- `<accountName>` is the owner's **current** account name (`ownerAccountName`, already loaded in `resolveProject`).
  Use it as is, without `@`.
- Without an artist: `<Song>, Synced by <accountName> | LRC Studio`. Without an owner name (the legacy fallback): drop the
  `, Synced by …` part: `<Song> – <Artist> | LRC Studio`.
- The suffix for this type is ` | LRC Studio` (pipe). Profile, list and the other page types keep their current suffix.
- Localise `Synced by` through `src/modules/og/og.strings.ts`: add `syncedBy: 'Synced by {{name}}'` (en) and
  `'Sincronizado por {{name}}'` (es) next to the other strings, and use the existing `interpolate` helper. Names are
  escaped like every other interpolated value.
- Hidden projects (banned or deleted owner, private project) keep returning the neutral hidden meta: no title leak.

### Tests

Update `buildProjectMeta` tests: with artist and owner, without artist, without owner, Spanish, an account name with
`.`/`_`/`-`, and a hostile song name (HTML is escaped by the renderer, not by string surgery). The hidden-project path
must still produce no song, artist or owner.

### Acceptance

1. `GET /og/meta?path=/32blunts/projects/radiohead-creep-<id>` returns `title: "Creep – Radiohead, Synced by 32blunts | LRC Studio"`.
2. `GET /og/project/<id>` shows the same text in `<title>`, `og:title` and `twitter:title`.
3. Profile and list previews are unchanged.
