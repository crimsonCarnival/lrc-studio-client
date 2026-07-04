import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import type { ChangeEvent, ComponentProps, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@ui/button';
import { FloatingInput } from '@ui/floating-input';
import { FloatingCombobox } from '@/shared/ui/floating-combobox';
import { useLanguageOptions } from '../../hooks/useLanguageOptions';
import { Textarea } from '@ui/textarea';
import { Switch } from '@ui/switch';
import { Tip } from '@ui/tip';
import { TagsSelector } from '@ui/tags-selector';
import { PRIMARY_GENRES, matchGenreFromTags } from '@features/editor/constants/genre-tags';
import { getMyMusicLibrary } from '@/features/editor/music-library.service';
import { parseRawLyricsText } from '@/features/editor/utils/parseRawLyrics';
import { Icon } from '@/shared/ui/Icon';
import { useSetupContext } from '@/features/editor/SetupContext';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { lyrics as lyricsApi, uploads as uploadsApi, songMetadata as songMetadataApi, getAccessToken } from '@/app/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { uploadsService } from '@/features/projects/services/uploads.service';
import { useAuthContext } from '@/features/auth/useAuthContext';
import YoutubeSearchPanel from '@features/projects/components/YoutubeSearchPanel';
import toast from 'react-hot-toast';
import MediaLibrary from './MediaLibrary';
import LyricsSearchBar from '../lyrics-search/LyricsSearchBar';
import type { EditorLine } from '@/features/editor/services/editor.service';

const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024;

const CDN_PATTERN = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\//;
const AUDIO_URL_PATTERN = /^https?:\/\/.+\.(mp3|mp4|wav|ogg|flac|aac|m4a|webm)(\?.*)?$/i;
const YT_PATTERN = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|watch\?.+&v=)|youtu\.be\/)([^&?/\s]{11})/;

// Typed i18next rejects arbitrary string keys.
type TkFn = (k: string) => string;

interface Prefill {
  lines?: EditorLine[];
  editorMode?: string;
  name?: string;
  description?: string;
  tags?: string[];
  songName?: string;
  songArtist?: string;
  songAlbum?: string;
  songYear?: string;
  genre?: string;
  songLanguage?: string;
  trackNumber?: number | string;
  trackCount?: number | string;
  coverImage?: string;
}

interface UploadItem {
  id?: string;
  title?: string;
  fileName?: string;
  source?: string;
  uploadUrl?: string;
}

interface AudioState {
  ready: boolean;
  name: string;
  tab: string;
  source: string | null;
  ytUrl: string;
  ytLoading: boolean;
  selectedUpload: UploadItem | null;
}

interface LyricsState {
  text: string;
  parsedLines: EditorLine[] | null;
  fileName: string;
  editorMode: string;
}

interface MetadataState {
  name: string;
  description: string;
  tags: string[];
  isPublic: boolean;
  songName: string;
  songArtist: string;
  songAlbum: string;
  songYear: string;
  genre: string;
  songLanguage: string;
  trackNumber: number | string;
  trackCount: number | string;
  coverImage: string;
}

interface MusicEntry {
  artist?: string;
  album?: string;
  genre?: string;
  language?: string;
  trackCount?: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlayerRef = { current?: any } | null;

interface SetupScreenProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onComplete: (data: any) => void | Promise<void>;
  playerRef: PlayerRef;
  onShowAllUploads?: () => void;
}

export default function SetupScreen({ onComplete, playerRef, onShowAllUploads }: SetupScreenProps) {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { prefill?: Prefill } | null)?.prefill || null;
  const { step, setStep } = useSetupContext();
  const reducedMotion = useReducedMotion();
  const [rightTab, setRightTab] = useState('media');
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [imageUploading, setImageUploading] = useState(false);
  const coverImageInputRef = useRef<HTMLInputElement | null>(null);

  // If arriving with prefill data (rollback from no-media project), start at the media step
  useEffect(() => {
    if (prefill) setStep(2);
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => setStep(1);
  }, [setStep]);

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const lyricsInputRef = useRef<HTMLInputElement | null>(null);
  const projectNameInputRef = useRef<HTMLInputElement | null>(null);
  const autoLoadPendingRef = useRef(false);

  useEffect(() => {
    // autoFocus removed as requested
  }, [step]);

  const [initialPendingYtUrl] = useState(() => sessionStorage.getItem('pendingYtUrl'));

  // Consolidated state for Step 1 & 2
  const [audio, setAudio] = useState<AudioState>(() => ({
    ready: false,
    name: '',
    tab: 'youtube',
    source: null,
    ytUrl: initialPendingYtUrl || '',
    ytLoading: false,
    selectedUpload: null,
  }));

  const [lyrics, setLyrics] = useState<LyricsState>(() => {
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
  const [lyricsAutoSearch, setLyricsAutoSearch] = useState<{ q: string; v: number } | null>(null);


  const [metadata, setMetadata] = useState<MetadataState>(() => ({
    name: prefill?.name || '',
    description: prefill?.description || '',
    tags: prefill?.tags || [],
    // Private by default — owner opts into public via the toggle. Guests can't
    // toggle it (disabled when !user), so their drafts stay private until they
    // sign up and choose to publish. See F8.
    isPublic: false,
    songName: prefill?.songName || '',
    songArtist: prefill?.songArtist || '',
    songAlbum: prefill?.songAlbum || '',
    songYear: prefill?.songYear || '',
    genre: prefill?.genre || '',
    songLanguage: prefill?.songLanguage || '',
    trackNumber: prefill?.trackNumber ?? '',
    trackCount: prefill?.trackCount ?? '',
    coverImage: prefill?.coverImage || '',
  }));

  const [musicLibrary, setMusicLibrary] = useState<MusicEntry[]>([]);
  const [metaSearching, setMetaSearching] = useState(false);

  const { ready: audioReady, name: audioName, tab: audioTab, source: audioSource, ytUrl, ytLoading, selectedUpload } = audio;
  const { text: lyricsText, parsedLines, fileName: lyricsFileName, editorMode } = lyrics;
  const { name: projectName, description: projectDescription, tags: projectTags, isPublic, songName, songArtist, songAlbum, songYear, genre, songLanguage, trackNumber, trackCount, coverImage } = metadata;

  // State setters
  const setAudioState = useCallback((val: Partial<AudioState> | ((p: AudioState) => Partial<AudioState>)) => setAudio(prev => ({ ...prev, ...(typeof val === 'function' ? val(prev) : val) })), []);
  const setLyricsState = useCallback((val: Partial<LyricsState> | ((p: LyricsState) => Partial<LyricsState>)) => setLyrics(prev => ({ ...prev, ...(typeof val === 'function' ? val(prev) : val) })), []);
  const setMetadataState = useCallback((val: Partial<MetadataState> | ((p: MetadataState) => Partial<MetadataState>)) => setMetadata(prev => ({ ...prev, ...(typeof val === 'function' ? val(prev) : val) })), []);

  const handleLyricsSearchImport = useCallback((searchText: string) => {
    const parsed = searchText.split('\n').reduce<EditorLine[]>((acc, line) => {
      const text = line.trim();
      if (text.length > 0) acc.push({ text, timestamp: null });
      return acc;
    }, []);
    setLyricsState({ parsedLines: parsed, text: '', fileName: '' });
    setLyricsTab('write');
  }, [setLyricsState]);

  // Media library state
  const [mediaUploads, setMediaUploads] = useState<UploadItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(!!getAccessToken());

  const hasLyrics = parsedLines ? parsedLines.length > 0 : lyricsText.trim().length > 0;
  const canContinue = audioReady && hasLyrics;

  // Fetch user's media library on mount
  useEffect(() => {
    if (!getAccessToken()) return;
    uploadsApi.listMedia()
      .then((uploads) => setMediaUploads((uploads as UploadItem[]) || []))
      .catch(() => { })
      .finally(() => setMediaLoading(false));
  }, []);

  // Fetch music library for artist/album autofill
  useEffect(() => {
    if (!getAccessToken()) return;
    getMyMusicLibrary().then((lib) => setMusicLibrary(lib as MusicEntry[])).catch(() => {});
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
  useLayoutEffect(() => {
    if (step !== prevStepRef.current) {
      prevStepRef.current = step;
      if (step === 2 && !projectName && audioName && !audioName.includes('://') && audioName !== t('setup.youtubeVideo')) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMetadataState({ name: audioName });
      }
    }
  }, [step, projectName, audioName, t, setMetadataState]);

  const saveUploadRecord = useCallback(async (data: Record<string, unknown>) => {
    if (!getAccessToken()) return;
    try {
      await uploadsApi.saveMedia(data as Parameters<typeof uploadsApi.saveMedia>[0]);
      const uploads = await uploadsApi.listMedia();
      setMediaUploads((uploads as UploadItem[]) || []);
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

  const handleAudioFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error(t('setup.invalidAudioType'));
      if (audioInputRef.current) audioInputRef.current.value = '';
      return;
    }
    if (playerRef?.current?.loadLocalAudio) playerRef.current.loadLocalAudio(file);
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
      if (playerRef?.current?.loadFromUrl) playerRef.current.loadFromUrl(trimmed, title);
      setAudioState({ ready: true, name: title, source: 'cloud', selectedUpload: null });
      saveUploadRecord({ source: 'cloudinary', uploadUrl: trimmed, fileName: `${rawName}.${ext}`, title });
      return;
    }

    const videoId = trimmed.match(YT_PATTERN)?.[1] || (trimmed.length === 11 ? trimmed : null);
    if (!videoId) { toast.error(t('player.invalidUrl')); return; }

    setAudioState({ ytLoading: true });
    if (playerRef?.current?.loadYouTube) playerRef.current.loadYouTube(trimmed);
    setAudioState({ ready: true, name: t('setup.youtubeVideo'), source: 'youtube', selectedUpload: null, ytLoading: false, ytUrl: '' });
  }, [ytUrl, detectedUrlType, playerRef, setAudioState, saveUploadRecord, t]);

  const handleLoadUrlRef = useRef(handleLoadUrl);
  useLayoutEffect(() => { handleLoadUrlRef.current = handleLoadUrl; });

  useEffect(() => {
    if (autoLoadPendingRef.current && ytUrl) {
      autoLoadPendingRef.current = false;
      const timer = setTimeout(() => handleLoadUrlRef.current(), 0);
      return () => clearTimeout(timer);
    }
  }, [ytUrl]);

  const handleSelectUpload = (upload: UploadItem) => {
    setAudioState({
      selectedUpload: upload,
      name: upload.title || upload.fileName || 'Media',
      ready: true,
      source: upload.source === 'youtube' ? 'youtube' : 'cloud',
    });

    if (upload.source === 'youtube' && upload.uploadUrl) {
      setAudioState({ ytUrl: upload.uploadUrl });
      playerRef?.current?.loadYouTube?.(upload.uploadUrl);
    } else if (upload.source === 'cloudinary' && upload.uploadUrl) {
      playerRef?.current?.loadFromUrl?.(upload.uploadUrl, upload.title || upload.fileName);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    try {
      await uploadsApi.deleteMedia(uploadId);
      setMediaUploads((prev) => prev.filter((u) => u.id !== uploadId));
      if (selectedUpload?.id === uploadId) { setAudioState({ ready: false, name: '', selectedUpload: null, source: null }); }
    } catch { toast.error(t('setup.deleteFailed')); }
  };

  const handleYtKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleLoadUrl(); } };

  // ── Lyrics handlers ──

  const handleLyricsFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['lrc', 'srt', 'txt'].includes(ext)) { toast.error(t('import.unsupportedFormat')); return; }
    if (file.size > MAX_IMPORT_FILE_SIZE) { toast.error(t('import.tooLarge')); return; }
    try {
      const text = await file.text();
      const { lines } = await lyricsApi.parse(text, file.name) as { lines: EditorLine[] };
      if (lines.length === 0) { toast.error(t('import.noLines')); return; }
      setLyricsState({ parsedLines: lines, fileName: file.name, editorMode: ext === 'srt' ? 'srt' : 'lrc', text: '' });
    } catch { toast.error(t('import.failed')); }
  };

  // ── Metadata handlers ──


  const genreOptions    = useMemo(() => PRIMARY_GENRES.map((k) => ({ value: k, label: (t as TkFn)(`setup.genre.${k}`) })), [t]);
  const languageOptions = useLanguageOptions();

  const artistOptions = useMemo(() => {
    const seen = new Set<string>();
    return musicLibrary
      .filter((e) => !!e.artist && !seen.has(e.artist.toLowerCase()) && !!seen.add(e.artist.toLowerCase()))
      .map((e) => ({ value: e.artist as string }));
  }, [musicLibrary]);

  const albumOptions = useMemo(() => {
    const seen = new Set<string>();
    const base = songArtist
      ? musicLibrary.filter((e) => e.artist?.toLowerCase() === songArtist.toLowerCase())
      : musicLibrary;
    return base
      .filter((e) => !!e.album && !seen.has(e.album.toLowerCase()) && !!seen.add(e.album.toLowerCase()))
      .map((e) => ({ value: e.album as string }));
  }, [musicLibrary, songArtist]);

  const handleAlbumSelect = useCallback((albumName: string) => {
    const match = musicLibrary.find((e) => e.album?.toLowerCase() === albumName.toLowerCase());
    if (!match) return;
    setMetadataState({
      ...(match.genre      ? { genre: match.genre }               : {}),
      ...(match.language   ? { songLanguage: match.language }     : {}),
      ...(match.trackCount != null ? { trackCount: String(match.trackCount) } : {}),
    });
  }, [musicLibrary, setMetadataState]);

  const handleFetchSongInfo = useCallback(async () => {
    if (!songName.trim() || !songArtist.trim() || metaSearching) return;
    setMetaSearching(true);
    try {
      const meta = await songMetadataApi.lookupTrack(songName.trim(), songArtist.trim()) as {
        error?: string; genres?: string[]; name?: string; artist?: string; album?: string; releaseYear?: string; totalTracks?: number; albumArt?: string;
      };
      if (meta && !meta.error) {
        const mappedGenre = matchGenreFromTags(meta.genres || []);
        setMetadataState({
          songName:   meta.name   || songName,
          songArtist: meta.artist || songArtist,
          songAlbum:  meta.album  || songAlbum,
          songYear:   meta.releaseYear || songYear,
          ...(mappedGenre           ? { genre:      mappedGenre              } : {}),
          ...(meta.totalTracks      ? { trackCount: String(meta.totalTracks) } : {}),
          // Populate coverImage from API art if user hasn't set one
          ...(!coverImage && meta.albumArt ? { coverImage: meta.albumArt }   : {}),
        });
      } else {
        toast.error(t('setup.metaSearchFailed'));
      }
    } catch {
      toast.error(t('setup.metaSearchFailed'));
    } finally {
      setMetaSearching(false);
    }
  }, [songName, songArtist, songAlbum, songYear, coverImage, metaSearching, setMetadataState, t]);

  const handleProceed = () => {
    let finalLines = parsedLines;
    if (!finalLines) {
      finalLines = parseRawLyricsText(lyricsText);
    }
    const parsedTrackNumber = parseInt(String(trackNumber), 10);
    const parsedTrackCount = parseInt(String(trackCount), 10);
    onComplete({ lines: finalLines, editorMode, audioSource, ytUrl, audioName: (audioName && !audioName.includes('://')) ? audioName : null, selectedUpload, name: projectName.trim(), description: projectDescription.trim(), tags: projectTags, isPublic, songName: songName.trim(), songArtist: songArtist.trim(), songAlbum: songAlbum.trim(), songYear: String(songYear).trim(), genre, songLanguage: songLanguage.trim(), trackNumber: isNaN(parsedTrackNumber) ? null : parsedTrackNumber, trackCount: isNaN(parsedTrackCount) ? null : parsedTrackCount, coverImage: coverImage.trim() });
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    setImageUploading(true);
    try {
      const token = executeRecaptcha ? await executeRecaptcha('upload_cover') : undefined;
      const url = await uploadsService.uploadCoverImage(file, token) as string;
      setMetadataState({ coverImage: url });
    } catch { /* ignore */ }
    finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 px-6 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className={`size-2 rounded-full bg-primary shrink-0 ${reducedMotion ? '' : 'animate-pulse'}`} />
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                {t('app.name')} · {t('setup.newProject')}
              </p>
              <h2 className="font-heading text-zinc-100" style={{ fontSize: 'clamp(1.05rem, 2vw, 1.3rem)' }}>
                {t('setup.newProjectTitle')}
              </h2>
            </div>
          </div>
          <Button
            onClick={handleProceed}
            disabled={!canContinue}
            className="h-9 px-5 bg-primary hover:bg-primary-dim text-zinc-950 font-bold rounded-xl gap-2 shadow-glow transition-all text-sm disabled:shadow-none shrink-0"
          >
            {t('setup.startToSync')}
          </Button>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex-1 min-h-0 px-6 overflow-y-auto lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-7xl mx-auto pb-3 lg:h-[calc(100%-1rem)] lg:pb-0">

          {/* Project info — swapped to the right column on desktop */}
          <div className="glass rounded-2xl flex flex-col p-5 gap-4 self-start lg:self-auto lg:overflow-y-auto lg:scrollbar-thin relative lg:order-2">

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
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {t('setup.songInformation')}
              </h3>
              {songName.trim() && songArtist.trim() && (
                <Tip content={t('setup.fetchSongInfo')} side="left">
                  <button
                    type="button"
                    onClick={handleFetchSongInfo}
                    disabled={metaSearching}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30 hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    {metaSearching && <Icon name="progress_activity" size={12} className="animate-spin" />}
                    {t('setup.fetchInfo')}
                  </button>
                </Tip>
              )}
            </div>

            {/* Row 1: Song Name + Artist */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <FloatingInput id="song-name" type="text" label={t('setup.songName')} value={songName}
                onChange={(e) => setMetadataState({ songName: e.target.value })}
                maxLength={500} />
              <FloatingCombobox
                id="song-artist"
                label={t('setup.songArtist')}
                value={songArtist}
                onChange={(v: string) => setMetadataState({ songArtist: v })}
                options={artistOptions}
                maxLength={300}
              />
            </div>

            {/* Row 2: Album + Year */}
            <div className="grid gap-3 shrink-0" style={{ gridTemplateColumns: '3fr 1fr' }}>
              <FloatingCombobox
                id="song-album"
                label={t('setup.songAlbum')}
                value={songAlbum}
                onChange={(v: string) => setMetadataState({ songAlbum: v })}
                onSelect={handleAlbumSelect}
                options={albumOptions}
                maxLength={300}
              />
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
                maxLength={4} />
            </div>

            {/* Row 3: Track # + Track Count */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <FloatingInput id="track-number" type="text" label={t('setup.trackNumber')}
                value={String(trackNumber ?? '')}
                onChange={(e) => setMetadataState({ trackNumber: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                maxLength={3} />
              <FloatingInput id="track-count" type="text" label={t('setup.trackCount')}
                value={String(trackCount ?? '')}
                onChange={(e) => setMetadataState({ trackCount: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                maxLength={3} />
            </div>

            {/* Row 4: Genre + Tags (tags disabled until genre selected) */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <FloatingCombobox
                id="song-genre"
                label={t('setup.songGenre')}
                value={genre}
                onChange={(v: string) => {
                  setMetadataState({ genre: v, tags: [] });
                }}
                options={genreOptions}
                maxLength={100}
                strict
              />
              <TagsSelector
                value={projectTags}
                onChange={(tags: string[]) => setMetadataState({ tags })}
                genre={genre}
              />
            </div>

            {/* Row 5: Language */}
            <FloatingCombobox
              id="song-language"
              label={t('setup.songLanguage')}
              value={songLanguage}
              onChange={(v: string) => setMetadataState({ songLanguage: v })}
              options={languageOptions}
              maxLength={100}
              strict
              className="shrink-0"
            />

            {/* Cover Image + Privacy toggle — same row */}
            <div className="flex items-center gap-2 shrink-0 mt-auto">
              {coverImage ? (
                <div className="relative w-10 h-10 shrink-0 rounded-xl overflow-hidden border border-zinc-700/50 bg-zinc-800/50">
                  <img src={coverImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                </div>
              ) : null}
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
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                ) : (
                  <Icon name="upload" size={16} />
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
                  onCheckedChange={(checked: boolean) => setMetadataState({ isPublic: checked })}
                  disabled={!user}
                />
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  {isPublic ? t('setup.public') : t('setup.private')}
                </span>
              </div>
            </div>
          </div>

          {/* Media + Lyrics — swapped to the left column on desktop */}
          <div className="glass rounded-2xl flex flex-col p-5 gap-0 overflow-hidden relative lg:order-1">

            {/* Rollback notice — shown when project was missing media */}
            {prefill && (
              <div className="flex items-start gap-3 px-4 py-3 mb-3 rounded-xl bg-amber-500/8 border border-amber-500/20 shrink-0">
                <span className="text-amber-400 text-base leading-none mt-0.5 shrink-0">⚠</span>
                <div>
                  <p className="text-xs font-semibold text-amber-300">{t('setup.noMediaTitle')}</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">{t('setup.noMediaDesc')}</p>
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
                  {tab === 'media' ? t('setup.tabMedia') : t('setup.tabLyrics')}
                </button>
              ))}
            </div>

            {/* MEDIA PANEL */}
            {rightTab === 'media' && (
              <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                {/* Source sub-tabs: YouTube / File & URL */}
                <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-1 shrink-0">
                  {[
                    { id: 'youtube', label: t('setup.tabYoutube') },
                    { id: 'local',   label: t('setup.tabLocal') },
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
                      <Icon name="check" size={24} className="text-green-400" />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm font-semibold text-zinc-200">{t('setup.audioReady')}</p>
                      <p className="text-xs text-zinc-400 truncate max-w-xs mt-0.5">{audioName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => { setAudioState({ ready: false, name: '', ytUrl: '', selectedUpload: null, source: null }); }}
                        className="h-8 px-3 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-lg"
                      >
                        {t('setup.changeAudio')}
                      </Button>
                      <Button
                        onClick={() => setRightTab('lyrics')}
                        className="h-8 px-4 text-xs font-semibold gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50"
                      >
                        {t('setup.nextLyrics')}
                        <Icon name="arrow_forward" size={12} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {audioTab === 'youtube' && (
                      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-zinc-800/50">
                        <YoutubeSearchPanel
                          initialQuery={[songName, songArtist].filter(Boolean).join(' ').trim()}
                          onSelect={({ url, title }: { url: string; title?: string }) => {
                            setAudioState({ ytUrl: url, source: 'youtube', ready: true, name: title || t('setup.youtubeVideo'), selectedUpload: null });
                            playerRef?.current?.loadYouTube?.(url);
                          }}
                        />
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
                              <Icon name="folder_open" size={20} />
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
                            {!ytUrl && <Icon name="link" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />}
                          </div>
                          <Button
                            onClick={handleLoadUrl}
                            disabled={!ytUrl.trim() || ytLoading}
                            className={`h-11 px-4 text-zinc-950 font-bold text-xs rounded-xl shrink-0 ${detectedUrlType === 'cdn' ? 'bg-blue-500 hover:bg-blue-400' : 'bg-primary hover:bg-primary-dim'}`}
                          >
                            {ytLoading ? <Icon name="progress_activity" size={16} className="animate-spin" /> : t('player.load')}
                          </Button>
                        </div>

                        {!user && (
                          <p className="text-[11px] text-zinc-500 px-1 flex items-center gap-1.5 shrink-0">
                            <Icon name="lock" size={12} className="text-zinc-600 shrink-0" />
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
                          uploads={mediaUploads as ComponentProps<typeof MediaLibrary>['uploads']}
                          onSelect={handleSelectUpload as ComponentProps<typeof MediaLibrary>['onSelect']}
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
                      <Icon name="check" size={24} className="text-green-400" />
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
                          <Icon name="upload" size={16} className="text-zinc-500 group-hover:text-primary transition-colors" />
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
                            <Icon name="search" size={14} className="shrink-0 text-zinc-500" />
                            <span className="truncate">
                              {t('lyricsSearch.searchFor')} &ldquo;{[songName, songArtist].filter(Boolean).join(' - ')}&rdquo;
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

    </div>
  );
}
