import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LazyMotion, domAnimation, m as M } from 'framer-motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import {
  Music2, FileText, Zap, Download, Mic2, Globe,
  ArrowRight, Sparkles, Play, Tag
} from 'lucide-react';
import { Button } from '@ui/button';
import SmoothWavyCanvas from './SmoothWavyCanvas';
import { ThemedShineBorder } from '@ui/themed-shine-border';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// VIEW is constructed per-render with the scroll container ref as root
// so IntersectionObserver watches the inner div, not the browser viewport.

const FEATURES = [
  { icon: Zap,      color: 'text-primary',       bg: 'bg-primary/10',       titleKey: 'landing.feat1Title', descKey: 'landing.feat1Desc' },
  { icon: Mic2,     color: 'text-accent-purple',  bg: 'bg-accent-purple/10', titleKey: 'landing.feat2Title', descKey: 'landing.feat2Desc' },
  { icon: Globe,    color: 'text-accent-blue',    bg: 'bg-accent-blue/10',   titleKey: 'landing.feat3Title', descKey: 'landing.feat3Desc' },
  { icon: Download, color: 'text-warning',         bg: 'bg-warning/10',       titleKey: 'landing.feat4Title', descKey: 'landing.feat4Desc' },
];

const STEPS = [
  { step: '01', icon: Tag,      titleKey: 'landing.step1Title', descKey: 'landing.step1Desc' },
  { step: '02', icon: Music2,   titleKey: 'landing.step2Title', descKey: 'landing.step2Desc' },
  { step: '03', icon: FileText, titleKey: 'landing.step3Title', descKey: 'landing.step3Desc' },
  { step: '04', icon: Zap,      titleKey: 'landing.step4Title', descKey: 'landing.step4Desc' },
];

export default function GuestLanding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const reducedMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
    <div ref={scrollRef} className="h-full overflow-y-auto scroll-smooth scrollbar-none">
      <SmoothWavyCanvas />

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <M.div
          className="flex flex-col items-center gap-8 max-w-3xl w-full"
          initial={reducedMotion ? false : "hidden"}
          animate="visible"
          variants={reducedMotion ? {} : stagger}
        >
          <M.div
            variants={reducedMotion ? {} : fadeUp}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold tracking-wide"
          >
            <Sparkles className="size-3.5" />
            {t('landing.badge')}
          </M.div>

          <M.div variants={reducedMotion ? {} : fadeUp} className="flex flex-col items-center gap-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-zinc-100 leading-[1.1]">
              {t('landing.headline')}{' '}
              <span className="text-primary">{t('landing.headlineAccent')}</span>
            </h1>
            <p className="text-zinc-300 text-base sm:text-lg max-w-xl leading-relaxed">
              {t('landing.sub')}
            </p>
          </M.div>

          <M.div variants={reducedMotion ? {} : fadeUp} className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate('/project/new')}
              className="gap-2 px-6 h-11 text-sm font-normal shadow-lg shadow-primary/20"
            >
              <Play className="size-4" />
              {t('landing.ctaStart')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate('/auth/signin')}
              className="gap-2 px-6 h-11 text-sm font-normal text-zinc-400 hover:text-zinc-100"
            >
              {t('landing.ctaSignIn')}
              <ArrowRight className="size-4" />
            </Button>
          </M.div>
        </M.div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-10 max-w-5xl w-full">
          <M.div
            className="flex flex-col items-center gap-2 text-center"
            initial={reducedMotion ? false : "hidden"}
            whileInView={reducedMotion ? undefined : "visible"}
            viewport={reducedMotion ? undefined : { root: scrollRef, once: true, margin: '-80px' }}
            variants={reducedMotion ? {} : stagger}
          >
            <M.h2 variants={reducedMotion ? {} : fadeUp} className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {t('landing.featuresLabel')}
            </M.h2>
            <M.p variants={reducedMotion ? {} : fadeUp} className="text-xl sm:text-2xl lg:text-3xl font-semibold text-zinc-100 tracking-tight">
              {t('landing.featuresTitle')}
            </M.p>
          </M.div>

          <M.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
            initial={reducedMotion ? false : "hidden"}
            whileInView={reducedMotion ? undefined : "visible"}
            viewport={reducedMotion ? undefined : { root: scrollRef, once: true, margin: '-80px' }}
            variants={reducedMotion ? {} : stagger}
          >
            {FEATURES.map(({ icon: Icon, color, bg, titleKey, descKey }) => (
              <M.div
                key={titleKey}
                variants={reducedMotion ? {} : fadeUp}
                className="glass rounded-2xl p-6 sm:p-5 flex gap-4 hover:border-zinc-600/50 transition-colors relative overflow-hidden"
              >
                <ThemedShineBorder />
                <div className={`size-10 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className={`size-5 ${color}`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm sm:text-xs font-semibold text-zinc-100">{t(titleKey)}</h3>
                  <p className="text-xs sm:text-[11px] text-zinc-400 leading-relaxed">{t(descKey)}</p>
                </div>
              </M.div>
            ))}
          </M.div>
        </div>
      </section>

      {/* ── How it works + CTA ─────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">
        <M.div
          className="flex flex-col items-center gap-10 max-w-5xl w-full"
          initial={reducedMotion ? false : "hidden"}
          whileInView={reducedMotion ? undefined : "visible"}
          viewport={reducedMotion ? undefined : { root: scrollRef, once: true, margin: '-80px' }}
          variants={reducedMotion ? {} : stagger}
        >
          {/* Section header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <M.h2 variants={reducedMotion ? {} : fadeUp} className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {t('landing.howLabel')}
            </M.h2>
            <M.p variants={reducedMotion ? {} : fadeUp} className="text-xl sm:text-2xl lg:text-3xl font-semibold text-zinc-100 tracking-tight">
              {t('landing.howTitle')}
            </M.p>
          </div>

          {/* 2×2 step grid */}
          <M.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
            variants={reducedMotion ? {} : stagger}
          >
            {STEPS.map(({ step, icon: Icon, titleKey, descKey }) => (
              <M.div
                key={step}
                variants={reducedMotion ? {} : fadeUp}
                className="flex items-center gap-3 p-4 glass rounded-xl relative overflow-hidden"
              >
                <ThemedShineBorder />
                <div className="flex items-center justify-center size-9 rounded-xl bg-zinc-800/80 border border-zinc-700/50 relative shrink-0">
                  <Icon className="size-4 text-zinc-400" />
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black text-primary bg-zinc-900 border border-primary/30 rounded-full size-4 flex items-center justify-center leading-none">
                    {step}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <h3 className="text-sm sm:text-xs font-semibold text-zinc-100">{t(titleKey)}</h3>
                  <p className="text-sm sm:text-[11px] text-zinc-400 leading-relaxed">{t(descKey)}</p>
                </div>
              </M.div>
            ))}
          </M.div>

          {/* CTA */}
          <M.div variants={reducedMotion ? {} : fadeUp} className="flex flex-col items-center gap-5 text-center w-full max-w-lg pt-2">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-400/50 dark:via-zinc-700/50 to-transparent" />
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100">
              {t('landing.ctaFooterTitle')}
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate('/project/new')}
                className="gap-2 px-8 h-11 text-sm font-normal"
              >
                {t('landing.ctaStart')}
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/auth/signup')}
                className="px-8 h-11 text-sm font-normal"
              >
                {t('landing.ctaSignUp')}
              </Button>
            </div>
            <p className="text-xs text-zinc-400">{t('landing.ctaFooterSub')}</p>
          </M.div>
        </M.div>
      </section>

    </div>
    </LazyMotion>
  );
}
