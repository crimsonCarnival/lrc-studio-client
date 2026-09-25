import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { UserHoverCard } from '@ui/UserHoverCard';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';

const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));
import toast from 'react-hot-toast';
import { Icon } from '@/shared/ui/Icon';
import { ProjectCardContextMenu } from './ProjectCardContextMenu';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { getPublicProfile, followUser, unfollowUser, blockUser, unblockUser } from './profile.service';
import { useSuggestedUsers } from '@/features/explore/hooks/useExplore';
import { FollowModal } from './FollowModal';
import { PlaylistGrid } from '@/features/playlists/PlaylistGrid';
import { BadgeChip } from '@/features/badges/BadgeChip';
import { ShowcasedBadges } from '@/features/badges/ShowcasedBadges';
import ActivityHeatmap from '@/features/settings/components/panels/profile/ActivityHeatmap';
import { projects } from '@/app/api';
import ProjectSetupModal from '@/features/editor/components/setup/ProjectSetupModal';
import type { ProjectSetupConfirm } from '@/features/editor/components/setup/ProjectSetupModal';
import useConfirm from '@/shared/hooks/useConfirm';
import { YoutubeIcon } from '@/shared/ui/YoutubeIcon';
import { ThemedShineBorder } from '@ui/themed-shine-border';
import { formatDistanceToNow } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { ProfileHeader } from './ProfileHeader';
import type { PublicUser, Project } from '@/types';
import { connectSocket } from '@/app/socket.client';

const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, es };

function formatRelativeTime(dateStr?: string | null, locale = 'en'): string {
  try {
    return formatDistanceToNow(new Date(dateStr ?? ''), {
      addSuffix: true,
      locale: DATE_FNS_LOCALES[locale] ?? enUS,
    });
  } catch {
    return '';
  }
}

// Project metadata is loosely shaped at this layer; narrow the fields we touch.
// Stable fallback for the edit modal: it re-syncs its form whenever an initial* prop changes identity.
const EMPTY_LIST: string[] = [];

interface ProjectMetaLoose {
  description?: string;
  tags?: string[];
  songName?: string;
  songArtist?: string;
  songArtists?: string[];
  songAlbum?: string;
  songYear?: string;
  genre?: string;
}

interface ProjectCardProps {
  project: Project;
  isOwner: boolean;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

function ProjectCard({ project, isOwner, onEdit, onDelete }: ProjectCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { title, publicId, upload, public: isPublic, coverImage } = project;
  const isYoutube = upload?.source === 'youtube';
  const isPrivate = isOwner && isPublic === false;
  const hasCover = !!coverImage;

  const handleEdit = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(project);
  };

  const handleDelete = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(project);
  };

  return (
    <ProjectCardContextMenu project={project} isOwner={isOwner} onEdit={onEdit} onDelete={onDelete}>
      <button
        type="button"
        onClick={() => navigate(`/project/${publicId}${isOwner ? '/edit' : ''}`)}
        className="group relative glass rounded-2xl overflow-hidden text-left hover:border-primary/30 transition-all cursor-pointer focus:ring-1 focus:ring-primary/30 outline-none animate-fade-in contrast-more:border-zinc-600 w-full"
      >
        <ThemedShineBorder />

        {isOwner && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20 bg-black/40 backdrop-blur-sm rounded-lg p-1">
            <button onClick={handleEdit} className="p-1.5 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors" aria-label={t('profile.editProject')}>
              <Icon name="edit" size={14} />
            </button>
            <button onClick={handleDelete} className="p-1.5 hover:bg-red-500/20 rounded-md text-zinc-400 hover:text-red-400 transition-colors" aria-label={t('profile.deleteProject')}>
              <Icon name="delete" size={14} />
            </button>
          </div>
        )}

        <div className={`relative ${hasCover ? 'h-20' : 'h-12 bg-gradient-to-br from-zinc-900 to-zinc-800/50 flex items-center justify-center'} overflow-hidden`}>
          {hasCover ? (
            <>
              <img src={coverImage ?? ''} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
            </>
          ) : (
            <Icon name="music_note" size={16} className="text-zinc-600" />
          )}
          {/* Source indicator */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
            {isPrivate && (
              <Icon name="lock" size={14} className="text-zinc-300 drop-shadow-md" aria-label={t('profile.privateProject')} />
            )}
            {isYoutube
              ? <YoutubeIcon className="size-4 drop-shadow-md" />
              : hasCover ? <Icon name="music_note" size={12} className="text-primary/60 drop-shadow-md" /> : null}
          </div>
        </div>

        {/* Info */}
        <div className="p-3 flex items-start gap-2.5">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-semibold text-zinc-200 truncate group-hover:text-primary transition-colors leading-snug">
              {title || t('library.untitled')}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-zinc-500">{formatRelativeTime(project.createdAt, (i18n.resolvedLanguage || i18n.language).slice(0, 2))}</span>
              <span className="size-0.5 rounded-full bg-zinc-700 shrink-0" />
              <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                <Icon name="monitoring" size={10} />
                {(project.syncedLineCount || 0)}/{(project.lineCount || 0)}
              </span>
            </div>
          </div>
          <Icon name="chevron_right" size={14} className="text-zinc-800 group-hover:text-primary group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0 transition-all mt-0.5 shrink-0" />
        </div>
      </button>
    </ProjectCardContextMenu>
  );
}

function PeopleYouMightKnow({ excludeAccountName }: { excludeAccountName?: string }) {
  const { t } = useTranslation();
  // Over-fetch by one so filtering out the viewed profile still leaves 5.
  const { users, loading } = useSuggestedUsers(6);

  // Don't recommend the profile the visitor is currently looking at.
  const suggestions = (excludeAccountName
    ? users.filter(u => u.accountName !== excludeAccountName)
    : users
  ).slice(0, 5);

  if (loading || suggestions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-600">{t('profile.peopleYouMightKnow')}</p>
      <div className="flex flex-col gap-1.5">
        {suggestions.map(u => (
          <UserHoverCard key={u.id} accountName={u.accountName} userId={u.id}>
            <Link
              to={`/profile/${u.accountName}`}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors w-full"
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
                <p className="text-[10px] text-zinc-500 truncate">{u.accountName}</p>
              </div>
            </Link>
          </UserHoverCard>
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

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [followModal, setFollowModal] = useState<'FOLLOWERS' | 'FOLLOWING' | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [requestConfirm, confirmModal] = useConfirm();

  const isSelf = !!user && !!accountName && user.accountName === accountName;
  // "View as others": a preview of the owner's own profile. The profile is
  // re-fetched with `asVisitor`, so the server applies the same projection an
  // anonymous visitor gets (public projects/playlists only, visitor-facing
  // counts, country/last-seen per privacy settings). Rendering only.
  const viewAsOthers = isSelf && searchParams.get('view') === 'public';
  const isOwner = isSelf && !viewAsOthers;

  const setViewAsOthers = useCallback((on: boolean) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (on) next.set('view', 'public');
      else next.delete('view');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Silently rewrite legacy /profile/:accountName → /:accountName
  useEffect(() => {
    if (location.pathname.startsWith('/profile/') && accountName) {
      navigate(`/profile/${accountName}`, { replace: true });
    }
  }, [location.pathname, accountName, navigate]);

  useEffect(() => {
    if (!accountName) {
      if (user?.accountName) {
        navigate(`/profile/${user.accountName}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setNotFound(false);

    // Toggling the preview refetches; ignore a stale response from the other mode.
    let cancelled = false;
    getPublicProfile(accountName, viewAsOthers)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setNotFound(true);
        } else {
          setProfile(data);
          setIsFollowing(data.isFollowedByMe ?? false);
          setIsBlocked(data.isBlockedByMe ?? false);
        }
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accountName, user?.accountName, navigate, viewAsOthers]);

  // Live-bump follower count on your own profile when someone else follows you.
  useEffect(() => {
    if (!isSelf || !user) return;
    const socket = connectSocket();

    const onFollowNew = (payload: { followerId: string; followerCount: number }) => {
      setProfile(prev => prev ? { ...prev, followerCount: payload.followerCount } : prev);
      toast(t('profile.newFollower'));
    };

    socket.on('follow:new', onFollowNew);
    return () => { socket.off('follow:new', onFollowNew); };
  }, [isSelf, user, t]);

  useEffect(() => {
    if (!profile || !user || isSelf || isFollowing) return;
    if (searchParams.get('intent') !== 'follow') return;

    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFollowLoading(true);
    followUser(profile.accountName)
      .then(() => setIsFollowing(true))
      .catch(() => { })
      .finally(() => setFollowLoading(false));
  }, [profile, user, isSelf, isFollowing, searchParams, setSearchParams]);

  const handleFollow = useCallback(async () => {
    if (!user) {
      navigate(`/auth?action=signin&redirect=${encodeURIComponent(`/profile/${accountName}`)}&intent=follow`);
      return;
    }
    setFollowLoading(true);
    try {
      await followUser(accountName!);
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
      await unfollowUser(accountName!);
      setIsFollowing(false);
      setProfile(prev => prev ? { ...prev, followerCount: Math.max(0, prev.followerCount - 1) } : prev);
    } catch {
      toast.error(t('profile.unfollowError'));
    }
    setFollowLoading(false);
  }, [accountName, t]);

  const handleBlock = useCallback(async () => {
    if (!user) {
      navigate(`/auth?action=signin&redirect=${encodeURIComponent(`/profile/${accountName}`)}`);
      return;
    }
    setBlockLoading(true);
    try {
      await blockUser(accountName!);
      setIsBlocked(true);
      // Blocking severs follows both ways.
      setIsFollowing(false);
      setProfile(prev => prev ? { ...prev, isBlockedByMe: true } : prev);
      toast.success(t('profile.blockSuccess', { name: accountName }));
    } catch {
      toast.error(t('profile.blockError'));
    }
    setBlockLoading(false);
  }, [user, accountName, navigate, t]);

  const handleUnblock = useCallback(async () => {
    setBlockLoading(true);
    try {
      await unblockUser(accountName!);
      setIsBlocked(false);
      setProfile(prev => prev ? { ...prev, isBlockedByMe: false } : prev);
    } catch {
      toast.error(t('profile.unblockError'));
    }
    setBlockLoading(false);
  }, [accountName, t]);

  const handleDeleteProject = useCallback((project: Project) => {
    requestConfirm(
      t('confirm.deleteProject', { title: project.title || t('library.untitled') }),
      async () => {
        try {
          await projects.remove(project.publicId);
          setProfile(prev => prev ? {
            ...prev,
            projects: prev.projects.filter(p => p.publicId !== project.publicId),
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

  const handleEditProject = useCallback((project: Project) => {
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
    ...(profile.isAdmin && !serverBadgeIds.includes('admin') ? ['admin'] : []),
  ];
  const showcasedBadges = profile.showcasedBadges ?? [];
  // Header shows only showcased badges; fall back to all if none showcased
  const showcasedIds = showcasedBadges.map(b => b.id);
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
  const xp = profile.progression?.xp ?? 0;

  const showcaseVisibleToViewer = profile.showcasePublic !== false;
  const hasVisibleShowcase = showcaseVisibleToViewer && showcasedBadges.length > 0;

  // In preview mode the server already returned the visitor projection.
  const visibleProjects = profile.projects;
  const projectCount = profile.projectCount;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col px-4 pt-6 pb-12 sm:pb-16 animate-fade-in max-w-5xl mx-auto w-full">
        {viewAsOthers && (
          <div className="sticky top-0 z-20 mb-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-sm px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Icon name="visibility" size={16} className="text-primary" />
              {t('profile.viewingAsOthers')}
            </span>
            <button
              type="button"
              onClick={() => setViewAsOthers(false)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t('profile.exitViewAsOthers')}
            </button>
          </div>
        )}
        <ProfileHeader
          profile={profile}
          displayName={displayName}
          badgeIds={badgeIds}
          level={level}
          xp={xp}
          minutesLabel={minutesLabel}
          isOwner={isOwner}
          // Preview shows the visitor's follow/block controls, disabled so the
          // owner can't follow or block themselves from here.
          isFollowing={viewAsOthers ? false : isFollowing}
          followLoading={viewAsOthers || followLoading}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          isBlocked={viewAsOthers ? false : isBlocked}
          blockLoading={viewAsOthers || blockLoading}
          onBlock={handleBlock}
          onUnblock={handleUnblock}
          onOpenFollowers={() => setFollowModal('FOLLOWERS')}
          onOpenFollowing={() => setFollowModal('FOLLOWING')}
          onViewAsOthers={isSelf ? () => setViewAsOthers(true) : undefined}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
          <div className="glass rounded-2xl p-4 flex flex-col justify-between hover:border-primary/20 transition-colors">
            <span className="text-2xl font-bold text-zinc-100">{projectCount}</span>
            <span className="text-xs font-medium text-zinc-500 mt-1">{t('profile.stats.projects')}</span>
          </div>
          <div className="glass rounded-2xl p-4 flex flex-col justify-between hover:border-primary/20 transition-colors">
            <span className="text-2xl font-bold text-zinc-100">{minutesLabel || '0 m'}</span>
            <span className="text-xs font-medium text-zinc-500 mt-1">{t('profile.stats.syncedTime')}</span>
          </div>
          <div className="glass rounded-2xl p-4 flex flex-col justify-between hover:border-primary/20 transition-colors">
            <span className="text-2xl font-bold text-zinc-100">{profile.totalStarsReceived}</span>
            <span className="text-xs font-medium text-zinc-500 mt-1">{t('profile.stats.stars')}</span>
          </div>
          <div className="glass rounded-2xl p-4 flex flex-col justify-between hover:border-primary/20 transition-colors">
            <span className="text-2xl font-bold text-zinc-100">{profile.followerCount}</span>
            <span className="text-xs font-medium text-zinc-500 mt-1">{t('profile.stats.followers')}</span>
          </div>
          <div className="glass rounded-2xl p-4 flex flex-col justify-between hover:border-primary/20 transition-colors">
            <span className="text-2xl font-bold text-zinc-100">{profile.followingCount}</span>
            <span className="text-xs font-medium text-zinc-500 mt-1">{t('profile.stats.following')}</span>
          </div>
        </div>

        {/* Two-column layout: main content + showcase sidebar */}
        <div className={`flex gap-6 items-start ${hasVisibleShowcase || isOwner || (!isOwner && !!user) ? 'flex-col lg:flex-row' : ''}`}>
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-border">
              {['projects', 'playlists', 'activity'].map((tab) => {
                const tAny = t as (k: string, opts?: object) => string;
                let label = tAny(`profile.publicTabs.${tab}`);
                if (tab === 'projects') label = tAny('profile.publicTabs.projectsWithCount', { count: projectCount });
                if (tab === 'playlists') label = tAny('profile.publicTabs.playlistsWithCount', { count: profile.playlistCount });
                
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {activeTab === 'projects' && (
              visibleProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center glass rounded-2xl">
                  <div className="size-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
                    <Icon name="folder_open" size={28} className="text-zinc-500" />
                  </div>
                  <p className="text-sm text-zinc-400 font-medium">{t('profile.noPublicProjects')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {visibleProjects.map((project) => (
                    <ProjectCard
                      key={project.publicId}
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

            {activeTab === 'activity' && profile.activityHeatmap && (
              <div className="glass rounded-2xl p-5">
                <ActivityHeatmap days={profile.activityHeatmap} />
              </div>
            )}

            {activeTab === 'activity' && !profile.activityHeatmap && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center glass rounded-2xl">
                <div className="size-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
                  <Icon name="monitoring" size={28} className="text-zinc-500" />
                </div>
                <p className="text-sm text-zinc-400 font-medium">
                  {isOwner ? (
                    <button onClick={() => navigate('/settings/activity')} className="text-primary hover:underline transition-colors">
                      {t('profile.activity.ownerEmpty')}
                    </button>
                  ) : (
                    t('profile.activity.empty')
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Showcase sidebar */}
          {(hasVisibleShowcase || isOwner || (!isOwner && !!user)) && (
            <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-6">
              
              {/* Vitrina block */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">{t('badges.showcase.title')}</h3>
                  {isOwner && (
                    <button onClick={() => navigate('/settings/badges')} className="text-xs text-primary hover:text-primary-dim transition-colors">
                      {t('badges.showcase.configure')}
                    </button>
                  )}
                </div>

                {hasVisibleShowcase ? (
                  <ShowcasedBadges
                    badges={showcasedBadges}
                    maxSlots={showcasedBadges.length}
                    className=""
                  />
                ) : isOwner ? (
                  <div className="flex flex-col gap-2 p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30">
                    <p className="text-xs text-zinc-500 font-medium">{t('badges.showcase.noShowcase')}</p>
                    <button
                      type="button"
                      onClick={() => navigate('/settings/badges')}
                      className="text-xs text-primary hover:text-primary/80 transition-colors text-left"
                    >
                      {t('badges.showcase.goSetup')}
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Insignias block */}
              {allBadgeIds.length > 0 && (isOwner || showcaseVisibleToViewer) && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">{t('profile.badges.title')}</h3>
                    <span className="text-xs text-zinc-500 font-medium">
                      {t('profile.badges.count', { count: allBadgeIds.length, total: 18 })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {allBadgeIds.map(id => (
                      <div key={id} className="glass rounded-xl p-3 flex items-center gap-3">
                        <BadgeChip id={id} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-bold text-zinc-200 truncate">{(t as (k: string) => string)(`badges.${id}.label`)}</span>
                          <span className="text-xs text-zinc-500 truncate">{(t as (k: string) => string)(`badges.${id}.tip`)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isOwner && !!user && <PeopleYouMightKnow excludeAccountName={accountName} />}
            </aside>
          )}
        </div>

        {followModal && profile.showFollowers && (
          <FollowModal
            accountName={profile.accountName}
            initialTab={followModal}
            onClose={() => setFollowModal(null)}
          />
        )}

        {editingProject && (() => {
          const meta = (editingProject.metadata || {}) as ProjectMetaLoose & { singers?: string[] | null; singerColors?: string[] | null };
          return (
            <ProjectSetupModal
              key={editingProject.publicId}
              isOpen={!!editingProject}
              onClose={() => setEditingProject(null)}
              onConfirm={async (data: ProjectSetupConfirm) => {
                try {
                  const { name: title, description, tags, songName, songArtist, songAlbum, songYear, genre, coverImage, isPublic, singerColors, singers } = data;
                  const updatedMetadata = {
                    ...(editingProject.metadata as Record<string, unknown>),
                    description,
                    tags,
                    songName,
                    songArtist,
                    songAlbum,
                    songYear,
                    genre,
                    singerColors: (singerColors || []).map((c) => c || ''),
                    singers,
                  };
                  await projects.patch(editingProject.publicId, {
                    title,
                    coverImage,
                    public: isPublic,
                    metadata: updatedMetadata
                  });
                  setProfile(prev => prev ? {
                    ...prev,
                    projects: prev.projects.map(p =>
                      p.publicId === editingProject.publicId
                        ? { ...p, title, coverImage, public: isPublic, metadata: updatedMetadata }
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
              initialDescription={meta.description || ''}
              initialTags={meta.tags ?? EMPTY_LIST}
              initialSongName={meta.songName || ''}
              initialSongArtist={(meta.songArtists || []).join(', ') || meta.songArtist || ''}
              initialSongAlbum={meta.songAlbum || ''}
              initialSongYear={meta.songYear || ''}
              initialGenre={meta.genre || ''}
              initialCoverImage={editingProject.coverImage || ''}
              initialIsPublic={editingProject.public || false}
              initialSingerColors={meta.singerColors ?? EMPTY_LIST}
              initialSingers={meta.singers ?? EMPTY_LIST}
              isEditing={true}
            />
          );
        })()}
        {confirmModal}
      </div>
    </div>
  );
}
