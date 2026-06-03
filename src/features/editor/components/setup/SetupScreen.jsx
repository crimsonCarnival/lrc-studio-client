import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@ui/button';
import { FloatingInput } from '@ui/floating-input';
import { FloatingTextarea } from '@ui/floating-textarea';
import { Textarea } from '@ui/textarea';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Badge } from '@ui/badge';
import { Switch } from '@ui/switch';
import { Tip } from '@ui/tip';
import {
  FolderOpen, Music2, FileText, Upload, Check, ArrowRight, Trash2,
  Video, Cloud, Link2, Loader2, Lock, Globe, Sparkles, X, LockKeyhole, Lightbulb, Search
} from 'lucide-react';
import { useSetupContext } from '@/features/editor/SetupContext';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { lyrics as lyricsApi, uploads as uploadsApi, spotify as spotifyApi, getAccessToken } from '@/app/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { uploadsService } from '@/features/projects/services/uploads.service';
import { SkeletonMediaItem } from '@ui/skeleton';
import SpotifyBrowser from '@features/player/components/SpotifyBrowser';
import SpotifyIcon from '@features/player/components/SpotifyIcon';
import { useAuthContext } from '@/features/auth/useAuthContext';
import YoutubeSearchPanel from '@features/projects/components/YoutubeSearchPanel';
import { ThemedShineBorder } from '@ui/themed-shine-border';
import toast from 'react-hot-toast';
import { useSpotifyAuth } from '@/features/player/hooks/useSpotifyAuth';
import MediaLibrary from './MediaLibrary';
import AudioSourceBadge from './AudioSourceBadge';
import LyricsSearchBar from '../lyrics-search/LyricsSearchBar';

const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024;

const CDN_PATTERN = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\//;
const AUDIO_URL_PATTERN = /^https?:\/\/.+\.(mp3|mp4|wav|ogg|flac|aac|m4a|webm)(\?.*)?$/i;
const YT_PATTERN = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|watch\?.+&v=)|youtu\.be\/)([^&?/\s]{11})/;

export default function SetupScreen({ onComplete, playerRef, onShowAllUploads }) {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill || null;
  const { login: handleSpotifyLogin } = useSpotifyAuth();
  const { step, setStep } = useSetupContext();
  const reducedMotion = useReducedMotion();
  const [rightTab, setRightTab] = useState('media');
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [imageUploading, setImageUploading] = useState(false);
  const coverImageInputRef = useRef(null);

  // If arriving with prefill data (rollback from no-media project), start at the media step
  useEffect(() => {
    if (prefill) setStep(2);
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => setStep(1);
  }, [setStep]);

  const audioInputRef = useRef(null);
  const lyricsInputRef = useRef(null);
  const tagInputRef = useRef(null);
  const projectNameInputRef = useRef(null);
  const autoLoadPendingRef = useRef(false);

  useEffect(() => {
    // autoFocus removed as requested
  }, [step]);

  const [initialPendingYtUrl] = useState(() => sessionStorage.getItem('pendingYtUrl'));

  // Consolidated state for Step 1 & 2
  const [audio, setAudio] = useState(() => {
    return {
      ready: false,
      name: '',
      tab: 'youtube',
      source: null,
      ytUrl: initialPendingYtUrl || '',
      ytLoading: false,
      selectedUpload: null,
    };
  });

  const [lyrics, setLyrics] = useState(() => {
    if (prefill?.lines?.length) {
      return {
        text: '',
        parsedLines: prefill.lines,
        fileName: '',
        editorMode: prefill.editorMode || 'lrc',
      };
    }
    return {
      text: '',
      parsedLines: null,
      fileName: '',
      editorMode: 'lrc',
    };
  });

  const [lyricsTab, setLyricsTab] = useState('write');
  const [lyricsAutoSearch, setLyricsAutoSearch] = useState(null);


  const [metadata, setMetadata] = useState(() => ({
    name: prefill?.name || '',
    description: prefill?.description || '',
    tags: prefill?.tags || [],
    tagInput: '',
    isPublic: true,
    songName: prefill?.songName || '',
    songArtist: prefill?.songArtist || '',
    songAlbum: prefill?.songAlbum || '',
    songYear: prefill?.songYear || '',
    coverImage: prefill?.coverImage || '',
  }));

  const { ready: audioReady, name: audioName, tab: audioTab, source: audioSource, ytUrl, ytLoading, selectedUpload } = audio;
  const { text: lyricsText, parsedLines, fileName: lyricsFileName, editorMode } = lyrics;
  const { name: projectName, description: projectDescription, tags: projectTags, tagInput, isPublic, songName, songArtist, songAlbum, songYear, coverImage } = metadata;

  // State setters
  const setAudioState = useCallback((val) => setAudio(prev => ({ ...prev, ...(typeof val === 'function' ? val(prev) : val) })), []);
  const setLyricsState = useCallback((val) => setLyrics(prev => ({ ...prev, ...(typeof val === 'function' ? val(prev) : val) })), []);
  const setMetadataState = useCallback((val) => setMetadata(prev => ({ ...prev, ...(typeof val === 'function' ? val(prev) : val) })), []);

  const handleLyricsSearchImport = useCallback((lyricsText) => {
    const parsedLines = lyricsText.split('\n').reduce((acc, line) => {
      const text = line.trim();
      if (text.length > 0) acc.push({ text, timestamp: null });
      return acc;
    }, []);
    setLyricsState({ parsedLines, text: '', fileName: '' });
    setLyricsTab('write');
  }, [setLyricsState]);

  // Media library state
  const [mediaUploads, setMediaUploads] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(!!getAccessToken());

  const hasLyrics = parsedLines ? parsedLines.length > 0 : lyricsText.trim().length > 0;
  const canContinue = audioReady && hasLyrics;

  // Fetch user's media library on mount
  useEffect(() => {
    if (!getAccessToken()) return;
    uploadsApi.listMedia()
      .then((uploads) => setMediaUploads(uploads || []))
      .catch(() => { })
      .finally(() => setMediaLoading(false));
  }, []);

  useEffect(() => {
    if (initialPendingYtUrl) {
      autoLoadPendingRef.current = true;
      sessionStorage.removeItem('pendingYtUrl');
      sessionStorage.removeItem('pendingYtTitle');
    }
  }, [initialPendingYtUrl]);

  // Sync project name to audio name if empty when reaching step 2
  const prevStepRef = useRef(step);
  if (step !== prevStepRef.current) {
    prevStepRef.current = step;
    if (step === 2 && !projectName && audioName && !audioName.includes('://') && audioName !== t('setup.youtubeVideo')) {
      setMetadataState({ name: audioName });
    }
  }

  const saveUploadRecord = useCallback(async (data) => {
    if (!getAccessToken()) return;
    try {
      await uploadsApi.saveMedia(data);
      const uploads = await uploadsApi.listMedia();
      setMediaUploads(uploads || []);
    } catch { /* ignore */ }
  }, []);

  // ── URL / pattern helpers ──

  const detectedUrlType = (() => {
    const v = ytUrl.trim().split(/\s+/)[0];
    if (!v) return 'none';
    if (CDN_PATTERN.test(v) || AUDIO_URL_PATTERN.test(v)) return 'cdn';
    if (YT_PATTERN.test(v) || v.length === 11) return 'youtube';
    return 'unknown';
  })();

  // ── Audio handlers ──

  const handleAudioFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error(t('setup.invalidAudioType'));
      if (audioInputRef.current) audioInputRef.current.value = '';
      return;
    }
    if (playerRef.current?.loadLocalAudio) playerRef.current.loadLocalAudio(file);
    setAudioState({ ready: true, name: file.name, source: 'local', selectedUpload: null });
  };

  const handleLoadUrl = useCallback(async () => {
    const trimmed = ytUrl.trim().split(/\s+/)[0];
    if (!trimmed) return;

    if (detectedUrlType === 'cdn') {
      const pathOnly = trimmed.split('?')[0].split('#')[0];
      const lastSegment = pathOnly.split('/').pop() || 'audio';
      const dotIdx = lastSegment.lastIndexOf('.');
      const rawName = dotIdx > 0 ? lastSegment.slice(0, dotIdx) : lastSegment;
      const ext = dotIdx > 0 ? lastSegment.slice(dotIdx + 1).toLowerCase() : 'mp4';
      const title = rawName.length > 30 ? 'Cloud Audio' : rawName;
      if (playerRef.current?.loadFromUrl) playerRef.current.loadFromUrl(trimmed, title);
      setAudioState({ ready: true, name: title, source: 'cloud', selectedUpload: null });
      saveUploadRecord({ source: 'cloudinary', cloudinaryUrl: trimmed, fileName: `${rawName}.${ext}`, title });
      return;
    }

    const videoId = trimmed.match(YT_PATTERN)?.[1] || (trimmed.length === 11 ? trimmed : null);
    if (!videoId) { toast.error(t('player.invalidUrl')); return; }

    setAudioState({ ytLoading: true });
    if (playerRef.current?.loadYouTube) playerRef.current.loadYouTube(trimmed);
    setAudioState({ ready: true, name: t('setup.youtubeVideo'), source: 'youtube', selectedUpload: null, ytLoading: false, ytUrl: '' });
  }, [ytUrl, detectedUrlType, playerRef, setAudioState, saveUploadRecord, t]);

  const handleLoadUrlRef = useRef(null);
  handleLoadUrlRef.current = handleLoadUrl;

  useEffect(() => {
    if (autoLoadPendingRef.current && ytUrl) {
      autoLoadPendingRef.current = false;
      const timer = setTimeout(() => handleLoadUrlRef.current(), 0);
      return () => clearTimeout(timer);
    }
  }, [ytUrl]);

  const handleSelectUpload = (upload) => {
    setAudioState({
      selectedUpload: upload,
      name: upload.title || upload.fileName || upload.youtubeUrl || 'Media',
      ready: true,
      source: upload.source === 'youtube' ? 'youtube' : upload.source === 'spotify' ? 'spotify' : 'cloud',
    });

    if (upload.source === 'youtube' && upload.youtubeUrl) {
      setAudioState({ ytUrl: upload.youtubeUrl });
      playerRef.current?.loadYouTube?.(upload.youtubeUrl);
    } else if (upload.source === 'cloudinary' && upload.cloudinaryUrl) {
      playerRef.current?.loadFromUrl?.(upload.cloudinaryUrl, upload.title || upload.fileName);
    } else if (upload.source === 'spotify' && (upload.spotifyTrackId || upload.trackId)) {
      const sId = upload.spotifyTrackId || (upload.trackId?.length !== 24 ? upload.trackId : null);
      if (sId) playerRef.current?.loadSpotify?.(sId, upload.title || upload.fileName || 'Spotify Track', false);
    }
  };

  const handleDeleteUpload = async (uploadId) => {
    try {
      await uploadsApi.deleteMedia(uploadId);
      setMediaUploads((prev) => prev.filter((u) => u.id !== uploadId));
      if (selectedUpload?.id === uploadId) { setAudioState({ ready: false, name: '', selectedUpload: null, source: null }); }
    } catch { toast.error(t('setup.deleteFailed')); }
  };

  const handleYtKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleLoadUrl(); } };

  const handleSpotifyBrowserSelect = useCallback(async (track) => {
    if (playerRef.current?.loadSpotify) playerRef.current.loadSpotify(track.trackId, track.title || track.name || '', false);
    else if (playerRef.current?.playTrack) playerRef.current.playTrack(track.trackId, track.title || track.name || '', false);
    setAudioState({ ready: true, name: track.title || track.name || 'Spotify track', source: 'spotify', selectedUpload: null });
    if (getAccessToken()) {
      try {
        await spotifyApi.createUpload(`spotify:track:${track.trackId}`);
        const uploads = await uploadsApi.listMedia();
        setMediaUploads(uploads || []);
      } catch { /* ignore */ }
    }
  }, [playerRef, setAudioState]);

  // ── Lyrics handlers ──

  const handleLyricsFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['lrc', 'srt', 'txt'].includes(ext)) { toast.error(t('import.unsupportedFormat')); return; }
    if (file.size > MAX_IMPORT_FILE_SIZE) { toast.error(t('import.tooLarge')); return; }
    try {
      const text = await file.text();
      const { lines } = await lyricsApi.parse(text, file.name);
      if (lines.length === 0) { toast.error(t('import.noLines')); return; }
      setLyricsState({ parsedLines: lines, fileName: file.name, editorMode: ext === 'srt' ? 'srt' : 'lrc', text: '' });
    } catch { toast.error(t('import.failed')); }
  };

  // ── Metadata handlers ──

  const addTag = (text) => {
    const trimmed = text.trim();
    if (trimmed && !projectTags.includes(trimmed)) setMetadataState({ tags: [...projectTags, trimmed] });
  };
  const removeTag = (index) => setMetadataState({ tags: projectTags.filter((_, i) => i !== index) });

  const handleTagInputChange = (e) => {
    const value = e.target.value;
    if (value.includes(',') || value.includes(' ')) {
      const parts = value.split(/[, ]+/);
      parts.slice(0, -1).forEach((p) => addTag(p));
      setMetadataState({ tagInput: parts[parts.length - 1] });
    } else { setMetadataState({ tagInput: value }); }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) { addTag(tagInput); setMetadataState({ tagInput: '' }); } }
    else if (e.key === 'Backspace' && !tagInput && projectTags.length > 0) removeTag(projectTags.length - 1);
  };

  const handleProceed = () => {
    let finalLines = parsedLines;
    if (!finalLines) {
      finalLines = lyricsText.split('\n').map((text) => ({
        text: text.trimEnd(), timestamp: null, endTime: null, secondary: '', translation: '', id: crypto.randomUUID(),
      }));
    }
    const finalTags = tagInput.trim() ? [...projectTags, tagInput.trim()] : projectTags;
    onComplete({ lines: finalLines, editorMode, audioSource, ytUrl, audioName: (audioName && !audioName.includes('://')) ? audioName : null, selectedUpload, name: projectName.trim(), description: projectDescription.trim(), tags: finalTags, isPublic, songName: songName.trim(), songArtist: songArtist.trim(), songAlbum: songAlbum.trim(), songYear: songYear.trim(), coverImage: coverImage.trim() });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    setImageUploading(true);
    try {
      const token = executeRecaptcha ? await executeRecaptcha('upload_cover') : undefined;
      const url = await uploadsService.uploadCoverImage(file, token);
      setMetadataState({ coverImage: url });
    } catch {}
    finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 px-6 pt-5 pb-4">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <div className={`size-2 rounded-full bg-primary shrink-0 ${reducedMotion ? '' : 'animate-pulse'}`} />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              {t('app.name')} · {t('setup.newProject', 'New Project')}
            </p>
            <h2 className="font-heading text-zinc-100" style={{ fontSize: 'clamp(1.05rem, 2vw, 1.3rem)' }}>
              {t('setup.newProjectTitle', 'New Project')}
            </h2>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex-1 min-h-0 px-6 pb-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto h-full pb-6">

          {/* LEFT: project info */}
          <div className="glass rounded-2xl flex flex-col p-5 gap-4 overflow-y-auto relative">
            <ThemedShineBorder />

            {/* Project name */}
            <FloatingInput
              ref={projectNameInputRef}
              id="project-name"
              type="text"
              label={`${t('setup.projectName')} *`}
              value={projectName}
              onChange={(e) => setMetadataState({ name: e.target.value })}
              placeholder={t('setup.projectNamePlaceholder')}
              maxLength={200}
            />

            <div className="w-full h-px bg-zinc-800/60 shrink-0" />

            {/* Song info */}
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider shrink-0">
              {t('setup.songInformation', 'Song Information')}
            </h3>
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                  <Tip content={t('setup.songNameDesc')}>
                    <Lightbulb className="size-3.5 text-zinc-600 cursor-help" />
                  </Tip>
                </div>
                <FloatingInput id="song-name" type="text" label={t('setup.songName')} value={songName}
                  onChange={(e) => setMetadataState({ songName: e.target.value })}
                  placeholder={t('setup.songNamePlaceholder')} maxLength={500} />
              </div>
              <FloatingInput id="song-artist" type="text" label={t('setup.songArtist')} value={songArtist}
                onChange={(e) => setMetadataState({ songArtist: e.target.value })}
                placeholder={t('setup.songArtistPlaceholder')} maxLength={300} />
              <FloatingInput id="song-album" type="text" label={t('setup.songAlbum')} value={songAlbum}
                onChange={(e) => setMetadataState({ songAlbum: e.target.value })}
                placeholder={t('setup.songAlbumPlaceholder')} maxLength={300} />
              <FloatingInput id="song-year" type="text" label={t('setup.songYear')} value={songYear}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  const currentYear = new Date().getFullYear();
                  if (val.length === 4 && parseInt(val) > currentYear) {
                    setMetadataState({ songYear: currentYear.toString() });
                  } else {
                    setMetadataState({ songYear: val });
                  }
                }}
                placeholder={t('setup.songYearPlaceholder')} maxLength={4} />
            </div>

            <div className="w-full h-px bg-zinc-800/60 shrink-0" />

            {/* Tags */}
            <div className="flex flex-col gap-2 shrink-0">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                {t('setup.tags', 'Tags')}
              </label>
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-900/50 border border-zinc-700/50 rounded-xl min-h-[36px]"
                role="presentation"
                onClick={() => tagInputRef.current?.focus()}
              >
                {projectTags.map((tag, i) => (
                  <Badge key={i} variant="secondary"
                    className="text-[10px] gap-1 py-0.5 px-2 bg-primary/10 text-primary border-primary/20">
                    {tag}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                      className="ml-0.5 hover:text-zinc-100 transition-colors">×</button>
                  </Badge>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagKeyDown}
                  placeholder={projectTags.length === 0 ? t('setup.tagsPlaceholder', 'Add tags...') : ''}
                  className="flex-1 min-w-[80px] bg-transparent text-xs text-zinc-300 outline-none placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Cover Image + Privacy toggle — same row */}
            <div className="flex items-center gap-2 shrink-0 mt-auto">
              <FloatingInput
                id="cover-image"
                type="text"
                label={t('setup.coverImage')}
                value={coverImage}
                onChange={(e) => setMetadataState({ coverImage: e.target.value })}
                placeholder={t('setup.coverImagePlaceholder')}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => coverImageInputRef.current?.click()}
                disabled={imageUploading}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-700/50 bg-transparent text-zinc-400 hover:text-zinc-200 hover:border-primary/50 transition-colors disabled:opacity-50"
              >
                {imageUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
              </button>
              <input
                type="file"
                ref={coverImageInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-1 shrink-0 pl-1">
                <Switch
                  checked={isPublic}
                  onCheckedChange={(checked) => setMetadataState({ isPublic: checked })}
                  disabled={!user}
                />
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  {isPublic ? t('setup.public', 'Public') : t('setup.private', 'Private')}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Media + Lyrics top-level tabs */}
          <div className="glass rounded-2xl flex flex-col p-5 gap-0 overflow-hidden relative">
            <ThemedShineBorder />

            {/* Rollback notice — shown when project was missing media */}
            {prefill && (
              <div className="flex items-start gap-3 px-4 py-3 mb-3 rounded-xl bg-amber-500/8 border border-amber-500/20 shrink-0">
                <span className="text-amber-400 text-base leading-none mt-0.5 shrink-0">⚠</span>
                <div>
                  <p className="text-xs font-semibold text-amber-300">{t('setup.noMediaTitle', 'Media source missing')}</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">{t('setup.noMediaDesc', 'Your project was loaded but had no audio attached. Please choose a new audio source to continue.')}</p>
                </div>
              </div>
            )}

            {/* Top-level tab bar: Media | Lyrics */}
            <div className="flex gap-0 border-b border-zinc-800/60 shrink-0 mb-3">
              {['media', 'lyrics'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRightTab(tab)}
                  className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-colors capitalize ${
                    rightTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tab === 'media' ? t('setup.tabMedia', 'Media') : t('setup.tabLyrics', 'Lyrics')}
                </button>
              ))}
            </div>

            {/* MEDIA PANEL */}
            {rightTab === 'media' && (
              <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                {/* Source sub-tabs: YouTube / Spotify / File & URL */}
                <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-1 shrink-0">
                  {[
                    { id: 'youtube', label: t('setup.tabYoutube', 'YouTube') },
                    { id: 'spotify', label: t('setup.tabSpotify', 'Spotify') },
                    { id: 'local',   label: t('setup.tabLocal', 'File / URL') },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAudioState({ tab: tab.id })}
                      className={`flex-1 h-7 rounded-lg text-[11px] font-semibold transition-all ${
                        audioTab === tab.id
                          ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Audio ready state */}
                {audioReady ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50 min-h-[140px]">
                    <div className="size-11 rounded-full bg-green-500/15 flex items-center justify-center ring-4 ring-green-500/5">
                      <Check className="size-6 text-green-400" />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm font-semibold text-zinc-200">{t('setup.audioReady')}</p>
                      <p className="text-xs text-zinc-400 truncate max-w-xs mt-0.5">{audioName}</p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => { setAudioState({ ready: false, name: '', ytUrl: '', selectedUpload: null, source: null }); }}
                      className="h-8 px-3 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-lg"
                    >
                      {t('setup.changeAudio')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {audioTab === 'youtube' && (
                      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-zinc-800/50">
                        <YoutubeSearchPanel
                          initialQuery={[songName, songArtist].filter(Boolean).join(' ').trim()}
                          onSelect={({ url, title }) => {
                            setAudioState({ ytUrl: url, source: 'youtube', ready: true, name: title || t('setup.youtubeVideo'), selectedUpload: null });
                            playerRef.current?.loadYouTube?.(url);
                          }}
                        />
                      </div>
                    )}

                    {audioTab === 'spotify' && (
                      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-zinc-800/50">
                        {!user ? (
                          <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                            <div className="size-12 rounded-full bg-zinc-800 flex items-center justify-center">
                              <SpotifyIcon className="size-6 text-zinc-500" />
                            </div>
                            <p className="text-sm font-medium text-zinc-300">{t('setup.searchSpotify')}</p>
                            <p className="text-xs text-zinc-500">{t('setup.spotifyRequiresAccount')}</p>
                            <Button
                              onClick={() => navigate('/auth?action=signup')}
                              className="h-9 px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold rounded-xl"
                              variant="ghost"
                            >
                              {t('auth.signUp')}
                            </Button>
                          </div>
                        ) : user?.spotify?.spotifyId ? (
                          <div className="h-full overflow-y-auto scrollbar-thin">
                            <SpotifyBrowser onSelectTrack={handleSpotifyBrowserSelect} />
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <SpotifyIcon className="size-6 text-primary" />
                            </div>
                            <p className="text-sm font-medium text-zinc-200">{t('settings.spotify.connectAccount', 'Connect Spotify Account')}</p>
                            <p className="text-xs text-zinc-500">{t('settings.spotify.connectToAccess', 'Connect to access your library')}</p>
                            <Button
                              onClick={handleSpotifyLogin}
                              className="h-9 px-4 bg-primary hover:bg-primary-dim text-zinc-950 text-xs font-bold rounded-xl"
                            >
                              {t('settings.spotify.connectAccount', 'Connect Spotify')}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {audioTab === 'local' && (
                      <div className="flex-1 flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-0.5">
                        {/* URL + file input */}
                        <div className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/60 focus-within:border-primary/40 transition-all shrink-0">
                          <Tip content={t('setup.uploadAudio')}>
                            <button
                              onClick={() => audioInputRef.current?.click()}
                              className="size-11 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-primary hover:bg-zinc-700/50 transition-all shrink-0 border border-zinc-700/40 cursor-pointer"
                            >
                              <FolderOpen className="size-5" />
                              <input ref={audioInputRef} id="setup-audio-input" type="file" accept="audio/*" onChange={handleAudioFile} className="hidden" />
                            </button>
                          </Tip>
                          <div className="relative flex-1 flex items-center">
                            <FloatingInput
                              type="text"
                              label={t('setup.urlPlaceholder')}
                              hasIcon={true}
                              value={ytUrl}
                              onChange={(e) => setAudioState({ ytUrl: e.target.value })}
                              onKeyDown={handleYtKeyDown}
                              className="pl-12 bg-transparent border-none text-sm h-11 focus:ring-0 focus-visible:ring-0 outline-none"
                            />
                            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
                          </div>
                          <Button
                            onClick={handleLoadUrl}
                            disabled={!ytUrl.trim() || ytLoading}
                            className={`h-11 px-4 text-zinc-950 font-bold text-xs rounded-xl shrink-0 ${detectedUrlType === 'cdn' ? 'bg-blue-500 hover:bg-blue-400' : 'bg-primary hover:bg-primary-dim'}`}
                          >
                            {ytLoading ? <Loader2 className="size-4 animate-spin" /> : t('player.load')}
                          </Button>
                        </div>

                        {!user && (
                          <p className="text-[11px] text-zinc-500 px-1 flex items-center gap-1.5 shrink-0">
                            <Lock className="size-3 text-zinc-600 shrink-0" />
                            {t('setup.guestUploadNote')}{' '}
                            <button onClick={() => navigate('/auth?action=signup')} className="text-primary hover:text-primary/80 underline underline-offset-2 font-medium">
                              {t('auth.signUp')}
                            </button>{' '}
                            {t('setup.guestUploadNoteKeep')}
                          </p>
                        )}

                        {/* Media library */}
                        <MediaLibrary
                          loading={mediaLoading}
                          uploads={mediaUploads}
                          onSelect={handleSelectUpload}
                          onDelete={handleDeleteUpload}
                          onShowAll={onShowAllUploads}
                          selectedId={selectedUpload?.id}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* LYRICS PANEL */}
            {rightTab === 'lyrics' && (
              <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
                {parsedLines ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50 min-h-[140px]">
                    <div className="size-11 rounded-full bg-green-500/15 flex items-center justify-center ring-4 ring-green-500/5">
                      <Check className="size-6 text-green-400" />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm font-semibold text-zinc-200">{t('setup.lyricsReady')}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{t('setup.linesCount', { count: parsedLines.length })}</p>
                      {lyricsFileName && <p className="text-xs text-zinc-400 truncate max-w-xs mt-0.5">{lyricsFileName}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => { setLyricsState({ parsedLines: null, fileName: '', text: '' }); }}
                      className="h-8 px-3 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-lg"
                    >
                      {t('setup.changeLyrics')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-2.5 min-h-0">
                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-1 shrink-0">
                      {[
                        { id: 'write', label: t('setup.pasteLyrics') },
                        { id: 'search', label: t('lyricsSearch.tabLabel') },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setLyricsTab(tab.id)}
                          className={`flex-1 h-7 rounded-lg text-[11px] font-semibold transition-all ${
                            lyricsTab === tab.id
                              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {lyricsTab === 'write' && (
                      <>
                        <Textarea
                          value={lyricsText}
                          onChange={(e) => setLyricsState({ text: e.target.value })}
                          placeholder={t('setup.pasteLyricsDesc')}
                          className="flex-1 min-h-0 bg-zinc-900/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-500 resize-none text-sm p-3 leading-relaxed focus:border-primary/50 overflow-y-auto scrollbar-thin rounded-xl"
                        />
                        <label
                          htmlFor="setup-lyrics-input"
                          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer group transition-colors rounded-xl bg-zinc-800/40 border border-zinc-700/40 hover:border-primary/30 hover:bg-zinc-800/80 shrink-0"
                        >
                          <Upload className="size-4 text-zinc-500 group-hover:text-primary transition-colors" />
                          <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">{t('setup.importFile')}</span>
                          <span className="text-[10px] text-zinc-500 ml-1 hidden sm:inline">.lrc, .srt, .txt</span>
                          <input ref={lyricsInputRef} id="setup-lyrics-input" type="file" accept=".lrc,.srt,.txt" onChange={handleLyricsFile} className="hidden" />
                        </label>
                      </>
                    )}

                    {lyricsTab === 'search' && (
                      <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto scrollbar-thin">
                        {(songName || songArtist) && (
                          <button
                            type="button"
                            onClick={() => {
                              const q = [songName, songArtist].filter(Boolean).join(' ').trim();
                              setLyricsAutoSearch(prev => ({ q, v: (prev?.v ?? 0) + 1 }));
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors text-xs font-medium shrink-0 w-full"
                          >
                            <Search className="size-3.5 shrink-0 text-zinc-500" />
                            <span className="truncate">
                              {t('lyricsSearch.searchFor', 'Search for')} &ldquo;{[songName, songArtist].filter(Boolean).join(' - ')}&rdquo;
                            </span>
                          </button>
                        )}
                        <LyricsSearchBar onImport={handleLyricsSearchImport} autoSearch={lyricsAutoSearch} showKeepTimestamps={false} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-4 border-t border-zinc-800/50">
        <div className="flex items-center justify-between max-w-5xl mx-auto gap-3">
          {rightTab === 'media' && audioReady ? (
            <Button
              onClick={() => setRightTab('lyrics')}
              variant="outline"
              className="h-10 px-5 text-sm font-semibold gap-2 rounded-xl border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-primary/50 hover:bg-zinc-800/60"
            >
              {t('setup.nextLyrics')}
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={handleProceed}
            disabled={!canContinue}
            className="h-12 px-10 bg-primary hover:bg-primary-dim text-zinc-950 font-bold rounded-xl gap-2.5 shadow-glow transition-all text-sm disabled:shadow-none"
          >
            {t('setup.startToSync')}
            <Sparkles className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
