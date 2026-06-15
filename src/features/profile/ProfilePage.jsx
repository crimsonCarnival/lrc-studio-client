import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link, useSearchParams, useLocation } from 'react-router-dom';

const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));
import toast from 'react-hot-toast';
import { Button } from '@ui/button';
import { LazyImage } from '@ui/LazyImage';
import { Star, GitFork, Music, PlayCircle, Settings, Pencil, Trash2, Timer, FolderOpen, Trophy, Lock } from 'lucide-react';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { getPublicProfile, followUser, unfollowUser } from './profile.service';
import { useSuggestedUsers } from '@/features/explore/hooks/useExplore';
import { FollowModal } from './FollowModal';
import { PlaylistGrid } from '@/features/playlists/PlaylistGrid';
import { BadgeList } from '@/features/badges/BadgeList';
import { BadgeChip } from '@/features/badges/BadgeChip';
import { ShowcasedBadges } from '@/features/badges/ShowcasedBadges';
import { projects } from '@/app/api';
import ProjectSetupModal from '@/features/editor/components/setup/ProjectSetupModal';
import useConfirm from '@/shared/hooks/useConfirm';

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

function ProjectCard({ project, isOwner, onEdit, onDelete }) {
  const { t } = useTranslation();
  const { title, projectId, starCount, forkCount, metadata, upload, public: isPublic } = project;
  const isYoutube = upload?.source === 'youtube';
  const isPrivate = isOwner && isPublic === false;

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(project);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(project);
  };

  return (
    <Link
      to={`/project/${projectId}`}
      className="glass rounded-2xl p-4 flex flex-col gap-2 hover:bg-white/5 transition-colors group relative"
    >
      {isOwner && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10 bg-black/40 backdrop-blur-sm rounded-lg p-1">
          <button onClick={handleEdit} className="p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors" aria-label={t('profile.editProject')}>
            <Pencil className="size-3.5" />
          </button>
          <button onClick={handleDelete} className="p-1.5 hover:bg-red-500/20 rounded-md text-zinc-400 hover:text-red-400 transition-colors" aria-label={t('profile.deleteProject')}>
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          {isPrivate && (
            <Lock className="size-3.5 text-muted-foreground" aria-label={t('profile.privateProject')} />
          )}
          {isYoutube ? (
            <PlayCircle className="size-4 text-red-400" />
          ) : (
            <Music className="size-4 text-muted-foreground" />
          )}
        </div>
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

function PeopleYouMightKnow() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { users, loading } = useSuggestedUsers(5);

  if (loading || users.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-600">{t('profile.peopleYouMightKnow')}</p>
      <div className="flex flex-col gap-1.5">
        {users.map(u => (
          <button
            key={u.id}
            type="button"
            onClick={() => navigate(`/${u.accountName}`)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors text-left w-full"
          >
            {u.avatarUrl ? (
              <img src={u.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="size-7 rounded-full bg-gradient-to-br from-primary/50 to-violet-500/50 flex items-center justify-center text-xs font-bold text-white shrink-0 select-none">
                {(u.displayName || u.accountName || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{u.displayName || u.accountName}</p>
              <p className="text-[10px] text-zinc-500 truncate">@{u.accountName}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { accountName } = useParams();
  const { user } = useAuthContext();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');

  const [isFollowing, setIsFollowing] = useState(false);
  const [confirmingUnfollow, setConfirmingUnfollow] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followModal, setFollowModal] = useState(null); // 'FOLLOWERS' | 'FOLLOWING' | null
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingProject, setEditingProject] = useState(null);
  const [requestConfirm, confirmModal] = useConfirm();

  const isOwner = !!user && !!accountName && user.accountName === accountName;

  // Silently rewrite legacy /profile/:accountName → /:accountName
  useEffect(() => {
    if (location.pathname.startsWith('/profile/') && accountName) {
      navigate(`/${accountName}`, { replace: true });
    }
  }, [location.pathname, accountName, navigate]);

  useEffect(() => {
    if (!accountName) {
      if (user?.accountName) {
        navigate(`/${user.accountName}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setNotFound(false);

    getPublicProfile(accountName)
      .then((data) => {
        if (!data) {
          setNotFound(true);
        } else {
          setProfile(data);
          setIsFollowing(data.isFollowedByMe ?? false);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [accountName, user?.accountName, navigate]);

  useEffect(() => {
    if (!profile || !user || isOwner || isFollowing) return;
    if (searchParams.get('intent') !== 'follow') return;

    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFollowLoading(true);
    followUser(profile.accountName)
      .then(() => setIsFollowing(true))
      .catch(() => {})
      .finally(() => setFollowLoading(false));
  }, [profile, user, isOwner, isFollowing, searchParams, setSearchParams]);

  const handleFollow = useCallback(async () => {
    if (!user) {
      navigate(`/auth?action=signin&redirect=${encodeURIComponent(`/${accountName}`)}&intent=follow`);
      return;
    }
    setFollowLoading(true);
    try {
      await followUser(accountName);
      setIsFollowing(true);
      setProfile(prev => prev ? { ...prev, followerCount: prev.followerCount + 1 } : prev);
    } catch {
      toast.error(t('profile.followError'));
    }
    setFollowLoading(false);
  }, [user, accountName, navigate, t]);

  const handleUnfollow = useCallback(async () => {
    setFollowLoading(true);
    try {
      await unfollowUser(accountName);
      setIsFollowing(false);
      setConfirmingUnfollow(false);
      setProfile(prev => prev ? { ...prev, followerCount: Math.max(0, prev.followerCount - 1) } : prev);
    } catch {
      toast.error(t('profile.unfollowError'));
      setConfirmingUnfollow(false);
    }
    setFollowLoading(false);
  }, [accountName, t]);

  const handleDeleteProject = useCallback((project) => {
    requestConfirm(
      t('confirm.deleteProject', { title: project.title || t('library.untitled') }),
      async () => {
        try {
          await projects.remove(project.projectId);
          setProfile(prev => prev ? { 
            ...prev, 
            projects: prev.projects.filter(p => p.projectId !== project.projectId), 
            projectCount: Math.max(0, prev.projectCount - 1) 
          } : prev);
          toast.success(t('project.deleteSuccess'));
        } catch {
          toast.error(t('project.deleteError'));
        }
      },
      { title: t('confirm.deleteProjectTitle'), variant: 'danger' }
    );
  }, [requestConfirm, t]);

  const handleEditProject = useCallback((project) => {
    setEditingProject(project);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (notFound) {
    return (
      <Suspense fallback={null}>
        <NotFoundPage type="user" identifier={accountName} />
      </Suspense>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const displayName = profile.displayName || profile.accountName;

  // All earned badge IDs (used in showcase tab only)
  const serverBadgeIds = (profile.badges ?? []).map(b => b.id);
  const allBadgeIds = [
    ...serverBadgeIds,
    ...(profile.isVerified && !serverBadgeIds.includes('verified') ? ['verified'] : []),
    ...(profile.isAdmin   && !serverBadgeIds.includes('admin')    ? ['admin']    : []),
  ];
  // Header shows only showcased badges; fall back to all if none showcased
  const showcasedIds = (profile.showcasedBadges ?? []).map(b => b.id ?? b);
  const badgeIds = showcasedIds.length > 0 ? showcasedIds : allBadgeIds.slice(0, 3);

  const minutesSynced = profile.stats?.minutesSynced ?? 0;
  const minutesLabel = minutesSynced > 0
    ? (() => {
        const h = Math.floor(minutesSynced / 60);
        const m = minutesSynced % 60;
        if (h === 0) return `${m}m`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
      })()
    : null;
  const level = profile.progression?.level ?? 0;

  const hasVisibleShowcase = profile.showcasePublic !== false && (profile.showcasedBadges?.length ?? 0) > 0;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
    <div className="flex flex-col px-4 pt-6 pb-12 sm:pb-16 animate-fade-in max-w-5xl mx-auto w-full">
      {/* Profile Header */}
      <div className="glass rounded-[2rem] p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden mb-6">
        <AvatarBadge avatarUrl={profile.avatarUrl} name={displayName} />

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-start gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <h1 className="text-2xl font-semibold text-foreground">{displayName}</h1>
                {level > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-[11px] font-bold text-zinc-400">
                    <Trophy className="size-3 text-warning" />
                    Lv.{level}
                  </span>
                )}
              </div>
              {badgeIds.length > 0 && (
                <BadgeList ids={badgeIds} max={3} className="mt-1.5 justify-center sm:justify-start" />
              )}
            </div>
          </div>

          <p className="text-muted-foreground text-sm font-mono mt-1.5">@{profile.accountName}</p>

          <p className="text-muted-foreground text-sm mt-3 max-w-md">
            {profile.bio || <span className="italic opacity-50">{t('profile.noBio')}</span>}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-4 text-sm text-muted-foreground">
            {profile.showFollowers ? (
              <button
                onClick={() => setFollowModal('FOLLOWERS')}
                className="hover:text-foreground transition-colors"
              >
                {t('profile.statsFollowers', { count: profile.followerCount })}
              </button>
            ) : (
              <span>{t('profile.statsFollowers', { count: profile.followerCount })}</span>
            )}
            <span className="opacity-30">·</span>
            {profile.showFollowers ? (
              <button
                onClick={() => setFollowModal('FOLLOWING')}
                className="hover:text-foreground transition-colors"
              >
                {t('profile.statsFollowing', { count: profile.followingCount })}
              </button>
            ) : (
              <span>{t('profile.statsFollowing', { count: profile.followingCount })}</span>
            )}
            <span className="opacity-30">·</span>
            <span>{t('profile.statsProjects', { count: profile.projectCount })}</span>
            <span className="opacity-30">·</span>
            <span>{t('profile.statsStars', { count: profile.totalStarsReceived })}</span>
            {minutesLabel && (
              <>
                <span className="opacity-30">·</span>
                <span className="flex items-center gap-1">
                  <Timer className="size-3.5 text-accent-blue" />
                  {minutesLabel}
                  <span className="text-xs opacity-50">¹</span>
                </span>
              </>
            )}
          </div>

          {minutesLabel && (
            <p className="text-[10.5px] text-muted-foreground mt-1 opacity-50">
              ¹ {t('badges.leaderboard.minutesSyncedNote')}
            </p>
          )}

          {profile.totalForksReceived > 0 && (
            <p className="text-xs text-muted-foreground mt-2 opacity-70">
              {t('profile.forkBadge', { count: profile.totalForksReceived })}
            </p>
          )}
        </div>

        {isOwner ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            className="absolute top-4 right-4 flex items-center gap-1.5"
          >
            <Settings className="size-4" />
            {t('profile.editProfile')}
          </Button>
        ) : (
          <div className="absolute top-4 right-4">
            {isFollowing ? (
              confirmingUnfollow ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnfollow}
                  disabled={followLoading}
                  className="text-muted-foreground border-border"
                >
                  {t('profile.confirmUnfollow')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingUnfollow(true)}
                  disabled={followLoading}
                >
                  {t('profile.following')}
                </Button>
              )
            ) : (
              <Button
                size="sm"
                onClick={handleFollow}
                disabled={followLoading}
              >
                {t('profile.follow')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Two-column layout: main content + showcase sidebar */}
      <div className={`flex gap-6 items-start ${hasVisibleShowcase || isOwner || (!isOwner && !!user) ? 'flex-col lg:flex-row' : ''}`}>
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-border">
            {['projects', 'playlists'].map((tab) => (
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

          {activeTab === 'projects' && (
            profile.projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="size-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
                  <FolderOpen className="size-7 text-zinc-500" />
                </div>
                <p className="text-sm text-zinc-400 font-medium">{t('profile.noPublicProjects')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.projects.map((project) => (
                  <ProjectCard
                    key={project.projectId}
                    project={project}
                    isOwner={isOwner}
                    onEdit={handleEditProject}
                    onDelete={handleDeleteProject}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === 'playlists' && (
            <PlaylistGrid accountName={profile.accountName} isOwner={isOwner} />
          )}
        </div>

        {/* Showcase sidebar */}
        {(hasVisibleShowcase || isOwner || (!isOwner && !!user)) && (
          <aside className="w-full lg:w-56 shrink-0 flex flex-col gap-4">
            {hasVisibleShowcase ? (
              <ShowcasedBadges
                badges={profile.showcasedBadges}
                maxSlots={profile.showcasedBadges.length}
                className=""
              />
            ) : isOwner ? (
              <div className="flex flex-col gap-2 p-4 rounded-xl border border-dashed border-zinc-800">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-600">{t('badges.showcase.title')}</p>
                <p className="text-xs text-zinc-600">{t('badges.showcase.noShowcase')}</p>
                <button
                  type="button"
                  onClick={() => navigate('/settings/profile')}
                  className="text-xs text-primary hover:text-primary/70 transition-colors text-left"
                >
                  {t('badges.showcase.goSetup')}
                </button>
              </div>
            ) : null}

            {allBadgeIds.length > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-600 mb-2">{t('badges.showcase.allBadges')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {allBadgeIds.map(id => <BadgeChip key={id} id={id} />)}
                </div>
              </div>
            )}

            {!isOwner && !!user && <PeopleYouMightKnow />}
          </aside>
        )}
      </div>

      {followModal && profile.showFollowers && (
        <FollowModal
          accountName={profile.accountName}
          type={followModal}
          onClose={() => setFollowModal(null)}
        />
      )}

      {editingProject && (
        <ProjectSetupModal
          key={editingProject.projectId}
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          onConfirm={async (data) => {
            try {
              const { name: title, description, tags, songName, songArtist, songAlbum, songYear, genre, coverImage } = data;
              const updatedMetadata = {
                ...editingProject.metadata,
                description,
                tags,
                songName,
                songArtist,
                songAlbum,
                songYear,
                genre,
              };
              await projects.patch(editingProject.projectId, {
                title,
                coverImage,
                metadata: updatedMetadata
              });
              setProfile(prev => prev ? {
                ...prev,
                projects: prev.projects.map(p =>
                  p.projectId === editingProject.projectId
                    ? { ...p, title, coverImage, metadata: updatedMetadata }
                    : p
                )
              } : prev);
              setEditingProject(null);
              toast.success(t('project.updateSuccess'));
            } catch {
              toast.error(t('project.updateError'));
            }
          }}
          initialName={editingProject.title || ''}
          initialDescription={editingProject.metadata?.description || ''}
          initialTags={editingProject.metadata?.tags || []}
          initialSongName={editingProject.metadata?.songName || ''}
          initialSongArtist={editingProject.metadata?.songArtist || ''}
          initialSongAlbum={editingProject.metadata?.songAlbum || ''}
          initialSongYear={editingProject.metadata?.songYear || ''}
          initialGenre={editingProject.metadata?.genre || ''}
          initialCoverImage={editingProject.coverImage || ''}
          initialAlbumArt={''}
          isEditing={true}
        />
      )}
      {confirmModal}
    </div>
    </div>
  );
}
