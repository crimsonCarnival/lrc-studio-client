import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { cn } from '@/shared/utils/utils';
import { pageCount, pageRange, pageWindow } from './list-pager';

type ListPagerProps = {
  /** 1-based. */
  page: number;
  perPage: number;
  total: number;
  /** Items actually on this page (the last page may be short). */
  shown: number;
  onPageChange: (page: number) => void;
};

/** "7–12 of 24" plus prev / numbered pages / next. Renders nothing when everything fits on one page. */
export function ListPager({ page, perPage, total, shown, onPageChange }: ListPagerProps) {
  const { t } = useTranslation();
  if (total <= perPage) return null;

  const pages = pageCount(total, perPage);
  const range = pageRange(page, perPage, shown);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {range && (
        <span className="font-mono text-xs text-muted-foreground">
          {t('playlists.lists.range', { from: range.from, to: range.to, total })}
        </span>
      )}
      <div className="flex-1" />
      <nav aria-label={t('playlists.lists.pages')} className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-9 rounded-lg"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={t('playlists.lists.previousPage')}
        >
          <Icon name="chevron_left" size={16} />
        </Button>
        {pageWindow(page, pages).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} aria-hidden="true" className="min-w-6 text-center text-sm text-muted-foreground">…</span>
          ) : (
            <Button
              key={item}
              type="button"
              variant="outline"
              size="sm"
              aria-current={item === page ? 'page' : undefined}
              aria-label={t('playlists.lists.goToPage', { page: item })}
              onClick={() => onPageChange(item)}
              className={cn(
                'h-9 min-w-9 px-2 rounded-lg font-mono text-sm',
                item === page && 'bg-primary text-primary-foreground border-primary hover:bg-primary hover:text-primary-foreground',
              )}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-9 rounded-lg"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          aria-label={t('playlists.lists.nextPage')}
        >
          <Icon name="chevron_right" size={16} />
        </Button>
      </nav>
    </div>
  );
}
