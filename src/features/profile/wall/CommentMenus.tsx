import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { LogoLoader } from '@ui/LogoLoader';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from '@ui/popover';
import { cn } from '@/shared/utils/utils';
import { profilePath } from '../profile-path';
import { getWallLikers, reportWallComment, WALL_REPORT_REASONS, wallErrorKey } from './wall.service';
import type { WallAuthor, WallReportReason } from './wall.service';

const ACTION_BUTTON = 'rounded-full transition-[color,background-color,transform] active:scale-90';

/** The report flag: pick a reason (and optionally say more), then it goes to the moderators. */
export function ReportMenu({ commentId }: { commentId: string }) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<WallReportReason | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!reason) return;
    setSending(true);
    try {
      await reportWallComment(commentId, reason, note.trim());
      toast.success(t('profile.wall.reported'));
      setOpen(false);
      setReason(null);
      setNote('');
    } catch (err) {
      toast.error(tk(wallErrorKey(err)));
    }
    setSending(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tip content={t('profile.wall.report')}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('profile.wall.report')}
            className={cn(ACTION_BUTTON, 'text-zinc-600 opacity-60 group-hover/row:opacity-100 focus-visible:opacity-100 hover:text-amber-400')}
          >
            <Icon name="flag" size={15} />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="end" className="w-64 lg:min-w-64">
        <p className="px-3 pb-1 pt-1 text-xs font-semibold text-zinc-400">{t('profile.wall.reportTitle')}</p>
        {WALL_REPORT_REASONS.map((r) => (
          <PopoverItem key={r} onClick={() => setReason(r)} aria-pressed={reason === r} className={cn('text-sm', reason === r && 'bg-primary/15 text-primary')}>
            {tk(`profile.wall.reportReasons.${r}`)}
          </PopoverItem>
        ))}
        {reason && (
          <div className="flex flex-col gap-2 px-1 pt-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              placeholder={t('profile.wall.reportNote')}
              rows={2}
              className="w-full resize-none rounded-lg bg-zinc-800/80 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-primary/50"
            />
            <Button type="button" size="sm" disabled={sending} onClick={send}>
              {sending ? <LogoLoader size={12} /> : t('profile.wall.reportSend')}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** The like count, which opens the list of who liked the comment. */
export function LikersPopover({ commentId, count }: { commentId: string; count: number }) {
  const { t } = useTranslation();
  const [likers, setLikers] = useState<{ users: WallAuthor[]; total: number } | null>(null);

  const load = (open: boolean) => {
    if (!open) return;
    getWallLikers(commentId).then(setLikers).catch(() => setLikers({ users: [], total: count }));
  };

  return (
    <Popover onOpenChange={load}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('profile.wall.likedBy', { count })}
          className="rounded px-0.5 text-xs tabular-nums text-zinc-500 transition-colors hover:text-zinc-200 hover:underline"
        >
          {count}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 lg:min-w-60">
        <p className="px-2 pb-1.5 text-xs font-semibold text-zinc-400">{t('profile.wall.likedBy', { count })}</p>
        {!likers ? (
          <div className="flex justify-center py-3"><LogoLoader size={14} /></div>
        ) : (
          <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {likers.users.map((u) => (
              <li key={u.id}>
                <Link to={profilePath(u.accountName)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800">
                  {u.avatarUrl
                    ? <img src={u.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-6 rounded-full object-cover" />
                    : <InitialsAvatar name={u.displayName || u.accountName} handle={u.accountName} className="size-6 rounded-full text-[10px]" />}
                  <span className="min-w-0 flex-1 truncate">{u.displayName || u.accountName}</span>
                </Link>
              </li>
            ))}
            {likers.total > likers.users.length && (
              <li className="px-2 pt-1 text-xs text-zinc-500">{t('profile.wall.andMore', { count: likers.total - likers.users.length })}</li>
            )}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
