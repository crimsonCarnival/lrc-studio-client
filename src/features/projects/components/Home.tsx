import { useState, useEffect, useCallback } from 'react';
import type { TFunction } from 'i18next';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatInTimezone, getRelativeTime } from '@/shared/utils/date';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { projects } from '@/app/api';
import { Icon } from '@/shared/ui/Icon';
import { SearchField } from '@ui/search-field';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { CountTabs } from '@ui/count-tabs';
import { Skeleton, SkeletonAlmostDone, SkeletonProjectCard, SkeletonResumeCard } from '@ui/skeleton';
import { projectStatus as statusOf } from '../project-status';
import { projectEditPath } from '../project-path';
import { ProjectStatusTag } from './ProjectStatusTag';
import ProjectSetupModalRaw from '@features/editor/components/setup/ProjectSetupModal';
import ProjectCard from '@/features/library/components/ProjectCard';
import { AlmostDoneBand } from './home/AlmostDoneBand';
import { ActivityBand } from './home/ActivityBand';
import { FollowingBand } from './home/FollowingBand';

// ProjectSetupModal is a large untyped component; alias to bypass prop checking until migrated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ProjectSetupModal = ProjectSetupModalRaw as any;

// Stable fallback: ProjectSetupModal re-syncs its form whenever an initial* prop changes identity.
const EMPTY_LIST: string[] = [];

interface ProjectMeta {
  tags?: string[];
  description?: string;
  songName?: string;
  songArtist?: string;
  songAlbum?: string;
  songYear?: string | number;
  singers?: string[];
  singerColors?: string[];
}

interface HomeProject {
  publicId: string;
  slug?: string | null;
  title?: string;
  coverImage?: string;
  metadata?: ProjectMeta;
  createdAt?: string | number;
  updatedAt?: string | number;
  syncedLineCount?: number;
  lineCount?: number;
  public?: boolean;
  starCount?: number;
  forkCount?: number;
  viewCount?: number;
  shareCount?: number;
  upload?: { source?: string };
  [key: string]: unknown;
}

interface DynamicTranslation {
  t: TFunction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dt: (key: string, options?: Record<string, any>) => string;
  i18n: { resolvedLanguage?: string; language?: string };
}

type HomeFilterTab = 'all' | 'inProgress' | 'completed' | 'notStarted';
const FILTER_TABS: HomeFilterTab[] = ['all', 'inProgress', 'completed', 'notStarted'];

export default function Home() {
  const { t, dt, i18n } = useDynamicTranslation() as DynamicTranslation;
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [items, setItems] = useState<HomeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<HomeFilterTab>('all');
  const [sortBy, setSortBy] = useState<'edited' | 'created' | 'title'>('edited');
  const [editingProject, setEditingProject] = useState<HomeProject | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Mirrors Library's handlers so both surfaces drive the shared card identically.
  const handleEdit = useCallback((project: { publicId: string }) => {
    setEditingProject(project as HomeProject);
  }, []);

  const handleDelete = useCallback((publicId: string) => {
    setDeletingId(publicId);
    try {
      projects.remove(publicId);
      setItems((prev) => prev.filter((p) => p.publicId !== publicId));
    } catch {
      // ignore — the row stays and the user can retry
    } finally {
      setDeletingId(null);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const list = await projects.list() as HomeProject[] || [];
      setItems(list || []);
    } catch (err) {
      console.error('Failed to fetch projects', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
  }, [fetchProjects]);

  const searchMatched = items.filter(p => {
    const titleMatch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const tagsMatch = p.metadata?.tags?.some(tag => (tag || '').toLowerCase().includes(searchQuery.toLowerCase())) || false;
    return titleMatch || tagsMatch;
  });

  // Tab counts are derived from the same search-filtered list the grid renders, so a
  // badge always equals the number of cards its tab shows. The server's `projects`
  // query ignores limit/offset and returns the user's full list (capped at 100).
  const tabCounts: Record<HomeFilterTab, number> = { all: searchMatched.length, inProgress: 0, completed: 0, notStarted: 0 };
  for (const p of searchMatched) tabCounts[statusOf(p)]++;

  const filteredProjects = searchMatched.filter(p => filterTab === 'all' || statusOf(p) === filterTab).sort((a, b) => {
    if (sortBy === 'edited') {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    }
    if (sortBy === 'created') {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    }
    if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });

  const lastProject = items.length > 0 ? items[0] : null;

  // projects.list() returns only the signed-in user's own projects, so the
  // signed-in account name IS the owner for everything on this page. Null when
  // it is not known yet; project URLs are owner-scoped, so there is nothing to
  // navigate to until it is.
  const openEditor = (project: HomeProject | null | undefined) => {
    const dest = project && projectEditPath(project, user?.accountName);
    if (dest) navigate(dest);
  };
  const greetingName = user?.displayName || user?.accountName || 'Creator';
  const timezone = (user as unknown as { settings?: { advanced?: { timezone?: string } } })?.settings?.advanced?.timezone || 'auto';
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden pt-8 pb-12 lg:px-12 max-w-7xl mx-auto w-full">
      {/* ── Greeting & New Project ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 animate-fade-in px-4 lg:px-0">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2 tracking-tight">
            {dt('home.welcome', { name: greetingName, context: user?.id })}
          </h1>
          <p className="text-[15px] text-zinc-400">
            {dt('home.welcomeSub')}
            {items.length > 0 && ` ${t('home.projectProgress', { total: items.length, remaining: lastProject?.lineCount ? lastProject.lineCount - (lastProject.syncedLineCount || 0) : '?' })}`}
          </p>
        </div>
        <Button asChild className="h-11 gap-2 px-[18px] text-base lg:h-11 lg:px-[18px] lg:text-base">
          <Link to="/project/new">
            <Icon name="add" size={18} />
            {t('home.createNew')}
          </Link>
        </Button>
      </div>

      {/* ── Donde lo dejaste ──
             While the project list loads this slot holds a skeleton of the same shape.
             Without it the section is simply absent, the bands below render at the top,
             and the card then pops in above them and shoves the page down. ── */}
      {(loading || lastProject) && (
        <section className="mb-12 animate-fade-in px-4 lg:px-0" aria-busy={loading}>
          <h2 className="text-sm font-bold text-subtle mb-4">{t('home.resumeLast')}</h2>
          {loading || !lastProject ? (
            <SkeletonResumeCard />
          ) : (
            <article
              className="group flex cursor-pointer flex-col gap-5 rounded-[var(--radius-card)] bg-background p-[18px] inset-ring inset-ring-hl transition-shadow duration-[var(--duration-state)] ease-state hover:inset-ring-faint sm:flex-row sm:items-center"
              onClick={() => openEditor(lastProject)}
            >
              <div className="cover-hatch relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl">
                {lastProject.coverImage ? (
                  <img src={lastProject.coverImage} alt="" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <Icon name="equalizer" className="text-faint" size={36} />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <h3 className="truncate font-heading text-2xl font-bold tracking-tight text-foreground">{lastProject.title || t('library.untitled')}</h3>
                  <ProjectStatusTag status={statusOf(lastProject)} withCheck />
                </div>
                <p className="truncate text-base text-subtle">
                  {lastProject.metadata?.songArtist || t('home.noArtist')}
                  {lastProject.metadata?.songAlbum ? ` · ${lastProject.metadata.songAlbum}` : ''}
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-1 flex-1 overflow-hidden rounded-sm bg-hl">
                    <div
                      className={`h-full rounded-sm ${statusOf(lastProject) === 'completed' ? 'bg-foam' : 'bg-iris'}`}
                      style={{ width: `${lastProject.lineCount ? Math.min(100, Math.round(((lastProject.syncedLineCount || 0) / lastProject.lineCount) * 100)) : 0}%` }}
                    />
                  </div>
                  <Tip content={`${t('home.created')} ${formatInTimezone(lastProject.createdAt, timezone, { dateStyle: 'short', timeStyle: 'short' }, locale)}`}>
                    <span className="shrink-0 font-mono text-xs font-medium text-subtle">
                      {(lastProject.syncedLineCount || 0)}/{(lastProject.lineCount || 0)} · {t('home.edited')} {getRelativeTime(lastProject.updatedAt || lastProject.createdAt, t, timezone, locale)}
                    </span>
                  </Tip>
                </div>
              </div>
              {/* The whole card is clickable for the mouse; this button is the keyboard and
                  screen-reader way in (its click bubbles to the card's handler). */}
              <Button aria-label={`${t('home.resume')}: ${lastProject.title || t('library.untitled')}`} className="h-11 shrink-0 gap-2 px-[18px] text-base lg:h-11 lg:px-[18px] lg:text-base">
                <Icon name="play_arrow" size={18} filled /> {t('home.resume')}
              </Button>
            </article>
          )}
        </section>
      )}

      {/* ── Almost done + your activity, side by side on wide screens.
             AlmostDoneBand renders nothing when no project qualifies, in which
             case ActivityBand's flex-1 takes the full row on its own. ── */}
      <div className="px-4 lg:px-0 mb-8 flex flex-col lg:flex-row lg:items-stretch gap-6">
        {loading ? (
          <div className="lg:w-[38%] lg:shrink-0" aria-hidden="true">
            <Skeleton className="mb-3 h-5 w-40" />
            <SkeletonAlmostDone />
          </div>
        ) : (
          <AlmostDoneBand
            projects={items}
            onOpen={(publicId) => openEditor(items.find(p => p.publicId === publicId))}
          />
        )}
        <ActivityBand />
      </div>

      {/* ── Tus proyectos ── */}
      <div className="px-4 lg:px-0 animate-fade-in">
        <div className="flex flex-col gap-4 mb-6 relative z-10">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-semibold text-zinc-100 tracking-tight">{t('home.yourProjects')}</h2>
            
            <SearchField
              compact
              label={t('home.search')}
              placeholder={t('home.search')}
              value={searchQuery}
              onValueChange={setSearchQuery}
              clearLabel={t('common.clear')}
              className="w-56 max-w-full"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 w-full relative">
            <CountTabs<HomeFilterTab>
              label={t('home.yourProjects')}
              value={filterTab}
              onChange={setFilterTab}
              tabs={FILTER_TABS.map((tab) => ({
                value: tab,
                label: (t as (k: string) => string)(`home.${tab}`),
                // No counts while loading: a row of zeros reads as "you have no projects".
                count: loading ? undefined : tabCounts[tab],
              }))}
            />

            <div className="flex items-center gap-2 relative shrink-0 ml-auto sm:ml-0 mb-1 sm:mb-0">
              <div className="relative flex items-center">
                <Icon name="sort" size={14} className="absolute left-3 text-zinc-400 pointer-events-none" />
                <select 
                  className="appearance-none bg-transparent hover:bg-zinc-800 text-xs coarse:min-h-11 text-zinc-400 hover:text-zinc-200 transition-colors pl-8 pr-8 py-1.5 rounded-lg outline-none cursor-pointer border-none"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'edited' | 'created' | 'title')}
                >
                  <option value="edited" className="bg-zinc-900">{t('home.sortBy')} {t('home.recentlyEdited')}</option>
                  <option value="created" className="bg-zinc-900">{t('home.sortBy')} {t('home.recentlyCreated')}</option>
                  <option value="title" className="bg-zinc-900">{t('home.sortBy')} {t('home.titleAZ')}</option>
                </select>
                <Icon name="expand_more" size={14} className="absolute right-2 text-zinc-400 pointer-events-none" />
              </div>
              <div className="w-px h-5 bg-zinc-800 mx-1 hidden sm:block" />
              <Link to="/library"
                className="text-xs font-medium text-primary hover:text-primary-dim transition-colors hidden sm:block"
              >
                {t('home.viewLibrary')}
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12" aria-busy={loading}>
          {loading && Array.from({ length: 3 }, (_, i) => <SkeletonProjectCard key={i} />)}
          {!loading && filteredProjects.map((project) => (
            <ProjectCard
              key={project.publicId}
              project={project}
              // ProjectCard builds the canonical path from the owner account
              // name it is given; never rebuild one from publicId here.
              onSelect={(_publicId, editPath) => { if (editPath) navigate(editPath); }}
              ownerAccountName={user?.accountName}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isListView={false}
              isDeleting={deletingId === project.publicId}
              i18n={i18n}
              timezone={timezone}
              // projects.list() returns only the signed-in user's own projects,
              // so the list itself is the ownership signal — same as Library.
              isOwner
            />
          ))}

          {/* Start another CTA Card */}
          <Link to="/project/new"
            className="group flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-[1.5px] border-dashed border-hl p-6 text-center text-subtle transition-colors duration-[var(--duration-state)] ease-state hover:border-iris hover:bg-primary-soft hover:text-primary-ink focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
          >
            <span className="grid size-[52px] place-items-center rounded-full bg-raised">
              <Icon name="add" size={24} />
            </span>
            <h3 className="text-base font-semibold">{t('home.startAnother')}</h3>
            <p className="text-sm text-subtle">{t('home.startAnotherDesc')}</p>
          </Link>
        </div>
      </div>

      {/* ── From people you follow: hides itself when the feed is empty ── */}
      <div className="px-4 lg:px-0">
        <FollowingBand />
      </div>

      <ProjectSetupModal
        key={editingProject?.publicId || 'none'}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onConfirm={async (data: {
          name?: string; description?: string; tags?: string[];
          songName?: string; songArtist?: string; songAlbum?: string; songYear?: string | number;
          coverImage?: string; isPublic?: boolean; singerColors?: string[]; singers?: string[];
        }) => {
          if (!editingProject) return;
          try {
            const { name: title, description, tags, songName, songArtist, songAlbum, songYear, coverImage, isPublic, singerColors, singers } = data;
            const updatedMetadata = {
              ...editingProject.metadata,
              description,
              tags,
              songName,
              songArtist,
              songAlbum,
              songYear,
              singerColors: (singerColors || []).map((c) => c || ''),
              singers,
            };
            await projects.patch(editingProject.publicId, {
              title,
              coverImage,
              public: isPublic,
              metadata: updatedMetadata
            } as Parameters<typeof projects.patch>[1]);
            // Update local state
            setItems(prev => prev.map(p =>
              p.publicId === editingProject.publicId
                ? { ...p, title, coverImage, public: isPublic, metadata: updatedMetadata }
                : p
            ));
            setEditingProject(null);
          } catch {
            toast.error(t('project.updateError'));
          }
        }}
        initialName={editingProject?.title || ''}
        initialDescription={editingProject?.metadata?.description || ''}
        initialTags={editingProject?.metadata?.tags || []}
        initialSongName={editingProject?.metadata?.songName || ''}
        initialSongArtist={editingProject?.metadata?.songArtist || ''}
        initialSongAlbum={editingProject?.metadata?.songAlbum || ''}
        initialSongYear={editingProject?.metadata?.songYear || ''}
        initialCoverImage={editingProject?.coverImage || ''}
        initialIsPublic={editingProject?.public || false}
        initialSingerColors={editingProject?.metadata?.singerColors ?? EMPTY_LIST}
        initialSingers={editingProject?.metadata?.singers ?? EMPTY_LIST}
        initialAlbumArt={''}
        isEditing={true}
      />
    </div>
  );
}
