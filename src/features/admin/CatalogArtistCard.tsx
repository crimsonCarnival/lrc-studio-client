import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Icon } from '@/shared/ui/Icon';
import type { CatalogArtist } from '@/features/catalog/catalog.types';
import { CatalogTile } from './CatalogTile';

type CatalogArtistCardProps = {
  artist: CatalogArtist;
  onAlbums: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** One approved artist in the browse grid. Edit and delete are icon buttons on wide screens and a menu on phones. */
export function CatalogArtistCard({ artist, onAlbums, onEdit, onDelete }: CatalogArtistCardProps) {
  const { t } = useTranslation();
  const name = artist.name;
  return (
    <li className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] bg-raised text-foreground inset-ring inset-ring-hl transition-[box-shadow,translate] duration-[var(--duration-state)] hover:-translate-y-0.5 hover:inset-ring-faint hover:shadow-[var(--shadow-elevated)] motion-reduce:hover:translate-y-0">
      <CatalogTile url={artist.imageUrl} name={name} alt={t('admin.catalogTab.form.imageAlt', { name })} className="aspect-square w-full">
        <span className="absolute left-2.5 top-2.5 rounded-[var(--radius-chip)] bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
          {t(artist.source === 'community' ? 'admin.catalogTab.browse.sourceCommunity' : 'admin.catalogTab.browse.sourceAdmin')}
        </span>
      </CatalogTile>

      <div className="flex flex-col gap-1.5 px-3.5 pb-3.5 pt-3">
        <div className="flex min-h-10 flex-col gap-0.5">
          <h3 className="truncate text-[15px] font-semibold group-hover:text-primary-ink" title={name}>{name}</h3>
          {artist.disambiguation && <p className="truncate text-xs text-subtle">{artist.disambiguation}</p>}
        </div>

        <div className="mt-1 flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1" aria-label={t('admin.catalogTab.browse.showAlbumsLabel', { name })} onClick={onAlbums}>
            {t('admin.catalogTab.browse.showAlbums')}
          </Button>
          <div className="hidden gap-2 sm:flex">
            <Button type="button" variant="outline" size="icon-sm" aria-label={t('admin.catalogTab.browse.editLabel', { name })} onClick={onEdit}>
              <Icon name="edit" size={16} />
            </Button>
            <Button type="button" variant="destructive" size="icon-sm" aria-label={t('admin.catalogTab.browse.deleteLabel', { name })} onClick={onDelete}>
              <Icon name="delete" size={16} />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon-sm" className="sm:hidden" aria-label={t('admin.catalogTab.browse.moreActions', { name })}>
                <Icon name="more_vert" size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit} className="max-lg:min-h-11">{t('admin.catalogTab.browse.edit')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={onDelete} className="text-love max-lg:min-h-11">{t('admin.catalogTab.browse.delete')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}
