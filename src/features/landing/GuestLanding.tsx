import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LazyMotion, domAnimation, m as M } from 'framer-motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import SmoothWavyCanvas from './SmoothWavyCanvas';
import { LangSwitcher } from '@/features/auth/auth-shared';
import { LazyImage } from '@ui/LazyImage';

const LYRIC_LINES = [
  { ts: '[00:00.00]', text: 'The stars align above the city lights', active: false },
  { ts: '[00:14.20]', text: 'Midnight echoes through the empty halls', active: true },
  { ts: '[00:28.80]', text: 'She sang a melody that broke the night', active: false },
  { ts: '[00:42.15]', text: 'And disappeared before the morning calls', active: false },
  { ts: '[00:56.40]', text: '月明かりに照らされた道を', active: false },
];

const FEATURES = [
  { iconName: 'bolt',        color: 'text-primary',      bg: 'bg-primary/10',       titleKey: 'landing.feat1Title', descKey: 'landing.feat1Desc' },
  { iconName: 'mic',         color: 'text-accent-purple', bg: 'bg-accent-purple/10', titleKey: 'landing.feat2Title', descKey: 'landing.feat2Desc' },
  { iconName: 'language',    color: 'text-accent-blue',   bg: 'bg-accent-blue/10',   titleKey: 'landing.feat3Title', descKey: 'landing.feat3Desc' },
  { iconName: 'download',    color: 'text-warning',       bg: 'bg-warning/10',       titleKey: 'landing.feat4Title', descKey: 'landing.feat4Desc' },
];

const STEPS = [
  { n: '01', iconName: 'music_note',  titleKey: 'landing.step1Title', descKey: 'landing.step1Desc' },
  { n: '02', iconName: 'bolt',        titleKey: 'landing.step2Title', descKey: 'landing.step2Desc' },
  { n: '03', iconName: 'description', titleKey: 'landing.step3Title', descKey: 'landing.step3Desc' },
  { n: '04', iconName: 'download',    titleKey: 'landing.step4Title', descKey: 'landing.step4Desc' },
];

export default function GuestLanding() {
  const { t, i18n } = useTranslation();
  // Feature/step labels use dynamic keys.
  const tk = t as (key: string) => string;
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <div ref={scrollRef} className="h-full overflow-y-auto scroll-smooth scrollbar-none">

        {/* Ambient canvas background — hidden for data-saver */}
        <div className="wavy-canvas-container fixed inset-0 pointer-events-none">
          <SmoothWavyCanvas />
        </div>

        {/* ── LANDING NAV ── */}
        <nav className="fixed top-0 left-0 right-0 z-nav flex items-center justify-between px-6 sm:px-10 py-3 bg-zinc-950/60 backdrop-blur-2xl border-b border-zinc-800/30">
          {/* Logo */}
          <button
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="size-7">
              <LazyImage
                src="https://res.cloudinary.com/dzjid2tos/image/upload/v1778106770/lrc-logo_dkumwz.png"
                alt="LRC Studio"
                className="size-full object-contain"
              />
            </div>
            <span className="text-xs font-bold text-zinc-100 font-heading tracking-tight hidden sm:inline">LRC Studio</span>
          </button>

          {/* Right: language + auth */}
          <div className="flex items-center gap-2">
            <LangSwitcher i18n={i18n} />
            <button
              onClick={() => navigate('/auth/signin')}
              className="h-8 px-3 text-xs font-normal text-zinc-300 hover:text-zinc-100 bg-zinc-800/70 hover:bg-zinc-700/80 border border-zinc-800/50 rounded-xl transition-colors"
            >
              {t('auth.signIn')}
            </button>
            <button
              onClick={() => navigate('/auth/signup')}
              className="h-8 px-3 text-xs font-normal text-zinc-950 bg-primary hover:bg-primary/90 rounded-xl transition-colors"
            >
              {t('auth.signUp')}
            </button>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="relative min-h-screen flex items-center px-6 sm:px-10 lg:px-16 xl:px-24 py-24">
          <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_420px] gap-12 lg:gap-20 items-center">

            {/* Left: main content */}
            <M.div
              className="flex flex-col gap-8"
              initial={reducedMotion ? false : { opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full border border-primary/25 bg-primary/5 text-primary text-xs font-semibold tracking-wide contrast-more:border-primary/60">
                {t('landing.badge')}
              </span>

              <div className="flex flex-col gap-0">
                <h1 className="font-heading leading-[0.92] tracking-tight text-zinc-100 contrast-more:text-white"
                    style={{ fontSize: 'clamp(2.75rem, 7vw, 5.5rem)' }}>
                  {t('landing.headline')}
                </h1>
                <h1 className="font-heading leading-[0.92] tracking-tight text-primary"
                    style={{ fontSize: 'clamp(2.75rem, 7vw, 5.5rem)' }}>
                  {t('landing.headlineAccent')}
                </h1>
              </div>

              <p className="text-zinc-400 contrast-more:text-zinc-200 leading-relaxed max-w-lg"
                 style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)' }}>
                {t('landing.sub')}
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate('/project/new')}
                  className="gap-2 px-7 h-12 font-normal shadow-glow"
                >
                  <Icon name="play_arrow" size={16} />
                  {t('landing.ctaStart')}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => navigate('/auth/signin')}
                  className="gap-2 px-7 h-12 font-normal text-zinc-400 hover:text-zinc-100"
                >
                  {t('landing.ctaSignIn')}
                  <Icon name="arrow_forward" size={16} />
                </Button>
              </div>
            </M.div>

            {/* Right: lyric companion panel (desktop only) */}
            <M.div
              className="hidden lg:block"
              initial={reducedMotion ? false : { opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-col gap-3">
                {/* Fake editor window */}
                <div className="rounded-xl border border-zinc-700/40 overflow-hidden bg-zinc-950/60 backdrop-blur-md shadow-elevated">
                  {/* Title bar */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800/60">
                    <div className="flex gap-1.5">
                      <div className="size-2.5 rounded-full bg-zinc-700" />
                      <div className="size-2.5 rounded-full bg-zinc-700" />
                      <div className="size-2.5 rounded-full bg-zinc-700" />
                    </div>
                    <span className="text-[10px] text-zinc-600 ml-1 font-mono tracking-tight">midnight-city.lrc</span>
                  </div>
                  {/* Lyric lines */}
                  <div className="p-3 space-y-0.5">
                    {LYRIC_LINES.map((line, i) => (
                      <div
                        key={i}
                        className={[
                          'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors',
                          reducedMotion ? '' : 'animate-fade-in',
                          line.active
                            ? 'bg-primary/8 border border-primary/20'
                            : 'hover:bg-zinc-800/30',
                        ].join(' ')}
                        style={reducedMotion ? {} : {
                          animationDelay: `${0.6 + i * 0.1}s`,
                          animationFillMode: 'both',
                          animationDuration: '0.4s',
                        }}
                      >
                        <span className={`font-mono text-[9px] shrink-0 tabular-nums ${line.active ? 'text-primary' : 'text-zinc-700'}`}>
                          {line.ts}
                        </span>
                        <span className={`truncate font-sans text-xs ${line.active ? 'text-zinc-100' : 'text-zinc-500'}`}>
                          {line.text}
                        </span>
                        {line.active && (
                          <span className={`size-1.5 rounded-full bg-primary ml-auto shrink-0 ${reducedMotion ? '' : 'animate-pulse'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Waveform companion */}
                <div className="px-4 py-3 rounded-xl border border-zinc-800/40 bg-zinc-950/50 backdrop-blur-sm">
                  <div className="flex items-end gap-0.5 h-10">
                    {Array.from({ length: 48 }, (_, i) => {
                      const h = 15 + 75 * Math.abs(Math.sin(i * 0.47 + 1));
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-full bg-primary/25"
                          style={{
                            height: `${h}%`,
                            transformOrigin: 'bottom',
                            animation: reducedMotion
                              ? 'none'
                              : `waveBar ${0.9 + (i % 5) * 0.15}s ease-in-out ${i * 0.025}s infinite`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </M.div>
          </div>

          {/* Scroll indicator */}
          {!reducedMotion && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-zinc-600 animate-bounce">
              <div className="w-px h-6 bg-gradient-to-b from-transparent to-zinc-600" />
            </div>
          )}
        </section>

        {/* ── FEATURES ── */}
        <section className="relative px-6 sm:px-10 lg:px-16 xl:px-24 py-24">
          <div className="max-w-7xl mx-auto flex flex-col gap-12">
            <M.div
              className="flex flex-col gap-1"
              initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ root: scrollRef, once: false, margin: '-80px' }}
              transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
                {t('landing.featuresLabel')}
              </p>
              <h2 className="font-heading text-zinc-100 contrast-more:text-white"
                  style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
                {t('landing.featuresTitle')}
              </h2>
            </M.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800/40 rounded-2xl overflow-hidden border border-zinc-800/40">
              {FEATURES.map(({ iconName, color, bg, titleKey, descKey }, i) => (
                <M.div
                  key={titleKey}
                  className="flex flex-col gap-4 p-6 bg-zinc-950/80 hover:bg-zinc-900/60 transition-colors"
                  initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ root: scrollRef, once: false, margin: '-60px' }}
                  transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : i * 0.08, ease: 'easeOut' }}
                >
                  <div className={`size-10 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon name={iconName} size={20} className={color} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-semibold text-zinc-100 text-sm">{tk(titleKey)}</h3>
                    <p className="text-[11px] text-zinc-500 contrast-more:text-zinc-300 leading-relaxed">{tk(descKey)}</p>
                  </div>
                </M.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="relative px-6 sm:px-10 lg:px-16 xl:px-24 py-24">
          <div className="max-w-3xl mx-auto flex flex-col gap-12">
            <M.div
              className="flex flex-col gap-1"
              initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ root: scrollRef, once: false, margin: '-80px' }}
              transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
                {t('landing.howLabel')}
              </p>
              <h2 className="font-heading text-zinc-100 contrast-more:text-white"
                  style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
                {t('landing.howTitle')}
              </h2>
            </M.div>

            <div className="flex flex-col">
              {STEPS.map(({ n, iconName, titleKey, descKey }, i) => (
                <M.div
                  key={n}
                  className="flex gap-5 relative"
                  initial={reducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ root: scrollRef, once: false, margin: '-40px' }}
                  transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : i * 0.1, ease: 'easeOut' }}
                >
                  {/* Left: step indicator column */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="size-10 rounded-xl bg-zinc-900 border border-zinc-800 contrast-more:border-zinc-600 flex items-center justify-center relative">
                      <Icon name={iconName} size={16} className="text-zinc-400" />
                      <span className="absolute -top-2 -right-2 font-heading text-[9px] text-primary bg-zinc-950 border border-primary/30 rounded-full size-5 flex items-center justify-center leading-none">
                        {n}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-px flex-1 mt-2 mb-2 bg-zinc-800/60 contrast-more:bg-zinc-600" style={{ minHeight: '2rem' }} />
                    )}
                  </div>
                  {/* Right: content */}
                  <div className={`flex flex-col gap-0.5 text-left ${i < STEPS.length - 1 ? 'pb-8' : ''}`}>
                    <h3 className="text-sm font-semibold text-zinc-100">{tk(titleKey)}</h3>
                    <p className="text-[12px] text-zinc-500 contrast-more:text-zinc-300 leading-relaxed">{tk(descKey)}</p>
                  </div>
                </M.div>
              ))}
            </div>

            {/* Footer CTA */}
            <M.div
              className="flex flex-col items-start gap-5 pt-4 border-t border-zinc-800/50"
              initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ root: scrollRef, once: false, margin: '-40px' }}
              transition={{ duration: reducedMotion ? 0 : 0.55, ease: 'easeOut' }}
            >
              <h2 className="font-heading text-zinc-100 contrast-more:text-white"
                  style={{ fontSize: 'clamp(1.25rem, 3vw, 2rem)' }}>
                {t('landing.ctaFooterTitle')}
              </h2>
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Button size="lg" onClick={() => navigate('/project/new')} className="gap-2 px-7 h-12 font-normal">
                  {t('landing.ctaStart')}
                  <Icon name="arrow_forward" size={16} />
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate('/auth/signup')} className="px-7 h-12 font-normal contrast-more:border-zinc-400">
                  {t('landing.ctaSignUp')}
                </Button>
              </div>
              <p className="text-xs text-zinc-600 contrast-more:text-zinc-400">{t('landing.ctaFooterSub')}</p>
            </M.div>
          </div>
        </section>

      </div>
    </LazyMotion>
  );
}
