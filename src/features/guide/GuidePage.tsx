import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { lastEditorPath, requestTourReplay } from '@/features/editor/tour/tour-launch';
import { GUIDE_SECTIONS, type GuideSectionId } from './guide-sections';
import { GuideSection } from './components/GuideSection';
import { GuideToc, GuideTocList } from './components/GuideToc';

const GROUPS = ['basics', 'features'] as const;

export default function GuidePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Captured once, synchronously, before a global URL-param-sync effect elsewhere
  // in the app replaces the location (dropping the hash) shortly after mount.
  const initialHashRef = useRef(typeof window !== 'undefined' ? window.location.hash : '');
  const scrollerRef = useRef<HTMLDivElement>(null);
  const editorPath = lastEditorPath();

  useEffect(() => {
    const hash = initialHashRef.current;
    if (!hash) return;
    const id = hash.slice(1);
    // Bodies load lazily and are taller than their fallbacks, so scrolling before
    // the ones above the target resolve would land short of it. `import` is an alias of `start`.
    const targetId = id === 'import' ? 'start' : id;
    const upTo = GUIDE_SECTIONS.findIndex((s) => s.id === targetId) + 1;
    let cancelled = false;
    // Any sign the reader took over (scroll, nav pill, key, hash change) cancels the pending scroll.
    const targets: EventTarget[] = [window];
    if (scrollerRef.current) targets.push(scrollerRef.current);
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'hashchange'];
    const cancel = () => {
      cancelled = true;
      for (const target of targets) for (const type of events) target.removeEventListener(type, cancel);
    };
    for (const target of targets) for (const type of events) target.addEventListener(type, cancel, { passive: true });
    Promise.all(GUIDE_SECTIONS.slice(0, upTo).map((s) => s.load()))
      .catch(() => undefined)
      .then(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
      .then(() => {
        if (cancelled) return;
        cancel();
        document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    return cancel;
  }, []);

  // The section being read: the topmost one inside a band just under the top of the scroller.
  const [activeId, setActiveId] = useState<GuideSectionId | null>(null);
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      }
      const first = GUIDE_SECTIONS.find((s) => visible.has(s.id));
      if (first) setActiveId(first.id);
    }, { root, rootMargin: '0px 0px -70% 0px' });
    for (const s of GUIDE_SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const replayTour = () => {
    if (!editorPath) return;
    requestTourReplay();
    navigate(editorPath);
  };

  return (
    <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex gap-10 px-4 pt-8 pb-24 max-w-6xl mx-auto w-full animate-fade-in">
      <aside className="hidden lg:block sticky top-8 self-start shrink-0 max-h-[calc(100dvh-8rem)] overflow-y-auto">
        <GuideToc activeId={activeId} />
      </aside>
      <div className="flex flex-col flex-1 min-w-0 max-w-3xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-heading font-semibold text-foreground">{t('guide.title')}</h1>
            <p className="text-sm text-muted-foreground mt-2">{t('guide.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {editorPath && (
              <Button variant="outline" size="sm" onClick={replayTour}>
                <Icon name="refresh" size={14} />
                {t('guide.replayTour')}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <Icon name="arrow_back" size={14} />
              {t('guide.backToEditor')}
            </Button>
          </div>
        </div>

        {/* Narrow screens: no room for the sidebar, so the same list folds under the title. */}
        <details className="lg:hidden mb-10 pb-6 border-b border-zinc-800/60 group">
          <summary className="flex items-center gap-2 cursor-pointer list-none text-sm font-semibold text-foreground min-h-11 [&::-webkit-details-marker]:hidden">
            <Icon name="toc" size={18} />
            {t('guide.toc.contents')}
            <Icon name="expand_more" size={18} className="ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <div className="pt-3">
            <GuideTocList activeId={activeId} label={t('guide.toc.contents')} />
          </div>
        </details>
        <div className="hidden lg:block mb-10 pb-6 border-b border-zinc-800/60" />

        <div className="flex flex-col gap-16">
          {GROUPS.map((group) => (
            <div key={group} className="flex flex-col gap-12">
              <div>
                <h2 className="text-2xl font-heading font-semibold text-foreground">{t(`guide.groups.${group}.title`)}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t(`guide.groups.${group}.hint`)}</p>
              </div>
              {GUIDE_SECTIONS.filter((s) => s.group === group).map((section) => (
                <GuideSection key={section.id} section={section}>
                  {/* Legacy anchor: the old "Importing lyrics" section folded into Start. */}
                  {section.id === 'start' && <span id="import" className="absolute top-0 scroll-mt-20" />}
                </GuideSection>
              ))}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
