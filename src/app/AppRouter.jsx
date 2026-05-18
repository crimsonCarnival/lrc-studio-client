import {
  Suspense, lazy, useEffect, useState, useRef, useCallback, useMemo, Fragment, memo
} from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { SkeletonList, SkeletonEditor, SkeletonPreview, SkeletonSetup } from '@ui/skeleton';
import { Loader2, GripVertical } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { STORAGE_KEYS, storage } from '@/features/projects/services/storage.service';

const EditorLazy = lazy(() => import('@features/editor/components/core/Editor'));
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
const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));

function EditorContainer({ loadProject, activeProjectId, children }) {
  const { id } = useParams();

  useEffect(() => {
    if (id && id !== 'new' && id !== 'local' && id !== 'fork' && id !== activeProjectId) {
      loadProject(id);
    }
  }, [id, activeProjectId, loadProject]);

  return children;
}

function ForkHandler({ appState, navigate }) {
  const { id } = useParams();
  const { user } = useAuthContext();
  const { loadProject, t } = appState;
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    if (!id) return;

    if (!user || user.isGuest) {
      // Store intention and redirect to login
      storage.set(STORAGE_KEYS.REDIRECT, `/project/fork/${id}`);
      storage.set(STORAGE_KEYS.CLONE_AFTER_AUTH, id);
      navigate(`/auth/signin?redirect=${encodeURIComponent(`/project/fork/${id}`)}`);
      return;
    }

    ran.current = true;
    import('@/app/api').then(({ projects }) => {
      projects.clone(id)
        .then((res) => {
          loadProject(res.projectId);
          navigate(`/project/${res.projectId}`);
          import('react-hot-toast').then(({ default: toast }) => {
            toast.success(t('project.cloneSuccess') || 'Project copied successfully!');
          });
        })
        .catch((err) => {
          console.error('Failed to clone project:', err);
          navigate('/library');
          import('react-hot-toast').then(({ default: toast }) => {
            toast.error(t('project.cloneFailed') || 'Failed to copy project');
          });
        });
    });
  }, [id, user, navigate, loadProject, t]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-400">
      <Loader2 className="size-10 animate-spin text-primary" />
      <p className="text-sm font-medium animate-pulse">
        {t('project.cloning') || 'Cloning project...'}
      </p>
    </div>
  );
}

export function AppRouter({
  appState,
  layoutState,
  navigate
}) {
  const {
    loadProject,
    activeProjectId,
    isProjectLoading,
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
    editorMode,
    setEditorMode,
    duration,
    triggerImportSave,
    handleManualSave,
    handleRemoveAllLyrics,
    isAutosaving,
    isSaving,
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
    setShowSettings,
    setShowKeyboardHelp,
    buildProjectPayload,
  } = appState;

  usePageTitle(mediaTitle);

  const { user } = useAuthContext();
  const { editorColClass, previewColClass, showEditor, showPreview, mobileTab, layoutSwap, setLayoutSwap, editorWidth, setEditorWidth, lockLayout, focusMode } = layoutState;
  const [draggingItem, setDraggingItem] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isHoveringDivider, setIsHoveringDivider] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleWinResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleWinResize);
    return () => window.removeEventListener('resize', handleWinResize);
  }, []);

  // Reorder logic
  const items = layoutSwap ? ['preview', 'editor'] : ['editor', 'preview'];
  const handleReorder = useCallback((newOrder) => {
    const isSwapped = newOrder[0] === 'preview';
    if (isSwapped !== layoutSwap) setLayoutSwap(isSwapped);
  }, [layoutSwap, setLayoutSwap]);

  const borderClasses = useMemo(() => {
    const base = (item) => {
      if (draggingItem === item) return 'border-dashed border-primary/40 shadow-2xl scale-[1.01] z-50';
      if (isResizing || isHoveringDivider) return 'border-primary/40 shadow-xl';
      const isFocused = (item === 'editor' && focusMode === 'sync') ||
                        (item === 'preview' && focusMode === 'playback');
      if (isFocused && !lockLayout) {
        return 'border-primary/40 shadow-[0_0_20px_rgba(29,185,84,0.15)] ring-1 ring-primary/20 transition-all duration-300';
      }
      return 'border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-300';
    };
    return { editor: base('editor'), preview: base('preview') };
  }, [draggingItem, isResizing, isHoveringDivider, focusMode, lockLayout]);

  const handleResize = useCallback((e) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Convert pixel constraints to percentages based on current container width
    const minEditorPct = (620 / containerRect.width) * 100; // Safe width for editor tools
    const maxEditorPct = 100 - ((300 / containerRect.width) * 100); // Preview safe width

    const targetEditorWidth = layoutSwap ? 100 - newWidth : newWidth;

    // Priority: ensure editor gets its minimum width even if window is small
    const safeMaxPct = Math.max(minEditorPct, maxEditorPct);
    const clampedEditorWidth = Math.max(minEditorPct, Math.min(safeMaxPct, targetEditorWidth));

    setEditorWidth(clampedEditorWidth);
  }, [layoutSwap, setEditorWidth]);

  // Keep a ref so the mousemove listener always calls the current handleResize
  // even if layoutSwap changes mid-drag (stale closure prevention).
  const handleResizeRef = useRef(handleResize);
  useEffect(() => { handleResizeRef.current = handleResize; }, [handleResize]);

  const startResizing = useCallback(() => {
    if (!isDesktop || lockLayout) return;
    setIsResizing(true);
    document.body.style.cssText += 'cursor: col-resize; user-select: none;';
    const onMove = (e) => handleResizeRef.current(e);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', () => {
      setIsResizing(false);
      document.body.style.cssText = document.body.style.cssText.replace('cursor: col-resize; user-select: none;', '');
      window.removeEventListener('mousemove', onMove);
    }, { once: true });
  }, [isDesktop, lockLayout]);

  return (
    <Routes>
      <Route path="uploads" element={
        <Suspense fallback={<div className="glass rounded-xl p-5 flex-1"><SkeletonList count={3} /></div>}>
          <UploadsLibrary onSelect={(upload) => navigate(`/uploads/${upload.id}`)} onBack={() => navigate(-1)} />
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
            onOpenSettings={() => setShowSettings(true)}
          />
        </Suspense>
      } />
      <Route path="library" element={
        <Suspense fallback={<div className="glass rounded-xl p-5 flex-1"><SkeletonList count={3} /></div>}>
          <Library
            onOpenProject={(projectId) => {
              loadProject(projectId);
              navigate(`/project/${projectId}`);
            }}
            onBack={() => navigate(-1)}
          />
        </Suspense>
      } />
      <Route path="admin" element={
        <Suspense fallback={<SkeletonList count={3} />}>
          <AdminDashboard />
        </Suspense>
      } />
      <Route path="project/fork/:id" element={<ForkHandler appState={appState} navigate={navigate} />} />
      <Route path="project/:id" element={
        <EditorContainer loadProject={loadProject} activeProjectId={activeProjectId}>
          {loadError === 'project' ? (
            <NotFoundPage type="project" />
          ) : isProjectLoading ? (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className={`${editorColClass} flex flex-col gap-4`}><SkeletonEditor /></div>
              <div className={`${previewColClass} flex flex-col`}><SkeletonPreview /></div>
            </div>
          ) : (
            <div ref={containerRef} className="flex-1 flex flex-col min-h-0 w-full overflow-x-hidden max-lg:pb-4">
              <Reorder.Group
                axis="x"
                values={items}
                onReorder={handleReorder}
                className="flex-1 min-h-0 flex flex-col lg:flex-row lg:gap-6 gap-0 pt-0 px-0 pb-0 w-full"
              >
                {items.map((item, index) => {
                  const isEditor = item === 'editor';
                  const isVisible = isEditor ? showEditor : showPreview;
                  if (!isVisible) return null;

                  // On desktop with both panels visible: use percentage-based widths with gap accounting.
                  // When only one panel is visible: fill the full container (flex:1 1 auto).
                  // editorWidth is preserved in state so toggling editor back reverts the split.
                  // minWidth is intentionally omitted — handleResize already clamps percentages to safe minimums.
                  const bothVisible = showEditor && showPreview;
                  const widthStyle = isDesktop && bothVisible ? {
                    flex: `0 0 calc(${isEditor ? editorWidth : (100 - editorWidth)}% - 12px)`,
                  } : {
                    flex: '1 1 auto'
                  };

                  return (
                    <Fragment key={item}>
                      <div className="flex items-stretch min-h-0 min-w-0" style={widthStyle}>
                        <Reorder.Item
                          value={item}
                          layout={false}
                          dragListener={isDesktop && !lockLayout}
                          whileDrag={{ scale: 1.01, zIndex: 50, boxShadow: "0px 20px 40px rgba(0,0,0,0.4)", opacity: 0.8 }}
                          className={`flex-1 flex flex-col min-h-0 ${isEditor ? 'gap-4' : ''} ${mobileTab !== item ? 'max-lg:hidden' : ''} relative group/reorder lg:border-2 lg:rounded-2xl border-0 rounded-none ${isEditor ? borderClasses.editor : borderClasses.preview} transition-colors duration-200 overflow-hidden lg:bg-zinc-900/50 lg:backdrop-blur-sm bg-zinc-950`}
                          onDragStart={() => setDraggingItem(item)}
                          onDragEnd={() => setDraggingItem(null)}
                        >
                          {/* Drag Handle - Hidden visually but functional */}
                          <div className={`absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-300 z-50 cursor-grab active:cursor-grabbing bg-zinc-800 backdrop-blur-xl border border-zinc-600/50 rounded-xl p-2 shadow-2xl pointer-events-auto max-lg:hidden hover:scale-110 hover:border-primary/50 group/handle ${draggingItem === item || lockLayout ? 'hidden' : ''}`}>
                            <GripVertical className="size-5 text-zinc-400 group-hover/handle:text-primary transition-colors" />
                          </div>

                          <Suspense fallback={isEditor ? <SkeletonEditor /> : <SkeletonPreview />}>
                            {isEditor ? (
                              <Editor
                                user={user}
                                lines={lines} setLines={setLines} syncMode={syncMode} setSyncMode={setSyncMode}
                                activeLineIndex={activeLineIndex} setActiveLineIndex={setActiveLineIndex}
                                playbackPosition={playbackPosition} playerRef={playerRef}
                                undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
                                editorMode={editorMode} setEditorMode={setEditorMode} duration={duration}
                                onImport={triggerImportSave} handleManualSave={handleManualSave}
                                buildProjectPayload={buildProjectPayload}
                                handleRemoveAllLyrics={handleRemoveAllLyrics} isAutosaving={isAutosaving}
                                isSaving={isSaving}
                                onNewProject={() => navigate('/project/new')}
                                onShowKeyboardHelp={setShowKeyboardHelp ? () => setShowKeyboardHelp(p => !p) : undefined}
                                registerAfterSave={registerAfterSave}
                              />
                            ) : (
                              <Preview
                                lines={lines} setLines={setLines} playbackPosition={playbackPosition}
                                mediaTitle={mediaTitle} playerRef={playerRef} duration={duration}
                                editorMode={editorMode} exportToUrl={exportToUrl} isSharedProject={isSharedProject}
                                sharedReadOnly={sharedReadOnly} setSharedReadOnly={setSharedReadOnly}
                                shareModal={shareModal} setShareModal={setShareModal} hasMedia={hasMedia}
                                isPlaying={isPlaying} playbackSpeed={playbackSpeed} activeProjectId={activeProjectId}
                                project={pendingProject} projectMetadata={projectMetadata}
                              />
                            )}
                          </Suspense>
                        </Reorder.Item>
                      </div>

                      {/* Resize Handle — overlays the center of the gap-6 (24px) gap */}
                      {isDesktop && !lockLayout && index === 0 && items.length > 1 && (
                        <div
                          role="separator"
                          onMouseDown={startResizing}
                          onMouseEnter={() => setIsHoveringDivider(true)}
                          onMouseLeave={() => setIsHoveringDivider(false)}
                          className="w-0 relative cursor-col-resize self-stretch flex items-center justify-center z-[100] group/resizer -mx-3"
                        >
                          {/* Invisible hit area perfectly centered in the gap */}
                          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-12 h-full">
                            <div className={`w-1 h-32 rounded-full transition-all duration-300 ${isResizing ? 'bg-primary scale-y-110 shadow-[0_0_15px_rgba(29,185,84,0.5)]' : isHoveringDivider ? 'bg-zinc-500 scale-y-105' : 'bg-zinc-800/50'}`} />
                          </div>
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </Reorder.Group>
            </div>
          )}
        </EditorContainer>
      } />
      <Route path="home" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="size-8 animate-spin" /></div>}>
          <Home />
        </Suspense>
      } />
      <Route path="profile" element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>}>
          <ProfilePage />
        </Suspense>
      } />
      <Route index element={
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="size-8 animate-spin" /></div>}>
          <GuestLanding />
        </Suspense>
      } />
      <Route path="*" element={<NotFoundPage type="general" />} />
    </Routes>
  );
}
