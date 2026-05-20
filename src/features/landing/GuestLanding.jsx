import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
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
  { icon: Download, color: 'text-green-400',      bg: 'bg-green-400/10',     titleKey: 'landing.feat4Title', descKey: 'landing.feat4Desc' },
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

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto scroll-smooth scrollbar-none">
      <SmoothWavyCanvas />

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          className="flex flex-col items-center gap-8 max-w-3xl w-full"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold tracking-wide"
          >
            <Sparkles className="size-3.5" />
            {t('landing.badge')}
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-col items-center gap-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-100 leading-[1.1]">
              {t('landing.headline')}{' '}
              <span className="text-primary">{t('landing.headlineAccent')}</span>
            </h1>
            <p className="text-zinc-300 text-base sm:text-lg max-w-xl leading-relaxed">
              {t('landing.sub')}
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate('/project/new')}
              className="gap-2 px-6 h-11 text-sm font-semibold shadow-lg shadow-primary/20"
            >
              <Play className="size-4" />
              {t('landing.ctaStart')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate('/auth/signin')}
              className="gap-2 px-6 h-11 text-sm font-medium text-zinc-400 hover:text-zinc-100"
            >
              {t('landing.ctaSignIn')}
              <ArrowRight className="size-4" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-10 max-w-5xl w-full">
          <motion.div
            className="flex flex-col items-center gap-2 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ root: scrollRef, once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
              {t('landing.featuresLabel')}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl sm:text-2xl lg:text-3xl font-semibold text-zinc-100 tracking-tight">
              {t('landing.featuresTitle')}
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
            initial="hidden"
            whileInView="visible"
            viewport={{ root: scrollRef, once: true, margin: '-80px' }}
            variants={stagger}
          >
            {FEATURES.map(({ icon: Icon, color, bg, titleKey, descKey }) => (
              <motion.div
                key={titleKey}
                variants={fadeUp}
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
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works + CTA ─────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16">
        <motion.div
          className="flex flex-col items-center gap-10 max-w-5xl w-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ root: scrollRef, once: true, margin: '-80px' }}
          variants={stagger}
        >
          {/* Section header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <motion.h2 variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
              {t('landing.howLabel')}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl sm:text-2xl lg:text-3xl font-semibold text-zinc-100 tracking-tight">
              {t('landing.howTitle')}
            </motion.p>
          </div>

          {/* 2×2 step grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full"
            variants={stagger}
          >
            {STEPS.map(({ step, icon: Icon, titleKey, descKey }) => (
              <motion.div
                key={step}
                variants={fadeUp}
                className="flex items-center gap-3 p-4 glass rounded-xl relative overflow-hidden"
              >
                <ThemedShineBorder />
                <div className="flex items-center justify-center size-9 rounded-xl bg-zinc-800/80 border border-zinc-700/50 relative shrink-0">
                  <Icon className="size-4 text-zinc-400" />
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black text-primary bg-zinc-900 border border-primary/30 rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {step}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <h3 className="text-sm sm:text-xs font-semibold text-zinc-100">{t(titleKey)}</h3>
                  <p className="text-sm sm:text-[11px] text-zinc-400 leading-relaxed">{t(descKey)}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div variants={fadeUp} className="flex flex-col items-center gap-5 text-center w-full max-w-lg pt-2">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-400/50 dark:via-zinc-700/50 to-transparent" />
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100">
              {t('landing.ctaFooterTitle')}
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate('/project/new')}
                className="gap-2 px-8 h-11 text-sm font-semibold"
              >
                {t('landing.ctaStart')}
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/auth/signup')}
                className="px-8 h-11 text-sm font-medium"
              >
                {t('landing.ctaSignUp')}
              </Button>
            </div>
            <p className="text-xs text-zinc-400">{t('landing.ctaFooterSub')}</p>
          </motion.div>
        </motion.div>
      </section>

    </div>
  );
}
