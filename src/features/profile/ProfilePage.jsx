import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@ui/button';
import { ArrowLeft, User } from 'lucide-react';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { ThemedShineBorder } from '@ui/themed-shine-border';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { accountName } = useParams();
  const { user } = useAuthContext();

  useEffect(() => {
    if (!accountName && user?.accountName) {
      navigate(`/profile/${user.accountName}`, { replace: true });
    }
  }, [accountName, user?.accountName, navigate]);

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(i18n.resolvedLanguage || i18n.language, { dateStyle: 'long' })
    : '';

  return (
    <div className="flex-1 flex flex-col px-4 pt-0 pb-12 sm:pb-16 animate-fade-in max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full size-12"
        >
          <ArrowLeft className="size-6" />
        </Button>
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
            {t('profile.title')}
          </h1>
          <p className="text-muted-foreground text-base">
            {t('profile.manageDesc')}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-6">
          <div className="glass rounded-[2rem] p-8 flex flex-col items-center text-center relative overflow-hidden">
            <ThemedShineBorder />
            <div className="relative mb-6">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user?.displayName || user?.accountName}
                  className="size-32 rounded-[2rem] object-cover border-4 border-border shadow-2xl shadow-primary/20"
                />
              ) : (
                <div className="size-32 rounded-[2rem] bg-gradient-to-br from-primary/80 to-accent-purple flex items-center justify-center border-4 border-border shadow-2xl shadow-primary/20 font-bold text-zinc-950 text-5xl select-none">
                  {(user?.displayName || user?.accountName || '?')[0].toUpperCase()}
                </div>
              )}
              {user?.role === 'admin' && (
                <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-xl bg-primary text-zinc-950 text-[10px] font-black uppercase tracking-widest shadow-lg">
                  {t('profile.adminBadge')}
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <h2 className="text-2xl font-semibold text-foreground">{user?.displayName || user?.accountName || 'User'}</h2>
              {user?.accountName && (
                <p className="text-muted-foreground text-xs font-mono mt-0.5">@{user.accountName}</p>
              )}
              <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>

              <div className="mt-4 max-w-xs mx-auto">
                {user?.bio ? (
                  <p className="text-muted-foreground text-sm leading-relaxed italic line-clamp-3">
                    "{user.bio}"
                  </p>
                ) : (
                  <p className="text-muted-foreground/50 text-xs italic">
                    {t('profile.noBio')}
                  </p>
                )}
              </div>
            </div>

            <div className="w-full mt-8 pt-6 border-t border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t('profile.status')}</span>
                <span className={`font-bold uppercase ${user?.isVerified ? 'text-blue-500' : 'text-muted-foreground'}`}>
                  {user?.isVerified ? t('profile.verified') : t('profile.unverified')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t('profile.memberSince')}</span>
                <span className="text-foreground font-medium">
                  {formattedDate || '---'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t('profile.spotifyLabel')}</span>
                <span className={`font-bold uppercase ${user?.spotify?.connected ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {user?.spotify?.connected
                    ? (user.spotify.isPremium ? t('settings.spotify.premium') : t('profile.spotifyConnected'))
                    : t('profile.spotifyNotConnected')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
