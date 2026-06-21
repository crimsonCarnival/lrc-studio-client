import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { Section } from '../shared';
import { Button } from '@ui/button';
import { LazyImage } from '@ui/LazyImage';
import { getBlockedUsers, unblockUser, type BlockedUser } from '@/features/profile/profile.service';

export default function BlockedUsersSettings({ searchTerm }: { searchTerm?: string }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    getBlockedUsers()
      .then(setUsers)
      .catch(() => {})
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

  return (
    <Section title={t('settings.blocked.label')} icon={Ban} searchTerm={searchTerm}>
      <p className="text-[11px] text-muted-foreground px-1 mb-2">{t('settings.blocked.description')}</p>

      {loading ? (
        <p className="text-xs text-muted-foreground px-1 py-4">{t('settings.blocked.loading')}</p>
      ) : users.length === 0 ? (
        <p className="text-xs text-muted-foreground italic px-1 py-4">{t('settings.blocked.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => {
            const name = u.displayName || u.accountName;
            return (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/10 p-3"
              >
                <Link to={`/${u.accountName}`} className="shrink-0">
                  {u.avatarUrl ? (
                    <LazyImage src={u.avatarUrl} alt={name} className="size-9 rounded-lg object-cover" />
                  ) : (
                    <div className="size-9 rounded-lg bg-gradient-to-br from-primary/80 to-accent-purple flex items-center justify-center font-bold text-zinc-950 select-none">
                      {(name || '?')[0].toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/${u.accountName}`} className="text-sm text-foreground hover:underline block truncate">
                    {name}
                  </Link>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">@{u.accountName}</p>
                </div>
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
    </Section>
  );
}
