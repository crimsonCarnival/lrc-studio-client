import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Textarea } from '@ui/textarea';
import { Label } from '@ui/label';
import { Badge } from '@ui/badge';
import { X, Sparkles, Image as ImageIcon, Upload, Loader2, Video, Music2 } from 'lucide-react';
import { Tip } from '@ui/tip';

const EMPTY_TAGS = [];

function SourceInfoBadge({ sourceInfo, initialName, t }) {
  if (!sourceInfo) return null;
  const { ytUrl, cloudinary, spotifyId, title } = sourceInfo;

  let sourceIcon = <Music2 className="size-4" />;
  let sourceLabel = t('setup.audioSource');
  let sourceValue = title || initialName;

  if (ytUrl) {
    sourceIcon = <Video className="size-4 text-red-500" />;
    sourceLabel = t('setup.youtubeVideo');
    sourceValue = title || initialName || ytUrl;
  } else if (spotifyId) {
    sourceIcon = <Music2 className="size-4 text-primary" />;
    sourceLabel = t('setup.spotifyTrack');
    sourceValue = title || initialName || spotifyId;
  } else if (cloudinary) {
    sourceIcon = <Upload className="size-4 text-blue-400" />;
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
  isEditing = false,
  sourceInfo = null
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    description: '',
    tags: [],
    tagInput: '',
    songName: '',
    songArtist: '',
    songAlbum: '',
    songYear: ''
  });

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setForm({
        name: initialName || '',
        description: initialDescription || '',
        tags: initialTags || [],
        tagInput: '',
        songName: initialSongName || '',
        songArtist: initialSongArtist || '',
        songAlbum: initialSongAlbum || '',
        songYear: initialSongYear || ''
      });
    }
  }

  if (!isOpen) return null;

  const addTag = (text) => {
    const trimmed = text.trim();
    if (trimmed && !form.tags.includes(trimmed)) {
      setForm(f => ({ ...f, tags: [...f.tags, trimmed] }));
    }
  };

  const removeTag = (index) => {
    setForm(f => ({ ...f, tags: f.tags.filter((_, i) => i !== index) }));
  };

  const handleTagInputChange = (e) => {
    const value = e.target.value;
    if (value.includes(',')) {
      const parts = value.split(',');
      parts.slice(0, -1).forEach((p) => addTag(p));
      setForm(f => ({ ...f, tagInput: parts[parts.length - 1] }));
    } else {
      setForm(f => ({ ...f, tagInput: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalTags = form.tagInput.trim() ? [...form.tags, form.tagInput.trim()] : form.tags;
    onConfirm({
      name: form.name.trim(),
      description: form.description.trim(),
      tags: finalTags,
      songName: form.songName.trim(),
      songArtist: form.songArtist.trim(),
      songAlbum: form.songAlbum.trim(),
      songYear: form.songYear.trim(),
    });
  };


  return (
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
              <X className="size-4" />
            </button>
          </Tip>

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-zinc-700/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="size-4 text-white" />
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
                  {t('setup.projectName')} *
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
                    placeholder="e.g. Bohemian Rhapsody"
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
                    placeholder="e.g. Queen"
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
                    placeholder="e.g. A Night at the Opera"
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
                    placeholder="e.g. 1975"
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 text-sm h-9"
                    maxLength={4}
                  />
                </div>
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
                          <X className="size-3" />
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
              <Sparkles className="size-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}