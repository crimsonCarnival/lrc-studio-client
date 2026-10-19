import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { artistErrorMessageFor } from '@/features/artists/artist-errors';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { getPendingProject, clearPendingProject } from '@/features/editor/services/guest-project-db';
import { projectsService } from '@/features/projects/services/projects.service';
import { uploadsService } from '@/features/projects/services/uploads.service';
import { LogoLoader } from '@ui/LogoLoader';
import { projectEditPath } from '@/features/projects/project-path';

const BACKOFF_INTERVALS_MS = [2000, 4000, 8000, 16000, 32000];
const STEADY_INTERVAL_MS = 30000;

interface PendingRecord {
  savedAt?: number;
  metadata?: { artists?: Array<{ name: string; role: string; order: number }>; songArtist?: string; [key: string]: unknown };
  [key: string]: unknown;
}

function getBackoffDelay(attempt: number): number {
  return attempt < BACKOFF_INTERVALS_MS.length
    ? BACKOFF_INTERVALS_MS[attempt]
    : STEADY_INTERVAL_MS;
}

export default function GuestProjectSaveGate() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const isActive =
    !!user &&
    location.pathname === '/project/local' &&
    new URLSearchParams(location.search).get('fromGuest') === '1';

  const attemptRef = useRef(0);
  const [displayAttempt, setDisplayAttempt] = useState(0);

  // Stable refs so the effect closure always calls the latest versions without
  // listing them as dependencies (which would re-fire the effect on every render).
  const navigateRef = useRef(navigate);
  const executeRecaptchaRef = useRef(executeRecaptcha);
  // The draft is created under this user, so they own it and their account name
  // is the owner segment of the project's URL.
  const accountNameRef = useRef(user?.accountName);
  useLayoutEffect(() => { navigateRef.current = navigate; });
  useLayoutEffect(() => { executeRecaptchaRef.current = executeRecaptcha; });
  useLayoutEffect(() => { accountNameRef.current = user?.accountName; });

  useEffect(() => {
    if (!isActive) return;

    // Per-invocation cancellation flag captured in the closure.
    // Each effect invocation gets its own `cancelled` variable, so the cleanup
    // from run #1 cannot interfere with run #2 (which is what React StrictMode
    // does in development: mount → cleanup → mount).
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    attemptRef.current = 0;

    const run = async () => {
      if (cancelled) return;
      const record = await getPendingProject() as PendingRecord | null;
      setDisplayAttempt(0);

      if (!record) {
        await clearPendingProject();
        toast.error(t('editor.draftExpired'));
        navigateRef.current('/', { replace: true });
        return;
      }

      const attempt = async () => {
        if (cancelled) return;

        try {
          const recaptchaToken = executeRecaptchaRef.current
            ? await executeRecaptchaRef.current('create_project').catch(() => undefined)
            : undefined;

          const { savedAt: _savedAt, ytUrl, uploadUrl, uploadPublicId, fileName, duration: fileDuration, ...payload } = record as PendingRecord & {
            ytUrl?: string; uploadUrl?: string; uploadPublicId?: string; fileName?: string; duration?: number;
          };

          // Resolve upload → get a real DB uploadId so the GraphQL mutation can link it.
          let uploadId: string | undefined;
          if (ytUrl) {
            try {
              const { upload } = await uploadsService.saveMedia({ source: 'youtube', uploadUrl: ytUrl });
              if (upload?.id) uploadId = upload.id;
            } catch { /* non-fatal — project saves without media */ }
          } else if (uploadUrl) {
            try {
              const { upload } = await uploadsService.saveMedia({
                source: 'cloudinary',
                uploadUrl,
                publicId: uploadPublicId || null,
                fileName: fileName || '',
                duration: fileDuration || null,
              });
              if (upload?.id) uploadId = upload.id;
            } catch { /* non-fatal */ }
          }

          if (cancelled) return;
          const result = await projectsService.create({
            title: (payload.title as string) || '',
            metadata: payload.metadata as Record<string, unknown> | undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            lyrics: payload.lyrics as any,
            state: payload.state as Record<string, unknown> | undefined,
            readOnly: false,
            uploadId,
            recaptchaToken,
          });
          await clearPendingProject();
          const dest = projectEditPath(
            { publicId: result.publicId, slug: (result as { slug?: string | null }).slug },
            accountNameRef.current,
          );
          navigateRef.current(dest ?? '/library', { replace: true });
        } catch (err) {
          if (cancelled) return;
          // A validation failure will not fix itself: say what is wrong instead of retrying forever.
          const invalid = artistErrorMessageFor(t, err);
          if (invalid) { toast.error(invalid); return; }
          const delay = getBackoffDelay(attemptRef.current);
          attemptRef.current += 1;
          setDisplayAttempt(attemptRef.current);
          retryTimer = setTimeout(attempt, delay);
        }
      };

      attempt();
    };

    run();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isActive, t]); // t is stable; isActive is the true trigger

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm gap-4">
      <LogoLoader size={40} className="text-primary" />
      <p className="text-base font-medium text-zinc-200">{t('editor.savingProject')}</p>
      {displayAttempt > 0 && (
        <p className="text-sm text-zinc-500">
          {displayAttempt > 5
            ? t('editor.savingStillTrying')
            : t('editor.savingRetrying')}
        </p>
      )}
    </div>
  );
}
