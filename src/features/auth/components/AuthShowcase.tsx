import type { TFunction } from 'i18next';
import { Icon } from '@/shared/ui/Icon';
import { AvatarBadge } from '../auth-shared';

/**
 * The branding half of the auth split. Sign-in shows a still of the karaoke
 * preview (what you come back to); sign-up shows a live card of how the new
 * account will be credited on a published project, fed by the form's fields.
 *
 * Purely decorative. Hidden from assistive tech: it repeats nothing the form
 * doesn't already say, and a screen reader walking a fake lyric sheet is noise.
 */

type SignInProps = { t: TFunction; variant: 'signin' };
type SignUpProps = { t: TFunction; variant: 'signup'; displayName: string; accountName: string };
type AuthShowcaseProps = SignInProps | SignUpProps;

// Sample lyric, not UI copy — the same demo song the landing page plays.
const LYRICS = {
  past: 'The stars align above the city lights',
  sung: 'Midnight echoes',
  rest: ' through the empty halls',
  next: 'She sang a melody that broke the night',
  later: 'And disappeared before the morning calls',
};

function SignInShowcase({ t }: { t: TFunction }) {
  return (
    <>
      <div className="flex-1 flex flex-col justify-center gap-[18px] max-w-[520px] font-lyrics">
        <p className="text-xl font-medium leading-tight text-primary/80">{LYRICS.past}</p>
        <p className="font-extrabold leading-[1.15] text-zinc-100" style={{ fontSize: 'clamp(24px, 2.6vw, 34px)' }}>
          <span className="text-primary glow-line">{LYRICS.sung}</span>{LYRICS.rest}
        </p>
        <p className="text-xl font-medium leading-tight text-zinc-100">{LYRICS.next}</p>
        <p className="text-xl font-medium leading-tight text-zinc-100 opacity-45">{LYRICS.later}</p>
      </div>
      <p className="max-w-[360px] text-sm text-foreground/65">{t('auth.showcase.signinNote')}</p>
    </>
  );
}

function SignUpShowcase({ t, displayName, accountName }: Omit<SignUpProps, 'variant'>) {
  const shownName = displayName.trim() || t('auth.showcase.yourName');
  const shownHandle = accountName.trim() || t('auth.showcase.yourHandle');

  return (
    <div className="flex-1 flex flex-col justify-center gap-6 w-full max-w-[420px] mx-auto">
      <p className="font-mono text-xs font-medium uppercase tracking-wider text-foreground/65">
        {t('auth.showcase.howYouAppear')}
      </p>

      <div className="flex items-center gap-3.5">
        <AvatarBadge username={displayName.trim() || undefined} size="md" />
        <span className="min-w-0">
          <span className="block text-[19px] font-bold text-zinc-100 truncate">{shownName}</span>
          <span className="block font-mono text-sm text-foreground/65 truncate">@{shownHandle}</span>
        </span>
      </div>

      {/* A blank project card: the only real data in it is the name being typed. */}
      <div className="rounded-[18px] bg-zinc-950 border border-zinc-800 overflow-hidden font-lyrics">
        <div className="aspect-video bg-zinc-800 flex items-center justify-center text-foreground/45">
          <Icon name="music_note" size={32} />
        </div>
        <div className="px-5 pt-[18px] pb-5 flex flex-col gap-3">
          <div>
            <p className="text-xl font-extrabold text-zinc-100">{t('auth.showcase.cardTitle')}</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground/80">{t('auth.showcase.cardMeta')}</p>
          </div>
          <div className="flex gap-4 text-[13px] font-semibold text-foreground/80">
            <span className="inline-flex items-center gap-1.5"><Icon name="star" size={14} />0</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="call_split" size={14} />0</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="visibility" size={14} />0</span>
          </div>
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100 min-w-0">
            <Icon name="music_note" size={14} className="shrink-0" />
            <span className="truncate">{shownName}</span>
          </p>
        </div>
      </div>

      <p className="text-sm text-foreground/65">{t('auth.showcase.signupNote')}</p>
    </div>
  );
}

export default function AuthShowcase(props: AuthShowcaseProps) {
  return (
    <div className="flex-1 flex flex-col gap-12" aria-hidden="true">
      {props.variant === 'signup'
        ? <SignUpShowcase t={props.t} displayName={props.displayName} accountName={props.accountName} />
        : <SignInShowcase t={props.t} />}
    </div>
  );
}
