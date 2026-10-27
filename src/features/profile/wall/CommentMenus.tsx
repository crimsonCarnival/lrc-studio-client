import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { LogoLoader } from '@ui/LogoLoader';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { Popover, PopoverContent, PopoverItem, PopoverSeparator, PopoverTrigger } from '@ui/popover';
import { cn } from '@/shared/utils/utils';
import { profilePath } from '../profile-path';
import { getWallLikers, reportWallComment, WALL_REPORT_REASONS, wallErrorKey } from './wall.service';
import type { WallAuthor, WallReportReason } from './wall.service';

const ACTION_BUTTON = 'rounded-full transition-[color,background-color,transform] active:scale-90';
// Corner actions stay quiet until the row is hovered or focused, as in CommentNode.
const CORNER_BUTTON = cn(ACTION_BUTTON, 'text-zinc-600 opacity-60 group-hover/row:opacity-100 focus-visible:opacity-100');

/** Pick a reason (and optionally say more), then the report goes to the moderators. */
function ReportForm({ commentId, onSent }: { commentId: string; onSent: () => void }) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const [reason, setReason] = useState<WallReportReason | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!reason) return;
    setSending(true);
    try {
      await reportWallComment(commentId, reason, note.trim());
      toast.success(t('profile.wall.reported'));
      onSent();
    } catch (err) {
      toast.error(tk(wallErrorKey(err)));
    }
    setSending(false);
  };

  return (
    <>
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
    </>
  );
}

/** Copies a comment's text (tags as their readable @names), with a toast either way. */
function useCopyText(text: string) {
  const { t } = useTranslation();
  return () => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(t('profile.wall.copied')),
      () => toast.error(t('profile.wall.copyFailed')),
    );
  };
}

/** The copy button, for someone who can't delete the comment (who gets it in the ⋯ menu). */
export function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const copy = useCopyText(text);
  return (
    <Tip content={t('profile.wall.copy')}>
      <Button type="button" variant="ghost" size="icon-xs" aria-label={t('profile.wall.copy')} onClick={copy} className={cn(CORNER_BUTTON, 'hover:text-zinc-100')}>
        <Icon name="content_copy" size={15} />
      </Button>
    </Tip>
  );
}

/** The report flag, for someone who can do nothing else to the comment. */
export function ReportMenu({ commentId }: { commentId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tip content={t('profile.wall.report')}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon-xs" aria-label={t('profile.wall.report')} className={cn(CORNER_BUTTON, 'hover:text-amber-400')}>
            <Icon name="flag" size={15} />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="end" className="w-64 lg:min-w-64">
        {/* Remounted on each open, so a half-filled report starts over. */}
        {open && <ReportForm commentId={commentId} onSent={() => setOpen(false)} />}
      </PopoverContent>
    </Popover>
  );
}

/**
 * The ⋯ menu, for someone who can delete the comment (its author, the wall's owner or a
 * moderator): copy, edit (the author, while the window is open), report (not your own) and
 * delete. Report swaps the menu for the reasons; delete asks in the corner, as before.
 */
export function CommentMenu({ commentId, copyText, canEdit, canReport, onEdit, onDelete }: {
  commentId: string;
  copyText: string;
  canEdit: boolean;
  canReport: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);

  const openChange = (next: boolean) => {
    setOpen(next);
    if (!next) setReporting(false);
  };
  const pick = (run: () => void) => () => { openChange(false); run(); };
  const copy = useCopyText(copyText);

  return (
    <Popover open={open} onOpenChange={openChange}>
      <Tip content={t('profile.wall.moreActions')}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('profile.wall.moreActions')}
            className={cn(CORNER_BUTTON, 'hover:text-zinc-100', open && 'opacity-100 text-zinc-100')}
          >
            <Icon name="more_horiz" size={15} />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="end" className={reporting ? 'w-64 lg:min-w-64' : 'w-48 lg:min-w-48'}>
        {reporting ? (
          <ReportForm commentId={commentId} onSent={() => openChange(false)} />
        ) : (
          <>
            <PopoverItem onClick={pick(copy)} className="text-sm">
              <Icon name="content_copy" size={16} /> {t('profile.wall.copy')}
            </PopoverItem>
            {canEdit && (
              <PopoverItem onClick={pick(onEdit)} className="text-sm">
                <Icon name="edit" size={16} /> {t('profile.wall.edit')}
              </PopoverItem>
            )}
            {canReport && (
              <PopoverItem onClick={() => setReporting(true)} className="text-sm">
                <Icon name="flag" size={16} /> {t('profile.wall.report')}
              </PopoverItem>
            )}
            <PopoverSeparator />
            <PopoverItem onClick={pick(onDelete)} className="text-sm text-destructive hover:bg-destructive/15 hover:text-destructive">
              <Icon name="delete" size={16} /> {t('profile.wall.delete')}
            </PopoverItem>
          </>
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
