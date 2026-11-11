import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { lastEditorPath, requestTourReplay } from '@/features/editor/tour/tour-launch';
import { GUIDE_SECTIONS } from './guide-sections';
import { GuideSection } from './components/GuideSection';

const GROUPS = ['basics', 'features'] as const;

export default function GuidePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Captured once, synchronously, before a global URL-param-sync effect elsewhere
  // in the app replaces the location (dropping the hash) shortly after mount.
  const initialHashRef = useRef(typeof window !== 'undefined' ? window.location.hash : '');
  const editorPath = lastEditorPath();

  useEffect(() => {
    const hash = initialHashRef.current;
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const replayTour = () => {
    if (!editorPath) return;
    requestTourReplay();
    navigate(editorPath);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col px-4 pt-8 pb-24 max-w-3xl mx-auto w-full animate-fade-in">

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

        <nav className="flex flex-wrap gap-1.5 mb-10 pb-6 border-b border-zinc-800/60">
          {GUIDE_SECTIONS.map(({ id }) => (
            <a
              key={id}
              href={`#${id}`}
              className="px-3 py-1.5 text-xs font-medium rounded-pill bg-zinc-900/60 border border-zinc-800/60 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
            >
              {t(`guide.nav.${id}`)}
            </a>
          ))}
        </nav>

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
                  {section.id === 'start' && <span id="import" />}
                </GuideSection>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
