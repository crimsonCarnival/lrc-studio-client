import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Upload as UploadIcon, Loader2 } from 'lucide-react';
import { Button } from '@ui/button';
import { createPlaylist, updatePlaylist, addProjectToPlaylist, removeProjectFromPlaylist } from './playlist.service';
import { gqlRequest } from '@/app/graphql.client';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { uploadsService } from '@/features/projects/services/uploads.service';

const GET_MY_PROJECTS = /* GraphQL */ `
  query GetMyProjects {
    projects {
      id publicId title
      metadata { songName songArtist }
    }
  }
`;

const SORT_OPTIONS = ['DATE_ADDED', 'STARS', 'ALPHABETICAL', 'MANUAL'];

interface ModalProject {
  id: string;
  publicId?: string;
  title?: string;
  metadata?: { songName?: string; songArtist?: string };
}

interface PlaylistInput {
  name?: string;
  description?: string;
  coverImage?: string | null;
  tags?: string[];
  isPublic?: boolean;
  sortMode?: string;
  projects?: { publicId?: string; id?: string }[];
  id?: string;
}

interface FormShape {
  name: string;
  description: string;
  coverImage: string;
  tags: string[];
  isPublic: boolean;
  sortMode: string;
}

interface PlaylistModalProps {
  playlist?: PlaylistInput | null;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (result: any) => void;
}

export function PlaylistModal({ playlist, onClose, onSave }: PlaylistModalProps) {
  const { t } = useTranslation();
  // sortMode keys are dynamic.
  const tk = t as (key: string) => string;
  const { executeRecaptcha } = useGoogleReCaptcha();
  const isEdit = !!playlist;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [myProjects, setMyProjects] = useState<ModalProject[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => playlist?.projects?.map(p => (p.publicId ?? p.id)!) ?? []
  );
  const [projectSearch, setProjectSearch] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const [form, setForm] = useState<FormShape>({
    name: playlist?.name ?? '',
    description: playlist?.description ?? '',
    coverImage: playlist?.coverImage ?? '',
    tags: playlist?.tags ?? [],
    isPublic: playlist?.isPublic ?? true,
    sortMode: playlist?.sortMode ?? 'DATE_ADDED',
  });

  useEffect(() => {
    gqlRequest(GET_MY_PROJECTS)
      .then((d) => setMyProjects((d as { projects?: ModalProject[] })?.projects ?? []))
      .catch(() => { /* ignore */ });
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
      const token = executeRecaptcha ? await executeRecaptcha('upload_cover') : undefined;
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
      if (form.tags.length < 10 && !form.tags.includes(tag)) {
        setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      }
      setTagInput('');
    }
  }

  function removeTag(tag: string) {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(x => x !== tag) }));
  }

  async function toggleProject(id: string) {
    if (!isEdit) {
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
      return;
    }
    if (togglingIds.has(id)) return;
    const isSelected = selectedIds.includes(id);
    setTogglingIds(prev => new Set([...prev, id]));
    setSelectedIds(prev =>
      isSelected ? prev.filter(x => x !== id) : [...prev, id]
    );
    try {
      const result = isSelected
        ? await removeProjectFromPlaylist(playlist!.id!, id)
        : await addProjectToPlaylist(playlist!.id!, id);
      if (result && onSave) onSave(result);
    } catch {
      setSelectedIds(prev =>
        isSelected ? [...prev, id] : prev.filter(x => x !== id)
      );
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const input = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        coverImage: form.coverImage.trim() || undefined,
        tags: form.tags,
        isPublic: form.isPublic,
        sortMode: form.sortMode,
        ...(!isEdit && { publicIds: selectedIds }),
      };
      const result = isEdit
        ? await updatePlaylist(playlist!.id!, input as Parameters<typeof updatePlaylist>[1])
        : await createPlaylist(input as Parameters<typeof createPlaylist>[0]);
      onSave(result);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const filteredProjects = myProjects.filter(p => {
    const q = projectSearch.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.metadata?.songName?.toLowerCase().includes(q) ||
      p.metadata?.songArtist?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
          <h2 className="text-base font-semibold">
            {isEdit ? t('playlists.modal.titleEdit') : t('playlists.modal.titleCreate')}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* Step indicator (create only) */}
        {!isEdit && (
          <div className="flex gap-2 px-6 pt-4">
            {[1, 2].map(s => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 h-1 rounded-full transition-colors ${step === s ? 'bg-primary' : 'bg-border'}`}
              />
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-4">
          {(isEdit || step === 1) && (
            <>
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t('playlists.modal.name')}</label>
                <input
                  type="text"
                  value={form.name}
                  maxLength={100}
                  onChange={e => handleField('name', e.target.value)}
                  placeholder={t('playlists.modal.namePlaceholder')}
                  className="bg-zinc-800/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t('playlists.modal.description')}</label>
                <textarea
                  value={form.description}
                  maxLength={500}
                  onChange={e => handleField('description', e.target.value)}
                  placeholder={t('playlists.modal.descriptionPlaceholder')}
                  rows={3}
                  className="bg-zinc-800/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 resize-none"
                />
              </div>

              {/* Cover image URL + upload */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t('playlists.modal.coverImage')}</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={form.coverImage}
                    onChange={e => handleField('coverImage', e.target.value)}
                    placeholder={t('playlists.modal.coverImagePlaceholder')}
                    className="flex-1 bg-zinc-800/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={imageUploading}
                    className="shrink-0 size-9 flex items-center justify-center rounded-lg border border-border bg-zinc-800/50 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
                  >
                    {imageUploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <UploadIcon className="size-4" />
                    )}
                  </button>
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    onChange={handleImageFile}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t('playlists.modal.tags')}</label>
                <div className="flex flex-wrap gap-1.5 bg-zinc-800/50 border border-border rounded-lg px-3 py-2 min-h-[40px]">
                  {form.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {tag}
                      <button onClick={() => removeTag(tag)}><X className="size-3" /></button>
                    </span>
                  ))}
                  {form.tags.length < 10 && (
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={addTag}
                      placeholder={form.tags.length === 0 ? t('playlists.modal.tagsPlaceholder') : ''}
                      className="flex-1 min-w-[80px] bg-transparent text-sm text-foreground outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Visibility + Sort */}
              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-muted-foreground">{t('playlists.modal.visibility')}</label>
                  <select
                    value={form.isPublic ? 'public' : 'private'}
                    onChange={e => handleField('isPublic', e.target.value === 'public')}
                    className="bg-zinc-800/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
                  >
                    <option value="public">{t('playlists.public')}</option>
                    <option value="private">{t('playlists.private')}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs text-muted-foreground">{t('playlists.modal.sortMode')}</label>
                  <select
                    value={form.sortMode}
                    onChange={e => handleField('sortMode', e.target.value)}
                    className="bg-zinc-800/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
                  >
                    {SORT_OPTIONS.map(m => (
                      <option key={m} value={m}>{tk(`playlists.sortMode.${m}`)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Project picker */}
          {(step === 2 || isEdit) && (
            <>
              <p className="text-xs text-muted-foreground">{t('playlists.modal.projects')}</p>
              <input
                type="text"
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                placeholder={t('playlists.modal.projectSearch')}
                className="bg-zinc-800/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
              />
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                {filteredProjects.map(p => {
                  const selected = selectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProject(p.id)}
                      disabled={togglingIds.has(p.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${selected ? 'bg-primary/10' : 'hover:bg-white/5'}`}
                    >
                      <span className={`size-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-primary border-primary' : 'border-border'}`}>
                        {selected && <Check className="size-3 text-zinc-950" />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-sm text-foreground line-clamp-1">{p.title || t('playlists.modal.untitled')}</span>
                        {(p.metadata?.songName || p.metadata?.songArtist) && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {[p.metadata.songName, p.metadata.songArtist].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-6 pt-0 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t('playlists.modal.cancel')}
          </Button>
          {!isEdit && step === 1 ? (
            <Button onClick={() => setStep(2)} className="flex-1">
              {t('common.next')}
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1">
              {isEdit ? t('playlists.modal.save') : t('playlists.modal.create')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
