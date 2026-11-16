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
    <li className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-3">
      <CatalogTile url={artist.imageUrl} name={name} alt={t('admin.catalogTab.form.imageAlt', { name })} className="aspect-square rounded-xl">
        <span className="absolute left-2 top-2 rounded-md bg-background/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {t(artist.source === 'community' ? 'admin.catalogTab.browse.sourceCommunity' : 'admin.catalogTab.browse.sourceAdmin')}
        </span>
      </CatalogTile>

      <div className="flex min-h-11 flex-col gap-0.5">
        <h3 className="truncate font-heading text-[15px] font-semibold text-foreground" title={name}>{name}</h3>
        {artist.disambiguation && <p className="truncate text-sm text-muted-foreground">{artist.disambiguation}</p>}
      </div>

      <div className="flex gap-2">
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
    </li>
  );
}
