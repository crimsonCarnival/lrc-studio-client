import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { siBluesky, siDiscord, siFacebook, siReddit, siTelegram, siWhatsapp, siX } from 'simple-icons';
import { ResponsiveModal } from '@ui/ResponsiveModal';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import { ProjectListCover } from '@/features/projects/components/ProjectListCover';
import { PlayerContext } from '@/features/player/PlayerContext';
import { Checkbox } from '@ui/checkbox';
import { SHARE_TARGETS, shareTargetUrl, type ShareTargetId } from '../share-targets';

interface ShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The link being shared. */
  url: string;
  /** Short text that goes with it: the song, the artist. */
  title: string;
  subtitle?: string;
  /** The project's own name, when it differs from the song's. Used in the WhatsApp intro. */
  projectName?: string;
  coverImage?: string | null;
  genre?: string | null;
  /** Called once per share action (copy, a service, the system sheet), for share counts. */
  onShared?: () => void;
}

// Brand marks from Simple Icons (CC0), drawn in the theme's text colour so they sit in the
// design system instead of seven competing brand colours.
const BRAND: Record<Exclude<ShareTargetId, 'email'> | 'discord', { path: string; label: string }> = {
  whatsapp: { path: siWhatsapp.path, label: 'WhatsApp' },
  x: { path: siX.path, label: 'X' },
  facebook: { path: siFacebook.path, label: 'Facebook' },
  telegram: { path: siTelegram.path, label: 'Telegram' },
  reddit: { path: siReddit.path, label: 'Reddit' },
  bluesky: { path: siBluesky.path, label: 'Bluesky' },
  discord: { path: siDiscord.path, label: 'Discord' },
};

const TILE = 'group flex flex-col items-center gap-2 rounded-[14px] px-1 py-2.5 text-[13px] font-medium text-subtle transition-colors duration-[var(--duration-state)] hover:bg-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus';
const DISC = 'grid size-12 place-items-center rounded-full bg-raised text-foreground inset-ring inset-ring-hl transition-colors duration-[var(--duration-state)] group-hover:bg-primary-soft group-hover:text-primary-ink';

function BrandMark({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px]" style={{ width: 22, height: 22 }} fill="currentColor">
      <path d={path} />
    </svg>
  );
}

/**
 * The link as a QR code, drawn as SVG squares in the text colour on a light tile: scanners
 * need dark-on-light, whatever the theme. The encoder is loaded only when the code is asked for.
 */
function QrCode({ value }: { value: string }) {
  const [modules, setModules] = useState<{ size: number; dark: boolean[] } | null>(null);

  useEffect(() => {
    let alive = true;
    import('qrcode').then(({ create }) => {
      const qr = create(value, { errorCorrectionLevel: 'M' });
      const size = qr.modules.size;
      const dark = Array.from({ length: size * size }, (_, i) => qr.modules.get(i % size, Math.floor(i / size)) === 1);
      if (alive) setModules({ size, dark });
    }).catch(() => { /* leave the placeholder */ });
    return () => { alive = false; };
  }, [value]);

  const quiet = 2; // modules of margin around the code
  return (
    <div className="mx-auto grid size-52 place-items-center rounded-[var(--radius-card)] bg-white p-3 text-black">
      {modules ? (
        <svg viewBox={`${-quiet} ${-quiet} ${modules.size + quiet * 2} ${modules.size + quiet * 2}`} className="size-full" shapeRendering="crispEdges" aria-hidden="true">
          {modules.dark.map((on, i) => on && (
            <rect key={i} x={i % modules.size} y={Math.floor(i / modules.size)} width="1" height="1" fill="currentColor" />
          ))}
        </svg>
      ) : null}
    </div>
  );
}

/**
 * Sharing a published project: a preview of what will be shared, copy link, a QR code for
 * another device, and the services people actually paste links into. Each service opens
 * its own compose screen; Discord has none, so its tile copies the link and says so.
 */
export function ShareSheet({ open, onOpenChange, ...body }: ShareSheetProps) {
  const { t } = useTranslation();
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('share.sheet.title')}
      className="max-h-[calc(100dvh-2rem)] max-w-[460px] gap-0 overflow-y-auto rounded-[var(--radius-card)] border-0 bg-background p-5 inset-ring inset-ring-hl sm:max-w-[460px]"
    >
      {/* Mounted only while open: every open starts fresh, and the player is only read
          (and re-read on every tick) while someone is looking at the sheet. */}
      {open && <ShareSheetBody {...body} />}
    </ResponsiveModal>
  );
}

const CAPTION = 'font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle';

/** "1:05" for 65 seconds; whole seconds, which is what ?s= carries. */
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Reads "1:05", "65" or "1:05.5" back as seconds; null when it is not a time. */
function parseMmss(raw: string): number | null {
  const m = raw.trim().match(/^(?:(\d{1,3}):)?(\d{1,4})(?:\.\d+)?$/);
  if (!m) return null;
  const seconds = (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2]);
  return Number.isFinite(seconds) ? seconds : null;
}

function ShareSheetBody({ url: baseUrl, title, subtitle, projectName, coverImage, genre, onShared }: Omit<ShareSheetProps, 'open' | 'onOpenChange'>) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const canSystemShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const text = subtitle ? `${title} · ${subtitle}` : title;
  // WhatsApp gets a sentence, not just a link: a friendly line that names the project and
  // the song (`Song – Artist`), as people would write it themselves.
  const song = subtitle ? `${title} – ${subtitle}` : title;
  const whatsappText = projectName && projectName.trim() && projectName.trim() !== title
    ? t('share.sheet.whatsappIntroProject', { project: projectName.trim(), song })
    : t('share.sheet.whatsappIntro', { song });

  // Start time, as in the editor's share panel: where the player was when the sheet opened,
  // editable. Null outside a player, and then the option is not offered.
  const player = useContext(PlayerContext);
  const [startText, setStartText] = useState(() => mmss(Math.floor(player?.currentTime ?? 0)));
  const [includeStart, setIncludeStart] = useState(false);
  const duration = Math.floor(player?.duration ?? 0);
  const canStart = duration > 0;
  // Read from the field itself, so Copy uses what is typed even before the field loses focus.
  // Past the end of the song it is clamped to the end; text that is not a time means no start.
  const typed = parseMmss(startText);
  const startAt = typed == null ? null : Math.min(Math.max(0, typed), duration);

  const url = (() => {
    const extra = new URLSearchParams();
    if (canStart && includeStart && startAt != null && startAt > 0) extra.set('s', String(startAt));
    const query = extra.toString();
    return query ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${query}` : baseUrl;
  })();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onShared?.();
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      toast.error(t('share.sheet.copyFailed'));
      return false;
    }
  };

  const openTarget = (target: ShareTargetId) => {
    onShared?.();
    const href = shareTargetUrl(target, url, target === 'whatsapp' ? whatsappText : text);
    // mailto: hands over to the mail app in place; the rest open the service in a new tab.
    window.open(href, target === 'email' ? '_self' : '_blank', 'noopener,noreferrer');
  };

  const shareToDiscord = async () => {
    if (await copy()) toast.success(t('share.sheet.discordCopied'));
  };

  const systemShare = async () => {
    try {
      await navigator.share({ url, title: text });
      onShared?.();
    } catch { /* cancelled */ }
  };

  return (
      <div className="flex flex-col gap-4">
        {/* What is being shared, the way a link preview will show it. */}
        <div className="flex items-center gap-3 rounded-[16px] bg-card p-3 inset-ring inset-ring-hl">
          <span className="block size-14 shrink-0 overflow-hidden rounded-xl">
            <ProjectListCover coverImage={coverImage} genre={genre} className="size-14" iconSize="size-6" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate font-heading text-[17px] font-bold leading-tight text-foreground">{title}</span>
            {subtitle && <span className="truncate text-sm text-subtle">{subtitle}</span>}
            <span className="truncate font-mono text-xs text-faint">{url.replace(/^https?:\/\//, '')}</span>
          </span>
        </div>

        <div className="flex gap-2">
          <Button onClick={copy} className="h-11 flex-1 gap-2 text-[15px] lg:h-11 lg:text-[15px]">
            <Icon name={copied ? 'check' : 'link'} size={18} className={copied ? 'icon-draw' : undefined} />
            {copied ? t('share.sheet.copied') : t('share.sheet.copy')}
          </Button>
          <Button
            variant="outline"
            aria-pressed={showQr}
            onClick={() => setShowQr((v) => !v)}
            className={cn('h-11 gap-2 px-3.5 text-[15px] lg:h-11 lg:px-3.5 lg:text-[15px]', showQr && 'bg-primary-soft text-primary-ink inset-ring-iris')}
          >
            <Icon name="qr_code_2" size={18} />
            {t('share.sheet.qr')}
          </Button>
        </div>

        {canStart && (
          <div className="flex min-h-9 items-center gap-3 rounded-[14px] bg-card p-3 inset-ring inset-ring-hl">
            <Checkbox id="share-start" checked={includeStart} onCheckedChange={(v) => setIncludeStart(v === true)} />
            <label htmlFor="share-start" className="flex-1 cursor-pointer text-[15px] text-foreground">{t('share.sheet.startAt')}</label>
            <input
              type="text"
              inputMode="numeric"
              aria-label={t('share.sheet.startAtTime')}
              value={startText}
              onFocus={() => setIncludeStart(true)}
              onChange={(e) => setStartText(e.target.value)}
              // Tidy what was typed ("65" becomes "1:05") once the field is left.
              onBlur={() => { if (startAt != null) setStartText(mmss(startAt)); }}
              className="h-9 w-20 rounded-[10px] border-0 bg-background px-2 text-center font-mono text-sm text-foreground outline-none inset-ring inset-ring-hl focus-visible:inset-ring-2 focus-visible:inset-ring-primary"
            />
          </div>
        )}

        {showQr && (
          <div className="flex flex-col items-center gap-2">
            <QrCode value={url} />
            <span className="text-[13px] text-subtle">{t('share.sheet.qrHint')}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className={CAPTION}>{t('share.sheet.via')}</span>
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-5">
            {SHARE_TARGETS.map((target) => (
              <button key={target} type="button" onClick={() => openTarget(target)} className={TILE}>
                <span className={DISC}>
                  {target === 'email' ? <Icon name="mail" size={22} /> : <BrandMark path={BRAND[target].path} />}
                </span>
                {target === 'email' ? t('share.sheet.email') : BRAND[target].label}
              </button>
            ))}
            <button type="button" onClick={shareToDiscord} className={TILE}>
              <span className={DISC}><BrandMark path={BRAND.discord.path} /></span>
              {BRAND.discord.label}
            </button>
            {canSystemShare && (
              <button type="button" onClick={systemShare} className={TILE}>
                <span className={DISC}><Icon name="more_horiz" size={22} /></span>
                {t('share.sheet.more')}
              </button>
            )}
          </div>
        </div>
      </div>
  );
}
