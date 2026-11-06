import { useTranslation } from 'react-i18next';

/** Everything the editor can change; the control being touched outlines the samples it affects. */
export type ThemeFocus = 'bg' | 'main' | 'sub' | 'text' | 'error' | 'radius' | 'glow' | 'borders';

// The outline uses the theme's own foreground, which the editor already holds at readable contrast on
// the background, so it shows up on any palette. It follows each sample's corner radius.
const OUTLINE = 'outline outline-2 outline-dashed outline-offset-2 outline-[color:var(--foreground)]';

const SUB = { color: 'var(--subtle)' } as const;

/**
 * A small mock of the app drawn with the theme's own variables. The editor applies the draft to the
 * page live, so nothing here is re-coloured by hand: radius, glow and border changes show on the same
 * classes the real components use.
 */
export default function ThemePreview({ focus }: { focus: ThemeFocus | null }) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const hl = (...roles: ThemeFocus[]) => (focus && roles.includes(focus) ? OUTLINE : '');
  const p = (key: string) => tk(`settings.themeEditor.preview.${key}`);

  return (
    <div
      aria-hidden="true"
      className={`flex flex-col gap-3 rounded-xl border border-border bg-background p-3 text-foreground ${hl('bg', 'borders', 'radius')}`}
    >
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${hl('sub')}`} style={SUB}>{p('title')}</p>

      {/* Tabs: the active one is the main colour. */}
      <div className="flex gap-4 border-b border-border text-xs font-semibold">
        <span className={`-mb-px border-b-2 border-primary pb-1.5 text-primary-ink ${hl('main')}`}>{p('tabEditor')}</span>
        <span className={`pb-1.5 ${hl('sub')}`} style={SUB}>{p('tabPreview')}</span>
      </div>

      {/* A card: surface, border, shadow and radius. */}
      <div
        className={`flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 ${hl('radius', 'borders', 'glow', 'bg')}`}
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div>
          <p className={`text-sm font-semibold ${hl('text')}`}>{p('song')}</p>
          <p className={`text-xs ${hl('sub')}`} style={SUB}>{p('artist')}</p>
        </div>

        {/* Lyric lines: the current one in the main colour, the rest quieter. */}
        <div className="flex flex-col gap-0.5 text-xs">
          <span className={hl('sub')} style={SUB}>{p('lineBefore')}</span>
          <span className={`font-semibold text-primary-ink ${hl('main')}`}>{p('lineNow')}</span>
          <span className={hl('text')}>{p('lineAfter')}</span>
        </div>

        {/* Progress and toggle: the main colour on a neutral track. */}
        <div className="flex items-center gap-3">
          <div className={`h-1.5 flex-1 overflow-hidden rounded-pill bg-secondary ${hl('radius', 'main')}`}>
            <div className="h-full w-2/3 rounded-pill bg-primary" />
          </div>
          <span className={`flex h-4 w-7 items-center justify-end rounded-pill bg-primary p-0.5 ${hl('main', 'radius')}`}>
            <span className="size-3 rounded-full bg-[var(--knob)]" />
          </span>
        </div>

        <input
          readOnly
          tabIndex={-1}
          placeholder={p('input')}
          className={`h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-xs text-foreground placeholder:text-[color:var(--faint)] ${hl('radius', 'borders')}`}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-pill bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary-ink ${hl('main', 'radius')}`}>{p('chip')}</span>
          <span className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold ${hl('error', 'radius')}`} style={{ background: 'var(--love-soft)', color: 'var(--love-ink)' }}>{p('badge')}</span>
        </div>

        <p className={`text-xs ${hl('error')}`} style={{ color: 'var(--love-ink)' }}>{p('errorMessage')}</p>

        <div className="flex flex-wrap gap-2 border-t border-border pt-2.5">
          <span
            className={`rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground ${hl('main', 'radius', 'glow')}`}
            style={{ boxShadow: 'var(--shadow-glow)' }}
          >
            {p('primary')}
          </span>
          <span className={`rounded-md border border-border px-3 py-1.5 text-xs font-semibold ${hl('text', 'radius', 'borders')}`}>{p('outline')}</span>
          <span
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${hl('error', 'radius')}`}
            style={{ borderColor: 'var(--destructive)', color: 'var(--love-ink)', background: 'var(--love-soft)' }}
          >
            {p('danger')}
          </span>
        </div>
      </div>

      {/* A raised panel with the strong glow, like the playing card. */}
      <div
        className={`flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 ${hl('glow', 'radius', 'borders')}`}
        style={{ boxShadow: 'var(--shadow-glow-strong)' }}
      >
        <span className="size-7 shrink-0 rounded-full bg-primary" />
        <div className="min-w-0">
          <p className={`truncate text-xs font-semibold ${hl('text')}`}>{p('nowPlaying')}</p>
          <p className={`truncate text-[10px] ${hl('sub')}`} style={SUB}>{p('nowPlayingMeta')}</p>
        </div>
      </div>
    </div>
  );
}
