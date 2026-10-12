import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/utils';

/** Segmented control that switches between the Projects and Uploads libraries. */
export function LibrarySwitch({ active }: { active: 'projects' | 'uploads' }) {
  const { t } = useTranslation();
  const items = [
    { id: 'projects', to: '/library', label: t('library.tabProjects') },
    { id: 'uploads', to: '/uploads', label: t('library.tabUploads') },
  ] as const;

  return (
    <nav aria-label={t('library.switchLabel')} className="flex w-fit gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          aria-current={active === item.id ? 'page' : undefined}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-semibold transition-colors coarse:min-h-11 flex items-center',
            active === item.id ? 'bg-zinc-700/70 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
