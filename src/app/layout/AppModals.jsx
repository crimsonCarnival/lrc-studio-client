import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@ui/button';
import { useTranslation } from 'react-i18next';

const KeyboardHelp = lazy(() => import('@features/settings/components/KeyboardHelp'));
import ProjectSetupModal from '@features/editor/components/setup/ProjectSetupModal';

/**
 * All floating global modals: keyboard help, project naming, restore prompt.
 * Settings is now a page at /settings.
 */
export function AppModals({
  showKeyboardHelp,
  setShowKeyboardHelp,
  handleManualSave,
  showNamingModal,
  setShowNamingModal,
  handleProjectConfirm,
  mediaTitle,
  projectMetadata,
  projectCoverImage,
  pendingProject,
  handleDiscardProject,
  handleRestoreProject,
  unsavedModalTarget,
  setUnsavedModalTarget,
  sourceInfo,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <Suspense fallback={null}>
        {showKeyboardHelp && (
          <KeyboardHelp isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
        )}
      </Suspense>

      <ProjectSetupModal
        key={showNamingModal ? (mediaTitle || 'editing') : 'closed'}
        isOpen={showNamingModal}
        onClose={() => setShowNamingModal(false)}
        onConfirm={handleProjectConfirm}
        initialName={mediaTitle}
        initialDescription={projectMetadata?.description}
        initialTags={projectMetadata?.tags}
        initialSongName={projectMetadata?.songName}
        initialSongArtist={(projectMetadata?.songArtists || []).join(', ') || projectMetadata?.songArtist || ''}
        initialSongAlbum={projectMetadata?.songAlbum}
        initialSongYear={projectMetadata?.songYear}
        initialCoverImage={projectCoverImage || ''}
        initialAlbumArt={projectMetadata?.albumArt || ''}
        isEditing={true}
        sourceInfo={sourceInfo}
      />

      {pendingProject && (
        <div className="fixed inset-0 z-popover flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
            onClick={handleDiscardProject}
            aria-label={t('common.discard') || 'Discard'}
          />
          <div className="relative bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-elevated animate-fade-in">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">{t('project.restoreTitle')}</h3>
            <p className="text-sm text-zinc-400 mb-6">{t('project.restoreMessage')}</p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleDiscardProject} className="flex-1">
                {t('common.discard')}
              </Button>
              <Button
                onClick={handleRestoreProject}
                className="flex-1 bg-primary text-zinc-950 hover:bg-primary-dim"
              >
                {t('common.restore')}
              </Button>
            </div>
          </div>
        </div>
      )}
      {unsavedModalTarget && (
        <div className="fixed inset-0 z-popover flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
            onClick={() => setUnsavedModalTarget(null)}
            aria-label={t('common.close') || 'Close'}
          />
          <div className="relative bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-elevated animate-fade-in">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">{t('confirm.unsavedChangesTitle')}</h3>
            <p className="text-sm text-zinc-400 mb-6">{t('confirm.unsavedChangesMessage')}</p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={async () => {
                  await handleManualSave();
                  const target = unsavedModalTarget;
                  setUnsavedModalTarget(null);
                  navigate(target);
                }}
                className="w-full bg-primary text-zinc-950 hover:bg-primary-dim font-semibold"
              >
                {t('common.saveAndLeave')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const target = unsavedModalTarget;
                  setUnsavedModalTarget(null);
                  navigate(target);
                }}
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                {t('common.discardAndLeave')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setUnsavedModalTarget(null)}
                className="w-full text-zinc-500"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
