import { useState, useEffect, useRef, useId, useMemo } from 'react';
import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/shared/hooks/useScrollLock';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Textarea } from '@ui/textarea';
import { Spinner } from '@ui/skeleton';
import { createPlaylist, updatePlaylist, addProjectToPlaylist, removeProjectFromPlaylist } from './playlist.service';
import { gqlRequest } from '@/app/graphql.client';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { uploadsService } from '@/features/projects/services/uploads.service';
import { executeRecaptchaSafe } from '@/app/recaptcha-arm';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { cn } from '@/shared/utils/utils';
import { Tip } from '@ui/tip';
import { PlaylistCover } from './PlaylistCover';
import { formatTrackLength, totalDurationSeconds } from './playlist-stats';
import type { Playlist, PlaylistSortMode } from '@/types';

const GET_MY_PROJECTS = /* GraphQL */ `
  query GetMyProjects {
    projects {
      id publicId title public hasWordSync coverImage
      metadata { songName songArtist }
      upload { source uploadUrl coverImage duration }
    }
  }
`;

const SORT_OPTIONS = ['MANUAL', 'DATE_ADDED', 'STARS', 'ALPHABETICAL'] as const satisfies readonly PlaylistSortMode[];
const FILTERS = ['all', 'selected', 'word', 'public'] as const;
type Filter = (typeof FILTERS)[number];

const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;
const TAGS_MAX = 10;

type ModalProject = {
  id: string;
  publicId: string;
  title?: string | null;
  public?: boolean | null;
  hasWordSync?: boolean | null;
  coverImage?: string | null;
  metadata?: { songName?: string | null; songArtist?: string | null } | null;
  upload?: { source?: string | null; uploadUrl?: string | null; coverImage?: string | null; duration?: number | null } | null;
};

/** The slice of a playlist the modal edits. Projects are matched by publicId, the id every playlist mutation takes. */
export type PlaylistModalInput = {
  id?: string;
  name?: string | null;
  description?: string | null;
  coverImage?: string | null;
  tags?: readonly string[] | null;
  isPublic?: boolean | null;
  listed?: boolean | null;
  sortMode?: PlaylistSortMode | null;
  projects?: ReadonlyArray<{ publicId?: string | null }> | null;
};

type FormShape = {
  name: string;
  description: string;
  coverImage: string;
  tags: string[];
  isPublic: boolean;
  /** Only meaningful while public: false = unlisted. */
  listed: boolean;
  sortMode: PlaylistSortMode;
};

type Visibility = 'public' | 'unlisted' | 'private';
const VISIBILITIES: readonly Visibility[] = ['public', 'unlisted', 'private'];
const visibilityOf = (f: Pick<FormShape, 'isPublic' | 'listed'>): Visibility => (!f.isPublic ? 'private' : f.listed ? 'public' : 'unlisted');

type PlaylistModalProps = {
  playlist?: PlaylistModalInput | null;
  onClose: () => void;
  /** The final create / save. Callers close the modal here. */
  onSave: (result: Playlist) => void;
  /**
   * Edit mode only: a project was added or removed (each toggle is its own
   * mutation). Must not close the modal — the user is still picking.
   */
  onProjectsChange?: (result: Playlist) => void;
};

// The field look of the shared Textarea (redesign sheet 05), for the single-line inputs.
const FIELD = 'h-11 lg:h-11 px-3.5 lg:px-3.5 text-[15px] lg:text-[15px] rounded-[var(--radius-control)] border-0 bg-card text-foreground inset-ring inset-ring-hl hover:inset-ring-faint focus-visible:ring-0 focus-visible:inset-ring-2 focus-visible:inset-ring-primary placeholder:text-faint';

function FieldLabel({ htmlFor, label, extra, counter }: { htmlFor?: string; label: ReactNode; extra?: ReactNode; counter?: ReactNode }) {
  return (
    <span className="flex items-baseline justify-between gap-2 text-xs font-semibold text-muted-foreground">
      <label htmlFor={htmlFor}>
        {label}
        {extra && <span className="ml-1 font-normal text-faint">{extra}</span>}
      </label>
      {counter != null && <span className="font-mono font-normal text-faint tabular-nums">{counter}</span>}
    </span>
  );
}

export function PlaylistModal({ playlist, onClose, onSave, onProjectsChange }: PlaylistModalProps) {
  const { t } = useTranslation();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const isEdit = !!playlist;
  const uid = useId();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [myProjects, setMyProjects] = useState<ModalProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  // Selection order matters: a new list is created with its projects in this order.
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => (playlist?.projects ?? []).flatMap(p => (p.publicId ? [p.publicId] : [])),
  );
  const [projectSearch, setProjectSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [tagInput, setTagInput] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  useScrollLock(true);

  const [form, setForm] = useState<FormShape>({
    name: playlist?.name ?? '',
    description: playlist?.description ?? '',
    coverImage: playlist?.coverImage ?? '',
    tags: [...(playlist?.tags ?? [])],
    isPublic: playlist?.isPublic ?? true,
    listed: playlist?.listed ?? true,
    sortMode: playlist?.sortMode ?? 'DATE_ADDED',
  });

  useEffect(() => {
    gqlRequest<{ projects?: ModalProject[] | null }>(GET_MY_PROJECTS)
      .then((d) => setMyProjects(d?.projects ?? []))
      .catch(() => { /* the picker shows its empty state */ })
      .finally(() => setProjectsLoading(false));
  }, []);

  // Escape closes, wherever focus is inside the page.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function handleField<K extends keyof FormShape>(key: K, value: FormShape[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleImageFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    setImageUploading(true);
    try {
      const token = await executeRecaptchaSafe(executeRecaptcha, 'upload_cover');
      const url = await uploadsService.uploadCoverImage(file, token);
      handleField('coverImage', url);
    } catch { /* ignore */ }
    finally {
      setImageUploading(false);
      e.target.value = '';
    }
  }

  function addTag(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().slice(0, 30);
      if (form.tags.length < TAGS_MAX && !form.tags.includes(tag)) {
        setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      }
      setTagInput('');
    }
  }

  function removeTag(tag: string) {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(x => x !== tag) }));
  }

  async function toggleProject(publicId: string) {
    if (!isEdit) {
      setSelectedIds(prev =>
        prev.includes(publicId) ? prev.filter(x => x !== publicId) : [...prev, publicId]
      );
      return;
    }
    if (togglingIds.has(publicId) || !playlist?.id) return;
    const isSelected = selectedIds.includes(publicId);
    setTogglingIds(prev => new Set([...prev, publicId]));
    setSelectedIds(prev =>
      isSelected ? prev.filter(x => x !== publicId) : [...prev, publicId]
    );
    try {
      const result = isSelected
        ? await removeProjectFromPlaylist(playlist.id, publicId)
        : await addProjectToPlaylist(playlist.id, publicId);
      if (result) onProjectsChange?.(result);
    } catch {
      setSelectedIds(prev =>
        isSelected ? [...prev, publicId] : prev.filter(x => x !== publicId)
      );
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(publicId);
        return next;
      });
    }
  }

  async function handleSave(withProjects = true) {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const base = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        coverImage: form.coverImage.trim() || undefined,
        tags: form.tags,
        isPublic: form.isPublic,
        // Sent only when unlisted, so a plain public or private list is the same request as ever.
        ...(form.isPublic && !form.listed ? { listed: false } : {}),
        sortMode: form.sortMode,
      };
      const result = isEdit && playlist?.id
        ? await updatePlaylist(playlist.id, base)
        : await createPlaylist({ ...base, publicIds: withProjects ? selectedIds : [] });
      if (result) onSave(result);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const projectsById = useMemo(() => new Map(myProjects.map(p => [p.publicId, p])), [myProjects]);
  const selectedProjects = useMemo(
    () => selectedIds.flatMap(id => { const p = projectsById.get(id); return p ? [p] : []; }),
    [selectedIds, projectsById],
  );
  const selectedSeconds = totalDurationSeconds(selectedProjects);
  const selectedPrivate = selectedProjects.filter(p => p.public !== true).length;

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    return myProjects.filter(p => {
      if (filter === 'selected' && !selectedIds.includes(p.publicId)) return false;
      if (filter === 'word' && p.hasWordSync !== true) return false;
      if (filter === 'public' && p.public !== true) return false;
      if (!q) return true;
      return (
        !!p.title?.toLowerCase().includes(q) ||
        !!p.metadata?.songName?.toLowerCase().includes(q) ||
        !!p.metadata?.songArtist?.toLowerCase().includes(q)
      );
    });
  }, [myProjects, filter, selectedIds, projectSearch]);

  const nameOk = form.name.trim().length > 0;
  const n = selectedIds.length;
  const title = isEdit
    ? t('playlists.modal.titleEdit')
    : step === 2 && nameOk
      ? t('playlists.modal.addTo', { name: form.name.trim() })
      : t('playlists.modal.titleCreate');

  // ── Pieces ────────────────────────────────────────────────────

  const stepper = !isEdit && (
    <ol aria-label={t('playlists.modal.steps')} className="flex gap-4 text-[13px]">
      {([1, 2] as const).map((s) => {
        const label = s === 1 ? t('playlists.modal.stepDetails') : t('playlists.modal.stepProjects');
        const current = step === s;
        const done = s < step;
        const dot = (
          <span
            className={cn(
              'inline-flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px]',
              current && 'bg-primary text-primary-foreground',
              done && 'bg-primary/20 text-primary',
              !current && !done && 'border border-border',
            )}
            aria-hidden
          >
            {done ? <Icon name="check" size={12} /> : s}
          </span>
        );
        return (
          <li
            key={s}
            aria-current={current ? 'step' : undefined}
            className={cn('flex items-center gap-1.5', current ? 'text-foreground' : done ? 'text-muted-foreground' : 'text-faint')}
          >
            {done ? (
              <button type="button" onClick={() => setStep(s)} className="flex items-center gap-1.5 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                {dot}{label}<span className="sr-only"> ({t('playlists.modal.stepDone')})</span>
              </button>
            ) : (
              <>{dot}{label}</>
            )}
          </li>
        );
      })}
    </ol>
  );

  const coverTile = (
    <div className="flex flex-col gap-2 w-28 sm:w-37 shrink-0">
      <button
        type="button"
        onClick={() => imageInputRef.current?.click()}
        disabled={imageUploading}
        aria-label={form.coverImage ? t('playlists.modal.changeCover') : t('playlists.modal.uploadCover')}
        className="group relative size-28 sm:size-37 rounded-xl border border-dashed border-border bg-card overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <PlaylistCover
          playlist={{ coverImage: form.coverImage.trim() || null, projects: selectedProjects }}
          className="absolute inset-0 size-full opacity-60"
          iconSize={32}
        />
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/60 text-xs font-medium text-foreground opacity-100 transition-opacity group-hover:bg-background/70">
          {imageUploading ? <Spinner size={20} /> : <Icon name="upload" size={22} />}
          {form.coverImage ? t('playlists.modal.changeCover') : t('playlists.modal.uploadCover')}
        </span>
      </button>
      <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageFile} className="hidden" />
      <span className="text-[11px] leading-snug text-faint">
        {!form.coverImage && <>{t('playlists.modal.coverHint')} </>}
        <button
          type="button"
          onClick={() => setShowUrl(v => !v)}
          aria-expanded={showUrl}
          className="text-primary hover:text-foreground underline-offset-2 hover:underline"
        >
          {showUrl ? t('playlists.modal.hideUrl') : t('playlists.modal.pasteUrl')}
        </button>
        {form.coverImage && (
          <>
            {' · '}
            <button type="button" onClick={() => handleField('coverImage', '')} className="text-primary hover:text-foreground underline-offset-2 hover:underline">
              {t('playlists.modal.removeCover')}
            </button>
          </>
        )}
      </span>
    </div>
  );

  const details = (
    <>
      <div className="flex gap-4 sm:gap-5">
        {coverTile}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`${uid}-name`} label={t('playlists.modal.name')} counter={`${form.name.length}/${NAME_MAX}`} />
            <Input
              id={`${uid}-name`}
              value={form.name}
              maxLength={NAME_MAX}
              onChange={e => handleField('name', e.target.value)}
              className={FIELD}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel
              htmlFor={`${uid}-desc`}
              label={t('playlists.modal.description')}
              extra={t('playlists.modal.optional')}
              counter={`${form.description.length}/${DESCRIPTION_MAX}`}
            />
            <Textarea
              id={`${uid}-desc`}
              value={form.description}
              maxLength={DESCRIPTION_MAX}
              rows={3}
              onChange={e => handleField('description', e.target.value)}
              className="min-h-[88px] lg:min-h-[88px] px-3.5 py-3 lg:px-3.5 lg:py-3 text-[15px] lg:text-[15px] md:text-[15px] font-normal resize-none"
            />
          </div>
        </div>
      </div>

      {showUrl && (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={`${uid}-cover`} label={t('playlists.modal.coverImage')} />
          <Input
            id={`${uid}-cover`}
            type="url"
            value={form.coverImage}
            placeholder={t('playlists.modal.coverImagePlaceholder')}
            onChange={e => handleField('coverImage', e.target.value)}
            className={FIELD}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={`${uid}-tag`} label={t('playlists.modal.tags')} counter={t('playlists.modal.tagsHint', { count: form.tags.length })} />
        <div className="flex flex-wrap items-center gap-1.5 min-h-11 rounded-[var(--radius-control)] bg-card inset-ring inset-ring-hl px-2.5 py-2 focus-within:inset-ring-2 focus-within:inset-ring-primary">
          {form.tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 text-[13px] pl-2.5 pr-1.5 py-0.5 rounded-pill bg-primary/15 text-primary">
              {tag}
              <Tip content={t('common.actions.removeTag')}>
                <button type="button" aria-label={`${t('common.actions.removeTag')}: ${tag}`} onClick={() => removeTag(tag)} className="flex p-0.5 rounded-full hover:bg-primary/20">
                  <Icon name="close" size={12} />
                </button>
              </Tip>
            </span>
          ))}
          {form.tags.length < TAGS_MAX && (
            <input
              id={`${uid}-tag`}
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder={t('playlists.modal.tagsPlaceholder')}
              className="flex-1 min-w-[100px] bg-transparent text-sm text-foreground placeholder:text-faint outline-none"
            />
          )}
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold text-muted-foreground">{t('playlists.modal.visibilityLegend')}</legend>
        <div className="flex flex-col sm:flex-row gap-2.5">
          {VISIBILITIES.map((visibility) => {
            const on = visibilityOf(form) === visibility;
            return (
              <label
                key={visibility}
                className={cn(
                  'flex-1 flex items-start gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50',
                  on ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/40',
                )}
              >
                <input
                  type="radio"
                  name={`${uid}-visibility`}
                  checked={on}
                  onChange={() => setForm((f) => ({ ...f, isPublic: visibility !== 'private', listed: visibility !== 'unlisted' }))}
                  className="sr-only"
                />
                <span aria-hidden className={cn('mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2', on ? 'border-primary' : 'border-border')}>
                  {on && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">{t(`playlists.${visibility}`)}</span>
                  <span className="text-xs text-muted-foreground">{t(`playlists.modal.${visibility}Hint`)}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <span id={`${uid}-order`} className="text-xs font-semibold text-muted-foreground">{t('playlists.modal.defaultOrder')}</span>
        <div role="group" aria-labelledby={`${uid}-order`} aria-describedby={`${uid}-order-hint`} className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map(m => {
            const on = form.sortMode === m;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => handleField('sortMode', m)}
                className={cn(
                  'h-9 px-3 rounded-pill border text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {t(`playlists.sortMode.${m}`)}
              </button>
            );
          })}
        </div>
        <span id={`${uid}-order-hint`} className="text-xs text-faint">{t(`playlists.modal.sortHint.${form.sortMode}`)}</span>
      </div>
    </>
  );

  const pickerControls = (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2.5 h-11 px-3.5 rounded-[var(--radius-control)] bg-card inset-ring inset-ring-hl text-faint focus-within:inset-ring-2 focus-within:inset-ring-primary">
        <Icon name="search" size={18} />
        <input
          type="search"
          value={projectSearch}
          onChange={e => setProjectSearch(e.target.value)}
          placeholder={t('playlists.modal.searchPlaceholder')}
          aria-label={t('playlists.modal.searchLabel')}
          className="w-full bg-transparent text-[15px] text-foreground placeholder:text-faint outline-none"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t('playlists.modal.filtersLabel')} className="flex flex-wrap gap-2">
          {FILTERS.map(f => {
            const on = filter === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f)}
                className={cn(
                  'h-8 px-3 rounded-pill border text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  on ? 'border-faint bg-accent text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {f === 'selected' ? t('playlists.modal.filter.selected', { count: n }) : t(`playlists.modal.filter.${f}`)}
              </button>
            );
          })}
        </div>
        <span className="ml-auto font-mono text-xs text-faint" aria-live="polite">
          {t('playlists.modal.projectCount', { count: filteredProjects.length })}
        </span>
      </div>
    </div>
  );

  const projectRows = (
    <>
      {projectsLoading ? (
        <div className="flex justify-center py-8"><Spinner size={22} className="text-primary" /></div>
      ) : filteredProjects.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {myProjects.length === 0 ? t('playlists.modal.noProjects') : t('playlists.modal.noMatches')}
        </p>
      ) : (
        filteredProjects.map(p => {
          const pos = selectedIds.indexOf(p.publicId);
          const selected = pos !== -1;
          const cover = resolveCoverImage(p) as string | null;
          const length = formatTrackLength(p.upload?.duration);
          const sub = [p.metadata?.songName, p.metadata?.songArtist].filter(Boolean).join(' · ');
          return (
            <button
              key={p.publicId}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleProject(p.publicId)}
              disabled={togglingIds.has(p.publicId)}
              className={cn(
                'grid grid-cols-[1.5rem_2.75rem_minmax(0,1fr)_auto] sm:grid-cols-[1.5rem_2.75rem_minmax(0,1fr)_auto_3rem] items-center gap-3 px-2.5 py-2 rounded-xl border text-left transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                selected ? 'border-primary/30 bg-primary/10' : 'border-transparent hover:bg-accent/40',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-6 items-center justify-center rounded-md border-[1.5px] font-mono text-[11px] font-semibold',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-faint',
                )}
              >
                {selected && (isEdit ? <Icon name="check" size={14} /> : pos + 1)}
              </span>
              <span className="size-11 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {cover
                  ? <img src={cover} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
                  : <Icon name="music_note" size={16} className="text-muted-foreground" />}
              </span>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span className="truncate">{p.title || t('playlists.modal.untitled')}</span>
                  {p.public !== true && (
                    <>
                      <Icon name="lock" size={12} className="shrink-0 text-muted-foreground" />
                      <span className="sr-only">{t('playlists.modal.privateProject')}</span>
                    </>
                  )}
                </span>
                {sub && <span className="truncate text-xs text-muted-foreground">{sub}</span>}
              </span>
              <span className={cn(
                'px-2 py-0.5 rounded-pill border text-[11px] font-medium whitespace-nowrap',
                p.hasWordSync ? 'border-foam/40 text-foam' : 'border-border text-muted-foreground',
              )}>
                {p.hasWordSync ? t('playlists.detail.wordSync') : t('playlists.detail.lineSync')}
              </span>
              <span className="max-sm:hidden text-right font-mono text-xs text-muted-foreground">{length ?? '—'}</span>
            </button>
          );
        })
      )}
    </>
  );

  const runtime = formatTrackLength(selectedSeconds);
  const summary = (
    <div className="flex items-center gap-3">
      <span className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground">
          {t('playlists.modal.selected', { count: n })}
          {runtime && <span className="font-mono font-normal text-muted-foreground"> · {runtime}</span>}
        </span>
        <span className="text-xs text-faint">
          {selectedPrivate > 0 && <>{t('playlists.modal.privateNote', { count: selectedPrivate })} </>}
          {!isEdit && t('playlists.modal.orderNote')}
        </span>
      </span>
      {!isEdit && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([])} disabled={n === 0}>
          {t('playlists.modal.clear')}
        </Button>
      )}
    </div>
  );

  // ── Layout ────────────────────────────────────────────────────

  const pickerStep = !isEdit && step === 2;

  // Portalled: the profile column animates `transform` with fill-mode `forwards`,
  // which makes it the containing block for `position: fixed` descendants, so an
  // inline overlay covered that column instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        className={cn(
          'w-full max-w-[600px] flex flex-col rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden',
          pickerStep || isEdit ? 'h-[min(820px,90dvh)]' : 'max-h-[90dvh]',
        )}
      >
        <header className="flex items-center gap-4 px-5 sm:px-6 py-5 border-b border-border">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <h2 id={`${uid}-title`} className="font-heading text-xl font-semibold text-foreground truncate">{title}</h2>
            {stepper}
          </div>
          <Tip content={t('common.close')}>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('common.close')} className="size-10 lg:size-10 text-muted-foreground">
              <Icon name="close" size={20} />
            </Button>
          </Tip>
        </header>

        {pickerStep ? (
          <>
            <div className="px-5 sm:px-6 pt-4 pb-2.5">{pickerControls}</div>
            <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-3.5 pb-2 flex flex-col gap-0.5">{projectRows}</div>
            <div className="px-5 sm:px-6 py-3 border-t border-border">{summary}</div>
          </>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 flex flex-col gap-5">
            {details}
            {isEdit && (
              <section className="flex flex-col gap-3 pt-2 border-t border-border">
                <h3 className="pt-3 text-xs font-semibold text-muted-foreground">{t('playlists.modal.projects')}</h3>
                {pickerControls}
                <div className="flex flex-col gap-0.5 -mx-2.5">{projectRows}</div>
                {summary}
              </section>
            )}
          </div>
        )}

        <footer className="flex flex-wrap items-center gap-2.5 px-5 sm:px-6 py-4 border-t border-border bg-card/60">
          {isEdit ? (
            <>
              <Button variant="ghost" onClick={onClose}>{t('playlists.modal.cancel')}</Button>
              <div className="flex-1" />
              <Button onClick={() => handleSave()} disabled={saving || !nameOk} loading={saving}>
                {t('playlists.modal.save')}
              </Button>
            </>
          ) : step === 1 ? (
            <>
              <Button variant="ghost" onClick={onClose}>{t('playlists.modal.cancel')}</Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || !nameOk}>
                {t('playlists.modal.createEmpty')}
              </Button>
              <Button onClick={() => setStep(2)} disabled={!nameOk} className="gap-1.5">
                {t('playlists.modal.addProjects')}
                <Icon name="arrow_forward" size={16} />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-1.5">
                <Icon name="arrow_back" size={16} />
                {t('playlists.modal.back')}
              </Button>
              <div className="flex-1" />
              <Button onClick={() => handleSave()} disabled={saving || !nameOk} loading={saving}>
                {n > 0 ? t('playlists.modal.createWith', { count: n }) : t('playlists.modal.createEmptyList')}
              </Button>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
