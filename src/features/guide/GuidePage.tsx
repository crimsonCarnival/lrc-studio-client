import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { ScreenshotPlaceholder } from './ScreenshotPlaceholder';

const SECTION_ORDER = ['sync', 'player', 'saveUndo', 'sections', 'preview', 'furigana', 'share', 'import'] as const;

export default function GuidePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Captured once, synchronously, before a global URL-param-sync effect elsewhere
  // in the app replaces the location (dropping the hash) shortly after mount.
  const initialHashRef = useRef(typeof window !== 'undefined' ? window.location.hash : '');

  useEffect(() => {
    const hash = initialHashRef.current;
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col px-4 pt-8 pb-24 max-w-3xl mx-auto w-full animate-fade-in">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-heading font-semibold text-foreground">{t('guide.title')}</h1>
            <p className="text-sm text-muted-foreground mt-2">{t('guide.subtitle')}</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
          >
            <Icon name="arrow_back" size={14} />
            {t('guide.backToEditor')}
          </button>
        </div>

        {/* Section nav */}
        <nav className="flex flex-wrap gap-1.5 mb-10 pb-6 border-b border-zinc-800/60">
          {SECTION_ORDER.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="px-3 py-1.5 text-xs font-medium rounded-full bg-zinc-900/60 border border-zinc-800/60 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
            >
              {t(`guide.nav.${id}`)}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-16">
          <section id="sync" className="scroll-mt-20 flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-zinc-100">{t('guide.sections.sync.title')}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.sync.body1')}</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.sync.body2')}</p>
            <ScreenshotPlaceholder id="sync-1" caption={t('guide.sections.sync.shot')} />
          </section>

          <section id="player" className="scroll-mt-20 flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-zinc-100">{t('guide.sections.player.title')}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.player.body1')}</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.player.body2')}</p>
            <ScreenshotPlaceholder id="player-1" caption={t('guide.sections.player.shot')} />
          </section>

          <section id="saveUndo" className="scroll-mt-20 flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-zinc-100">{t('guide.sections.saveUndo.title')}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.saveUndo.body1')}</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.saveUndo.body2')}</p>
            <ScreenshotPlaceholder id="save-undo-1" caption={t('guide.sections.saveUndo.shot')} aspect="aspect-[3/1]" />
          </section>

          <section id="sections" className="scroll-mt-20 flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-zinc-100">{t('guide.sections.sections.title')}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.sections.body1')}</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.sections.body2')}</p>
            <ScreenshotPlaceholder id="sections-singers-1" caption={t('guide.sections.sections.shot')} />
          </section>

          <section id="preview" className="scroll-mt-20 flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-zinc-100">{t('guide.sections.preview.title')}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.preview.body1')}</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.preview.body2')}</p>
            <ScreenshotPlaceholder id="preview-1" caption={t('guide.sections.preview.shot')} />
          </section>

          <section id="furigana" className="scroll-mt-20 flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-zinc-100">{t('guide.sections.furigana.title')}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.furigana.body1')}</p>
            <ScreenshotPlaceholder id="furigana-1" caption={t('guide.sections.furigana.shot1')} />
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.furigana.body2')}</p>
            <ScreenshotPlaceholder id="furigana-2" caption={t('guide.sections.furigana.shot2')} />
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.furigana.body3')}</p>
            <ScreenshotPlaceholder id="furigana-3" caption={t('guide.sections.furigana.shot3')} aspect="aspect-[3/1]" />
          </section>

          <section id="share" className="scroll-mt-20 flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-zinc-100">{t('guide.sections.share.title')}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.share.body1')}</p>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.share.body2')}</p>
            <ScreenshotPlaceholder id="share-export-1" caption={t('guide.sections.share.shot')} aspect="aspect-[3/1]" />
          </section>

          <section id="import" className="scroll-mt-20 flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-zinc-100">{t('guide.sections.import.title')}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{t('guide.sections.import.body1')}</p>
            <ScreenshotPlaceholder id="import-1" caption={t('guide.sections.import.shot')} />
          </section>
        </div>
      </div>
    </div>
  );
}
