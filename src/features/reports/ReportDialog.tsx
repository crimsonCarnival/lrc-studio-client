import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button } from '@ui/button';
import { Checkbox } from '@ui/checkbox';
import { Label } from '@ui/label';
import { LogoLoader } from '@ui/LogoLoader';
import { ResponsiveModal } from '@ui/ResponsiveModal';
import { cn } from '@/shared/utils/utils';
import { Icon } from '@/shared/ui/Icon';
import { fileReport, REASONS_BY_TYPE, reportErrorKey } from './reports.service';
import type { ReportReason, ReportTargetType } from './reports.service';

const NOTE_MAX = 300;

/**
 * Pick a reason (and optionally say more), then the report goes to the moderators. Rendered
 * inside ReportDialog. `blockName` (accounts only) offers to block the account in the same
 * step; `onSent` says whether it was blocked.
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
      {showTitle && <p className="pb-1 text-xs font-semibold text-zinc-400">{t('reports.formTitle')}</p>}
      {/* A radio list, so every reason and what it covers is visible before choosing. */}
      <div role="radiogroup" aria-label={t('reports.formTitle')} className="flex flex-col gap-1.5">
        {REASONS_BY_TYPE[targetType].map((r) => {
          const selected = reason === r;
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setReason(r)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors coarse:min-h-11',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus',
                selected ? 'border-primary/50 bg-primary/10' : 'border-border hover:bg-raised',
              )}
            >
              <span
                aria-hidden
                className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2', selected ? 'border-primary' : 'border-zinc-600')}
              >
                {selected && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cn('text-sm font-semibold', selected ? 'text-primary-ink' : 'text-foreground')}>{tk(`reports.reasons.${r}`)}</span>
                <span className="text-xs text-subtle">{tk(`reports.reasonHints.${r}`)}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 pt-3">
        <div className="relative">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
            placeholder={t('reports.notePlaceholder')}
            aria-label={t('reports.note')}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-raised/50 px-3 py-2 pb-6 text-sm text-foreground placeholder:text-subtle outline-none focus:border-primary/50"
          />
          <span aria-hidden className="pointer-events-none absolute bottom-2 right-3 font-mono text-[11px] tabular-nums text-subtle">{note.length}/{NOTE_MAX}</span>
        </div>
        {canBlock && (
          <div className="flex items-start gap-2 px-1 py-1">
            <Checkbox id="report-also-block" checked={alsoBlock} onCheckedChange={(c) => setAlsoBlock(!!c)} className="mt-0.5" />
            <Label htmlFor="report-also-block" className="flex flex-col items-start gap-0.5 cursor-pointer">
              <span className="text-sm text-zinc-200">{t('reports.alsoBlock', { name: blockName })}</span>
              <span className="text-xs font-normal text-zinc-500">{t('reports.alsoBlockHint')}</span>
            </Label>
          </div>
        )}
        <p className="flex items-start gap-1.5 text-xs text-subtle">
          <Icon name="lock" size={13} className="mt-px shrink-0" />
          {t('reports.privacyHint')}
        </p>
        <Button type="button" disabled={!reason || sending} onClick={send} className="mt-1">
          {sending ? <LogoLoader size={12} /> : t('reports.send')}
        </Button>
      </div>
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
      className="sm:max-w-md"
    >
      {/* Mounted only while open, so a reopened dialog starts blank. */}
      {open && (
        <div className="flex flex-col">
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
