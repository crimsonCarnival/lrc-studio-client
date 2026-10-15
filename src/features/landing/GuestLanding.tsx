import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { Icon } from '@/shared/ui/Icon';
import { LangSwitcher } from '@/features/auth/auth-shared';
import { LogoMark } from '@/shared/ui/LogoMark';
import SmoothWavyCanvas from './SmoothWavyCanvas';
import LandingDemo from './LandingDemo';
import LandingSteps, { Kbd } from './LandingSteps';

const SECTION = 'max-w-[1280px] mx-auto px-6';
const H2 = 'font-extrabold leading-[1.05] tracking-[-0.03em]';
const H2_SIZE = { fontSize: 'clamp(32px, 4vw, 48px)' };
const CTA_PRIMARY = 'h-12 px-[22px] inline-flex items-center gap-2.5 rounded-[10px] bg-primary hover:bg-primary-dim text-primary-foreground font-bold transition-colors';

// Sample export output for one demo line — file contents, not UI copy.
const EXPORT_LINE = 'Midnight echoes through the empty halls';
const EXPORT_SAMPLES = [
  { ext: '.lrc', useKey: 'landing.features.forPlayers', body: `[00:03.60] ${EXPORT_LINE}` },
  { ext: '.srt', useKey: 'landing.features.forEditors', body: `2\n00:00:03,600 --> 00:00:06,800\n${EXPORT_LINE}` },
  { ext: 'word .lrc', useKey: 'landing.features.forKaraoke', body: '[00:03.60] <00:03.60>Midnight <00:04.03>echoes <00:04.41>through …' },
] as const;

const NAV_LINKS = [
  { id: 'how', labelKey: 'landing.nav.how' },
  { id: 'editor', labelKey: 'landing.nav.editor' },
  { id: 'formats', labelKey: 'landing.nav.formats' },
] as const;

export default function GuestLanding() {
  const { t, i18n } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // The page scrolls inside this container, not the window, so in-page links
  // are buttons that scroll it rather than hash anchors the router would see.
  const scrollTo = (id?: string) => {
    const behavior = reducedMotion ? 'auto' : 'smooth';
    if (!id) scrollRef.current?.scrollTo({ top: 0, behavior });
    else document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
  };

  const rise = (delayMs: number) => ({ animationDelay: `${delayMs}ms`, animationFillMode: 'both' as const, animationDuration: '0.7s' });

  return (
    // `fixed inset-0` rather than `h-full`: the route renders inside the app
    // shell, which reserves header height and side gutters this page (it has
    // its own nav, and AppHeader renders nothing on `/`) must not inherit.
    <div ref={scrollRef} className="fixed inset-0 z-raised overflow-y-auto bg-zinc-950 text-zinc-100 font-sans text-base leading-normal">

      {/* Ambient canvas background — hidden for data-saver. Everything after it
          is `relative` so it stacks above this positioned layer. */}
      <div className="wavy-canvas-container fixed inset-0 pointer-events-none">
        <SmoothWavyCanvas />
      </div>

      {/* ── NAV ── */}
      <header className="relative border-b border-zinc-800">
        <nav className={`${SECTION} py-4 flex items-center gap-6 flex-wrap`}>
          <button
            type="button"
            onClick={() => scrollTo()}
            className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            <LogoMark className="size-7" decorative />
            {t('app.name')}
          </button>
          <div className="hidden sm:flex gap-5 flex-1 text-[15px]">
            {NAV_LINKS.map(({ id, labelKey }) => (
              <button key={id} type="button" onClick={() => scrollTo(id)} className="text-foreground/65 hover:text-zinc-100 transition-colors">
                {t(labelKey)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <LangSwitcher i18n={i18n} />
            <Link to="/auth/signin" className="h-10 px-3.5 inline-flex items-center rounded-lg text-[15px] font-medium hover:bg-zinc-900 transition-colors">
              {t('auth.signIn')}
            </Link>
            <Link to="/auth/signup" className="h-10 px-4 inline-flex items-center rounded-lg bg-zinc-100 text-zinc-950 text-[15px] font-semibold hover:opacity-90 transition-opacity">
              {t('auth.signUp')}
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative">
        {/* ── HERO ── */}
        <section className={`${SECTION} pt-20 pb-24`}>
          <p className="animate-fade-in mb-7 font-mono text-[13px] font-medium tracking-wide text-foreground/65" style={rise(0)}>
            {t('landing.eyebrow')}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-8">
            <h1
              className="animate-fade-in max-w-[760px] font-extrabold leading-[0.95] tracking-[-0.045em]"
              style={{ ...rise(80), fontSize: 'clamp(44px, 7vw, 96px)' }}
            >
              <Trans i18nKey="landing.headline" components={{ br: <br />, accent: <span className="text-primary" /> }} />
            </h1>
            <div className="animate-fade-in flex-[0_1_380px] flex flex-col gap-6" style={rise(160)}>
              <p className="text-lg leading-[1.55] text-foreground/80">
                <Trans i18nKey="landing.sub" components={{ ext: <span className="font-mono text-[15px] text-zinc-100" /> }} />
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/project/new" className={CTA_PRIMARY}>
                  {t('landing.ctaOpen')}<Icon name="arrow_forward" size={16} />
                </Link>
                <Link to="/auth/signin" className="h-12 px-[18px] inline-flex items-center rounded-[10px] font-medium hover:bg-zinc-900 transition-colors">
                  {t('landing.ctaHaveAccount')}
                </Link>
              </div>
            </div>
          </div>

          <div className="animate-fade-in mt-[72px]" style={rise(280)}>
            <LandingDemo reducedMotion={reducedMotion} />
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" className="border-t border-zinc-800">
          <div className={`${SECTION} py-24 flex flex-col gap-[72px]`}>
            <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-4">
              <h2 className={H2} style={H2_SIZE}>
                <Trans i18nKey="landing.how.title" components={{ br: <br /> }} />
              </h2>
              <p className="max-w-[380px] text-foreground/65">{t('landing.how.intro')}</p>
            </div>
            <LandingSteps t={t} />
          </div>
        </section>

        {/* ── EDITOR FEATURES ── */}
        <section id="editor" className="border-t border-zinc-800">
          <div className={`${SECTION} py-24`}>
            <h2 className={`${H2} mb-14 max-w-[640px]`} style={H2_SIZE}>{t('landing.features.title')}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-zinc-800 border border-zinc-800 rounded-[14px] overflow-hidden">

              <article className="bg-zinc-950 p-8 flex flex-col gap-5">
                <div>
                  <h3 className="mb-1.5 text-xl font-bold tracking-tight">{t('landing.features.stampTitle')}</h3>
                  <p className="text-foreground/65">{t('landing.features.stampDesc')}</p>
                </div>
                <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 text-[15px]">
                  <dt><Kbd>{t('landing.demo.enterKey')}</Kbd></dt>
                  <dd className="text-foreground/80">{t('landing.features.stampKey')}</dd>
                  <dt className="flex gap-1.5"><Kbd square>←</Kbd><Kbd square>→</Kbd></dt>
                  <dd className="text-foreground/80">{t('landing.features.nudgeKeys')}</dd>
                </dl>
              </article>

              <article className="bg-zinc-950 p-8 flex flex-col gap-5">
                <div>
                  <h3 className="mb-1.5 text-xl font-bold tracking-tight">{t('landing.features.wordsTitle')}</h3>
                  <p className="text-foreground/65">{t('landing.features.wordsDesc')}</p>
                </div>
                {/* Sample lyric with furigana; decorative, so kept out of the a11y tree. */}
                <div aria-hidden="true" className="flex flex-col gap-2.5 p-5 rounded-[14px] bg-zinc-900 font-lyrics text-2xl">
                  <p className="font-extrabold leading-tight">
                    <span className="text-primary glow-line">Midnight echoes</span> through the empty halls
                  </p>
                  <p className="font-bold leading-[1.9]">
                    <span className="text-primary glow-line"><ruby>月明<rt>つきあ</rt></ruby>かりに</span>
                    <ruby>照<rt>て</rt></ruby>らされた<ruby>道<rt>みち</rt></ruby>を
                  </p>
                </div>
              </article>

              <article id="formats" className="lg:col-span-2 bg-zinc-950 p-8 flex flex-wrap items-start gap-x-12 gap-y-6">
                <div className="flex-[1_1_240px] max-w-[320px]">
                  <h3 className="mb-1.5 text-xl font-bold tracking-tight">{t('landing.features.exportTitle')}</h3>
                  <p className="text-foreground/65">{t('landing.features.exportDesc')}</p>
                </div>
                <div className="flex-[999_1_560px] min-w-0 grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[13px] leading-relaxed">
                  {EXPORT_SAMPLES.map(({ ext, useKey, body }) => (
                    <div key={ext} className="min-w-0 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                      <div className="px-3.5 py-2 border-b border-zinc-800 flex justify-between text-xs text-foreground/65">
                        <span className="font-semibold text-success">{ext}</span>
                        <span>{t(useKey)}</span>
                      </div>
                      <pre className="p-3.5 whitespace-pre-wrap break-words text-foreground/80 font-mono select-text">{body}</pre>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="border-t border-zinc-800">
          <div className={`${SECTION} py-28 flex flex-wrap items-end justify-between gap-8`}>
            <div>
              <span aria-hidden="true" className="inline-flex items-center h-7 mb-[18px] px-3 rounded-full bg-primary/25 border border-primary/50 font-mono text-[13px] font-medium text-primary">
                00:00.00
              </span>
              <h2 className="font-extrabold leading-none tracking-[-0.04em]" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>
                <Trans i18nKey="landing.cta.title" components={{ br: <br /> }} />
              </h2>
            </div>
            <div className="flex flex-col items-start gap-3.5">
              <div className="flex flex-wrap gap-3">
                <Link to="/project/new" className={CTA_PRIMARY}>{t('landing.cta.start')}</Link>
                <Link to="/auth/signup" className="h-12 px-5 inline-flex items-center rounded-[10px] border border-zinc-700 font-semibold hover:bg-zinc-900 transition-colors">
                  {t('landing.cta.signUp')}
                </Link>
              </div>
              <p className="text-sm text-foreground/65">{t('landing.cta.sub')}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-zinc-800">
        <div className={`${SECTION} py-7 flex flex-wrap gap-x-6 gap-y-4 text-sm text-foreground/65`}>
          <span suppressHydrationWarning>&copy; {new Date().getFullYear()} {t('app.name')}</span>
          <a href="https://github.com/crimsonCarnival" target="_blank" rel="noreferrer" className="ml-auto hover:text-zinc-100 underline underline-offset-2 transition-colors">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
