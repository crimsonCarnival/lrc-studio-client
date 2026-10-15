import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import type { i18n as I18nInstance } from 'i18next';
import { Icon } from '@/shared/ui/Icon';
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from '@ui/popover';
import { LazyImage } from '@ui/LazyImage';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';

import { LANGUAGES, getLangLabel } from './auth-constants';

export function LangSwitcher({ i18n }: { i18n?: I18nInstance }) {
  const currentCode = (i18n?.language || 'en').split('-')[0];
  const currentShort = currentCode.toUpperCase();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 lg:h-8">
          <Icon name="language" size={14} />
          {currentShort}
        </Button>
      </PopoverTrigger>
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
              <Icon name="check" size={12} className={`shrink-0 ${active ? 'text-primary' : 'invisible'}`} />
            </PopoverItem>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

export function FieldError({ message }: { message?: ReactNode }) {
  if (!message) return null;
  return <p className="pl-1 text-sm text-love-ink font-medium flex items-center gap-1.5">{message}</p>;
}

interface AuthFieldProps {
  error?: ReactNode;
  /** Shown under the input when there is no error. */
  hint?: ReactNode;
  children: ReactNode;
}

/** Field wrapper: the FloatingInput passed as children (it carries its own label), then error or hint. */
export function AuthField({ error, hint, children }: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      {children}
      {error
        ? <FieldError message={error} />
        : hint && <p className="pl-1 text-sm text-subtle">{hint}</p>}
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div>
      <h1 className="text-[32px] leading-[1.1] font-extrabold tracking-tight text-zinc-100">{title}</h1>
      {subtitle && <p className="mt-1.5 text-foreground/65">{subtitle}</p>}
    </div>
  );
}

export function OrDivider({ t }: { t: TFunction }) {
  return (
    <div className="flex items-center gap-3.5 text-sm lowercase text-subtle">
      <span className="flex-1 h-px bg-hl" />
      {t('common.or')}
      <span className="flex-1 h-px bg-hl" />
    </div>
  );
}

export function ErrorBanner({ message }: { message?: ReactNode }) {
  if (!message) return null;
  return (
    <div className="px-4 py-3 bg-destructive/10 border border-destructive/25 rounded-xl text-xs text-destructive font-medium leading-relaxed">
      {message}
    </div>
  );
}

interface AvatarBadgeProps {
  accountName?: string;
  avatarUrl?: string;
  size?: 'md' | 'lg';
}

function AvatarBadgeInner({ accountName, avatarUrl, size = 'md' }: AvatarBadgeProps) {
  const sizeClass = size === 'lg' ? 'size-16 text-2xl' : 'size-12 text-xl';
  // Iris ring separated from the avatar by a gap in the page colour (redesign sheet 05).
  const ring = 'ring-[1.5px] ring-iris ring-offset-2 ring-offset-ground';
  const initial = (accountName || '?')[0].toUpperCase();
  const [imgError, setImgError] = useState(false);

  if (avatarUrl && !imgError) {
    return (
      <LazyImage
        src={avatarUrl}
        alt={accountName}
        className={`${sizeClass} ${ring} shrink-0 rounded-full object-cover`}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className={`${sizeClass} ${ring} shrink-0 rounded-full bg-primary-soft text-primary-ink font-heading font-bold flex items-center justify-center`}>
      {initial}
    </div>
  );
}

export function AvatarBadge(props: AvatarBadgeProps) {
  return <AvatarBadgeInner key={props.avatarUrl || ''} {...props} />;
}

export function RedirectMessage({ from, t }: { from?: string; t: TFunction }) {
  const [visible, setVisible] = useState(!!from);
  const prevFromRef = useRef(from);

  useLayoutEffect(() => {
    if (from !== prevFromRef.current) {
      prevFromRef.current = from;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (from) setVisible(true);
    }
  }, [from]);

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
      message = t('auth.message.logout');
      break;
    case 'session-expiration':
      message = t('auth.message.sessionExpired');
      variant = 'warning';
      break;
    case 'banned':
      message = t('auth.message.banned');
      variant = 'danger';
      break;
    case 'unauthorized':
      message = t('auth.message.unauthorized');
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
      {variant === 'warning' ? <Icon name="lightbulb" size={16} className="shrink-0" /> : <Icon name="music_note" size={16} className="shrink-0" />}
      <div className="flex-1">{message}</div>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setVisible(false)}
        aria-label={t('common.dismiss')}
        className="size-6 lg:size-6"
      >
        <Icon name="close" size={14} />
      </Button>
    </div>
  );
}

export function GoogleButton({ onClick, t, short }: { onClick?: () => void; t: TFunction; short?: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-[52px] w-full gap-2.5 text-[17px] lg:h-[52px] lg:text-[17px]"
    >
      <svg className="size-[18px]" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
      </svg>
      {short ? t('auth.googleShort') : t('auth.googleContinue')}
    </Button>
  );
}


export function ContextBanner({ redirect, t, onDismiss }: { redirect?: string; t: TFunction; onDismiss?: () => void }) {
  if (!redirect) return null;

  // Decode and clean up the redirect path for display
  let displayPath = '';
  try {
    const decoded = decodeURIComponent(redirect);
    const url = new URL(decoded, window.location.origin);
    displayPath = url.pathname;

    if (displayPath.startsWith('/project/') || /^\/[^/]+\/projects\/[^/]+$/.test(displayPath)) {
      const id = displayPath.split('/').pop();
      displayPath = id === 'new' ? t('auth.context.newProject') : t('auth.context.project');
    } else if (displayPath === '/library') {
      displayPath = t('auth.context.library');
    } else if (displayPath === '/home') {
      displayPath = t('auth.context.home');
    } else if (displayPath === '/settings') {
      displayPath = t('auth.context.settings');
    } else if (displayPath === '/change-password') {
      displayPath = t('auth.context.changePassword');
    } else {
      displayPath = t('auth.context.app');
    }
  } catch {
    displayPath = t('auth.context.app');
  }

  return (
    <div className="mb-6 flex items-center gap-2 px-3 py-2 bg-zinc-800/40 border border-zinc-700/30 rounded-xl animate-fade-in" style={{ animationDelay: '100ms' }}>
      <div className="size-6 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
        <Icon name="arrow_forward" size={12} className="text-zinc-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 leading-none">
          {t('auth.context.continuingTo')}
        </p>
        <p className="text-xs font-semibold text-zinc-300 truncate mt-0.5">
          {displayPath}
        </p>
      </div>
      {onDismiss && (
        <Tip content={t('auth.context.dismiss')}>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onDismiss}
            aria-label={t('auth.context.dismiss')}
            className="size-6 lg:size-6"
          >
            <Icon name="close" size={14} />
          </Button>
        </Tip>
      )}
    </div>
  );
}
