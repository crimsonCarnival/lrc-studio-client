import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, FormEvent, MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Textarea } from '@ui/textarea';
import { Label } from '@ui/label';
import { Badge } from '@ui/badge';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { uploadsService } from '@/features/projects/services/uploads.service';
import { PRIMARY_GENRES } from '@features/editor/constants/genre-tags';
import { Switch } from '@/shared/ui/switch';

const EMPTY_TAGS: string[] = [];

interface SourceInfo {
  ytUrl?: string;
  cloudinary?: { title?: string; fileName?: string } | null;
  title?: string;
}

interface SourceInfoBadgeProps {
  sourceInfo?: SourceInfo | null;
  initialName: string;
  t: TFunction;
}

function SourceInfoBadge({ sourceInfo, initialName, t }: SourceInfoBadgeProps) {
  if (!sourceInfo) return null;
  const { ytUrl, cloudinary, title } = sourceInfo;

  let sourceIcon = <Icon name="music_note" size={16} />;
  let sourceLabel = t('setup.audioSource');
  let sourceValue = title || initialName;

  if (ytUrl) {
    sourceIcon = <svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 180"><path fill="red" d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134Z" /><path fill="#FFF" d="m102.421 128.06 66.328-38.418-66.328-38.418z" className="size-4 text-red-500" /></svg>;
    sourceLabel = t('setup.youtubeVideo');
    sourceValue = title || initialName || ytUrl;
  } else if (cloudinary) {
    sourceIcon = <Icon name="upload" size={16} className="text-blue-400" />;
    sourceLabel = t('setup.cloudUpload');
    sourceValue = cloudinary.title || cloudinary.fileName || title || initialName;
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/50 mb-2">
      <div className="size-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-700/60 shadow-sm">
        {sourceIcon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider leading-none mb-1">
          {sourceLabel}
        </p>
        <p className="text-sm font-medium text-zinc-200 truncate">
          {sourceValue}
        </p>
      </div>
    </div>
  );
}

interface ProjectSetupForm {
  name: string;
  description: string;
  tags: string[];
  tagInput: string;
  songName: string;
  songArtist: string;
  songAlbum: string;
  songYear: string;
  genre: string;
  coverImage: string;
  isPublic: boolean;
}

export interface ProjectSetupConfirm {
  name: string;
  title: string;
  description: string;
  tags: string[];
  songName: string;
  songArtist: string;
  songAlbum: string;
  songYear: string;
  genre: string;
  coverImage: string;
  isPublic: boolean;
}

interface ProjectSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ProjectSetupConfirm) => void;
  initialName?: string;
  initialDescription?: string;
  initialTags?: string[];
  initialSongName?: string;
  initialSongArtist?: string;
  initialSongAlbum?: string;
  initialSongYear?: string;
  initialGenre?: string;
  initialCoverImage?: string;
  initialIsPublic?: boolean;
  isEditing?: boolean;
  sourceInfo?: SourceInfo | null;
}

export default function ProjectSetupModal({
  isOpen,
  onClose,
  onConfirm,
  initialName = '',
  initialDescription = '',
  initialTags = EMPTY_TAGS,
  initialSongName = '',
  initialSongArtist = '',
  initialSongAlbum = '',
  initialSongYear = '',
  initialGenre = '',
  initialCoverImage = '',
  initialIsPublic = false,
  isEditing = false,
  sourceInfo = null,
}: ProjectSetupModalProps) {
  const { t } = useTranslation();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [imageUploading, setImageUploading] = useState(false);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProjectSetupForm>(() => ({
    name: initialName || '',
    description: initialDescription || '',
    tags: initialTags || [],
    tagInput: '',
    songName: initialSongName || '',
    songArtist: initialSongArtist || '',
    songAlbum: initialSongAlbum || '',
    songYear: initialSongYear || '',
    genre: initialGenre || '',
    coverImage: initialCoverImage || '',
    isPublic: initialIsPublic || false,
  }));

  // Sync form when the modal is opened or when the underlying data changes
  // (e.g. switching between projects without unmounting the component)
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: initialName || '',
        description: initialDescription || '',
        tags: initialTags || [],
        tagInput: '',
        songName: initialSongName || '',
        songArtist: initialSongArtist || '',
        songAlbum: initialSongAlbum || '',
        songYear: initialSongYear || '',
        genre: initialGenre || '',
        coverImage: initialCoverImage || '',
        isPublic: initialIsPublic || false,
      });
    }
  }, [isOpen, initialName, initialDescription, initialTags, initialSongName, initialSongArtist, initialSongAlbum, initialSongYear, initialGenre, initialCoverImage, initialIsPublic]);

  if (!isOpen) return null;

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !form.tags.includes(trimmed)) {
      setForm(f => ({ ...f, tags: [...f.tags, trimmed] }));
    }
  };

  const removeTag = (index: number) => {
    setForm(f => ({ ...f, tags: f.tags.filter((_, i) => i !== index) }));
  };

  const handleTagInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.includes(',')) {
      const parts = value.split(',');
      parts.slice(0, -1).forEach((p) => addTag(p));
      setForm(f => ({ ...f, tagInput: parts[parts.length - 1] }));
    } else {
      setForm(f => ({ ...f, tagInput: value }));
    }
  };

  const handleImageUpload = async (field: keyof ProjectSetupForm, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    setImageUploading(true);
    try {
      const token = executeRecaptcha ? await executeRecaptcha('upload_cover') : undefined;
      const url = await uploadsService.uploadCoverImage(file, token) as string;
      setForm(f => ({ ...f, [field]: url }));
    } catch { /* ignore */ }
    finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: FormEvent | ReactMouseEvent) => {
    e.preventDefault();
    const finalTags = form.tagInput.trim() ? [...form.tags, form.tagInput.trim()] : form.tags;
    onConfirm({
      name: form.name.trim(),
      title: form.name.trim(),
      description: form.description.trim(),
      tags: finalTags,
      songName: form.songName.trim(),
      songArtist: form.songArtist.trim(),
      songAlbum: form.songAlbum.trim(),
      songYear: form.songYear.trim(),
      genre: form.genre,
      coverImage: form.coverImage.trim(),
      isPublic: form.isPublic,
    });
  };


  const modalContent = (
    <>
      <button
        type="button"
        className="fixed inset-0 bg-black/60 z-modal-backdrop animate-fade-in cursor-default"
        onClick={onClose}
        aria-label={t('common.close') || 'Close'}
      />
      <div className="fixed inset-0 z-modal flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-elevated pointer-events-auto animate-fade-in max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Close */}
          <Tip content={t('common.close')}>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors z-10"
              aria-label={t('common.close')}
            >
              <Icon name="close" size={16} />
            </button>
          </Tip>

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-zinc-700/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg shadow-primary/20">
                <Icon name="auto_awesome" size={16} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100">
                {isEditing ? t('setup.settingsTitle') || 'Project Settings' : t('setup.title')}
              </h3>
            </div>
          </div>

          {/* Scrollable Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-thin p-6 pt-4 flex flex-col gap-5">
            <SourceInfoBadge sourceInfo={sourceInfo} initialName={initialName} t={t} />

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="project-name" className="text-xs font-semibold text-zinc-300">
                  {t('setup.projectName')}
                </Label>
                <Input
                  id="project-name"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t('project.titlePlaceholder')}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-primary/20"
                  required
                />
              </div>

              {/* Song Metadata Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="song-name" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t('setup.songName')}
                  </Label>
                  <Input
                    id="song-name"
                    value={form.songName}
                    onChange={(e) => setForm(f => ({ ...f, songName: e.target.value }))}
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm h-9"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="song-artist" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t('setup.songArtist')}
                  </Label>
                  <Input
                    id="song-artist"
                    value={form.songArtist}
                    onChange={(e) => setForm(f => ({ ...f, songArtist: e.target.value }))}
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="song-album" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t('setup.songAlbum')}
                  </Label>
                  <Input
                    id="song-album"
                    value={form.songAlbum}
                    onChange={(e) => setForm(f => ({ ...f, songAlbum: e.target.value }))}
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm h-9"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="song-year" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {t('setup.songYear')}
                  </Label>
                  <Input
                    id="song-year"
                    value={form.songYear}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      const currentYear = new Date().getFullYear();
                      if (val.length === 4 && parseInt(val) > currentYear) {
                        setForm(f => ({ ...f, songYear: currentYear.toString() }));
                      } else {
                        setForm(f => ({ ...f, songYear: val }));
                      }
                    }}
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm h-9"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="song-genre" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t('setup.songGenre')}
                </Label>
                <select
                  id="song-genre"
                  value={form.genre}
                  onChange={(e) => setForm(f => ({ ...f, genre: e.target.value }))}
                  className="h-9 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">—</option>
                  {PRIMARY_GENRES.map((g) => (
                    <option key={g} value={g}>{t(`setup.genre.${g}`)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t('project.description')}
                </Label>
                <Textarea
                  id="project-description"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={t('project.descriptionPlaceholder')}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-primary/20 min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-tags" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t('project.tags')}
                </Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                    {form.tags.map((tag, i) => (
                      <Badge key={tag} variant="secondary" className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 gap-1 pl-2 pr-1 h-6 transition-colors border-zinc-700/50">
                        <span className="text-[11px] font-medium">{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(i)}
                          className="p-0.5 hover:bg-zinc-600 rounded-full transition-colors"
                        >
                          <Icon name="close" size={12} />
                        </button>
                      </Badge>
                    ))}
                    <input
                      id="project-tags"
                      value={form.tagInput}
                      onChange={handleTagInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(form.tagInput);
                          setForm(f => ({ ...f, tagInput: '' }));
                        }
                      }}
                      placeholder={form.tags.length === 0 ? t('project.tagsPlaceholder') : ''}
                      className="flex-1 bg-transparent border-none text-xs text-zinc-200 focus:outline-none min-w-[120px] placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cover-image" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {t('setup.coverImage')}
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="cover-image"
                    value={form.coverImage}
                    onChange={(e) => setForm(f => ({ ...f, coverImage: e.target.value }))}
                    placeholder={t('setup.coverImagePlaceholder')}
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm h-9 placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => coverImageInputRef.current?.click()}
                    disabled={imageUploading}
                    className="shrink-0 size-9 flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-primary/50 transition-colors disabled:opacity-50"
                  >
                    {imageUploading ? (
                      <Icon name="progress_activity" size={16} className="animate-spin" />
                    ) : (
                      <Icon name="upload" size={16} />
                    )}
                  </button>
                  <input
                    type="file"
                    ref={coverImageInputRef}
                    accept="image/*"
                    onChange={(e) => handleImageUpload('coverImage', e)}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Privacy Setting */}
              <div className="flex flex-row items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    {form.isPublic ? <Icon name="language" size={14} className="text-zinc-400" /> : <Icon name="lock" size={14} className="text-zinc-400" />}
                    <span className="text-xs font-semibold text-zinc-300">
                      {form.isPublic ? t('project.visibilityPublic', 'Public Project') : t('project.visibilityPrivate', 'Private Project')}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {form.isPublic
                      ? t('project.publicDescription', 'Anyone can view this project on your profile.')
                      : t('project.privateDescription', 'Only you can view and edit this project.')}
                  </span>
                </div>
                <Switch
                  checked={form.isPublic}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, isPublic: checked }))}
                />
              </div>

            </div>
          </form>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-zinc-800/60 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 px-6 rounded-xl h-10"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!form.name.trim()}
              className="bg-primary hover:bg-primary-dim text-zinc-950 font-bold px-8 rounded-xl shadow-lg shadow-primary/10 transition-all h-10"
            >
              {isEditing ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
