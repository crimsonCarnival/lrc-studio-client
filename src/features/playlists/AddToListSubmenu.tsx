import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { MenuComponents } from '@ui/menu-components';
import { Icon } from '@/shared/ui/Icon';
import { LogoLoader } from '@ui/LogoLoader';
import { addProjectToPlaylist, getPlaylists } from './playlist.service';

type Props = {
  C: MenuComponents;
  accountName: string;
  publicId: string;
  className?: string;
};

/**
 * "Add to list" as a submenu of a project menu: the signed-in user's own lists, the ones already
 * holding the project checked and disabled. The lists are fetched when the submenu first opens
 * (its content only mounts then), and the key sits under 'playlists' so any list write refetches it.
 */
export function AddToListSubmenu({ C, accountName, publicId, className }: Props) {
  const { t } = useTranslation();
  return (
    <C.Sub>
      <C.SubTrigger className={className}>
        <Icon name="playlist_add" />
        {t('projectView.actions.addToList')}
      </C.SubTrigger>
      <C.SubContent>
        <ListItems C={C} accountName={accountName} publicId={publicId} className={className} />
      </C.SubContent>
    </C.Sub>
  );
}

function ListItems({ C, accountName, publicId, className }: Props) {
  const { t } = useTranslation();
  const { data: lists, isPending, isError } = useQuery({
    queryKey: ['playlists', 'picker', accountName],
    queryFn: () => getPlaylists(accountName),
  });

  if (isPending) {
    return (
      <C.Item disabled className={className}>
        <LogoLoader size={14} />
        {t('projectView.actions.loadingLists')}
      </C.Item>
    );
  }
  if (isError || !lists?.length) {
    return <C.Item disabled className={className}>{t('projectView.actions.noLists')}</C.Item>;
  }

  const add = (id: string, name: string) => {
    addProjectToPlaylist(id, publicId)
      .then(() => toast.success(t('projectView.actions.addedToList', { name })))
      .catch(() => toast.error(t('projectView.actions.addToListFailed')));
  };

  return lists.map((list) => {
    const inList = list.projects?.some((p) => p?.publicId === publicId) ?? false;
    return (
      <C.Item key={list.id} disabled={inList} onClick={() => add(list.id, list.name)} className={className}>
        <Icon name={inList ? 'check' : 'lists'} />
        <span className="max-w-[16rem] truncate">{list.name}</span>
      </C.Item>
    );
  });
}
