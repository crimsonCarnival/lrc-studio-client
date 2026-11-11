import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { savePendingProject } from '@/features/editor/services/guest-project-db';
import { flatToSections } from '@/features/editor/utils/sections';
import type { EditorLine } from '@/features/editor/editor.types';

type GuestAuthArgs = {
  isReady: boolean;
  lines: EditorLine[];
  mediaTitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildProjectPayload?: () => Record<string, any>;
};

/**
 * Sends a guest to sign in or sign up. A draft in progress is stashed in IndexedDB first,
 * so it survives the round trip and is reclaimed after auth. Shared by the header buttons,
 * the phone drawer and the bottom bar.
 */
export function useGuestAuth({ isReady, lines, mediaTitle, buildProjectPayload }: GuestAuthArgs) {
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
      ...(payload.kind ? { kind: payload.kind } : {}),
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
  return async (target: 'signin' | 'signup') => {
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
  };}
