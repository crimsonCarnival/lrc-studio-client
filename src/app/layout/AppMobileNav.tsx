import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useHapticFeedback from '../../shared/hooks/useHapticFeedback.js';
import { Icon } from '@/shared/ui/Icon';
import { useAuthContext } from '@/features/auth/useAuthContext';
import type { EditorLine } from '@/features/editor/editor.types';
import { useGuestAuth } from './header/use-guest-auth';
import { activeNavId, getBottomBarItems, SIGN_IN_ID } from './nav-items';

type AppMobileNavProps = {
  isReady?: boolean;
  lines: EditorLine[];
  mediaTitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildProjectPayload?: () => Record<string, any>;
};

/**
 * Fixed bottom bar, phones only (hidden on lg+). Signed in: Home, Projects, Explore,
 * Profile. Guest: Explore, Draft, Sign in. AppLayout decides where it shows
 * (see showsBottomBar); everything else lives in the burger drawer. `isReady` only
 * means a project is loaded (it is false on Home or Explore), so it gates the draft
 * stash for sign-in and never the bar itself.
 */
export function AppMobileNav({ isReady, lines, mediaTitle, buildProjectPayload }: AppMobileNavProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { trigger: haptic } = useHapticFeedback();
  const { user } = useAuthContext();
  const goToAuth = useGuestAuth({ isReady: !!isReady, lines, mediaTitle, buildProjectPayload });

  const items = getBottomBarItems({ user, accountName: user?.accountName, hasDraft: lines.length > 0 });
  const activeId = activeNavId(items, pathname);

  return (
    <nav
      aria-label={t('nav.tabs')}
      className="lg:hidden fixed bottom-0 inset-x-0 z-nav pb-safe bg-zinc-900/95 backdrop-blur-md border-t border-zinc-700/50"
    >
      <div className="flex items-stretch gap-2 px-1">
        {items.map((item) => {
          const active = item.id === activeId;
          const cls = `relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[calc(var(--radius)*1)] text-[10px] font-semibold outline-none transition-colors focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus ${
            active ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'
          }`;
          const inner = (
            <>
              <span aria-hidden="true" className="inline-flex"><Icon name={item.icon} size={24} filled={active} /></span>
              <span className="max-w-full truncate px-1">{t(item.labelKey)}</span>
              {active && <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-primary" />}
            </>
          );
          if (item.id === SIGN_IN_ID) {
            return (
              <button key={item.id} type="button" className={cls} onClick={() => { haptic('light'); void goToAuth('signin'); }}>
                {inner}
              </button>
            );
          }
          return (
            <Link key={item.id} to={item.path} aria-current={active ? 'page' : undefined} className={cls} onClick={() => haptic('light')}>
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
