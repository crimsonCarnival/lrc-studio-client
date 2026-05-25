import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Button } from '@ui/button';
import { LazyImage } from '@ui/LazyImage';
import { Star, GitFork, Music, Youtube, Settings } from 'lucide-react';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { getPublicProfile } from './profile.service';

function AvatarBadge({ avatarUrl, name, size = 'lg' }) {
  const sizeClass = size === 'lg' ? 'size-24 text-4xl rounded-[1.5rem]' : 'size-16 text-2xl rounded-xl';
  if (avatarUrl) {
    return (
      <LazyImage
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} object-cover border-4 border-border shadow-2xl shadow-primary/20`}
      />
    );
  }
  return (
    <div className={`${sizeClass} bg-gradient-to-br from-primary/80 to-accent-purple flex items-center justify-center border-4 border-border shadow-2xl shadow-primary/20 font-bold text-zinc-950 select-none`}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function ProjectCard({ project }) {
  const { title, projectId, starCount, forkCount, metadata, upload } = project;
  const isYoutube = upload?.source === 'youtube' || !!upload?.youtubeUrl;

  return (
    <Link
      to={`/project/${projectId}`}
      className="glass rounded-2xl p-4 flex flex-col gap-2 hover:bg-white/5 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        {isYoutube ? (
          <Youtube className="size-4 text-red-400 shrink-0" />
        ) : (
          <Music className="size-4 text-muted-foreground shrink-0" />
        )}
      </div>
      {(metadata?.songName || metadata?.songArtist) && (
        <p className="text-xs text-muted-foreground line-clamp-1">
          {[metadata.songName, metadata.songArtist].filter(Boolean).join(' · ')}
        </p>
      )}
      <div className="flex items-center gap-3 mt-auto pt-1">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3" />
          {starCount ?? 0}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <GitFork className="size-3" />
          {forkCount ?? 0}
        </span>
      </div>
    </Link>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accountName } = useParams();
  const { user } = useAuthContext();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');

  const isOwner = !!user && !!accountName && user.accountName === accountName;

  useEffect(() => {
    if (!accountName) {
      if (user?.accountName) {
        navigate(`/profile/${user.accountName}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }

    setLoading(true);
    setNotFound(false);

    getPublicProfile(accountName)
      .then((data) => {
        if (!data) {
          setNotFound(true);
        } else {
          setProfile(data);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [accountName, user?.accountName, navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
        <p className="text-lg font-semibold text-foreground">{t('profile.notFound')}</p>
        <p className="text-sm text-muted-foreground">{t('profile.notFoundSub')}</p>
      </div>
    );
  }

  if (!profile) return null;

  const displayName = profile.displayName || profile.accountName;

  return (
    <div className="flex-1 flex flex-col px-4 pt-6 pb-12 sm:pb-16 animate-fade-in max-w-4xl mx-auto w-full">
      {/* Profile Header */}
      <div className="glass rounded-[2rem] p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden mb-6">
        <AvatarBadge avatarUrl={profile.avatarUrl} name={displayName} />

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{displayName}</h1>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              {profile.isVerified && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                  {t('profile.verified')}
                </span>
              )}
              {profile.role === 'admin' && (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
                  {t('profile.adminBadge')}
                </span>
              )}
            </div>
          </div>

          <p className="text-muted-foreground text-sm font-mono mt-0.5">@{profile.accountName}</p>

          <p className="text-muted-foreground text-sm mt-3 max-w-md">
            {profile.bio || <span className="italic opacity-50">{t('profile.noBio')}</span>}
          </p>

          <div className="flex items-center justify-center sm:justify-start gap-4 mt-4 text-sm text-muted-foreground">
            <span>{t('profile.statsProjects', { count: profile.projectCount })}</span>
            <span className="opacity-30">·</span>
            <span>{t('profile.statsStars', { count: profile.totalStarsReceived })}</span>
          </div>
        </div>

        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            className="absolute top-4 right-4 flex items-center gap-1.5"
          >
            <Settings className="size-4" />
            {t('profile.editProfile')}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {['projects', 'albums'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`profile.publicTabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'projects' && (
        profile.projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">{t('profile.noPublicProjects')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )
      )}

      {activeTab === 'albums' && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">{t('profile.albumsComingSoon')}</p>
        </div>
      )}
    </div>
  );
}
