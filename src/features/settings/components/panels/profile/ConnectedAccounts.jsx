import { useTranslation } from 'react-i18next';
import { Unplug } from 'lucide-react';
import SpotifyIcon from "@features/player/components/SpotifyIcon";
import { Button } from '@ui/button';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { formatTimeAgo } from '@/features/notifications/timeAgo';

export default function ConnectedAccounts() {
  const { t } = useTranslation();
  const { user, connectSpotify, disconnectSpotify, connectGoogle, disconnectGoogle } = useAuthContext();

  return (
    <div className="space-y-6">
      {/* Google Section */}
      <div className="animate-fade-in bg-secondary/10 border border-border rounded-2xl p-5 hover:border-primary/30 transition-all">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
            {t('settings.google.label') || 'Google'}
          </h3>
          {user?.google?.connected && user.google.lastUsedAt && (
            <span className="text-[10px] text-zinc-500 font-medium">
              {t('settings.google.lastUsed', { when: formatTimeAgo(user.google.lastUsedAt, t) })}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {user?.google?.connected
            ? t('settings.google.connectedDesc')
            : t('settings.google.connectDesc')}
        </p>

        {user?.google?.connected ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/30 border border-border">
              <div className="size-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <svg className="size-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 4.87-4.53z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{t('settings.google.connected')}</p>
                <p className="text-xs text-muted-foreground truncate">{user.google.email || '---'}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  await disconnectGoogle();
                  toast.success(t('settings.google.disconnected'));
                } catch {
                  toast.error(t('auth.errors.googleDisconnectFailed'));
                }
              }}
              className="text-xs font-semibold text-zinc-500 hover:text-red-400 underline transition-colors cursor-pointer self-start ml-1"
            >
              {t('settings.google.disconnect') || 'Disconnect'}
            </button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={async () => {
              try {
                await connectGoogle();
                toast.success(t('settings.google.connectSuccess') || 'Google connected successfully');
              } catch {
                toast.error(t('settings.google.connectFailed'));
              }
            }}
            className="gap-2 bg-foreground text-background hover:bg-muted-foreground rounded-xl h-10 px-6 font-bold shadow-lg shadow-black/20"
          >
            <svg className="size-3.5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 4.87-4.53z" />
            </svg>
            {t('settings.google.connect')}
          </Button>
        )}
      </div>

      {/* Spotify Section */}
      <div className="animate-fade-in bg-secondary/10 border border-border rounded-2xl p-5 hover:border-primary/30 transition-all">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
            {t('settings.spotify.label') || 'Spotify'}
          </h3>
          {user?.spotify?.connected && user.spotify.lastUsedAt && (
            <span className="text-[10px] text-zinc-500 font-medium">
              {t('settings.spotify.lastUsed', { when: formatTimeAgo(user.spotify.lastUsedAt, t) })}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {user?.spotify?.connected
            ? t('settings.spotify.connectedDesc')
            : t('settings.spotify.connectDesc')}
        </p>

        {user?.spotify?.connected ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-spotify/10 border border-spotify/30">
              <div className="size-10 rounded-full bg-spotify/20 flex items-center justify-center shrink-0">
                <SpotifyIcon className="size-5 text-spotify shrink-0" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-spotify">{t('settings.spotify.connected')}</p>
                <p className="text-xs text-muted-foreground truncate">{user.spotify.spotifyId || '---'}</p>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${user.spotify.isPremium ? 'bg-spotify/20 text-spotify' : 'bg-secondary text-muted-foreground'}`}>
                {user.spotify.isPremium ? t('settings.spotify.premium') : t('settings.spotify.free')}
              </span>
            </div>
            <button
              onClick={async () => {
                try {
                  await disconnectSpotify();
                  toast.success(t('settings.spotify.disconnected'));
                } catch {
                  toast.error(t('settings.spotify.connectFailed'));
                }
              }}
              className="text-xs font-semibold text-zinc-500 hover:text-red-400 underline transition-colors cursor-pointer self-start ml-1"
            >
              {t('settings.spotify.disconnect') || 'Disconnect'}
            </button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={async () => {
              try {
                await connectSpotify();
              } catch (err) {
                if (err.message !== 'State mismatch') {
                  toast.error(t('settings.spotify.connectFailed'));
                }
              }
            }}
            className="gap-2 bg-spotify hover:bg-spotify/80 text-spotify-foreground rounded-xl h-10 px-6 font-bold shadow-lg shadow-spotify/20"
          >
            <SpotifyIcon className="size-3.5" />
            {t('settings.spotify.connect')}
          </Button>
        )}
      </div>
    </div>
  );
}
