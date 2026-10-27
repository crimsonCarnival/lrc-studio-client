import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button } from '@ui/button';
import { Checkbox } from '@ui/checkbox';
import { Label } from '@ui/label';
import { LogoLoader } from '@ui/LogoLoader';
import { PopoverItem } from '@ui/popover';
import { ResponsiveModal } from '@ui/ResponsiveModal';
import { cn } from '@/shared/utils/utils';
import { fileReport, REASONS_BY_TYPE, reportErrorKey } from './reports.service';
import type { ReportReason, ReportTargetType } from './reports.service';

const NOTE_MAX = 300;

/**
 * Pick a reason (and optionally say more), then the report goes to the moderators. Rendered
 * inside the wall's ⋯ popover and inside ReportDialog. `blockName` (accounts only) offers to
 * block the account in the same step; `onSent` says whether it was blocked.
 */
export function ReportForm({ targetType, targetId, blockName, showTitle = true, onSent }: {
  targetType: ReportTargetType;
  targetId: string;
  blockName?: string;
  showTitle?: boolean;
  onSent: (blocked: boolean) => void;
}) {
  const { t } = useTranslation();
  const tk = t as (key: string, o?: Record<string, unknown>) => string;
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [sending, setSending] = useState(false);
  const canBlock = targetType === 'user' && !!blockName;

  const send = async () => {
    if (!reason) return;
    setSending(true);
    const blocked = canBlock && alsoBlock;
    try {
      await fileReport({ targetType, targetId, reason, note: note.trim(), alsoBlock: blocked });
      toast.success(blocked ? t('reports.sentAndBlocked', { name: blockName }) : t('reports.sent'));
      onSent(blocked);
    } catch (err) {
      toast.error(tk(reportErrorKey(err)));
    }
    setSending(false);
  };

  return (
    <>
      {showTitle && <p className="px-3 pb-1 pt-1 text-xs font-semibold text-zinc-400">{t('reports.formTitle')}</p>}
      {REASONS_BY_TYPE[targetType].map((r) => (
        <PopoverItem key={r} type="button" onClick={() => setReason(r)} aria-pressed={reason === r} className={cn('text-sm', reason === r && 'bg-primary/15 text-primary')}>
          {tk(`reports.reasons.${r}`)}
        </PopoverItem>
      ))}
      {reason && (
        <div className="flex flex-col gap-2 px-1 pt-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
            placeholder={t('reports.note')}
            aria-label={t('reports.note')}
            rows={2}
            className="w-full resize-none rounded-lg bg-zinc-800/80 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-primary/50"
          />
          {canBlock && (
            <div className="flex items-start gap-2 px-1 py-1">
              <Checkbox id="report-also-block" checked={alsoBlock} onCheckedChange={(c) => setAlsoBlock(!!c)} className="mt-0.5" />
              <Label htmlFor="report-also-block" className="flex flex-col items-start gap-0.5 cursor-pointer">
                <span className="text-sm text-zinc-200">{t('reports.alsoBlock', { name: blockName })}</span>
                <span className="text-xs font-normal text-zinc-500">{t('reports.alsoBlockHint')}</span>
              </Label>
            </div>
          )}
          <Button type="button" size="sm" disabled={sending} onClick={send}>
            {sending ? <LogoLoader size={12} /> : t('reports.send')}
          </Button>
        </div>
      )}
    </>
  );
}

/** The report form in a dialog (a sheet on touch), for the profile, project and playlist menus. */
export function ReportDialog({ open, onOpenChange, targetType, targetId, name, onSent }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  /** The account name, for an account report: names it in the title and the block option. */
  name?: string;
  onSent?: (blocked: boolean) => void;
}) {
  const { t } = useTranslation();
  const tk = t as (key: string, o?: Record<string, unknown>) => string;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={tk(`reports.dialogTitle.${targetType}`, { name })}
      description={t('reports.formTitle')}
      className="sm:max-w-sm"
    >
      {/* Mounted only while open, so a reopened dialog starts blank. */}
      {open && (
        <div className="flex flex-col gap-0.5">
          <ReportForm
            targetType={targetType}
            targetId={targetId}
            blockName={targetType === 'user' ? name : undefined}
            showTitle={false}
            onSent={(blocked) => { onOpenChange(false); onSent?.(blocked); }}
          />
        </div>
      )}
    </ResponsiveModal>
  );
}
