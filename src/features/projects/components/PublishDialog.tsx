import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ResponsiveModal } from '@ui/ResponsiveModal';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { projectsService } from '@/features/projects/services/projects.service';
import { sectionsToFlat } from '@/features/editor/utils/sections';
import type { EditorLine } from '@/features/editor/editor.types';
import { getPublishReadiness } from '@/features/projects/publish-readiness';
import type { PublishMissing } from '@/features/projects/publish-readiness';
import { ogShareUrl } from '@/features/projects/og-url';
import { ProjectListCover } from '@/features/projects/components/ProjectListCover';
import { ShareSheet } from '@/features/sharing/components/ShareSheet';

export type PublishProject = {
  /** Absent until the project has been saved to the server. */
  publicId?: string | null;
  isPublic: boolean;
  title?: string;
  artists?: string[];
  coverImage?: string;
  /** When omitted (a project picked from a list) the dialog loads the lyrics itself. */
  lines?: EditorLine[];
};

type PublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: PublishProject;
  /** Called with the new visibility once the server has accepted it. */
  onPublished?: (isPublic: boolean) => void;
};

type FetchedLines = { status: 'loading' } | { status: 'error' } | { status: 'ready'; lines: EditorLine[] };

const MISSING_KEY: Record<PublishMissing, string> = {
  title: 'project.publishMissingTitle',
  lines: 'project.publishMissingLines',
  artist: 'project.publishMissingArtist',
  cover: 'project.publishMissingCover',
};

/**
 * The only way a project becomes public or private again. Publishing is always an explicit,
 * confirmed action; a failure leaves the project exactly as it was and the dialog open.
 */
export function PublishDialog({ open, onOpenChange, project, onPublished }: PublishDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const signedIn = !!user && !user.isGuest;
  const { publicId, isPublic, title, artists, coverImage } = project;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set once this dialog has published, so the final state survives the parent re-rendering
  // with the new `isPublic`.
  const [published, setPublished] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [fetched, setFetched] = useState<FetchedLines>({ status: 'loading' });

  const needsFetch = open && signedIn && !!publicId && !isPublic && project.lines === undefined;
  useEffect(() => {
    if (!needsFetch || !publicId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetched({ status: 'loading' });
    projectsService.get(publicId)
      .then(({ project: p }) => {
        if (cancelled) return;
        if (!p) { setFetched({ status: 'error' }); return; }
        setFetched({ status: 'ready', lines: sectionsToFlat(p.lyrics?.sections || []) as EditorLine[] });
      })
      .catch(() => { if (!cancelled) setFetched({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [needsFetch, publicId]);

  useEffect(() => {
    if (open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPublished(false); setError(null); setBusy(false); setShareOpen(false);
  }, [open]);

  const lines = project.lines ?? (fetched.status === 'ready' ? fetched.lines : undefined);
  const readiness = useMemo(
    () => (lines ? getPublishReadiness(lines, { title, artists, coverImage }) : null),
    [lines, title, artists, coverImage],
  );

  const link = publicId ? ogShareUrl(publicId) : '';
  const displayTitle = title?.trim() || t('project.publishUntitled');
  const artistLine = artists?.filter((a) => a.trim()).join(', ');

  const change = async (next: boolean) => {
    if (!publicId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await projectsService.update(publicId, { public: next });
    } catch {
      setError(t(next ? 'project.publishFailed' : 'project.unpublishFailed'));
      setBusy(false);
      return;
    }
    setBusy(false);
    onPublished?.(next);
    if (next) {
      setPublished(true);
    } else {
      toast.success(t('project.unpublished'));
      onOpenChange(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t('project.sharecopied'));
    } catch {
      toast.error(t('project.shareFailed'));
    }
  };

  let heading: string;
  let body: ReactNode;

  if (!signedIn) {
    heading = t('project.publishSignIn');
    body = (
      <>
        <p className="text-sm text-subtle">{t('project.publishSignInLead')}</p>
        <Button asChild className="h-11 w-full lg:h-11">
          <Link to="/auth/signin" onClick={() => onOpenChange(false)}>{t('project.publishSignInAction')}</Link>
        </Button>
      </>
    );
  } else if (!publicId) {
    heading = t('project.publishTitle');
    body = <p className="text-sm text-subtle">{t('project.publishNeedsSave')}</p>;
  } else if (published) {
    heading = t('project.publishedTitle');
    body = (
      <>
        <p className="text-sm text-subtle">{t('project.publishedLead')}</p>
        <div className="flex items-center gap-2 rounded-[calc(var(--radius)*1.2)] bg-raised px-3 py-2 inset-ring inset-ring-hl">
          <Icon name="link" size={16} className="shrink-0 text-subtle" />
          <input
            readOnly
            value={link}
            aria-label={t('project.publishedTitle')}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={copy} className="h-11 flex-1 gap-2 lg:h-11">
            <Icon name="content_copy" size={16} />{t('project.publishCopy')}
          </Button>
          <Button onClick={() => setShareOpen(true)} className="h-11 flex-1 gap-2 lg:h-11">
            <Icon name="share" size={16} />{t('project.publishShare')}
          </Button>
        </div>
        <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11 w-full lg:h-11">{t('project.publishDone')}</Button>
        <ShareSheet
          open={shareOpen}
          onOpenChange={setShareOpen}
          url={link}
          title={displayTitle}
          subtitle={artistLine}
          projectName={title}
          coverImage={coverImage}
        />
      </>
    );
  } else if (isPublic) {
    heading = t('project.unpublishTitle');
    body = (
      <>
        <p className="text-sm text-subtle">{t('project.unpublishLead')}</p>
        {error && <p role="alert" className="text-sm text-love-ink">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11 lg:h-11">{t('common.cancel')}</Button>
          <Button variant="destructive" loading={busy} onClick={() => change(false)} className="h-11 lg:h-11">
            {busy ? t('project.unpublishing') : t('project.unpublishAction')}
          </Button>
        </div>
      </>
    );
  } else {
    heading = t('project.publishTitle');
    const blocked = !readiness || !readiness.complete;
    body = (
      <>
        <p className="text-sm text-subtle">{t('project.publishLead')}</p>
        <div className="flex items-center gap-3 rounded-[calc(var(--radius)*1.2)] bg-raised p-3 inset-ring inset-ring-hl">
          <ProjectListCover coverImage={coverImage} className="size-12 shrink-0 rounded-[calc(var(--radius)*0.8)]" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{displayTitle}</p>
            {artistLine && <p className="truncate text-[13px] text-subtle">{artistLine}</p>}
            {readiness && (
              <p className="text-[13px] text-subtle">{t('project.publishLinesTimed', { timed: readiness.timed, total: readiness.total })}</p>
            )}
          </div>
        </div>
        {project.lines === undefined && fetched.status === 'loading' && <p className="text-[13px] text-subtle">{t('project.publishLoading')}</p>}
        {project.lines === undefined && fetched.status === 'error' && <p role="alert" className="text-sm text-love-ink">{t('project.publishLoadFailed')}</p>}
        {readiness && readiness.missing.length > 0 && (
          <ul className="space-y-1.5">
            {readiness.missing.map((m) => (
              <li key={m} className="text-[13px] text-subtle">{t(MISSING_KEY[m])}</li>
            ))}
          </ul>
        )}
        {error && <p role="alert" className="text-sm text-love-ink">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11 lg:h-11">{t('common.cancel')}</Button>
          <Button loading={busy} disabled={blocked} onClick={() => change(true)} className="h-11 lg:h-11">
            {busy ? t('project.publishing') : t('project.publishAction')}
          </Button>
        </div>
      </>
    );
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title={heading} dialogProps={{ className: 'sm:max-w-md' }}>
      <div className="flex flex-col gap-4">{body}</div>
    </ResponsiveModal>
  );
}
