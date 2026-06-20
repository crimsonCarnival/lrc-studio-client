import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Tip } from '@ui/tip';
import { savePendingProject } from '@/features/editor/services/guest-project-db';
import { flatToSections } from '@/features/editor/utils/sections';
import type { EditorLine } from '@/features/editor/services/editor.service';

interface GuestAuthButtonsProps {
  isReady: boolean;
  lines: EditorLine[];
  mediaTitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildProjectPayload?: () => Record<string, any>;
}

export function GuestAuthButtons({ isReady, lines, mediaTitle, buildProjectPayload }: GuestAuthButtonsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Persist the in-progress guest draft to IndexedDB before bouncing to auth,
  // so the work survives the round-trip and is reclaimed after sign-in.
  const saveToIdb = async () => {
    const payload = buildProjectPayload ? buildProjectPayload() : { title: mediaTitle || '', lines: lines ?? [] };
    const idbPayload = {
      title: payload.title,
      lyrics: { editorMode: payload.editorMode, sections: payload.sections || flatToSections(payload.lines || []) },
      state: {
        syncMode: payload.syncMode,
        activeLineIndex: payload.activeLineIndex,
        playbackPosition: payload.playbackPosition,
        playbackSpeed: payload.playbackSpeed,
        saveTime: payload.saveTime,
      },
      metadata: payload.metadata,
      ...(payload.ytUrl ? { ytUrl: payload.ytUrl } : {}),
      ...(payload.uploadedAudio ? {
        uploadUrl: payload.uploadedAudio.uploadUrl,
        uploadPublicId: payload.uploadedAudio.publicId || null,
        fileName: payload.uploadedAudio.fileName || '',
        duration: payload.uploadedAudio.duration || null,
      } : {}),
    };
    await savePendingProject(idbPayload);
  };

  const hasDraft = (lines?.length ?? 0) > 0;

  // Guest with unsaved work → stash the draft, then carry them back to it post-auth.
  const goToAuth = async (target: 'signin' | 'signup') => {
    const base = target === 'signin' ? '/auth?action=signin' : '/auth/signup';
    if (isReady && hasDraft) {
      try {
        await saveToIdb();
        navigate(`${base}${base.includes('?') ? '&' : '?'}redirect=${encodeURIComponent('/project/local?fromGuest=1')}`);
      } catch {
        import('react-hot-toast').then(({ default: toast }) => {
          toast.error(t('editor.draftSaveFailed'));
        });
      }
    } else {
      navigate(base);
    }
  };

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <div className="relative hidden sm:flex items-center flex-shrink-0">
        <button
          onClick={() => goToAuth('signin')}
          className="h-8 px-3 text-xs font-normal text-zinc-300 hover:text-zinc-100 bg-zinc-800/70 hover:bg-zinc-700/80 border border-zinc-800/50 rounded-xl transition-colors"
        >
          {t('auth.signIn')}
        </button>
      </div>
      <div className="relative flex items-center flex-shrink-0">
        <button
          onClick={() => goToAuth('signup')}
          className="h-8 px-3 text-xs font-normal text-zinc-950 bg-primary hover:bg-primary/90 rounded-xl transition-colors"
        >
          {t('auth.signUp')}
        </button>
        {hasDraft && (
          <Tip content={t('auth.signUpToSave')}>
            <span
              className="absolute -top-1 -right-1 size-2 rounded-full bg-primary animate-pulse pointer-events-none"
            />
          </Tip>
        )}
      </div>
    </div>
  );
}
