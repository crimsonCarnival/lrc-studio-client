import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { GUIDE_SECTIONS, type GuideSectionId } from '../guide-sections';

export const TOC_HIDDEN_KEY = 'lrc-guide-toc-hidden';
const GROUPS = ['basics', 'features'] as const;

function readHidden(): boolean {
  try { return localStorage.getItem(TOC_HIDDEN_KEY) === '1'; } catch { return false; }
}

function writeHidden(hidden: boolean) {
  try {
    if (hidden) localStorage.setItem(TOC_HIDDEN_KEY, '1');
    else localStorage.removeItem(TOC_HIDDEN_KEY);
  } catch { /* storage unavailable: the choice lasts this visit */ }
}

/** The section links, grouped like the page. Shared by the desktop sidebar and the phone disclosure. */
export function GuideTocList({ activeId, label }: { activeId: GuideSectionId | null; label: string }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={label} className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle">
            {t(`guide.groups.${group}.title`)}
          </p>
          {GUIDE_SECTIONS.filter((s) => s.group === group).map(({ id }) => {
            const current = id === activeId;
            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={current ? 'location' : undefined}
                className={`relative rounded-[calc(var(--radius)*0.8)] px-3 py-1.5 coarse:py-3 text-sm transition-colors duration-[var(--duration-state)] hover:bg-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus ${
                  current
                    ? "font-semibold text-foreground bg-raised before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-sm before:bg-primary before:content-['']"
                    : 'text-subtle'
                }`}
              >
                {t(`guide.nav.${id}`)}
              </a>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/**
 * Left-hand table of contents on wide screens. It can be hidden; the choice is a
 * per-browser convenience, so it lives in localStorage.
 */
export function GuideToc({ activeId }: { activeId: GuideSectionId | null }) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(readHidden);
  const toggle = (next: boolean) => {
    setHidden(next);
    writeHidden(next);
  };

  if (hidden) {
    return (
      <Tip content={t('guide.toc.show')} side="right">
        <Button variant="ghost" size="icon" onClick={() => toggle(false)} aria-label={t('guide.toc.show')} className="size-10 lg:size-10">
          <Icon name="left_panel_open" size={20} />
        </Button>
      </Tip>
    );
  }

  return (
    <div className="flex w-56 flex-col gap-3">
      <div className="flex items-center justify-between gap-2 pl-3">
        <p className="text-sm font-semibold text-foreground">{t('guide.toc.title')}</p>
        <Tip content={t('guide.toc.hide')} side="right">
          <Button variant="ghost" size="icon" onClick={() => toggle(true)} aria-label={t('guide.toc.hide')} className="size-8 lg:size-8">
            <Icon name="left_panel_close" size={18} />
          </Button>
        </Tip>
      </div>
      <GuideTocList activeId={activeId} label={t('guide.toc.title')} />
    </div>
  );
}
