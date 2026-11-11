import { Suspense, lazy, type ComponentType, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { GUIDE_SECTIONS, type GuideSectionDef, type GuideSectionId } from '../guide-sections';

// One lazy component per section, created once at module level: lazy() inside render would remount.
const BODIES = new Map<GuideSectionId, ComponentType>(GUIDE_SECTIONS.map((s) => [s.id, lazy(s.load)]));

export function GuideSection({ section, children }: { section: GuideSectionDef; children?: ReactNode }) {
  const { t } = useTranslation();
  // Looked up from the module-level cache above, so the identity is stable across renders.
  const Body = BODIES.get(section.id);
  if (!Body) return null;
  return (
    <section id={section.id} className="relative scroll-mt-20 flex flex-col gap-3">
      {children}
      <h3 className="text-xl font-semibold text-zinc-100">{t(`guide.sections.${section.id}.title`)}</h3>
      <Suspense fallback={<div className="h-16 rounded-lg bg-zinc-900/60 animate-pulse" aria-hidden="true" />}>
        {/* eslint-disable-next-line react-hooks/static-components */}
        <Body />
      </Suspense>
    </section>
  );
}
