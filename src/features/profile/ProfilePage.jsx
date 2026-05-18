import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@ui/button';
import { ArrowLeft, User, ShieldCheck } from 'lucide-react';
import ProfileSettings from '@features/settings/components/panels/ProfileSettings';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { ThemedShineBorder } from '@ui/themed-shine-border';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
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
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full size-12"
        >
          <ArrowLeft className="size-6" />
        </Button>
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-100 tracking-tight">
            {t('profile.title') || 'User Profile'}
          </h1>
          <p className="text-zinc-500 text-base">
            {t('profile.manageDesc') || 'Manage your account and connections'}
          </p>
        </div>
      </div>

      {/* Main Content (Centered) */}
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-6">
          <div className="glass rounded-[2rem] p-8 flex flex-col items-center text-center relative overflow-hidden">
            <ThemedShineBorder />
            <div className="relative mb-6">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user?.username}
                  className="size-32 rounded-[2rem] object-cover border-4 border-zinc-800 shadow-2xl shadow-primary/20"
                />
              ) : (
                <div className="size-32 rounded-[2rem] bg-zinc-800 flex items-center justify-center border-4 border-zinc-700">
                  <User className="size-16 text-zinc-600" />
                </div>
              )}
              {user?.role === 'admin' && (
                <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-xl bg-primary text-zinc-950 text-[10px] font-black uppercase tracking-widest shadow-lg">
                  {t('profile.adminBadge') || 'Admin'}
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <h2 className="text-2xl font-semibold text-zinc-100">{user?.username || 'User'}</h2>
              <p className="text-zinc-500 text-sm">{user?.email}</p>
              
              <div className="mt-4 max-w-xs mx-auto">
                {user?.bio ? (
                  <p className="text-zinc-400 text-sm leading-relaxed italic line-clamp-3">
                    "{user.bio}"
                  </p>
                ) : (
                  <p className="text-zinc-600 text-xs italic opacity-50">
                    {t('profile.noBio')}
                  </p>
                )}
              </div>
            </div>

            <div className="w-full mt-8 pt-6 border-t border-zinc-800/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{t('profile.status') || 'Status'}</span>
                <span className={`font-bold uppercase ${user?.isVerified ? 'text-blue-400' : 'text-zinc-500'}`}>
                  {user?.isVerified ? (t('profile.verified') || 'Verified') : (t('profile.unverified') || 'Unverified')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{t('profile.memberSince') || 'Joined'}</span>
                <span className="text-zinc-300 font-medium">
                  {formattedDate || '---'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{t('profile.spotifyLabel')}</span>
                <span className={`font-bold uppercase ${user?.spotify?.connected ? 'text-green-400' : 'text-zinc-500'}`}>
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
