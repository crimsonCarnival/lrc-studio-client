import { cn } from '@/shared/utils/utils';
import { LazyMotion, domAnimation, m as M, useMotionValue, useSpring } from 'framer-motion';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollProgress({ className, springOptions, containerRef }) {
  const motionValue = useMotionValue(0);
  const scaleX = useSpring(motionValue, {
    stiffness: 200,
    damping: 50,
    restDelta: 0.001,
    ...springOptions,
  });
  const { pathname } = useLocation();

  // Reset bar on route change
  useEffect(() => {
    motionValue.set(0);
  }, [pathname, motionValue]);

  useEffect(() => {
    const el = containerRef?.current;
    if (el) {
      const handleScroll = () => {
        const scrollMax = el.scrollHeight - el.clientHeight;
        if (scrollMax <= 0) { motionValue.set(0); return; }
        motionValue.set(el.scrollTop / scrollMax);
      };
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }

    // No containerRef: listen for any scrollable element (used by guest landing page header)
    const handleScroll = (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const scrollMax = target.scrollHeight - target.clientHeight;
      if (scrollMax <= 0) return;
      if (target.closest('.z-modal')) return;
      motionValue.set(target.scrollTop / scrollMax);
    };
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', handleScroll, { capture: true, passive: true });
  }, [motionValue, containerRef]);

  return (
    <LazyMotion features={domAnimation}>
      <M.div
        className={cn(
          'fixed inset-x-0 top-0 z-nav h-1 origin-left bg-gradient-to-r from-primary to-accent-blue',
          className,
        )}
        style={{ scaleX }}
      />
    </LazyMotion>
  );
}
