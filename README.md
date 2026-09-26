# LRC Studio

A professional web application for synchronizing song lyrics with audio, with support for karaoke-style word-level timing, multi-language content, cloud projects, and a social platform for sharing them.

**[lrc-studio.vercel.app](https://lrc-studio.vercel.app)** · [GitHub](https://github.com/crimsonCarnival/lrc-studio) · [Server README](../server/README.md) · [Documentation (DeepWiki)](https://deepwiki.com/crimsonCarnival/lrc-studio)

> Translations: [Español (Spanish)](docs/translations/README.es.md)

## Table of Contents

- [Features](#features)
  - [Audio Sources](#-audio-sources)
  - [Editor Modes](#editor-modes)
  - [Timing & Synchronization](#timing--synchronization)
  - [AI Auto Stamp](#-ai-auto-stamp)
  - [Lyrics Search & Import](#-lyrics-search--import)
  - [Sections & Singers](#sections--singers)
  - [Lyric Content](#lyric-content)
  - [Import](#import)
  - [Export](#export)
  - [Live Preview](#live-preview)
  - [Project Management](#project-management)
  - [Social Platform](#-social-platform)
  - [Gamification](#-gamification)
  - [Sharing](#sharing)
  - [Keyboard Shortcuts](#️-keyboard-shortcuts)
  - [Interface & Themes](#interface--themes)
  - [Settings Panels](#settings-panels)
  - [Authentication](#authentication)
  - [Moderation & Admin](#moderation--admin)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
  - [`/health`](#health)
  - [`/auth`](#auth)
  - [`/projects`](#projects)
  - [`/lyrics` and `/editor`](#lyrics-and-editor--parsing--editor-operations)
  - [`/lyrics` search & import](#lyrics--search--import)
  - [`/asr`](#asr--auto-stamp)
  - [`/uploads`](#uploads)
  - [`/settings`](#settings)
  - [`/notifications`](#notifications)
  - [Misc endpoints](#song-metadata-youtube-google-og)
  - [`/admin`](#admin)
  - [GraphQL](#graphql--post-graphql)
  - [Socket.IO](#socketio)
- [Docker Deployment Considerations](#docker-deployment-considerations)
- [LRC File Format Reference](#lrc-file-format-reference)
- [License](#license)

## Features

### 🎵 Audio Sources

- **Local Files** — Drag and drop or browse to load MP3, WAV, FLAC, OGG, and other common formats. Full waveform display with seek and loop handles.
- **YouTube** — Paste any YouTube URL to stream the audio directly inside the editor. Includes a visual playback progress indicator with A-B loop support.
- **Cloudinary / direct URL** — Paste a direct audio URL and it loads through the HTML audio element; authenticated uploads under 50 MB are stored on Cloudinary and restored automatically on project load.

### Editor Modes

- **LRC Mode** — Line-by-line synchronization with millisecond-accurate timestamps. Hit a configurable key (default: `Space`) to stamp the current playback position onto the active line.
- **SRT Mode** — Subtitle format with start and end times per line. Each line gets both an in and out timestamp for precise subtitle placement.
- **Words Mode** — Per-word karaoke synchronization. Each word in a line gets its own independent timestamp, enabling animated karaoke-fill playback in the preview.

The mode switcher sits in the floating editor toolbar alongside Auto Stamp. Words Mode requires at least one synced line, so it can anchor per-word times.

### Timing & Synchronization

- **Keyboard-driven stamping** — Fully configurable shortcut keys for marking, nudging, and navigating lines during sync sessions.
- **Fine nudging** — Shift timestamps forward or backward by configurable increments (default: 0.1s / 0.01s fine).
- **Bulk shift** — Select multiple lines and shift their timestamps simultaneously.
- **Global offset** — Shift all timestamps at once.
- **A-B loop** — Set loop start and end points on the waveform or progress bar to practice a section repeatedly.
- **Auto-pause on mark** — Optionally pause playback automatically after stamping a line.
- **Overlapping timestamp detection** — Visual badge warns when two lines share the same timestamp.

### 🤖 AI Auto Stamp

- **One-click AI transcription** — Load a local audio file, a Cloudinary upload, **or a YouTube URL**, then click Auto Stamp to have the audio transcribed and every lyric line aligned automatically. YouTube audio is extracted server-side; this is not a local-file-only feature.
- **Word-level auto-stamping** — In Words Mode, timestamps are distributed per word rather than per line, producing a ready-made karaoke track.
- **Monotonic alignment** — Lyrics are matched to the transcript with Needleman-Wunsch global alignment, which is order-preserving by construction. Repeated choruses stay in the right order instead of collapsing onto the first occurrence.
- **Real-time progress tracking** — A live progress bar follows each phase (fetching audio → extracting → transcribing → aligning → applying).
- **Line-by-line preview** — Results are staged, not written straight in. Review each matched line and its assigned time before committing.
- **Confidence scoring** — Every stamped line gets a status of matched, partial, low, or none. Low-confidence lines are highlighted for review, and manually editing a timestamp clears its badge.
- **Apply modes** — "Empty Only" (default — fills only un-timed lines) or "All" (overwrites existing timestamps, with confirmation).
- **Fuzzy matching** — Configurable tolerance controls how loosely lyrics are matched, absorbing minor lyric discrepancies and transcription errors.
- **Re-runnable** — Run it again to pick up lines the first pass missed. Under the default apply mode this is idempotent.
- **Background job & cancellation** — Jobs run server-side and can be cancelled at any time; the modal stays reachable even if dismissed mid-job.
- **Leaderboard integration** — AI-stamped lines are tracked separately and weighted at 0.3× to preserve the value of manual syncing.

> Requires a Groq API key on the server. YouTube sources additionally need `yt-dlp`, plus a PO-token provider in production. Limits: 20-minute videos, 25 MB audio.

### 🔍 Lyrics Search & Import

Search for a song and import its lyrics without leaving the app — available from both the setup wizard and the editor toolbar.

- **Pre-timed lyrics** — The primary provider, [LRCLIB](https://lrclib.net), returns *already-synchronized* LRC. When a song is found there, you can skip both manual syncing and transcription entirely.
- **Synced results are flagged up front** — Results show a "Synced" badge and track duration *before* you pick one, so you can deliberately choose the timed version.
- **Smart defaults** — When a result carries timestamps, "keep timestamps" is pre-ticked and the import parses straight into timed lines. Untick it to import the words as plain text instead.
- **Provider fallback** — LRCLIB → LyricFind (if licensed) → lyrics.ovh, each isolated so one failing source doesn't fail the search. Provider attribution is shown in the preview.
- **Works with zero API keys** — No credentials are required for search or import.
- **Safe replacement** — Importing from the editor replaces the current lyrics, so it asks for confirmation whenever there is work to lose. Undo covers it either way.

### Sections & Singers

- **Section markers** — Group lines into sections (Intro, Verse, Chorus…) directly in the lyric list or via raw-text syntax.
- **Per-singer colors** — Assign singers to a section or to individual lines. Each singer gets a stable color from a shared palette, so the editor and the preview always resolve the same singer to the same color.
- **Raw-text syntax** — Edit structure as plain text: `[Chorus | Mira, Theo]` declares a section with singers, and `Mira: line` assigns a singer to one line. Singer prefixes only apply when the name is in the project's singer list, so an ordinary lyric like `Baby: come on` stays lyric text.
- **Collapsible sections** — Collapse and expand sections while editing long songs.

### Lyric Content

- **Secondary lyrics** — Add a secondary text track per line (e.g., romaji, alternate language pronunciation).
- **Translation layer** — A separate per-line translation field (e.g., an English translation alongside the main lyrics).
- **Furigana / Ruby markup** — Annotate CJK characters with readings using `{字|じ}` syntax. The editor renders ruby markup above the character inline.
- **CJK-aware tokenization** — Japanese, Chinese, and Korean text is automatically split character-by-character for per-character timing; Latin runs are kept as whole-word tokens.
- **Reading format** — Toggle between Hiragana and Katakana for phonetic reading display.
- **Dual-line display** — Optionally show the next line below the active line during sync for better readability.

### Import

- **Paste / Type** — Enter lyrics directly in the editor's text input.
- **File import** — Load existing `.lrc`, `.srt`, or `.txt` files. Word-level LRC (Enhanced LRC) is supported and preserves per-word timestamps.
- **URL import** — Import lyrics from a remote URL.
- **Paste detection** — Pasting an LRC or SRT block is automatically detected and parsed.
- **Lyrics search** — See [Lyrics Search & Import](#-lyrics-search--import).

### Export

- **LRC download** — Standard `[MM:SS.xx]` format with optional word timestamps (`<MM:SS.xx>`).
- **SRT download** — `HH:MM:SS,ms --> HH:MM:SS,ms` format with optional second-line secondary content.
- **Copy to clipboard** — Instantly copy the compiled LRC or SRT output.
- **LRC metadata tags** — Optionally include `[ti:]`, `[ar:]`, `[al:]`, `[lg:]` header tags.
- **Configurable precision** — Hundredths (`[01:23.45]`) or thousandths (`[01:23.456]`) for both line and word timestamps.
- **Line endings** — LF or CRLF for compatibility with different media players.
- **Strip empty lines** — Automatically omit unsynced or blank lines.
- **Normalize timestamps** — Sort and deduplicate timestamps on export.
- **Filename pattern** — Fixed `lyrics.lrc` or derived from the project title.
- **Translation & secondary toggles** — Choose whether to include each track in the output.
- **Server compilation with local fallback** — Compiles server-side for advanced formatting, falling back to the local compiler automatically if the server is unavailable.

### Live Preview

- **Real-time karaoke preview** — Highlights the currently playing line and fills words character-by-character as they play (in Words mode).
- **Karaoke fill easing** — Linear (accurate) or ease-in/out (smooth) word fill animation.
- **Fill track selection** — Apply the animated fill to the main text, secondary text, or both.
- **Translation display** — Optionally show the translation layer below each lyric line.
- **Furigana display** — Toggle ruby text annotations.
- **Font size** — Small, Normal, Large, X-Large.
- **Line spacing** — Compact, Normal, or Relaxed.
- **Preview alignment** — Left, center, or right.
- **Auto-scroll** — Scrolls the active line into view; configurable alignment (center, top, nearest, off) and behavior (smooth / instant).

### Project Management

- **Project library** — Browse, search, and manage all your projects. Each stores lyrics, timestamps, media references, and editor state.
- **Cloud sync** — Authenticated projects save to the server automatically. Created on first save, then patched incrementally — a single-line change sends a surgical positional patch rather than the whole document.
- **Guest Mode & project claiming** — Use the editor fully without an account. Your draft lives in `localStorage` and migrates to your account on sign-in, whichever auth method you use.
- **Autosave** — Fires after a configurable interval or after a threshold of line edits, whichever comes first.
- **Manual save** — Save button with status indicator (spinner → checkmark).
- **Local storage fallback** — Project data is mirrored locally so work survives going offline.
- **Multi-tab sync** — Saves broadcast over WebSocket, so another open tab on the same project updates live.
- **Uploads library** — View all audio files and YouTube tracks previously associated with projects.
- **Project metadata** — Name, description, tags, song title/artist/album/year/genre/language, track numbers, cover art, and singer roster.

### 🌐 Social Platform

- **Public projects** — Publish a project and get a public view with its own styling and Open Graph preview image.
- **Stars & forks** — Star projects you like; fork one to build on it (the owner can disable forking per project).
- **Boosts** — Boost a project to raise it in trending.
- **Reactions** — Emoji reactions on projects and comments.
- **Comments** — Discuss projects inline.
- **Follows & feed** — Follow other users and get a timeline of their published, starred, forked and boosted activity.
- **Explore** — Trending and popular projects and playlists, with search.
- **Playlists** — Collect projects into public or private playlists, ordered manually or by date added, stars, or alphabetically.
- **Profiles** — Public profile with stats, badges, and an optional activity heatmap. A "view as others" mode shows exactly what visitors see.
- **Notifications** — Real-time delivery for stars, forks, follows, reactions, badges, and moderation events.
- **User blocking** — Block another user.
- **Privacy controls** — Online visibility, notification preferences, mini-profile badge display, and whether your activity heatmap is public.

### 🏆 Gamification

- **XP & levels** — Earn XP and level up; level controls how many showcase badge slots you get.
- **Badges** — Awarded for registration rank, minutes synced, project count, verification, and more.
- **Addiction levels** — Admin-defined tiers based on synced lines, karaoke lines, minutes synced, public projects, stars received, and words timestamped.
- **Activity streaks** — Daily streak tracking with a warning before a streak lapses. Streaks reset on **UTC** day boundaries, which the UI states explicitly.
- **Activity heatmap** — A calendar heatmap of days you created or edited a project. Counts distinct projects per day, so autosaving one project all day contributes once.
- **Leaderboard** — Global ranking. AI-stamped lines are weighted at 0.3× so manual syncing stays worth more.

### Sharing

- **Public/private sharing** — Generate a shareable URL for any project and toggle its visibility.
- **Deep link with timestamp** — Include `?s=N` to start playback at a specific second.
- **Current position shortcut** — One-click sync of the share timestamp to the current playback position.
- **Read-only viewer** — Shared links open a read-only view with embedded media and synced lyrics.

### ⌨️ Keyboard Shortcuts

All shortcuts are fully user-configurable via **Settings → Shortcuts**, with conflict detection.

| Action | Default Shortcut |
|---|---|
| **Editor Shortcuts** | |
| Stamp / Mark | `Space` |
| Nudge Left (subtract time) | `Alt+ArrowLeft` |
| Nudge Right (add time) | `Alt+ArrowRight` |
| Add Line | `Ctrl+Enter` |
| Delete Line | `Delete` |
| Clear Timestamp | `Backspace` |
| Switch Mode (LRC/SRT) | `Ctrl+M` |
| Deselect / Close | `Escape` |
| Show Shortcuts Help | `?` |
| Select a Range | `Shift + Click` |
| Pick Individual Lines | `Ctrl + Click` |
| **Player Shortcuts** | |
| Play / Pause | `Enter` |
| Seek Backward | `ArrowLeft` |
| Seek Forward | `ArrowRight` |
| Mute / Unmute | `m` |
| Speed Up | `+` |
| Speed Down | `-` |
| **Preview Shortcuts** | |
| Toggle Translations | `t` |
| Add Secondary Lyrics | `Shift+H` |
| Add Translations | `Shift+T` |

### Interface & Themes

- **Themes** — Obsidian (dark), Pure (light), Cobalt, Velvet, Sage, and System (follows OS preference).
- **Active line highlight styles** — Glow, Zoom, Color, or Dim.
- **Translation layout** — Stacked or side-by-side.
- **Focus mode** — Hides the editor panel for an unobstructed preview.
- **Resizable, reorderable panels** — Drag the divider to resize, or reorder the editor and preview panels.
- **Lock layout** — Prevent accidental panel resizing.
- **Mobile layout** — Tabbed navigation between sync, lyrics, and preview.
- **Internationalization** — Full UI in **English** and **Spanish** (more can be added under `src/locales/`).

### Settings Panels

**Editor** — Default editor mode, word timestamp visibility, auto-advance behavior, highlight mode, loop selection, pause on mark, shift/nudge amounts, lyrics search speed, preserve empty lines.

**Playback** — Seek increment, default speed, persistent volume and mute.

**Interface** — Theme, language, active line highlight, scroll behavior and alignment, preview alignment, typography, translation layout, karaoke fill target and easing, reading format, lock layout.

**Export** — Default copy/download formats, timestamp precision, filename pattern, line endings, strip empty lines, normalize timestamps, metadata tags.

**Auto Stamp** — Confidence threshold, fuzzy tolerance, and apply mode (empty-only or all).

**Shortcuts** — All keybindings and mouse modifiers across the Editor, Player, and Preview namespaces.

**Advanced** — Autosave toggle and interval, timezone.

**Profile & Account** — Display name, account name, email, avatar, password, passkeys, active sessions, and privacy preferences.

### Authentication

- **Email / password** — Standard registration and login, with email verification and password reset.
- **Passkeys (WebAuthn)** — Register and sign in with a platform passkey; manage registered passkeys from settings.
- **Google OAuth** — Popup-based sign-in.
- **Guest Mode** — Full editor access without an account; your draft migrates intact on sign-in.
- **Session management** — See every active session and revoke them individually or all at once.
- **Remembered accounts** — Quick account switching on the sign-in screen.

### Moderation & Admin

Staff-only, gated by granular permissions rather than a role name.

- **User management** — Search, inspect, ban/unban, shadow ban, and handle appeals.
- **Network blocking** — Block IPs and device fingerprints.
- **Badges & levels** — Create and edit badge definitions and addiction level tiers, grant/revoke badges, run retroactive scans.
- **Manage permissions** — Superadmins can view every permission, edit the presets for the `mod` and `admin` roles, and adjust individual staff permissions.
- **Proposal workflow** — Staff without a given permission can propose an action for someone with it to approve.
- **Audit log** — Every privileged action is recorded.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 19](https://react.dev/) |
| Build Tool | [Vite 8](https://vitejs.dev/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Audio Waveform | [WaveSurfer.js](https://wavesurfer-js.org/) |
| UI Primitives | [Radix UI](https://www.radix-ui.com/) |
| Internationalization | [i18next](https://www.i18next.com/) |
| Routing | [React Router v7](https://reactrouter.com/) |
| Virtualization | [TanStack Virtual](https://tanstack.com/virtual) |
| Real-time | [Socket.IO](https://socket.io/) |
| Testing | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |

State is deliberately kept without a global store — no Redux, no Zustand. It lives in React Context, the root `useAppState` hook, an undo/redo history stack, and `localStorage`.

## Getting Started

### Using Docker (recommended for a quick start)

> [!IMPORTANT]
> **Ensure Docker Desktop is running** before executing these commands. On Windows, make sure the Docker engine has fully initialized.

From the repository root:

```bash
docker-compose up -d --build
```

This builds the client (Nginx + static files) and the server (Node.js), starts MongoDB, and wires them together. The app will be available at [http://localhost](http://localhost).

### Manual Installation

#### Prerequisites

- **Node.js ≥ 20.3.0** (required by the server)
- **pnpm** — both packages use `pnpm-lock.yaml`
- A MongoDB instance (local or Atlas)

#### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/crimsonCarnival/lrc-studio.git
   cd lrc-studio
   ```

2. Install dependencies for both packages:

   ```bash
   cd client && pnpm install
   cd ../server && pnpm install
   ```

3. Configure environment:

   **Client (`client/.env`):**

   ```bash
   cp .env.example .env
   # VITE_SERVER_ORIGIN should point at http://localhost:3000 for local dev
   ```

   **Server (`server/.env`):**

   ```bash
   cp .env.example .env
   # Set MONGODB_URI, JWT_SECRET and COOKIE_SECRET at minimum
   ```

4. Start both dev servers, in separate terminals:

   ```bash
   cd server && pnpm dev    # http://localhost:3000
   cd client && pnpm dev    # http://127.0.0.1:5173
   ```

5. Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

See the [Server README](../server/README.md) for the full environment variable reference and backend architecture.

### Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the Vite development server |
| `pnpm build` | Build the production bundle |
| `pnpm preview` | Preview the production build locally |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run the TypeScript compiler |
| `pnpm test` | Run Vitest |

## API Reference

Every endpoint this client talks to, with its guard and request/response shape. The backend is authoritative — see the [Server README](../server/README.md) for implementation detail.

**Conventions.** JSON unless noted. Every request carries `X-Device-Id`; `/auth` routes **require** it. Auth travels in `httpOnly` cookies (`credentials: 'include'`), never in bodies. `lines[]` is the shared lyric-line array (`text`, `timestamp`, `endTime`, `secondary`, `translations[]`, `words[]`, `type`, `label`, `singers[]`). Errors are `{ error: string }` with a stable code, plus `{ retryAfter }` on 429. REST goes through `app/api.client.ts`; GraphQL through `gqlRequest` in `app/graphql.client.ts`.

**Guards:**

| Guard | Meaning |
|---|---|
| — | Public |
| `optionalAuth` | Sets `userId` if a valid token is present; never rejects |
| `requireAuth` | 401 without a valid token; 403 if banned |
| `requireActiveUser` | `requireAuth` + device/IP ban checks |
| `requireAuthForAppeal` | `requireAuth` without the ban check |
| `requireStaff` | Must hold at least one permission |
| `perm(x)` | Must hold permission `x` |
| `sudo` | Valid `adminSudo` cookie (5-minute TTL) |
| `requireSuperadmin` | Literal `role === 'superadmin'` |

### `/health`

| Method | Path | Guard | Request | Response |
|---|---|---|---|---|
| GET | `/health/live` | — | — | `{ status: 'ok' }` |
| GET | `/health/ready` | — | — | `{ status, checks: { database } }` — 503 if DB errored |
| GET | `/health` | — | — | Full health report — 503 if errored |

### `/auth`

Rate limits key on **IP only**, never on the client-supplied device header.

| Method | Path | Guard | Rate | Request | Response |
|---|---|---|---|---|---|
| POST | `/register` | — | 3/h | `{ accountName?, email?, password, recaptchaToken? }` (one of accountName/email required; password ≥8) | Sets auth cookies → `{ user }` |
| POST | `/login` | — | 10/min | `{ identifier, password, recaptchaToken? }` | Sets auth cookies → `{ user }` |
| POST | `/check-identifier` | — | 10/min | `{ identifier }` | `{ exists, methods }` |
| POST | `/refresh` | — | — | Body ignored; reads the `refreshToken` **cookie** | Rotates both cookies → `{ user }` |
| POST | `/logout` | `optionalAuth` | — | — | Clears cookies |
| GET | `/me` | `requireAuth` | — | — | `{ user }` |
| PATCH | `/profile` | `requireAuth` | — | `{ avatarUrl?, avatarPublicId?, accountName?, email?, bio? }` (bio ≤160) | `{ user }` |
| POST | `/appeal` | `requireAuthForAppeal` | — | `{ message }` | `{ ok }` |
| POST | `/forgot-password` | — | 10/min | `{ email }` | `{ ok }` (never reveals existence) |
| GET | `/reset-password/validate` | — | 10/min | `?token` | `{ valid }` |
| POST | `/reset-password` | — | 10/min | `{ token, password }` | `{ ok }` |
| POST | `/change-password` | `requireAuth` | — | `{ currentPassword, newPassword }` | `{ ok }` |
| POST | `/set-password` | `requireAuth` | — | `{ password }` — for OAuth-only accounts | `{ ok }` |
| POST | `/verify-email` | — | 10/min | `{ token }` | `{ ok }` |
| GET | `/sessions` | `requireAuth` | — | — | `[{ id, deviceId, ip, userAgent, createdAt, expiresAt, current }]` |
| DELETE | `/sessions/:id` | `requireAuth` | — | — | `{ ok }` |
| POST | `/logout-all` | `requireAuth` | — | — | Revokes every session |
| GET | `/passkey/register/options` | `requireAuth` | — | — | WebAuthn `PublicKeyCredentialCreationOptions` |
| POST | `/passkey/register/verify` | `requireAuth` | — | WebAuthn attestation response | `{ verified }` |
| POST | `/passkey/login/options` | — | 10/min | `{ identifier? }` | WebAuthn `PublicKeyCredentialRequestOptions` |
| POST | `/passkey/login/verify` | — | 10/min | WebAuthn assertion response | Sets auth cookies → `{ user }` |
| GET | `/passkeys` | `requireAuth` | — | — | `[{ id, name, createdAt, transports }]` |
| DELETE | `/passkeys/:id` | `requireAuth` | — | — | `{ ok }` |
| POST | `/deactivate` | `requireAuth` | — | — | Soft-deletes the account |
| POST | `/exchange-ott` | — | 20/min | `{ ott }` — the Google one-time token | Sets auth cookies → `{ user }` |

> Every one of these that establishes a session must also trigger guest-project migration from `localStorage`.

### `/projects`

| Method | Path | Guard | Request | Response |
|---|---|---|---|---|
| POST | `/projects` | `requireActiveUser` | `{ title?, uploadId?, lyrics?, state?, metadata?, readOnly?, public?, ytUrl?, uploadUrl?, uploadPublicId?, fileName?, duration?, recaptchaToken? }` | `{ project }` with a nanoid(10) `publicId` |
| GET | `/projects` | `requireActiveUser` | — | `{ projects }` |
| GET | `/projects/:id` | `optionalAuth` | `:id` = `publicId` | `{ project, lyrics, upload }` |
| PUT | `/projects/:id` | `requireActiveUser` | Full project body (as POST) | `{ project }` |
| PATCH | `/projects/:id` | `requireActiveUser` | Any subset, plus `version` and `saveKind: 'manual'\|'auto'` | `{ project, version }`; emits `project:updated` + `autosave:ack` |
| DELETE | `/projects/:id` | `requireActiveUser` | — | `{ ok }` |
| GET | `/projects/share/:id` | — | — | Read-only project for shared links |

`lyrics` in a PATCH is either a full replace or a surgical positional patch — which is what `buildProjectPatch` decides:

```jsonc
// full replace
{ "lyrics": { "editorMode": "lrc", "language": "en", "sections": [ { "label": "Verse", "singers": [], "lines": [] } ] } }

// single line   → sections.<sectionIdx>.lines.<lineIdx>
{ "lyrics": { "sectionIdx": 0, "lineIdx": 4, "line": { "text": "…", "timestamp": 63.42 } } }

// single word   → …lines.<lineIdx>.words.<wordIndex>
{ "lyrics": { "sectionIdx": 0, "lineIdx": 4, "wordIndex": 2, "word": { "word": "close", "time": 11.4 } } }
```

Bounds: `sectionIdx ≤ 2000`, `lineIdx ≤ 10000`, `wordIndex ≤ 2000`. Always send nested `sections`, never the client's flat `lines` — convert with `flatToSections`.

### `/lyrics` and `/editor` — parsing & editor operations

The same router is mounted under **both** prefixes, so every route answers at `/lyrics/…` *and* `/editor/…`. All public and stateless — they transform `lines[]` and return it.

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/parse` | `{ content, filename? }` (≤5 MB; extension picks LRC/SRT/TXT) | `{ lines }` |
| POST | `/compile/lrc` | `{ lines, includeTranslations?, includeSecondary?, precision?: 'hundredths'\|'thousandths', wordPrecision?, metadata?, lineEndings?: 'lf'\|'crlf', exportTranslationIndex? }` | `{ content }` |
| POST | `/compile/srt` | `{ lines, duration?, includeTranslations?, includeSecondary?, lineEndings?, srtConfig? }` | `{ content }` |
| POST | `/infer-end-times` | `{ lines, duration?, srtConfig? }` | `{ lines }` |
| POST | `/mark` | `{ lines, activeLineIndex, time, editorMode, settings, activeWordIndex?, stampTarget?: 'main'\|'secondary', awaitingEndMark?, lastAction? }` | `{ lines, activeLineIndex, awaitingEndMark }` |
| POST | `/bulk-shift` | `{ lines, selectedIndices, delta }` | `{ lines }` |
| POST | `/global-offset` | `{ lines, delta }` | `{ lines }` |
| POST | `/clear-all` | `{ lines, isSrt?, isWords? }` | `{ lines }` |
| POST | `/clear-line` | `{ lines, index, isSrt?, isWords? }` | `{ lines }` |
| POST | `/detect-duplicates` | `{ lines, threshold? }` | `{ duplicates }` |

### `/lyrics` — search & import

`optionalAuth`, 20 requests/minute. Backed by the LRCLIB → LyricFind → lyrics.ovh chain.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/lyrics/search` | `?q` (required) | `{ results: [{ id, title, artist, album?, duration?, synced?, thumbnail, url, provider }] }` — `id` is namespaced (`lrclib:123`) when resolvable |
| GET | `/lyrics/extract` | `?track` (required), `?artist`, `?album`, `?duration`, `?id` | `{ lyrics, synced, provider }` · `422 lyrics_unavailable` if no provider has it |

Send `duration` and `id` whenever you have them — they let the server resolve the exact recording instead of re-running a fuzzy match.

### `/asr` — Auto Stamp

All routes `requireAuth`, 10 requests/hour. Progress also arrives over Socket.IO as `asr:progress`, which is what `useAutoStamp` listens to.

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/asr/stamp` | `{ lines: [{ index, text, wordTokens? }], fuzzyTolerance?: 0.5–1 }` plus **exactly one** of `uploadId` or `youtubeUrl` (both or neither → 400) | `{ jobId }` |
| POST | `/asr/stamp/upload` | `multipart/form-data`: the `payload` field (`{ lines, fuzzyTolerance? }` as JSON) **must precede** the `file` part; ≤50 MB, 1 file | `{ jobId }` |
| GET | `/asr/jobs/:id` | — | `{ jobId, phase, result?, errorCode? }` · **404** if not yours |
| GET | `/asr/jobs/:id/audio` | — | Extracted audio bytes (for the waveform) · 404 if not yours |
| POST | `/asr/jobs/:id/cancel` | — | `{ cancelled }` |

`phase` ∈ `starting, fetching_audio, extracting_audio, transcribing, aligning, applying, completed, failed, cancelled`. Each `result[]` entry is `{ index, timestamp, endTime, confidence, status, words }` with `status` ∈ `matched, partial, low, none`.

Error codes: `asr_invalid_key`, `asr_no_audio`, `asr_unsupported_audio`, `asr_empty_transcript`, `asr_rate_limited`, `asr_timeout`, `asr_network`, `asr_cancelled`, `asr_malformed_response`, `asr_youtube_blocked`, `asr_youtube_unavailable`, `asr_ytdlp_not_configured`, `asr_job_not_found`.

### `/uploads`

| Method | Path | Guard | Rate | Request | Response |
|---|---|---|---|---|---|
| POST | `/signature` | `optionalAuth` | — | `{ fileName, fileSize }` (≤50 MB), `recaptchaToken?` | `{ signature, timestamp, apiKey, cloudName, folder }` |
| POST | `/avatar-signature` | `requireAuth` | 5/h | — | Signed Cloudinary params |
| POST | `/cover-signature` | `requireAuth` | 20/h | — | Signed Cloudinary params |
| GET | `/media` | `requireActiveUser` | — | `?limit` (≤100, default 50), `?offset` | `{ uploads }` |
| GET | `/media/:id` | `requireActiveUser` | — | — | `{ upload }` |
| POST | `/media` | `requireActiveUser` | — | `{ source: 'cloudinary'\|'youtube', uploadUrl?, publicId?, fileName?, title?, duration? }` | `{ upload }` |
| PATCH | `/media/:id` | `requireActiveUser` | — | `{ title?, fileName?, duration? }` | `{ upload }` |
| DELETE | `/media/:id` | `requireActiveUser` | — | — | `{ ok }` |

The binary goes straight from the browser to Cloudinary using the signature — it never transits the API. Record it afterwards with `POST /media`.

### `/settings`

All `requireAuth`. Bodies validate against the full settings tree (`playback`, `editor`, `export`, `interface`, `shortcuts`, `import`, `advanced`, `autoStamp`).

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/settings` | — | `{ settings }` |
| PUT | `/settings` | Complete settings object | `{ settings }` |
| PATCH | `/settings` | Partial settings (deep-merged) — what the per-path diff sync sends | `{ settings }` |
| DELETE | `/settings` | — | Resets to defaults |

### `/notifications`

All `requireAuth`. Also delivered live over Socket.IO.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/notifications` | — | `{ notifications, unreadCount }` |
| POST | `/notifications/read` | `{ ids }` | `{ ok }` |
| POST | `/notifications/read-all` | — | `{ ok }` |
| DELETE | `/notifications/:id` | — | `{ ok }` |

### `/song-metadata`, `/youtube`, `/google`, `/og`

| Method | Path | Guard | Rate | Request | Response |
|---|---|---|---|---|---|
| GET | `/song-metadata/lookup` | — | 20/min | `?songName` (required), `?artistName` | Track metadata (title, artist, album, year, cover, …) |
| GET | `/youtube/search` | `optionalAuth` | 30/min | `?q` | Search results |
| GET | `/youtube/availability` | `optionalAuth` | 30/min | `?videoId` (11 chars) | Availability plus a specific failure reason |
| GET | `/youtube/check-embed` | `optionalAuth` | 30/min | `?videoId` | **Deprecated** alias returning the legacy `{ embeddable }` shape |
| GET | `/google/auth/url` | `requireAuth` | — | — | `{ url }` — for linking Google to an existing account |
| GET | `/google/login/url` | — | — | — | `{ url }` — for sign-in |
| GET | `/google/auth/callback` | — | — | `?code&state` | HTML that `postMessage`s a one-time token to the opener, which you exchange via `POST /auth/exchange-ott` |
| POST | `/google/disconnect` | `requireAuth` | — | — | `{ disconnected }` · 409 `last_auth_method` if it's the only sign-in method |
| GET | `/og/project/:publicId` | — | — | — | **HTML** (not JSON) with Open Graph/Twitter tags and a redirect, under a per-response CSP nonce · 404 for private/missing |

### `/admin`

An `onRequest` hook applies `requireStaff` to **every** route below. Destructive actions additionally need a permission *and* a fresh `sudo` grant. Staff may only act on strictly lower ranks. Client-side permission checks are for showing and hiding UI only — the server re-checks everything.

| Method | Path | Guard | Request | Response |
|---|---|---|---|---|
| GET | `/sudo/factors` | staff | — | `{ factors }` — which re-auth methods are available |
| POST | `/sudo` | staff | `{ password? }` | Sets the `adminSudo` cookie (5 min) |
| POST | `/sudo/passkey/options` | staff | — | WebAuthn request options |
| POST | `/sudo/passkey/verify` | staff | WebAuthn assertion | Sets the `adminSudo` cookie |
| GET | `/users` | `perm('users.view')` | `?cursor`, `?limit` (≤100), `?search`, `?role`, `?status` ∈ `all\|active\|banned\|pending\|deleted\|verified\|premium` | `{ users, nextCursor }` |
| GET | `/stats` | `perm('stats.view')` | — | Dashboard aggregates |
| GET | `/audit-logs` | `perm('audit.view')` | `?page`, `?limit` (≤100) | `{ logs, total }` |
| GET | `/banned-ips` | `perm('network.block')` | — | `{ ips }` |
| GET | `/banned-devices` | `perm('network.block')` | — | `{ devices }` |
| POST | `/users/:id/ban` | `perm('users.ban')` + sudo | `{ reason?, bannedUntil?, banIp?, banDevice? }` | `{ user }` |
| POST | `/users/:id/unban` | `perm('users.ban')` + sudo | — | `{ user }` |
| POST | `/users/:id/reject-appeal` | `perm('users.ban')` + sudo | — | `{ user }` |
| POST | `/users/:id/shadowban` | `perm('users.shadowban')` + sudo | `{ feed, search, reason? }` | `{ user }` |
| POST | `/users/:id/unshadowban` | `perm('users.shadowban')` + sudo | — | `{ user }` |
| POST | `/users/:id/role` | `perm('users.role')` + sudo | `{ role: 'user'\|'mod'\|'admin'\|'superadmin' }` | `{ user }` |
| DELETE | `/users/:id` | `perm('users.delete')` + sudo | — | `{ ok }` |
| POST | `/users/:id/reactivate` | `perm('users.delete')` + sudo | — | `{ user }` |
| POST | `/banned-ips` | `perm('network.block')` + sudo | `{ ip, reason? }` | `{ entry }` |
| DELETE | `/banned-ips/:id` | `perm('network.block')` + sudo | — | `{ ok }` |
| POST | `/banned-devices` | `perm('network.block')` + sudo | `{ deviceId, reason? }` | `{ entry }` |
| DELETE | `/banned-devices/:id` | `perm('network.block')` + sudo | — | `{ ok }` |
| POST | `/xp` | `perm('xp.adjust')` + sudo | `{ userId, delta, reason? }` | `{ user }` |
| GET | `/permissions` | `requireSuperadmin` | — | `{ permissions, rolePresets, editableRoles }` |
| PUT | `/permissions/roles/:role` | `requireSuperadmin` + sudo | `:role` ∈ `mod\|admin` only; `{ permissions: [] }` | `{ rolePresets }` |
| PUT | `/permissions/users/:id` | `requireSuperadmin` + sudo | `{ permissions: [] }` | `{ user }` |

### GraphQL — `POST /graphql`

Depth limit 12; introspection disabled in production. `gqlRequest` returns `json.data` directly and throws `ApiError` on HTTP or GraphQL errors; a 401 emits `authEvents('token:expired')` to trigger a refresh. There is **no client-side GraphQL cache**, so every query refetches.

**Queries**

| Query | Arguments | Returns |
|---|---|---|
| `health` | — | `HealthStatus!` |
| `me` | — | `User` |
| `project` | `id: ID!` | `Project` |
| `projects` | `limit, offset` | `[Project!]!` |
| `publicProject` | `publicId: String!` | `Project` |
| `getShare` | `id: ID!` | `Project` |
| `upload` / `uploads` | `id: ID!` / `limit, offset` | `Upload` / `[Upload!]!` |
| `settings` | — | `Settings` |
| `publicProfile` | `accountName: String!, asVisitor: Boolean` | `PublicUser` |
| `followList` | `accountName: String!, type: FollowListType!, offset` | `FollowListResult!` |
| `blockedUsers` | — | `[BlockedUser!]!` |
| `playlist` / `playlists` | `id: ID!` / `accountName: String!` | `Playlist` / `[Playlist!]!` |
| `savedPlaylists` | — | `[Playlist!]!` |
| `feed` | `offset, limit` | `FeedResult!` |
| `userActivity` | `offset, limit` | `FeedResult!` |
| `userActivityHeatmap` | — | `[ActivityHeatmapDay!]!` |
| `searchProjects` | `query: String!, sortBy: SearchSort, offset, limit` | `SearchResult!` |
| `searchUsers` | `query: String!, limit` | `[FollowUser!]!` |
| `trendingProjects` | `offset, limit` | `ProjectPage!` |
| `popularPlaylists` | `offset, limit` | `PlaylistPage!` |
| `suggestedUsers` | `limit` | `[FollowUser!]!` |
| `exploreStats` | — | `ExploreStats!` |
| `projectReactions` | `publicId: String!` | `ProjectReactions!` |
| `leaderboard` | `limit, offset` | `LeaderboardResult!` |
| `badgeDefinitions` | — | `[BadgeDef!]!` |
| `publicBadgeDefinitions` | — | `[PublicBadgeDef!]!` |
| `userShowcase` | `accountName: String!` | `[ShowcasedBadge!]!` |
| `myMusicLibrary` | — | `[MusicLibraryEntry!]!` |
| `userContentStats` | — | `ContentStats!` |
| `adminAddictionLevels` | — | `[AddictionLevel!]!` |
| `myPreferences` | — | `UserPreferences!` |
| `myRequests` / `pendingRequests` / `reviewedRequests` | — | `[StaffRequest!]!` |
| `requestCapabilities` / `requestCounts` | — | `RequestCapabilities!` / `RequestCounts!` |

**Mutations**

| Mutation | Arguments | Returns |
|---|---|---|
| `createProject` | `input: CreateProjectInput!` | `Project!` |
| `updateProject` | `id: ID!, input: UpdateProjectInput!` | `Project!` |
| `deleteProject` | `id: ID!` | `Boolean!` |
| `updateLyrics` | `publicId: String!, input: UpdateLyricsInput!` | `Lyrics!` |
| `cloneProject` | `id: ID!` | `Project!` — fork |
| `starProject` / `unstarProject` | `id: ID!` | `Project!` |
| `boostProject` | `publicId: ID!` | `Boolean!` |
| `setForksEnabled` | `publicId: ID!, enabled: Boolean!` | `Project!` |
| `reactToProject` | `publicId: String!, emoji: String!` | `ProjectReactions!` |
| `incrementProjectView` / `incrementProjectShare` | `id: ID!` | `Boolean!` |
| `incrementPlaylistView` / `incrementPlaylistShare` | `id: ID!` | `Boolean!` |
| `updateProfile` | `input: UpdateProfileInput!` (`accountName`, `displayName`, `email`, `bio`, `avatarUrl`) | `User!` |
| `updateSettings` / `resetSettings` | `input: UpdateSettingsInput!` / — | `Settings!` / `Boolean!` |
| `updatePreferences` | `input: UpdatePreferencesInput!` (visibility, notification toggles, `showActivityHeatmap`, mini-profile badges) | `UserPreferences!` |
| `saveMedia` / `deleteMedia` | `input: SaveMediaInput!` / `id: ID!` | `Upload!` / `Boolean!` |
| `sendVerificationEmail` | — | `Boolean!` |
| `follow` / `unfollow` | `accountName: String!` | `Boolean!` |
| `blockUser` / `unblockUser` | `accountName: String!` | `Boolean!` |
| `createPlaylist` | `input: CreatePlaylistInput!` | `Playlist!` |
| `updatePlaylist` | `id: ID!, input: UpdatePlaylistInput!` | `Playlist!` |
| `deletePlaylist` | `id: ID!` | `Boolean!` |
| `addProjectToPlaylist` / `removeProjectFromPlaylist` | `playlistId: ID!, publicId: ID!` | `Playlist!` |
| `reorderPlaylist` | `playlistId: ID!, publicIds: [ID!]!` | `Playlist!` |
| `savePlaylist` / `unsavePlaylist` | `playlistId: ID!` | `Boolean!` |
| `updateShowcase` | `badgeIds: [String!]!, showcasePublic: Boolean` | `UpdateShowcaseResult!` |
| `adminGrantBadge` | `userIdentifier: String!, badgeId: String!` | `Boolean!` |
| `adminRevokeBadge` | `userId: ID!, badgeId: String!` | `Boolean!` |
| `adminCreateBadge` / `adminUpdateBadge` | `input: BadgeDefInput!` / `id: String!, input` | `BadgeDef!` |
| `adminDeleteBadge` | `id: String!` | `Boolean!` |
| `adminRetroactiveScan` | `badgeId: String!` | `RetroactiveResult!` |
| `adminCreateAddictionLevel` / `adminUpdateAddictionLevel` | `input` / `id: String!, input` | `AddictionLevel!` |
| `adminDeleteAddictionLevel` | `id: String!` | `Boolean!` |
| `adminShadowBan` | `userId: ID!, feed: Boolean!, search: Boolean!, reason: String` | `Boolean!` |
| `adminUnshadowBan` | `userId: ID!` | `Boolean!` |
| `submitRequest` | `type: String!, payload: String!` (JSON string, whitelisted server-side) | `StaffRequest!` |
| `reviewRequest` | `id: ID!, decision: String!, note: String` | `StaffRequest!` — atomic claim; self-review refused |

### Socket.IO

`socket.client.ts` connects idempotently and reconnects on visibility and network change. Clients join `user:{userId}` and `project:{publicId}` rooms.

| Event | Direction | Payload |
|---|---|---|
| `project:updated` | → client | Broadcast to the project room after a successful patch (another tab saved) |
| `autosave:ack` | → client | To the originating socket only |
| `asr:progress` | → client | `{ jobId, phase, result?, errorCode? }` |
| `notification` | → client | New notification |
| `session:invalidated` | → client | Forces a client-side logout |

## Docker Deployment Considerations

### With Docker Compose (default values)

Running `docker-compose up` without custom environment variables gives you a working app immediately.

✅ **Working with defaults:**

- User authentication (register, login, logout, passkeys)
- Profile and project management, full CRUD
- Lyrics editing in all three modes, all shortcuts and settings, all themes
- Audio uploads from local files
- **Lyrics search and import** — needs no API keys at all, and still returns pre-timed lyrics via LRCLIB

⚠️ **Limited with defaults (dummy API keys):**

- **Password reset / verification emails** — the flow works, but nothing sends (dummy SMTP credentials)
- **Cloudinary uploads** — demo account with storage and bandwidth limits
- **YouTube metadata** — won't fetch titles with a dummy API key
- **AI Auto Stamp** — needs a real Groq API key; YouTube sources additionally need `yt-dlp` and, in production, a PO-token provider
- **Genius search results** — falls back to LRCLIB, which works but has no cover art
- **reCAPTCHA** — uses Google's public test key (always passes)

### Enabling full features

1. Create a `.env.local` based on `.env.docker`:

   ```bash
   cp .env.docker .env.local
   ```

2. Add real credentials:

   ```bash
   # Email (verification + password reset)
   EMAIL_SMTP_HOST=smtp.gmail.com
   EMAIL_SMTP_USER=your-email@gmail.com
   EMAIL_SMTP_PASS=your-app-password

   # Cloudinary (file uploads)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # YouTube (video metadata)
   YOUTUBE_API_KEY=your-youtube-api-key

   # Groq (AI Auto Stamp transcription)
   GROQ_API_KEY=your-groq-api-key

   # Optional: richer lyrics search results
   GENIUS_CLIENT_ACCESS_TOKEN=your-genius-client-access-token

   # Superadmin bootstrap (comma-separated list)
   SUPERADMIN_EMAIL=you@example.com

   # reCAPTCHA (bot protection)
   RECAPTCHA_SECRET_KEY=your-secret-key
   VITE_RECAPTCHA_KEY=your-public-key
   ```

3. Run with your configuration:

   ```bash
   docker-compose --env-file .env.local up -d --build
   ```

## LRC File Format Reference

### Standard LRC

```lrc
[ti:Song Title]
[ar:Artist Name]
[al:Album Name]
[00:10.50]First line of lyrics
[00:15.20]Second line of lyrics
```

### Enhanced LRC (word-level)

```lrc
[00:10.50]<00:10.50>Hold <00:11.00>me <00:11.40>close
[00:15.20]<00:15.20>Don't <00:15.80>let <00:16.10>go
```

### With secondary / furigana

Multiple lines sharing a timestamp stack vertically in compatible players:

```lrc
[00:10.50]持ち上げて
[00:10.50]mochiagete
[00:10.50]Lift me up
```

## License

This project is open-source and available under the MIT License.
