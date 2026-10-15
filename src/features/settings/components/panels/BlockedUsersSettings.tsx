import { profilePath } from '@/features/profile/profile-path';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '@ui/button';
import { LazyImage } from '@ui/LazyImage';
import { getBlockedUsers, unblockUser, type BlockedUser } from '@/features/profile/profile.service';
import { UserHoverCard } from '@ui/UserHoverCard';

export default function BlockedUsersSettings({ searchTerm }: { searchTerm?: string }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    getBlockedUsers()
      .then(setUsers)
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const handleUnblock = useCallback(async (accountName: string) => {
    setPending(accountName);
    try {
      await unblockUser(accountName);
      setUsers((prev) => prev.filter((u) => u.accountName !== accountName));
    } catch {
      toast.error(t('profile.unblockError'));
    }
    setPending(null);
  }, [t]);

  const query = (searchTerm ?? '').toLowerCase();
  if (query && !`${t('settings.blocked.label')} ${t('settings.blocked.description')} blocked`.toLowerCase().includes(query)) return null;

  return (
    <section className="settings-section rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4">
      <h2 className="text-xs font-bold uppercase tracking-[.09em] text-primary">{t('settings.blocked.label')}</h2>
      <p className="text-sm text-zinc-400 mt-1.5">{t('settings.blocked.description')}</p>

      {loading ? (
        <p className="text-sm text-zinc-400 py-5">{t('settings.blocked.loading')}</p>
      ) : users.length === 0 ? (
        <div className="mt-4 mb-2 p-5 rounded-xl border border-dashed border-zinc-700 text-zinc-400 text-center text-sm">
          {t('settings.blocked.empty')}
        </div>
      ) : (
        <ul className="flex flex-col gap-2 mt-4 mb-2">
          {users.map((u) => {
            const name = u.displayName || u.accountName;
            return (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/10 p-3"
              >
                <UserHoverCard accountName={u.accountName} userId={u.id}>
                  <span className="flex items-center gap-3 min-w-0 flex-1">
                    <Link to={profilePath(u.accountName)} className="shrink-0">
                      {u.avatarUrl ? (
                        <LazyImage src={u.avatarUrl} alt={name} className="size-9 rounded-lg object-cover" />
                      ) : (
                        <InitialsAvatar name={(name || '?')} handle={u.accountName} className="size-9 rounded-lg" />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={profilePath(u.accountName)} className="text-sm text-foreground hover:underline block truncate">
                        {name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{u.accountName}</p>
                    </div>
                  </span>
                </UserHoverCard>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnblock(u.accountName)}
                  disabled={pending === u.accountName}
                >
                  {t('profile.unblock')}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
