import { useState, useEffect, useRef } from 'react';
import { Globe, Check, Lightbulb, Music2, X, ArrowRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from '@ui/popover';
import { Tip } from '@ui/tip';
import { LazyImage } from '@ui/LazyImage';

import { LANGUAGES, getLangLabel } from './auth-constants';

export function LangSwitcher({ i18n }) {
  const currentCode = (i18n?.language || 'en').split('-')[0];
  const currentShort = currentCode.toUpperCase();
  return (
    <Popover>
      <Tip content="Language">
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1 h-8 px-2.5 text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/50 rounded-xl transition-colors text-[11px] font-bold"
          >
            <Globe className="size-3.5" />
            {currentShort}
          </button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent className="w-48 p-1" align="end" sideOffset={6}>
        {LANGUAGES.map(({ code, short }) => {
          const label = getLangLabel(code, currentCode);
          const active = currentCode === code;
          return (
            <PopoverItem
              key={code}
              onClick={() => i18n?.changeLanguage(code)}
              className={`flex items-center gap-2.5 cursor-pointer text-sm py-2 ${active ? 'text-primary' : ''}`}
            >
              <span className="text-[10px] font-bold text-zinc-500 w-6 shrink-0">{short}</span>
              <span className="flex-1 text-left">{label}</span>
              <Check className={`size-3 shrink-0 ${active ? 'text-primary' : 'invisible'}`} />
            </PopoverItem>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

export function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive font-medium mt-1 flex items-center gap-1">{message}</p>;
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="px-4 py-3 bg-destructive/10 border border-destructive/25 rounded-xl text-xs text-destructive font-medium leading-relaxed">
      {message}
    </div>
  );
}

function AvatarBadgeInner({ username, avatarUrl, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'size-16 text-xl' : 'size-10 text-sm';
  const initial = (username || '?')[0].toUpperCase();
  const [imgError, setImgError] = useState(false);

  if (avatarUrl && !imgError) {
    return (
      <LazyImage
        src={avatarUrl}
        alt={username}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-primary/30`}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary/80 to-accent-purple flex items-center justify-center font-bold text-zinc-950 ring-2 ring-primary/20`}>
      {initial}
    </div>
  );
}

export function AvatarBadge(props) {
  return <AvatarBadgeInner key={props.avatarUrl || ''} {...props} />;
}

// ─── Background ────────────────────────────────────────────────────────────

export function Background() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-zinc-950" />
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.75%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")' }} />
      {/* Gradient orbs */}
      <div className="absolute -top-32 -left-32 size-[500px] bg-primary/8 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 -right-48 size-[400px] bg-accent-purple/6 rounded-full blur-[100px]" />
      <div className="absolute -bottom-48 left-1/4 size-[500px] bg-accent-blue/5 rounded-full blur-[120px]" />
    </div>
  );
}

// ─── Tip footer ────────────────────────────────────────────────────────────

export function TipFooter({ t, seed }) {
  const getRandStr = (key) => {
    const arr = t(key, { returnObjects: true });
    if (Array.isArray(arr) && arr.length > 0) return arr[seed % arr.length];
    return t(key);
  };

  return (
    <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 mt-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
      <Lightbulb className="size-3.5 text-warning/60 shrink-0" />
      <p>{getRandStr('home.tips')}</p>
    </div>
  );
}

export function RedirectMessage({ from, t }) {
  const [visible, setVisible] = useState(!!from);
  const prevFromRef = useRef(from);

  if (from !== prevFromRef.current) {
    prevFromRef.current = from;
    if (from) {
      setVisible(true);
    }
  }

  useEffect(() => {
    if (from && visible) {
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [from, visible]);

  if (!from || !visible) return null;

  let message = '';
  let variant = 'info';

  switch(from) {
    case 'logout':
      message = t('auth.message.logout', 'You have been signed out successfully.');
      break;
    case 'session-expiration':
      message = t('auth.message.sessionExpired', 'Your session has expired. Please sign in again.');
      variant = 'warning';
      break;
    case 'banned':
      message = t('auth.message.banned', 'Your account has been restricted. Please contact support.');
      variant = 'danger';
      break;
    case 'unauthorized':
      message = t('auth.message.unauthorized', 'Please sign in to access this page.');
      break;
    default:
      return null;
  }

  return (
    <div className={`mb-6 p-3 rounded-xl text-xs font-medium flex items-center gap-3 border transition-all duration-500 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
    } ${
      variant === 'warning' ? 'bg-warning/10 border-warning/20 text-warning' :
      variant === 'danger' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
      'bg-primary/10 border-primary/20 text-primary'
    }`}>
      {variant === 'warning' ? <Lightbulb className="size-4 shrink-0" /> : <Music2 className="size-4 shrink-0" />}
      <div className="flex-1">{message}</div>
      <button
        onClick={() => setVisible(false)}
        aria-label={t('common.dismiss')}
        className="p-1 hover:bg-white/5 rounded-md transition-colors opacity-60 hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function GoogleButton({ onClick, t }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-11 bg-[#09090b] hover:bg-zinc-800 text-white font-normal text-sm rounded-xl flex items-center justify-center gap-3 transition-all duration-200 shadow-md hover:shadow-lg border border-zinc-800/50"
    >
      <svg className="size-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
      </svg>
      {t('auth.googleContinue')}
    </button>
  );
}

export function ContextBanner({ redirect, t }) {
  if (!redirect) return null;

  // Decode and clean up the redirect path for display
  let displayPath = '';
  try {
    const decoded = decodeURIComponent(redirect);
    const url = new URL(decoded, window.location.origin);
    displayPath = url.pathname;

    if (displayPath.startsWith('/project/')) {
      const id = displayPath.split('/').pop();
      displayPath = id === 'new' ? t('auth.context.newProject', 'New Project') : t('auth.context.project', 'Project');
    } else if (displayPath === '/library') {
      displayPath = t('auth.context.library', 'Your Library');
    } else if (displayPath === '/home') {
      displayPath = t('auth.context.home', 'Home');
    } else if (displayPath === '/settings') {
      displayPath = t('auth.context.settings', 'Settings');
    } else if (displayPath === '/change-password') {
      displayPath = t('auth.context.changePassword', 'Change Password');
    } else {
      displayPath = t('auth.context.app', 'LRC Studio');
    }
  } catch {
    displayPath = t('auth.context.app', 'LRC Studio');
  }

  return (
    <div className="mb-6 flex items-center gap-2 px-3 py-2 bg-zinc-800/40 border border-zinc-700/30 rounded-xl animate-fade-in" style={{ animationDelay: '100ms' }}>
      <div className="size-6 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
        <ArrowRight className="size-3 text-zinc-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 leading-none">
          {t('auth.context.continuingTo', 'Continuing to')}
        </p>
        <p className="text-xs font-semibold text-zinc-300 truncate mt-0.5">
          {displayPath}
        </p>
      </div>
    </div>
  );
}
