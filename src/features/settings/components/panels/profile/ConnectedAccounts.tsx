import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '@/features/notifications/timeAgo';
import { IconRow, Chip } from '../../shared';

export default function ConnectedAccounts() {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const { user, connectGoogle, disconnectGoogle } = useAuthContext();
  const connected = !!user?.google?.connected;

  const lastUsed = connected && user?.google?.lastUsedAt
    ? ` · ${t('settings.google.lastUsed', { when: formatTimeAgo(user.google.lastUsedAt, t, settings.advanced?.timezone, i18n.resolvedLanguage || i18n.language) })}`
    : '';

  return (
    <IconRow
      icon="G"
      iconClassName="bg-zinc-100 text-zinc-900 font-extrabold"
      title={t('settings.google.label')}
      badge={connected ? <Chip tone="teal">{t('settings.google.connected')}</Chip> : undefined}
      description={connected
        ? `${user?.google?.email || '---'} · ${t('settings.google.connectedDesc')}${lastUsed}`
        : t('settings.google.connectDesc')}
    >
      {connected ? (
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await disconnectGoogle();
              toast.success(t('settings.google.disconnected'));
            } catch {
              toast.error(t('auth.errors.googleDisconnectFailed'));
            }
          }}
          className="h-11 rounded-[10px] border-red-900/60 bg-transparent text-red-300 hover:bg-red-950/40 font-semibold"
        >
          {t('settings.google.disconnect')}
        </Button>
      ) : (
        <Button
          onClick={async () => {
            try {
              await connectGoogle();
              toast.success(t('settings.google.connectSuccess'));
            } catch {
              toast.error(t('settings.google.connectFailed'));
            }
          }}
          className="h-11 rounded-[10px] px-5 font-bold"
        >
          {t('settings.google.connect')}
        </Button>
      )}
    </IconRow>
  );
}
