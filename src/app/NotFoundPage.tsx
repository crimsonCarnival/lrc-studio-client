import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';

const KNOWN_PREFIXES = new Set([
  '/home', '/library', '/search', '/explore', '/feed',
  '/settings', '/admin', '/notifications', '/leaderboard',
  '/uploads', '/project', '/profile', '/auth', '/verify-email',
  '/share', '/login', '/register', '/reset-password', '/change-password',
]);

interface RouteInfo {
  type: string;
  identifier: string | null;
}

function detectRouteType(pathname: string): RouteInfo {
  // /:accountName/lists/:listId
  if (/^\/[^/]+\/lists\/[^/]+\/?$/.test(pathname)) {
    const parts = pathname.split('/');
    return { type: 'playlist', identifier: parts[3] };
  }
  // /project/:id/edit or /project/:id
  if (/^\/project\/[^/]/.test(pathname)) {
    const parts = pathname.split('/');
    return { type: 'project', identifier: parts[2] };
  }
  // /uploads/:id
  if (/^\/uploads\/[^/]+/.test(pathname)) {
    const parts = pathname.split('/');
    return { type: 'upload', identifier: parts[2] };
  }
  // /profile/:accountName
  if (/^\/profile\/[^/]+/.test(pathname)) {
    const parts = pathname.split('/');
    return { type: 'user', identifier: parts[2] };
  }
  // /:accountName (single segment, not a known prefix)
  const firstSegment = '/' + pathname.split('/')[1];
  if (!KNOWN_PREFIXES.has(firstSegment) && /^\/[a-z0-9_.:-]+\/?$/i.test(pathname)) {
    return { type: 'user', identifier: pathname.replace(/^\/|\/$/g, '') };
  }
  return { type: 'general', identifier: null };
}

function pickVariant(t: TFunction, key: string, opts?: object): string {
  const tk = t as (k: string, o?: object) => unknown;
  const val = tk(key, { returnObjects: true, ...opts });
  if (Array.isArray(val)) return val[Math.floor(Math.random() * val.length)];
  return String(val);
}

interface NotFoundAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}

interface NotFoundConfig {
  icon: ReactNode;
  title: string;
  description: string;
  primaryAction: NotFoundAction;
  searchAction: NotFoundAction | null;
}

export default function NotFoundPage({ type: typeProp, identifier: identifierProp }: { type?: string; identifier?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { type, identifier } = useMemo(() => {
    const routeDetected = detectRouteType(location.pathname);
    return {
      type: typeProp || routeDetected.type,
      identifier: identifierProp ?? routeDetected.identifier,
    };
  }, [typeProp, identifierProp, location.pathname]);

  const config = useMemo<NotFoundConfig>(() => {
    switch (type) {
      case 'project':
        return {
          icon: <Icon name="folder_search" size={64} className="text-amber-400" />,
          title: identifier
            ? t('error.projectNotFoundWithName', { id: identifier })
            : pickVariant(t, 'error.projectNotFoundTitle'),
          description: pickVariant(t, 'error.projectNotFoundDesc'),
          primaryAction: {
            label: t('app.backToLibrary'),
            icon: <Icon name="home" size={20} className="mr-2" />,
            onClick: () => navigate('/library'),
          },
          searchAction: {
            label: t('error.searchAnotherProject'),
            onClick: () => navigate('/search'),
          },
        };
      case 'playlist':
        return {
          icon: <Icon name="music_note" size={64} className="text-violet-400" />,
          title: pickVariant(t, 'error.playlistNotFoundTitle'),
          description: pickVariant(t, 'error.playlistNotFoundDesc'),
          primaryAction: {
            label: t('app.backHome'),
            icon: <Icon name="home" size={20} className="mr-2" />,
            onClick: () => navigate('/home'),
          },
          searchAction: null,
        };
      case 'upload':
        return {
          icon: <Icon name="help" size={64} className="text-blue-400" />,
          title: pickVariant(t, 'error.uploadNotFoundTitle'),
          description: pickVariant(t, 'error.uploadNotFoundDesc'),
          primaryAction: {
            label: t('app.viewUploads'),
            icon: <Icon name="home" size={20} className="mr-2" />,
            onClick: () => navigate('/uploads'),
          },
          searchAction: null,
        };
      case 'user':
        return {
          icon: <Icon name="person_off" size={64} className="text-rose-400" />,
          title: identifier
            ? t('error.userNotFoundWithName', { name: `@${identifier}` })
            : pickVariant(t, 'error.userNotFoundTitle'),
          description: pickVariant(t, 'error.userNotFoundDesc'),
          primaryAction: {
            label: t('app.backToDashboard'),
            icon: <Icon name="home" size={20} className="mr-2" />,
            onClick: () => navigate('/home'),
          },
          searchAction: {
            label: t('error.searchAnotherUser'),
            onClick: () => navigate('/search'),
          },
        };
      default:
        return {
          icon: <Icon name="ghost" size={64} className="text-zinc-500" />,
          title: pickVariant(t, 'error.pageNotFoundTitle'),
          description: pickVariant(t, 'error.pageNotFoundDesc'),
          primaryAction: {
            label: t('app.backHome'),
            icon: <Icon name="home" size={20} className="mr-2" />,
            onClick: () => navigate('/home'),
          },
          searchAction: {
            label: t('error.searchContent'),
            onClick: () => navigate('/search'),
          },
        };
    }
  }, [type, identifier, t, navigate]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-md">
        <div className="mb-8 p-6 bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-zinc-800/50 shadow-elevated animate-slide-up-fade">
          {config.icon}
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-100 mb-4 tracking-tight font-heading">
          {config.title}
        </h1>

        <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
          {config.description}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Button
            variant="default"
            size="lg"
            onClick={config.primaryAction.onClick}
            className="w-full sm:flex-1 h-12 text-base font-semibold glow-primary"
          >
            {config.primaryAction.icon}
            {config.primaryAction.label}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate(-1)}
            className="w-full sm:flex-1 h-12 text-base text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:bg-zinc-800/50"
          >
            <Icon name="arrow_back" size={20} className="mr-2" />
            {t('app.goBack')}
          </Button>
        </div>

        {config.searchAction && (
          <Button
            variant="ghost"
            size="sm"
            onClick={config.searchAction.onClick}
            className="mt-4 text-zinc-500 hover:text-zinc-300 gap-2"
          >
            <Icon name="search" size={16} />
            {config.searchAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
