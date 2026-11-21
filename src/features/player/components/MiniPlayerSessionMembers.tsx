import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/utils';
import { useMySessions } from '@/features/collab/hooks/useMySessions';

/**
 * Who is in the live session the mini player came from, so leaving it does not mean losing
 * sight of it. From the session list (refreshed every minute), so it shows members rather than
 * who is connected this second.
 */
export function MiniPlayerSessionMembers({ publicId }: { publicId: string }) {
  const { t } = useTranslation();
  const { sessions } = useMySessions();
  const session = sessions.find((s) => s.publicId === publicId);
  if (!session || session.memberCount === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 pb-2 text-xs text-subtle">
      <span className="flex" aria-hidden="true">
        {session.members.slice(0, 4).map((m, i) => (
          <span
            key={`${m.name}-${i}`}
            title={m.name}
            className={cn('size-5 shrink-0 overflow-hidden rounded-full ring-2 ring-raised', i > 0 && '-ml-1.5')}
            style={{ backgroundColor: `var(--color-collab-${m.colorIndex})` }}
          >
            {m.avatarUrl
              ? <img src={m.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
              : <span className="grid size-full place-items-center text-[9px] font-bold text-white">{(m.name || '?')[0].toUpperCase()}</span>}
          </span>
        ))}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-love" aria-hidden="true" />
        {t('player.mini.sessionMembers', { count: session.memberCount })}
      </span>
    </div>
  );
}
