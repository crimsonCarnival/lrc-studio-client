import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Icon } from '@/shared/ui/Icon';
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
import type { CatalogDecision } from '@/features/catalog/catalog.types';
import { CatalogTile } from './CatalogTile';
import { isCloudinaryUrl } from './catalog-image';
import { entryName } from './catalog-queue';
import type { QueueEntry } from './catalog-queue';

const NOTE_MAX = 500;

type CatalogReviewCardProps = {
  row: QueueEntry;
  parentName: string | null;
  duplicate: boolean;
  busy: boolean;
  onDecide: (row: QueueEntry, decision: CatalogDecision, note: string) => void;
};

/** One pending submission: the photo big enough to judge (click for full size), who sent it, and the decision. */
export function CatalogReviewCard({ row, parentName, duplicate, busy, onDecide }: CatalogReviewCardProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [zoom, setZoom] = useState(false);
  const name = entryName(row);
  const submitter = row.entry.submittedBy;
  const image = row.kind === 'artist' ? row.entry.imageUrl : row.entry.coverUrl;
  const hasImage = isCloudinaryUrl(image);
  const tile = (
    <CatalogTile url={image} name={name} alt={t('admin.catalogTab.queue.imageAlt', { name })} className="size-24 shrink-0 rounded-xl sm:size-28" initialClassName="text-3xl">
      {!hasImage && <span className="absolute bottom-1.5 text-[11px] opacity-80">{t('admin.catalogTab.queue.noImage')}</span>}
    </CatalogTile>
  );
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-start">
      {hasImage ? (
        <>
          <button
            type="button"
            aria-label={t('admin.catalogTab.queue.viewImage', { name })}
            onClick={() => setZoom(true)}
            className="shrink-0 cursor-zoom-in self-start rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {tile}
          </button>
          <ImageLightbox src={zoom ? image : null} alt={t('admin.catalogTab.queue.imageAlt', { name })} onClose={() => setZoom(false)} />
        </>
      ) : tile}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t(`admin.catalogTab.kind.${row.kind}`)}
          </span>
          <span className="break-words font-heading text-sm font-semibold text-foreground">{name}</span>
          {row.kind === 'album' && row.entry.year && <span className="text-xs text-muted-foreground">{row.entry.year}</span>}
        </div>
        {parentName && <p className="text-xs text-muted-foreground">{t('admin.catalogTab.queue.albumBy', { artist: parentName })}</p>}
        {row.kind === 'artist' && row.entry.disambiguation && <p className="text-xs text-muted-foreground">{row.entry.disambiguation}</p>}
        {row.kind === 'artist' && row.entry.bio && <p className="line-clamp-3 text-xs text-muted-foreground">{row.entry.bio}</p>}
        <p className="text-xs text-muted-foreground">
          {t('admin.catalogTab.queue.submittedBy', { name: submitter?.displayName || submitter?.accountName || t('admin.catalogTab.queue.anonymous') })}
        </p>
        {duplicate && (
          <p className="flex items-center gap-1 text-xs font-medium text-love">
            <Icon name="warning" size={12} /> {t('admin.catalogTab.queue.duplicateHint')}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:w-64">
        <Input
          value={note}
          maxLength={NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          aria-label={t('admin.catalogTab.queue.noteLabel', { name })}
          placeholder={t('admin.catalogTab.queue.notePlaceholder')}
        />
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            aria-label={t('admin.catalogTab.queue.approveLabel', { name })}
            onClick={() => onDecide(row, 'approve', note)}
            className="flex-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
          >
            <Icon name="check" size={12} /> {t('admin.catalogTab.queue.approve')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={busy}
            aria-label={t('admin.catalogTab.queue.rejectLabel', { name })}
            onClick={() => onDecide(row, 'reject', note)}
            className="flex-1"
          >
            <Icon name="close" size={12} /> {t('admin.catalogTab.queue.reject')}
          </Button>
        </div>
      </div>
    </li>
  );
}
