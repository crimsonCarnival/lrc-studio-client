import { useState, useRef, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pencil, ArrowLeft, ExternalLink, Settings2 } from 'lucide-react';
import { Input } from '@ui/input';
import { Tip } from '@ui/tip';
import { LazyImage } from '@ui/LazyImage';

interface ForkedFrom {
  publicId?: string;
  accountName?: string;
}

interface HeaderBreadcrumbProps {
  isReady: boolean;
  mediaTitle: string;
  setMediaTitle: (title: string) => void;
  triggerImportSave: (opts: { title?: string }) => void;
  forkedFrom?: ForkedFrom | null;
  projectCoverImage?: string | null;
  // Logo click is guarded for unsaved changes by the parent.
  onLogoClick: () => void;
  // Opens the project settings modal; shown left of the title on project pages (#10).
  onProjectSettings?: () => void;
}

export function HeaderBreadcrumb({ isReady, mediaTitle, setMediaTitle, triggerImportSave, forkedFrom, projectCoverImage, onLogoClick, onProjectSettings }: HeaderBreadcrumbProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [editingProjectName, setEditingProjectName] = useState(false);
  const projectNameInputRef = useRef<HTMLInputElement | null>(null);

  const isSetupPage = location.pathname === '/project/new';
  const isSettingsPage = location.pathname.startsWith('/settings');

  // Page title shown in the header breadcrumb (single source of truth — pages no
  // longer render their own title row).
  const breadcrumbTitle = (() => {
    const seg = location.pathname.split('/')[1];
    const map: Record<string, string> = {
      profile: t('profile.title'),
      settings: t('settings.title'),
      library: t('library.title'),
      uploads: t('uploads.title'),
      admin: t('admin.dashboard.title'),
      'change-password': t('auth.changePassword.title'),
      'verify-email': t('auth.verification.pageTitle'),
      feed: t('feed.title'),
      search: t('search.title'),
      explore: t('explore.nav'),
      leaderboard: t('badges.leaderboard.title'),
      notifications: t('notifications.bell'),
    };
    return map[seg] || seg.replace(/-/g, ' ');
  })();

  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
      <button
        onClick={onLogoClick}
        className="size-7 sm:size-8 flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <LazyImage
          src="https://res.cloudinary.com/dzjid2tos/image/upload/v1778106770/lrc-logo_dkumwz.png"
          alt="LRC Studio"
          className="size-full object-contain"
        />
      </button>

      <div className="flex items-center gap-1.5 min-w-0">
        {isReady ? (
          <>
            <span className="text-zinc-700 shrink-0">/</span>
            {projectCoverImage && (
              <LazyImage
                src={projectCoverImage}
                alt=""
                className="size-6 rounded object-cover border border-zinc-700/50 shrink-0"
              />
            )}
            {onProjectSettings && (
              <Tip content={t('editor.projectSettings')} side="bottom">
                <button
                  onClick={onProjectSettings}
                  aria-label={t('editor.projectSettings')}
                  className="size-6 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors shrink-0 cursor-pointer"
                >
                  <Settings2 className="size-3.5" />
                </button>
              </Tip>
            )}
            {editingProjectName ? (
              <Input
                ref={projectNameInputRef}
                type="text"
                value={mediaTitle}
                onChange={(e) => setMediaTitle(e.target.value)}
                onBlur={() => {
                  setEditingProjectName(false);
                  triggerImportSave({ title: mediaTitle });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { setEditingProjectName(false); triggerImportSave({ title: mediaTitle }); }
                  else if (e.key === 'Escape') { setEditingProjectName(false); }
                }}
                maxLength={200}
                className="h-6 text-xs bg-zinc-800/60 border-zinc-700/60 text-zinc-200 min-w-[100px] max-w-[180px]"
              />
            ) : (
              <button
                onClick={() => {
                  startTransition(() => setEditingProjectName(true));
                  requestAnimationFrame(() => projectNameInputRef.current?.focus());
                }}
                className="flex items-center gap-1 min-w-0 group py-1 -my-1"
                aria-label={t('setup.projectNamePlaceholder')}
              >
                <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 truncate transition-colors max-w-[120px] sm:max-w-[200px]">
                  {mediaTitle || t('setup.projectNamePlaceholder')}
                </span>
                <Pencil className="size-3 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
              </button>
            )}
            {forkedFrom?.publicId && (
              <Tip content={forkedFrom.accountName ? t('share.forkedFrom', { username: forkedFrom.accountName, defaultValue: `Forked from {{username}}` }) : t('share.forkedProject')}>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-blue/10 border border-accent-blue/20 text-[9px] font-bold text-accent-blue uppercase shrink-0 cursor-help transition-colors hover:bg-accent-blue/20">
                  <ExternalLink className="size-2.5" />
                  <span className="hidden xs:inline">{t('share.forkedBadge')}</span>
                </div>
              </Tip>
            )}
          </>
        ) : isSetupPage ? null : location.pathname !== '/home' && location.pathname !== '/' && (
          <>
            <span className="text-zinc-700 shrink-0 hidden sm:inline">/</span>
            {isSettingsPage ? (
              // Settings keeps its own guarded back button in-page, so the header shows the title only.
              <span className="text-xs font-semibold text-zinc-200 truncate uppercase tracking-wide">
                {breadcrumbTitle}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 min-w-0 group py-1 -my-1"
                aria-label={t('common.back')}
              >
                <ArrowLeft className="size-3.5 text-zinc-500 group-hover:text-zinc-200 transition-colors shrink-0" />
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-zinc-100 truncate uppercase tracking-wide transition-colors">
                  {breadcrumbTitle}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
