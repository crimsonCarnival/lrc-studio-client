import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ui/dialog';
import { LogoLoader } from '@ui/LogoLoader';
import { Icon } from '@/shared/ui/Icon';
import type { CatalogAlbum, CatalogArtist } from '@/features/catalog/catalog.types';
import { CatalogTile } from './CatalogTile';

type CatalogAlbumsDrawerProps = {
  artist: CatalogArtist | null;
  /** undefined while the albums have not loaded. */
  albums: CatalogAlbum[] | undefined;
  failed: boolean;
  onRetry: () => void;
  onNew: () => void;
  onDetect: () => void;
  onEdit: (album: CatalogAlbum) => void;
  onDelete: (album: CatalogAlbum) => void;
  onClose: () => void;
};

/** The albums of one artist, in a panel that slides over the right edge so the artist grid stays in place behind it. */
export function CatalogAlbumsDrawer({ artist, albums, failed, onRetry, onNew, onDetect, onEdit, onDelete, onClose }: CatalogAlbumsDrawerProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={artist !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="top-0 right-0 left-auto h-dvh max-h-dvh w-full max-w-full translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none border-y-0 border-r-0 sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{t('admin.catalogTab.drawer.title', { name: artist?.name ?? '' })}</DialogTitle>
          <DialogDescription>{albums ? t('admin.catalogTab.drawer.count', { count: albums.length }) : t('admin.catalogTab.drawer.description')}</DialogDescription>
        </DialogHeader>

        {failed && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-love">
            <span>{t('admin.catalogTab.browse.albumsLoadError')}</span>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>{t('admin.catalogTab.retry')}</Button>
          </div>
        )}
        {!albums && !failed && <div className="flex justify-center py-8"><LogoLoader size={28} /></div>}
        {albums && albums.length === 0 && <p className="text-sm text-muted-foreground">{t('admin.catalogTab.browse.noAlbums')}</p>}

        <ul className="flex flex-col gap-2">
          {(albums ?? []).map((album) => (
            <li key={album.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2">
              <CatalogTile url={album.coverUrl} name={album.title} alt={t('admin.catalogTab.form.imageAlt', { name: album.title })} className="size-14 shrink-0 rounded-lg" initialClassName="text-xl" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-foreground" title={album.title}>{album.title}</span>
                {album.year && <span className="text-xs text-muted-foreground">{album.year}</span>}
              </div>
              <Button type="button" variant="outline" size="icon-sm" aria-label={t('admin.catalogTab.browse.editLabel', { name: album.title })} onClick={() => onEdit(album)}>
                <Icon name="edit" size={16} />
              </Button>
              <Button type="button" variant="destructive" size="icon-sm" aria-label={t('admin.catalogTab.browse.deleteLabel', { name: album.title })} onClick={() => onDelete(album)}>
                <Icon name="delete" size={16} />
              </Button>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={!albums} onClick={onNew}>
            <Icon name="add" size={14} /> {t('admin.catalogTab.browse.newAlbum')}
          </Button>
          <Button type="button" variant="outline" disabled={!albums} onClick={onDetect}>
            <Icon name="search" size={14} /> {t('admin.catalogTab.detect.button')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
