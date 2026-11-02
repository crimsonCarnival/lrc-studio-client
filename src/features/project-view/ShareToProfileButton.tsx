import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
import { Textarea } from '@ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover';
import { projectsService } from '@/features/projects/services/projects.service.js';
import toast from 'react-hot-toast';
import { cn } from '@/shared/utils/utils';
import type { ProfileShareNote } from '@/types';

// Mirrors the server's normalizeShareNote, which rejects anything past these.
const DESCRIPTION_MAX = 500;
const TAGS_MAX = 10;
const TAG_MAX = 30;
const TAG_RE = /^[\p{L}\p{N}_-]+$/u;

/** A typed tag as the server will store it, or null when it can never be valid. */
function cleanTag(raw: string): string | null {
  const tag = raw.trim().replace(/^#+/, '');
  return tag && tag.length <= TAG_MAX && TAG_RE.test(tag) ? tag : null;
}

type ShareToProfileButtonProps = {
  publicId: string;
  /** Server state at load; the button owns it from then on. Null when not shared. */
  initialShare?: ProfileShareNote | null;
  initialCount?: number;
  /** Shared segment styles from the project action group. */
  className?: string;
  countClassName?: string;
};

/**
 * One segment of the project action group, carrying its own count (redesign sheet 17).
 * Opens a composer for an optional note and tags; on a project already shared the same
 * composer edits the note or takes the share back.
 */
export function ShareToProfileButton({ publicId, initialShare = null, initialCount = 0, className, countClassName }: ShareToProfileButtonProps) {
  const { t } = useTranslation();
  const [share, setShare] = useState<ProfileShareNote | null>(initialShare);
  const [count, setCount] = useState(initialCount);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  // On a project already shared: edit that share's note, or post it again.
  const [mode, setMode] = useState<'edit' | 'reshare'>('edit');
  const shared = share != null;

  const handleOpenChange = (next: boolean) => {
    // Every open starts from what is saved, so a cancelled edit leaves nothing behind.
    if (next) {
      setDescription(share?.description ?? '');
      setTags(share?.tags ?? []);
      setTagInput('');
      setMode('edit');
    }
    setOpen(next);
  };

  const addTag = (raw: string): boolean => {
    const tag = cleanTag(raw);
    if (!tag) return false;
    setTags((prev) => (prev.length >= TAGS_MAX || prev.some((x) => x.toLowerCase() === tag.toLowerCase()) ? prev : [...prev, tag]));
    return true;
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === ' ') && tagInput.trim()) {
      e.preventDefault();
      if (addTag(tagInput)) setTagInput('');
      else toast.error(t('projectView.shareTagInvalid'));
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (loading) return;
    // A tag still in the input counts as entered, so pressing Share does not drop it.
    const pending = tagInput.trim() ? cleanTag(tagInput) : null;
    if (tagInput.trim() && !pending) {
      toast.error(t('projectView.shareTagInvalid'));
      return;
    }
    const note = {
      description: description.trim(),
      tags: pending && tags.length < TAGS_MAX && !tags.some((x) => x.toLowerCase() === pending.toLowerCase()) ? [...tags, pending] : tags,
    };
    setLoading(true);
    try {
      const reshare = shared && mode === 'reshare';
      await projectsService.shareToProfile(publicId, { ...note, reshare });
      if (!shared) setCount((n) => n + 1);
      toast.success(t(!shared ? 'projectView.sharedToProfile' : reshare ? 'projectView.reshared' : 'projectView.shareUpdated'));
      setShare(note);
      setOpen(false);
    } catch {
      toast.error(t('projectView.shareToProfileFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await projectsService.unshareFromProfile(publicId);
      setShare(null);
      setCount((n) => Math.max(0, n - 1));
      toast.success(t('projectView.unsharedFromProfile'));
      setOpen(false);
    } catch {
      toast.error(t('projectView.unshareFromProfileFailed'));
    } finally {
      setLoading(false);
    }
  };

  // The visible label stays short to fit the segment group; the tooltip and the
  // accessible name say where the share goes.
  const label = shared ? t('projectView.editProfileShare') : t('projectView.shareToProfile');
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tip content={label}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-pressed={shared}
            aria-label={label}
            aria-busy={loading || undefined}
            className={cn(className, shared && 'bg-foam-soft text-foam-ink hover:bg-foam-soft', loading && 'cursor-progress')}
          >
            {loading
              ? <span className="eq-bars" aria-hidden="true"><i /><i /><i /></span>
              : <Icon name="ios_share" size={17} />}
            {shared ? t('projectView.sharedShort') : t('projectView.shareShort')}
            <span className={cn(countClassName, shared && 'text-foam-ink')}>{count}</span>
          </button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="start" className="flex flex-col gap-3 p-3 lg:min-w-80">
        <p className="text-sm font-semibold text-foreground">{t('projectView.shareComposerTitle')}</p>
        {shared && (
          <div role="radiogroup" aria-label={t('projectView.shareModeLabel')} className="grid grid-cols-2 gap-1 rounded-lg bg-raised/60 p-0.5">
            {(['edit', 'reshare'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex h-9 coarse:h-11 items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors',
                  mode === m ? 'bg-primary/20 text-primary' : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                <Icon name={m === 'edit' ? 'edit' : 'repeat'} size={14} />
                {m === 'edit' ? t('projectView.shareModeEdit') : t('projectView.shareModeReshare')}
              </button>
            ))}
          </div>
        )}
        {shared && (
          <p className="-mt-1 text-[11px] text-subtle">
            {mode === 'edit' ? t('projectView.shareModeEditHint') : t('projectView.shareModeReshareHint')}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor={`share-desc-${publicId}`} className="text-xs text-muted-foreground">
            {t('projectView.shareDescriptionLabel')}
          </label>
          <Textarea
            id={`share-desc-${publicId}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={3}
            placeholder={t('projectView.shareDescriptionPlaceholder')}
            className="resize-none text-sm"
          />
          <span className="self-end font-mono text-[11px] tabular-nums text-subtle">
            {description.length}/{DESCRIPTION_MAX}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`share-tags-${publicId}`} className="text-xs text-muted-foreground">
            {t('projectView.shareTagsLabel')}
          </label>
          <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-raised/50 px-2.5 py-1.5">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary-ink">
                #{tag}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((x) => x !== tag))}
                  aria-label={t('projectView.shareTagRemove', { tag })}
                  className="grid place-items-center rounded-full coarse:size-6"
                >
                  <Icon name="close" size={12} />
                </button>
              </span>
            ))}
            {tags.length < TAGS_MAX && (
              <input
                id={`share-tags-${publicId}`}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                maxLength={TAG_MAX + 1}
                placeholder={tags.length === 0 ? t('projectView.shareTagsPlaceholder') : ''}
                className="min-w-[80px] flex-1 bg-transparent text-sm text-foreground outline-none"
              />
            )}
          </div>
          <span className="text-[11px] text-subtle">{t('projectView.shareTagsHint', { max: TAGS_MAX })}</span>
        </div>

        <div className="flex items-center gap-2">
          {shared && (
            <Button type="button" variant="ghost" size="sm" onClick={handleUnshare} disabled={loading} className="mr-auto text-destructive">
              {t('projectView.removeFromProfile')}
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className={shared ? undefined : 'ml-auto'}>
            {t('common.cancel')}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={loading}>
            {!shared ? t('projectView.shareConfirm') : mode === 'reshare' ? t('projectView.shareModeReshare') : t('common.save')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
