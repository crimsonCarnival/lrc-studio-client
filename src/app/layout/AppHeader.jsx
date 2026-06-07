import { useState, useRef, useEffect, startTransition } from 'react';
import { ScrollProgress } from '@/shared/ui/magicui/scroll-progress';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UploadCloud, Settings as SettingsIcon, LogOut, BookOpen, Pencil,
  ShieldAlert, Eye, EyeOff, User, Check, ArrowLeft,
  Sun, Moon, Monitor, Palette, Globe, ExternalLink, Search, Compass, Trophy,
} from 'lucide-react';
import { HeaderSearchBar } from '@/features/search/components/HeaderSearchBar';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from '@ui/popover';
import { Tip } from '@ui/tip';
import { LazyImage } from '@ui/LazyImage';
import { projects, uploads } from '@/app/api';
import { savePendingProject } from '@/features/editor/services/guest-project-db';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

const THEMES = [
  { id: 'system',  label: 'System', Icon: Monitor, swatch: 'bg-zinc-500' },
  { id: 'dark',    label: 'Dark',   Icon: Moon,    swatch: 'bg-[#232136] border border-[#393552]' },
  { id: 'light',   label: 'Light',  Icon: Sun,     swatch: 'bg-[#faf4ed] border border-[#dfdad9]' },
  { id: 'cobalt',  label: 'Cobalt', Icon: Palette, swatch: 'bg-[#2F2FE4]' },
  { id: 'velvet',  label: 'Velvet', Icon: Palette, swatch: 'bg-[#A64D79]' },
  { id: 'sage',    label: 'Sage',   Icon: Palette, swatch: 'bg-[#5C8374]' },
];

const LANG_NAMES = {
  en: { en: 'English',  es: 'Inglés',    ja: '英語'        },
  es: { en: 'Spanish',  es: 'Español',   ja: 'スペイン語'  },
  ja: { en: 'Japanese', es: 'Japonés',   ja: '日本語'      },
};

const LANGUAGES = [
  { code: 'en', short: 'EN' },
  { code: 'es', short: 'ES' },
  { code: 'ja', short: 'JA' },
];

function getLangLabel(code, currentLang) {
  const native = LANG_NAMES[code]?.[code] || code;
  const translated = LANG_NAMES[code]?.[currentLang];
  if (!translated || translated === native) return native;
  return `${native} (${translated})`;
}

// Resolved outside render so ESLint doesn't flag it as a component created during render
const THEME_ICONS = {
  system: Monitor,
  dark: Moon,
  light: Sun,
  cobalt: Palette,
  velvet: Palette,
  sage: Palette,
};

export function AppHeader({
  user,
  logout,
  isReady,
  lines,
  mediaTitle,
  setMediaTitle,
  triggerImportSave,
  buildProjectPayload,
  hasUnsavedChanges,
  activeProjectId,
  forkedFrom,
  focusMode,
  setFocusMode,
  hideEditor,
  setHideEditor,
  setUnsavedModalTarget,
  settings,
  updateSetting,
  i18n,
  syncMode,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [counts, setCounts] = useState({ library: 0, uploads: 0 });
  const [searchOpen, setSearchOpen] = useState(false);
  const searchOverlayRef = useRef(null);
  const projectNameInputRef = useRef(null);

  useEffect(() => {
    if (!searchOpen) return;
    function onPointerDown(e) {
      if (searchOverlayRef.current && !searchOverlayRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    function onKeyDown(e) { if (e.key === 'Escape') setSearchOpen(false); }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [searchOpen]);



  const isSetupPage = location.pathname === '/project/new';
  const isGuestLanding = location.pathname === '/';
  const isSettingsPage = location.pathname.startsWith('/settings');

  // Page title shown in the header breadcrumb (single source of truth — pages no
  // longer render their own title row).
  const breadcrumbTitle = (() => {
    const seg = location.pathname.split('/')[1];
    const map = {
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
      leaderboard: t('badges.leaderboard.title', 'Leaderboard'),
      notifications: t('notifications.bell'),
    };
    return map[seg] || seg.replace(/-/g, ' ');
  })();

  const currentTheme = settings?.interface?.theme || 'dark';
  const currentLang = (i18n?.language || 'en').slice(0, 2).toUpperCase();

  const fetchCounts = async () => {
    if (!user) return;
    try {
      const [pRes, uRes] = await Promise.all([projects.list(), uploads.listMedia()]);
      setCounts({ library: pRes?.length || 0, uploads: uRes?.length || 0 });
    } catch (err) { console.error('Failed to fetch counts for menu:', err); }
  };

  const goHomeOrWarn = () => {
    if (location.pathname.startsWith('/project/') && hasUnsavedChanges()) {
      setUnsavedModalTarget('/');
    } else {
      navigate('/');
    }
  };

  const navTo = (path) => {
    const inProject = location.pathname.startsWith('/project/');
    if (inProject && hasUnsavedChanges()) {
      setUnsavedModalTarget(path);
    } else if (location.pathname.startsWith(path)) {
      navigate(activeProjectId ? `/project/${activeProjectId}/edit` : '/project/new');
    } else {
      navigate(path);
    }
  };

  const NAV_ACTIVE = `bg-primary text-zinc-950 border-primary hover:bg-primary-dim hover:text-zinc-950`;

  const iconBtn ='size-8 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors rounded-lg flex-shrink-0 cursor-pointer';

  const saveToIdb = async () => {
    const payload = buildProjectPayload ? buildProjectPayload() : { title: mediaTitle || '', lines: lines ?? [] };
    const idbPayload = {
      title: payload.title,
      lyrics: { editorMode: payload.editorMode, lines: payload.lines },
      state: {
        syncMode: payload.syncMode,
        activeLineIndex: payload.activeLineIndex,
        playbackPosition: payload.playbackPosition,
        playbackSpeed: payload.playbackSpeed,
        saveTime: payload.saveTime,
        timezone: payload.timezone,
        utcOffset: payload.utcOffset,
      },
      metadata: payload.metadata,
      ...(payload.ytUrl ? { ytUrl: payload.ytUrl } : {}),
      ...(payload.cloudinaryAudio ? {
        cloudinaryUrl: payload.cloudinaryAudio.cloudinaryUrl,
        cloudinaryPublicId: payload.cloudinaryAudio.publicId || null,
        fileName: payload.cloudinaryAudio.fileName || '',
        duration: payload.cloudinaryAudio.duration || null,
      } : {}),
    };
    await savePendingProject(idbPayload);
  };

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-nav animate-fade-in bg-zinc-950/60 backdrop-blur-2xl pointer-events-none">

      <div className="max-w-[1600px] mx-auto w-full px-4 lg:px-6 py-2 sm:py-2.5 flex flex-row items-center justify-between gap-2 pointer-events-auto">

        {/* ── Left: Logo + breadcrumb ── */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
          <button
            onClick={goHomeOrWarn}
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
                {forkedFrom?.projectId && (
                  <Tip content={forkedFrom.accountName ? t('share.forkedFrom', { username: forkedFrom.accountName, defaultValue: `Forked from {{username}}` }) : t('share.forkedProject', 'Forked project')}>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-blue/10 border border-accent-blue/20 text-[9px] font-bold text-accent-blue uppercase shrink-0 cursor-help transition-colors hover:bg-accent-blue/20">
                      <ExternalLink className="size-2.5" />
                      <span className="hidden xs:inline">{t('share.forkedBadge', 'Forked')}</span>
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
                    aria-label={t('common.back', 'Back')}
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

        {/* ── Center: Start Syncing (edit mode only) ── */}
        {!syncMode && isReady && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('editor:start-syncing'))}
            className="py-1 px-3 h-7 text-xs font-semibold text-zinc-950 bg-primary hover:bg-primary-dim rounded-lg transition-colors shrink-0"
          >
            {t('editor.startSyncing')}
          </button>
        )}
        <div className="flex-1" />

        {/* ── Right: Controls ── */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Hide editor toggle — desktop, project pages, when lines exist */}
          {isReady && lines.length > 0 && (
            <Tip content={t('app.hideEditor')} side="bottom">
              <button
                aria-label={t('app.hideEditor')}
                onClick={() => {
                  if (focusMode === 'playback') { setFocusMode('default'); setHideEditor(false); }
                  else { setHideEditor(h => !h); }
                }}
                className={`hidden lg:flex size-8 items-center justify-center rounded-xl transition-colors flex-shrink-0 border text-xs font-bold ${
                  (hideEditor || focusMode === 'playback')
                    ? NAV_ACTIVE
                    : 'bg-zinc-800/60 border-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {(hideEditor || focusMode === 'playback') ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </Tip>
          )}

          {/* Search — inline in header next to button */}
          {!isGuestLanding && (
            <div ref={searchOverlayRef} className="flex items-center gap-1">
              {searchOpen && (
                <div className="w-52 sm:w-64">
                  <HeaderSearchBar autoFocus onClose={() => setSearchOpen(false)} />
                </div>
              )}
              <Tip content={t('search.title')} side="bottom">
                <button
                  onClick={() => setSearchOpen(o => !o)}
                  aria-label={t('search.title')}
                  className={`${iconBtn} ${searchOpen ? 'text-primary bg-primary/10' : ''}`}
                >
                  <Search className="size-3.5" />
                </button>
              </Tip>
            </div>
          )}

          {/* Grouped icon controls: theme | lang | shortcuts */}
          <div className="flex items-center bg-zinc-900/60 border border-zinc-800/50 rounded-xl overflow-hidden">

            {/* Theme switcher — hidden on mobile (accessible via Settings) */}
            <Popover>
              <Tip content={t('settings.interface.theme')} side="bottom">
                <PopoverTrigger asChild>
                  <button className={`${iconBtn} hidden sm:flex`} aria-label={t('settings.interface.theme')}>
                    {(() => { const TI = THEME_ICONS[currentTheme] || Moon; return <TI className="size-3.5" />; })()}
                  </button>
                </PopoverTrigger>
              </Tip>
              <PopoverContent className="w-44 p-1" align="end" sideOffset={8}>
                {THEMES.map(({ id, label, swatch }) => (
                  <PopoverItem
                    key={id}
                    onClick={() => updateSetting?.('interface.theme', id)}
                    className={`flex items-center gap-2.5 cursor-pointer text-sm py-2 ${currentTheme === id ? 'text-primary' : ''}`}
                  >
                    <span className={`size-3 rounded-full shrink-0 ${swatch}`} />
                    <span className="flex-1 text-left">{label}</span>
                    <Check className={`size-3 shrink-0 ${currentTheme === id ? 'text-primary' : 'invisible'}`} />
                  </PopoverItem>
                ))}
              </PopoverContent>
            </Popover>

            <div className="hidden sm:block w-px h-4 bg-zinc-800/80 shrink-0" />

            {/* Language switcher */}
            <Popover>
              <Tip content={t('settings.interface.language')} side="bottom">
                <PopoverTrigger asChild>
                  <button className={`${iconBtn} gap-0.5 w-auto px-2`} aria-label={t('settings.interface.language')}>
                    <Globe className="size-3.5 shrink-0" />
                    <span className="text-[10px] font-bold tracking-wide">{currentLang}</span>
                  </button>
                </PopoverTrigger>
              </Tip>
              <PopoverContent className="w-48 p-1" align="end" sideOffset={8}>
                {LANGUAGES.map(({ code }) => {
                  const currentLang = (i18n?.language || 'en').split('-')[0];
                  const label = getLangLabel(code, currentLang);
                  const active = currentLang === code;
                  return (
                    <PopoverItem
                      key={code}
                      onClick={() => i18n?.changeLanguage(code)}
                      className={`flex items-center gap-2.5 cursor-pointer text-sm py-2 ${active ? 'text-primary' : ''}`}
                    >
                      <span className="flex-1 text-left">{label}</span>
                      <Check className={`size-3 shrink-0 ${active ? 'text-primary' : 'invisible'}`} />
                    </PopoverItem>
                  );
                })}
              </PopoverContent>
            </Popover>

          </div>

          {/* Auth section */}
          {!user ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="relative hidden sm:flex items-center flex-shrink-0">
                <button
                  onClick={async () => {
                    if ((lines?.length ?? 0) > 0) {
                      try {
                        await saveToIdb();
                        navigate(`/auth?action=signin&redirect=${encodeURIComponent('/project/local?fromGuest=1')}`);
                      } catch {
                        import('react-hot-toast').then(({ default: toast }) => {
                          toast.error(t('editor.draftSaveFailed'));
                        });
                      }
                    } else {
                      navigate('/auth?action=signin');
                    }
                  }}
                  className="h-8 px-3 text-xs font-normal text-zinc-300 hover:text-zinc-100 bg-zinc-800/70 hover:bg-zinc-700/80 border border-zinc-800/50 rounded-xl transition-colors"
                >
                  {t('auth.signIn', 'Sign in')}
                </button>
              </div>
              <div className="relative flex items-center flex-shrink-0">
                <button
                  onClick={async () => {
                    if ((lines?.length ?? 0) > 0) {
                      try {
                        await saveToIdb();
                        navigate(`/auth/signup?redirect=${encodeURIComponent('/project/local?fromGuest=1')}`);
                      } catch {
                        import('react-hot-toast').then(({ default: toast }) => {
                          toast.error(t('editor.draftSaveFailed'));
                        });
                      }
                    } else {
                      navigate('/auth/signup');
                    }
                  }}
                  className="h-8 px-3 text-xs font-normal text-zinc-950 bg-primary hover:bg-primary/90 rounded-xl transition-colors"
                >
                  {t('auth.signUp', 'Sign up')}
                </button>
                {(lines?.length ?? 0) > 0 && (
                  <Tip content={t('auth.signUpToSave', 'Sign up to save your project to the cloud')}>
                    <span
                      className="absolute -top-1 -right-1 size-2 rounded-full bg-primary animate-pulse pointer-events-none"
                    />
                  </Tip>
                )}
              </div>
            </div>
          ) : (
            <>
            {user && <NotificationBell />}
            <Popover onOpenChange={(open) => { if (open) fetchCounts(); }}>
              <div className="relative flex-shrink-0">
                <PopoverTrigger className="relative z-[110] size-8 rounded-full overflow-hidden bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 transition-all focus:ring-2 focus:ring-primary/50 cursor-pointer outline-none block">
                  {user?.avatarUrl
                    ? <LazyImage src={user.avatarUrl} alt={user?.displayName || user?.accountName || user?.email} className="size-full object-cover" />
                    : <div className="size-full flex items-center justify-center bg-gradient-to-br from-primary/50 to-accent-purple/50 text-white font-bold text-sm">
                      {(user?.displayName || user?.accountName || user?.email || '?').charAt(0).toUpperCase()}
                    </div>}
                </PopoverTrigger>
                {user?.email && !user?.isVerified && (
                  <Tip content={t('auth.verification.avatarBadge')}>
                    <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-amber-400 border-2 border-zinc-950 pointer-events-none z-[111]" />
                  </Tip>
                )}
              </div>
              <PopoverContent className="w-[calc(100vw-32px)] sm:w-64 p-0" align="end" sideOffset={8}>
                <div className="p-3 border-b border-zinc-800/60 flex flex-col">
                  <span className="text-sm font-bold text-zinc-100 truncate">{user?.displayName || user?.accountName || t('auth.user')}</span>
                  <span className="text-xs text-zinc-400 truncate">{user?.email || ''}</span>
                </div>

                <div className="p-1 border-b border-zinc-800/60">
                  <PopoverItem onClick={() => navigate('/search')} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
                    <span className="flex items-center gap-2"><Search className="size-4 text-zinc-400" />{t('search.title')}</span>
                  </PopoverItem>
                  <PopoverItem onClick={() => navTo('/explore')} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
                    <span className="flex items-center gap-2"><Compass className="size-4 text-zinc-400" />{t('explore.nav')}</span>
                  </PopoverItem>
                  <PopoverItem onClick={() => navTo('/feed')} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
                    <span className="flex items-center gap-2"><Globe className="size-4 text-zinc-400" />{t('feed.title')}</span>
                  </PopoverItem>
                </div>

                <div className="p-1 border-b border-zinc-800/60">
                  <PopoverItem onClick={() => { navigate(user?.accountName ? `/${user.accountName}` : '/'); }} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
                    <User className="size-4 text-zinc-400" />{t('profile.title')}
                  </PopoverItem>
                  <PopoverItem onClick={() => navTo('/library')} className="flex items-center justify-between cursor-pointer font-medium text-sm py-3 sm:py-2">
                    <span className="flex items-center gap-2"><BookOpen className="size-4 text-zinc-400" />{t('library.title')}</span>
                    {counts.library > 0 && <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold">{counts.library}</span>}
                  </PopoverItem>
                  <PopoverItem onClick={() => navTo('/uploads')} className="flex items-center justify-between cursor-pointer font-medium text-sm py-3 sm:py-2">
                    <span className="flex items-center gap-2"><UploadCloud className="size-4 text-zinc-400" />{t('uploads.title')}</span>
                    {counts.uploads > 0 && <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold">{counts.uploads}</span>}
                  </PopoverItem>
                  <PopoverItem onClick={() => navigate('/leaderboard')} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
                    <span className="flex items-center gap-2"><Trophy className="size-4 text-warning" />{t('badges.leaderboard.title', 'Leaderboard')}</span>
                  </PopoverItem>
                </div>

                <div className="p-1 border-b border-zinc-800/60">
                  {user?.role === 'admin' && (
                    <PopoverItem onClick={() => { navigate('/admin'); }} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2 text-zinc-400 hover:text-zinc-200">
                      <ShieldAlert className="size-4" />{t('admin.dashboard.title')}
                    </PopoverItem>
                  )}
                  <PopoverItem onClick={() => { navigate('/settings'); }} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
                    <SettingsIcon className="size-4 text-zinc-400" />{t('settings.title')}
                  </PopoverItem>
                  {setShowKeyboardHelp && (
                    <PopoverItem onClick={() => { setShowKeyboardHelp(true); }} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
                      <BookOpen className="size-4 text-zinc-400" />{t('shortcuts.title', 'Editor Help')}
                    </PopoverItem>
                  )}
                </div>

                <div className="p-1">
                  <PopoverItem onClick={async () => { 
                    await logout();
                    window.location.href = '/auth/signin?from=logout';
                  }} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2 text-red-400 hover:text-red-300">
                    <LogOut className="size-4" />{t('auth.signOut', 'Sign out')}
                  </PopoverItem>
                </div>
              </PopoverContent>
            </Popover>
            </>
          )}
        </div>
      </div>

      {/* Scroll progress — only shown on guest landing page */}
      {isGuestLanding && <ScrollProgress className="absolute top-auto bottom-0 h-[2px]" />}


    </header>

    </>
  );
}
