import {
  Suspense, lazy, useEffect, useRef, useCallback, useMemo, memo
} from 'react';
import type { ComponentProps, ReactNode } from 'react';
import React from 'react';
import { isAdminHost, canUseAdminHost, adminHostUrl } from '@/shared/utils/host';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { SkeletonList, SkeletonEditor, SkeletonPreview, SkeletonSetup } from '@ui/skeleton';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { useEditorActivity } from '@/features/auth/hooks/useSessionSocket';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { isStaff } from '@/features/auth/permissions';
import { usePlayerSlot } from '@/features/player/hooks/usePlayerSlot';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import useInputMethod from '@/shared/hooks/useInputMethod';
import type { AppState } from '@/shared/hooks/useAppState';
import type { AuthUser } from '@/features/auth/hooks/useAuth';
import { isApiError } from '@/types';
import { projectEditPath, publicIdFromSlugId, canonicalPathFromParams } from '@features/projects/project-path';
import { LogoLoader } from '@ui/LogoLoader';

const EditorLazy = lazy(() => import('@features/editor/components/EditorPage'));
const PreviewLazy = lazy(() => import('@features/preview/components/Preview'));

// Memo wrappers prevent Editor/Preview from re-rendering when AppRouter
// re-renders due to hover/drag/resize layout state changes — which are
// purely cosmetic and don't affect editor or preview content.
const Editor = memo(EditorLazy);
const Preview = memo(PreviewLazy);
const Library = lazy(() => import('@features/library/components/Library'));
const UploadsLibrary = lazy(() => import('@features/library/components/UploadsLibrary'));
const UploadDetailView = lazy(() => import('@features/projects/components/UploadDetailView'));
const SetupScreen = lazy(() => import('@features/editor/components/setup/SetupScreen'));
const Home = lazy(() => import('@features/projects/components/Home'));
const GuestLanding = lazy(() => import('@features/landing/GuestLanding'));
const AdminDashboard = lazy(() => import('@features/admin/AdminDashboard'));
const ProfilePage = lazy(() => import('@features/profile/ProfilePage'));
const SettingsPage = lazy(() => import('@features/settings/components/SettingsPage'));
const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));
const VerifyEmailPage = lazy(() => import('@features/auth/VerifyEmailPage'));

const FeedPage   = lazy(() => import('@features/feed/FeedPage'));
const SearchPage = lazy(() => import('@features/search/SearchPage'));
const ExplorePage = lazy(() => import('@features/explore/ExplorePage'));
const ExploreProjectsPage = lazy(() => import('@features/explore/ExploreProjectsPage'));
const ExplorePlaylistsPage = lazy(() => import('@features/explore/ExplorePlaylistsPage'));
const PublicProjectViewPage = lazy(() => import('@features/projects/components/PublicProjectViewPage'));
const ListPage = lazy(() => import('@features/playlists/ListPage'));
const LeaderboardPage = lazy(() => import('@features/leaderboard/LeaderboardPage'));
const NotificationsPage = lazy(() => import('@features/notifications/NotificationsPage'));
const GuidePage = lazy(() => import('@features/guide/GuidePage'));

type EditorProps = ComponentProps<typeof Editor>;
type PreviewComponentProps = ComponentProps<typeof Preview>;

// appState is the enhanced useAppState result (App augments it with t + setup handler).
type RouterAppState = AppState & {
  t: TFunction;
  handleSetupComplete: (data: unknown) => void;
  isPlaying: boolean;
  playbackSpeed: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouterLayoutState = Record<string, any>;

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext();
  if (loading) return <div className="flex-1 flex items-center justify-center"><LogoLoader size={32} /></div>;
  if (!user) return <Navigate to="/auth/signin" replace />;
  // Any staff member (holds at least one permission) may reach the dashboard;
  // individual tabs/actions are gated by their specific permission.
  if (!isStaff(user.permissions)) return <Navigate to="/home" replace />;
  return children;
}

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => { window.location.replace(to); }, [to]);
  return null;
}

function RedirectWithParams({ to }: { to: (params: Record<string, string>) => string }) {
  const params = useParams() as Record<string, string>;
  return <Navigate to={to(params)} replace />;
}

type WorkspaceView = 'editor' | 'preview';

interface EditorWorkspaceProps {
  view: WorkspaceView;
  user?: AuthUser | null;
  editorProps: EditorProps;
  previewProps: PreviewComponentProps;
}

// One full-bleed view at a time. The editor is only mounted while it is the
// active view, so its keyboard shortcuts (mark, nudge) cannot fire from the
// preview. The preview stays mounted and merely hidden: it owns the export
// dialog, which the editor's Export button opens without leaving the editor.
const EditorWorkspace = memo(function EditorWorkspace({ view, user, editorProps, previewProps }: EditorWorkspaceProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">
      {view === 'editor' && (
        <Suspense fallback={<SkeletonEditor />}>
          <Editor user={user} {...editorProps} />
        </Suspense>
      )}
      <div className={`flex-1 min-h-0 flex flex-col ${view === 'preview' ? '' : 'hidden'}`}>
        <Suspense fallback={<SkeletonPreview />}>
          <Preview {...previewProps} active={view === 'preview'} />
        </Suspense>
      </div>
    </div>
  );
});

interface EditorContainerProps {
  loadProject: (id: string) => void;
  activepublicId?: string | null;
  isProjectLoading?: boolean;
  projectUserId?: string | null;
  user?: AuthUser | null;
  navigate: NavigateFunction;
  children: ReactNode;
}

function EditorContainer({ loadProject, activepublicId, isProjectLoading, projectUserId, user, navigate, children }: EditorContainerProps) {
  const { accountName, slugId } = useParams();
  // The slug half of the segment is cosmetic; the project is always resolved by
  // the publicId in its tail.
  const id = publicIdFromSlugId(slugId);

  useEffect(() => {
    if (id && id !== activepublicId) {
      loadProject(id);
    }
    // loadProject is stable (useCallback); route param id is the true trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activepublicId]);

  useEffect(() => {
    if (!isProjectLoading && projectUserId && activepublicId === id && user && user.id !== projectUserId) {
      // Rebuilt rather than reused: route params arrive decoded, so an encoded
      // slash in the (cosmetic) account segment would make this a protocol-relative
      // off-site navigation. canonicalPathFromParams re-encodes both segments.
      navigate(canonicalPathFromParams(accountName, slugId));
    }
  }, [isProjectLoading, projectUserId, activepublicId, id, user, navigate, accountName, slugId]);

  return children;
}

function ForkHandler({ appState, navigate }: { appState: RouterAppState; navigate: NavigateFunction }) {
  const { accountName, slugId } = useParams();
  const { user, loading } = useAuthContext();
  const { loadProject, t } = appState;
  const ran = useRef(false);
  const id = publicIdFromSlugId(slugId);

  useEffect(() => {
    if (loading) return;
    if (ran.current) return;
    if (!id) return;

    if (!user || user.isGuest) {
      // Redirect to login; AuthPage's handleAuthSuccess navigates back to ?redirect= on success
      navigate(`/auth/signin?redirect=${encodeURIComponent(`${canonicalPathFromParams(accountName, slugId)}/fork`)}`);
      return;
    }

    ran.current = true;
    import('@/app/api').then(({ projects }) => {
      projects.clone(id)
        .then((res) => {
          // The clone belongs to the signed-in user, so they are its owner.
          // accountName is always set on a real account; '/library' is only a
          // guard so a missing one cannot navigate to a half-built URL.
          const result = res as { publicId: string; slug?: string | null };
          loadProject(result.publicId);
          navigate(projectEditPath(result, user.accountName) ?? '/library');
          import('react-hot-toast').then(({ default: toast }) => {
            toast.success(t('project.cloneSuccess'));
          });
        })
        .catch((err) => {
          const code = isApiError(err) ? err.graphqlErrors?.[0]?.extensions?.code : undefined;
          const key = code === 'already_forked' ? 'project.cloneAlreadyForked'
            : code === 'forks_disabled' ? 'project.cloneForksDisabled'
            : code === 'quota_exceeded' ? 'project.cloneQuotaExceeded'
            : code === 'not_found' ? 'project.cloneNotFound'
            : 'project.cloneFailed';
          console.error('Failed to clone project:', err);
          navigate('/library');
          import('react-hot-toast').then(({ default: toast }) => {
            toast.error(t(key));
          });
        });
    });
    // navigate, loadProject, t are stable; ran.current guards single-execution
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, loading]);

  if (!id) return <NotFoundPage type="project" />;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-400">
      <LogoLoader size={40} className="text-primary" />
      <p className="text-sm font-medium animate-pulse">
        {t('project.cloning')}
      </p>
    </div>
  );
}

interface AppRouterProps {
  appState: RouterAppState;
  layoutState: RouterLayoutState;
  navigate: NavigateFunction;
}

export function AppRouter({
  appState,
  layoutState,
  navigate
}: AppRouterProps) {
  const routerLocation = useLocation();
  const {
    loadProject,
    activepublicId,
    isProjectLoading,
    projectUserId,
    lines,
    setLines,
    syncMode,
    setSyncMode,
    activeLineIndex,
    setActiveLineIndex,
    playbackPosition,
    playerRef,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    editorReady,
    editorMode,
    setEditorMode,
    duration,
    triggerImportSave,
    handleManualSave,
    handleRemoveAllLyrics,
    isAutosaving,
    pendingSyncs,
    isSaving,
    saveFailed,
    registerAfterSave,
    mediaTitle,
    exportToUrl,
    isSharedProject,
    sharedReadOnly,
    setSharedReadOnly,
    shareModal,
    setShareModal,
    hasMedia,
    isPlaying,
    playbackSpeed,
    pendingProject,
    projectMetadata,
    loadError,
    handleSetupComplete,
    setShowKeyboardHelp,
    buildProjectPayload,
    restoredMedia,
    uploadedAudio,
  } = appState;

  usePageTitle(mediaTitle);

  // Broadcast editor activity to mutual friends via socket presence system.
  // Emits when user is actively working in a project; clears on close/unmount.
  const songName = (projectMetadata as { songName?: string } | undefined)?.songName;
  const projectTitle = (projectMetadata as { name?: string } | undefined)?.name;
  useEditorActivity(
    activepublicId && activepublicId !== 'new' && activepublicId !== 'local'
      ? { projectTitle: projectTitle ?? '', songName: songName ?? '', publicId: activepublicId }
      : null
  );

  const { user } = useAuthContext();
  const { mobileTab, setMobileTab, setShowNamingModal } = layoutState;

  // Editor or preview ("Revisar"). Stored in interface.mobileTab, the setting the
  // phone tab bar already writes, so both ways of switching stay in step.
  const view: WorkspaceView = mobileTab === 'preview' ? 'preview' : 'editor';
  const showEditorView = useCallback(() => setMobileTab('editor'), [setMobileTab]);
  const showPreviewView = useCallback(() => setMobileTab('preview'), [setMobileTab]);

  const isLgRouter = useBreakpoint('lg');
  const routerInputMethod = useInputMethod();
  const playerSlot = usePlayerSlot({
    hideEditor: view === 'preview',
    hidePreview: false,
    focusMode: 'default',
    isLg: isLgRouter,
    isTouch: routerInputMethod === 'touch',
  });

  const handleNewProject = useCallback(() => navigate('/project/new'), [navigate]);
  const handleToggleKeyboardHelp = useCallback(() => {
    setShowKeyboardHelp?.((p: boolean) => !p);
  }, [setShowKeyboardHelp]);
  // The public view is the editor URL without `/edit`, so it is derived from the
  // path we are already on rather than rebuilt from an id we have no owner for.
  const handleViewPublic = useMemo(() => {
    if (!activepublicId) return undefined;
    const match = /^(\/[^/]+\/projects\/[^/]+)\/edit$/.exec(routerLocation.pathname);
    if (!match) return undefined;
    const viewPath = match[1];
    return () => navigate(viewPath);
  }, [activepublicId, routerLocation.pathname, navigate]);

  const editorProps = useMemo(() => ({
    lines, setLines, syncMode, setSyncMode,
    activeLineIndex, setActiveLineIndex,
    playbackPosition, playerRef,
    undo, redo, canUndo, canRedo, clearHistory,
    editorMode, setEditorMode, duration,
    onImport: triggerImportSave, handleManualSave,
    buildProjectPayload,
    handleRemoveAllLyrics, isAutosaving, pendingSyncs,
    isSaving,
    saveFailed,
    onNewProject: handleNewProject,
    onShowKeyboardHelp: handleToggleKeyboardHelp,
    onOpenProjectSettings: setShowNamingModal ? () => setShowNamingModal(true) : undefined,
    registerAfterSave,
    songArtists: projectMetadata?.songArtists || [],
    singerColors: projectMetadata?.singerColors || [],
    declaredSingers: projectMetadata?.singers || [],
    playerSlot,
    onShowPreview: showPreviewView,
    uploadedAudio,
    hasMedia,
    activepublicId,
    onTogglePublicView: handleViewPublic,
    isPlaying,
  } as unknown as EditorProps), [
    lines, setLines, syncMode, setSyncMode,
    activeLineIndex, setActiveLineIndex,
    playbackPosition, playerRef,
    undo, redo, canUndo, canRedo, clearHistory,
    editorMode, setEditorMode, duration,
    triggerImportSave, handleManualSave,
    buildProjectPayload,
    handleRemoveAllLyrics, isAutosaving, pendingSyncs,
    isSaving,
    saveFailed,
    handleNewProject,
    handleToggleKeyboardHelp,
    setShowNamingModal,
    registerAfterSave,
    projectMetadata,
    playerSlot,
    showPreviewView,
    uploadedAudio, hasMedia, activepublicId, handleViewPublic, isPlaying,
  ]);

  const previewProps = useMemo(() => ({
    lines, setLines, playbackPosition,
    mediaTitle, playerRef, duration,
    editorMode, exportToUrl, isSharedProject,
    sharedReadOnly, setSharedReadOnly,
    shareModal, setShareModal, hasMedia,
    isPlaying, playbackSpeed, activepublicId,
    project: pendingProject, projectMetadata,
    onShowEditor: showEditorView,
    onViewPublic: handleViewPublic,
    setActiveLineIndex,
    songArtists: projectMetadata?.songArtists || [],
    singerColors: projectMetadata?.singerColors || [],
    playerSlot,
  } as unknown as PreviewComponentProps), [
    lines, setLines, playbackPosition,
    mediaTitle, playerRef, duration,
    editorMode, exportToUrl, isSharedProject,
    sharedReadOnly, setSharedReadOnly,
    shareModal, setShareModal, hasMedia,
    isPlaying, playbackSpeed, activepublicId,
    pendingProject, projectMetadata,
    showEditorView, handleViewPublic, setActiveLineIndex,
    playerSlot,
  ]);

  const adminPage = (
    <RequireAdmin>
      <Suspense fallback={<SkeletonList count={3} />}>
        <AdminDashboard />
      </Suspense>
    </RequireAdmin>
  );

  return (
    <Routes>
      <Route path="uploads" element={
        <Suspense fallback={<div className="glass rounded-xl p-5 flex-1"><SkeletonList count={3} /></div>}>
          <UploadsLibrary onSelect={(upload) => navigate(`/uploads/${upload.id}`)} />
        </Suspense>
      } />
      <Route path="uploads/:id" element={
        <Suspense fallback={<div className="glass rounded-xl p-5 flex-1"><SkeletonList count={3} /></div>}>
          <UploadDetailView onBack={() => navigate('/uploads')} />
        </Suspense>
      } />
      <Route path="project/new" element={
        <Suspense fallback={<SkeletonSetup />}>
          <SetupScreen
            onComplete={handleSetupComplete}
            playerRef={playerRef}
            onShowAllUploads={() => navigate('/uploads')}
          />
        </Suspense>
      } />
      <Route path="library" element={
        <Suspense fallback={<div className="glass rounded-xl p-5 flex-1"><SkeletonList count={3} /></div>}>
          <Library
            onOpenProject={(publicId: string, editPath: string | null) => {
              // Library builds the canonical path from the row it rendered (it
              // has the slug and the owner); null means the owner was unknown
              // there, and there is no URL to send the user to.
              if (!editPath) return;
              loadProject(publicId);
              navigate(editPath);
            }}
          />
        </Suspense>
      } />
      {isAdminHost() ? (
        <>
          <Route index element={adminPage} />
          <Route path="home" element={adminPage} />
          <Route path="dashboard" element={adminPage} />
          <Route path="admin" element={<Navigate to="/" replace />} />
        </>
      ) : canUseAdminHost() ? (
        <Route path="admin" element={<ExternalRedirect to={adminHostUrl('/')} />} />
      ) : (
        <Route path="admin" element={adminPage} />
      )}
      <Route path=":accountName/projects/:slugId/fork" element={<ForkHandler appState={appState} navigate={navigate} />} />
      <Route path=":accountName/projects/:slugId/edit" element={
        <EditorContainer loadProject={loadProject} activepublicId={activepublicId} isProjectLoading={isProjectLoading} projectUserId={projectUserId} user={user} navigate={navigate}>
          {loadError === 'project' ? (
            <NotFoundPage type="project" />
          ) : loadError === 'forbidden' ? (
            <NotFoundPage type="forbidden" />
          ) : loadError === 'gone' ? (
            <NotFoundPage type="gone" />
          ) : isProjectLoading ? (
            <SkeletonEditor />
          ) : (
            <EditorWorkspace view={view} user={user} editorProps={editorProps} previewProps={previewProps} />
          )}
        </EditorContainer>
      } />
      <Route path="home" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} /></div>}>
          <Home />
        </Suspense>
      } />
      <Route path="project/local" element={
        editorReady && lines.length === 0 && !hasMedia && !pendingProject && !restoredMedia
          && new URLSearchParams(routerLocation.search).get('fromGuest') !== '1'
          ? <Navigate to="/project/new" replace />
          : <EditorWorkspace view={view} user={user} editorProps={editorProps} previewProps={previewProps} />
      } />
      <Route path=":accountName/projects/:slugId" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>}>
          <PublicProjectViewPage />
        </Suspense>
      } />
      <Route path="profile/:accountName/lists/:listId" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>}>
          <ListPage />
        </Suspense>
      } />
      <Route path=":accountName/lists/:listId" element={<RedirectWithParams to={(p) => `/profile/${p.accountName}/lists/${p.listId}`} />} />
      <Route path="u/:accountName/lists/:listId" element={<RedirectWithParams to={(p) => `/profile/${p.accountName}/lists/${p.listId}`} />} />
      <Route path="profile/:accountName" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>}>
          <ProfilePage />
        </Suspense>
      } />
      <Route path=":accountName" element={<RedirectWithParams to={(p) => `/profile/${p.accountName}`} />} />
      <Route path="u/:accountName" element={<RedirectWithParams to={(p) => `/profile/${p.accountName}`} />} />
      <Route path="settings/:tab?" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>}>
          <SettingsPage />
        </Suspense>
      } />
      <Route index element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} /></div>}>
          <GuestLanding />
        </Suspense>
      } />
      <Route path="verify-email" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>}>
          <VerifyEmailPage />
        </Suspense>
      } />
      <Route path="feed" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>}>
          <FeedPage />
        </Suspense>
      } />
      <Route path="search" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} /></div>}>
          <SearchPage />
        </Suspense>
      } />
      <Route path="explore" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>}>
          <ExplorePage />
        </Suspense>
      } />
      <Route path="explore/projects" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>}>
          <ExploreProjectsPage />
        </Suspense>
      } />
      <Route path="explore/playlists" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>}>
          <ExplorePlaylistsPage />
        </Suspense>
      } />
      <Route path="leaderboard" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>}>
          <LeaderboardPage />
        </Suspense>
      } />
      <Route path="notifications" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>}>
          <NotificationsPage />
        </Suspense>
      } />
      <Route path="guide" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LogoLoader size={32} className="text-primary" /></div>}>
          <GuidePage />
        </Suspense>
      } />
      <Route path="*" element={<NotFoundPage type="general" />} />
    </Routes>
  );
}
