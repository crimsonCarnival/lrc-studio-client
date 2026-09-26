import { m as M } from 'framer-motion';
import type { TFunction } from 'i18next';

/**
 * The branding half of the auth card: headline plus a small non-interactive
 * mock of the product. Sign-in shows the preview (what you get), sign-up shows
 * the editor (what you'll do) — so the demo matches what the user is about to
 * start doing.
 *
 * Purely decorative. Hidden from assistive tech: it repeats nothing the form
 * doesn't already say, and a screen reader walking a fake lyric grid is noise.
 */

type DemoVariant = 'preview' | 'editor';

const PREVIEW_LINES = [
  { ts: '[00:00.00]', text: 'The stars align above the city', active: false },
  { ts: '[00:14.20]', text: 'Midnight echoes through the halls', active: true },
  { ts: '[00:28.80]', text: 'She sang a melody that broke', active: false },
];

const EDITOR_LINES = [
  { ts: '00:00.00', text: 'The stars align above the city', state: 'synced' as const },
  { ts: '00:14.20', text: 'Midnight echoes through the halls', state: 'active' as const },
  { ts: '--:--.--', text: 'She sang a melody that broke', state: 'pending' as const },
  { ts: '--:--.--', text: 'And left the night in pieces', state: 'pending' as const },
];

function WindowChrome({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/40">
      <div className="flex gap-1">
        <div className="size-2 rounded-full bg-zinc-800" />
        <div className="size-2 rounded-full bg-zinc-800" />
        <div className="size-2 rounded-full bg-zinc-800" />
      </div>
      <span className="text-[9px] font-mono text-zinc-500">{label}</span>
    </div>
  );
}

function Waveform() {
  return (
    <div className="px-3 py-2 rounded-xl border border-zinc-800/30 bg-zinc-950/40 backdrop-blur-sm">
      <div className="flex items-end gap-0.5 h-6">
        {Array.from({ length: 36 }, (_, i) => (
          <div
            key={i}
            className="flex-1 rounded-full bg-primary/20"
            style={{
              height: `${20 + 70 * Math.abs(Math.sin(i * 0.5))}%`,
              transformOrigin: 'bottom',
              animation: `waveBar ${0.8 + (i % 5) * 0.14}s ease-in-out ${i * 0.022}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Mirrors the read-only preview panel: timestamps left, active line highlighted. */
function PreviewDemo() {
  return (
    <>
      <div className="rounded-xl border border-zinc-800/50 overflow-hidden bg-zinc-950/50 backdrop-blur-sm">
        <WindowChrome label="untitled.lrc" />
        <div className="p-2.5 space-y-0.5">
          {PREVIEW_LINES.map((line, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs ${
                line.active ? 'bg-primary/8 border border-primary/20' : ''
              }`}
            >
              <span className={`font-mono text-[8px] shrink-0 ${line.active ? 'text-primary' : 'text-zinc-800'}`}>
                {line.ts}
              </span>
              <span className={`truncate ${line.active ? 'text-zinc-200' : 'text-zinc-600'}`}>
                {line.text}
              </span>
              {line.active && <span className="size-1 rounded-full bg-primary ml-auto shrink-0 animate-pulse" />}
            </div>
          ))}
        </div>
      </div>
      <Waveform />
    </>
  );
}

/**
 * Mirrors the editor: a stamp button, a timestamp gutter that's empty for
 * un-synced lines, and the active line marked for the next mark press. The
 * un-synced rows are the point — they show there's work to do, which is what
 * someone signing up is about to start.
 */
function EditorDemo({ t }: { t: TFunction }) {
  return (
    <>
      <div className="rounded-xl border border-zinc-800/50 overflow-hidden bg-zinc-950/50 backdrop-blur-sm">
        <WindowChrome label="my-song.lrc" />

        {/* Toolbar mock — the Auto Stamp pill and mode toggle from the real editor */}
        <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-zinc-800/40 bg-zinc-900/30">
          <div className="flex items-center gap-1 h-5 px-2 rounded-full bg-gradient-to-br from-primary to-emerald-500 text-zinc-950 text-[8px] font-bold">
            <span className="material-symbols-outlined text-[10px] leading-none">auto_fix_high</span>
            {t('auth.showcase.autoStamp')}
          </div>
          <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-zinc-800/40 border border-zinc-700/50">
            {['LRC', 'SRT'].map((mode, i) => (
              <span
                key={mode}
                className={`px-1.5 py-0.5 rounded-full text-[7px] font-bold ${
                  i === 0 ? 'bg-primary text-zinc-950' : 'text-zinc-500'
                }`}
              >
                {mode}
              </span>
            ))}
          </div>
        </div>

        <div className="p-2 space-y-0.5">
          {EDITOR_LINES.map((line, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                line.state === 'active' ? 'bg-primary/8 border border-primary/20' : 'border border-transparent'
              }`}
            >
              <span
                className={`font-mono text-[8px] shrink-0 tabular-nums ${
                  line.state === 'pending' ? 'text-zinc-800' : line.state === 'active' ? 'text-primary' : 'text-zinc-600'
                }`}
              >
                {line.ts}
              </span>
              <span className={`truncate ${line.state === 'pending' ? 'text-zinc-600' : 'text-zinc-200'}`}>
                {line.text}
              </span>
              {line.state === 'active' && (
                <span className="ml-auto shrink-0 px-1 py-px rounded bg-primary/20 text-primary text-[7px] font-bold tracking-wide">
                  {t('auth.showcase.markKey')}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <Waveform />
    </>
  );
}

interface AuthShowcaseProps {
  t: TFunction;
  variant: DemoVariant;
}

export default function AuthShowcase({ t, variant }: AuthShowcaseProps) {
  return (
    <div className="flex flex-col justify-center gap-6 h-full" aria-hidden="true">
      <M.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="font-heading text-zinc-100 leading-tight contrast-more:text-white"
        style={{ fontSize: 'clamp(1.75rem, 2.4vw, 2.5rem)' }}
      >
        {t('auth.tagline')}
      </M.h2>

      <M.div
        // Keyed on the variant so swapping sign-in ↔ sign-up replays the fade
        // rather than hard-cutting between two different mocks.
        key={variant}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
        className="flex flex-col gap-2"
      >
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">
          {variant === 'editor' ? t('auth.showcase.editorLabel') : t('auth.showcase.previewLabel')}
        </p>
        {variant === 'editor' ? <EditorDemo t={t} /> : <PreviewDemo />}
      </M.div>
    </div>
  );
}
