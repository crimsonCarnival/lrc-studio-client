import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import type { ChangeEvent, ComponentProps, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@ui/button';
import { FloatingInput } from '@ui/floating-input';
import { FloatingCombobox } from '@/shared/ui/floating-combobox';
import { CollapsibleSection } from '@/shared/ui/collapsible-section';
import { TrackNumberField } from '@/shared/ui/track-number-field';
import { CoverDropzone } from './CoverDropzone';
import { useLanguageOptions } from '../../hooks/useLanguageOptions';
import { Textarea } from '@ui/textarea';
import { Switch } from '@ui/switch';
import { Tip } from '@ui/tip';
import { TagsSelector } from '@ui/tags-selector';
import { PRIMARY_GENRES, matchGenreFromTags } from '@features/editor/constants/genre-tags';
import { getMyMusicLibrary } from '@/features/editor/music-library.service';
import { parseRawLyricsText } from '@/features/editor/utils/parse-raw-lyrics';
import { Icon } from '@/shared/ui/Icon';
import { useSetupContext } from '@/features/editor/SetupContext';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { lyrics as lyricsApi, songMetadata as songMetadataApi, getAccessToken } from '@/app/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { uploadsService } from '@/features/projects/services/uploads.service';
import { hasProjectIdentity } from '@/features/projects/project-path';
import { ArtistsSection, type ArtistsSectionHandle } from '@/features/artists/ArtistsSection';
import { TitleFeatSuggestion } from '@/features/artists/TitleFeatSuggestion';
import { mergeCredits, primaryArtistText } from '@/features/artists/artist-credits';
import { formatArtistDisplay, primaryNames, type ArtistCredit } from '@/shared/utils/artists';
import { useAuthContext } from '@/features/auth/useAuthContext';
import YoutubeSearchPanel from '@features/editor/components/setup/YoutubeSearchPanel';
import { YT_UNAVAILABLE_KEYS } from '@/features/player/hooks/useYouTubeAvailability';
import toast from 'react-hot-toast';
import MediaLibrary from './MediaLibrary';
import SingersInput from './SingersInput';
import RawLyricsSyntaxBar from './RawLyricsSyntaxBar';
import LyricsSearchBar from '../lyrics-search/LyricsSearchBar';
import { stripLrcTimestamps } from '@/features/editor/utils/lrc-text';
import type { EditorLine } from '@/features/editor/services/editor.service';
import { useSetupMedia } from '@/features/editor/hooks/useSetupMedia';
import { LogoLoader } from '@ui/LogoLoader';
import { executeRecaptchaSafe } from '@/app/recaptcha-arm';

const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024;


// Typed i18next rejects arbitrary string keys.
type TkFn = (k: string) => string;

interface Prefill {
  lines?: EditorLine[];
  editorMode?: string;
  name?: string;
  description?: string;
  tags?: string[];
  songName?: string;
  artists?: ArtistCredit[];
  songAlbum?: string;
  songYear?: string;
  genre?: string;
  songLanguage?: string;
  trackNumber?: number | string;
  trackCount?: number | string;
  coverImage?: string;
  singers?: string[];
  previewUrl?: string;
  explicit?: boolean;
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
  artists: ArtistCredit[];
  songAlbum: string;
  songYear: string;
  genre: string;
  songLanguage: string;
  trackNumber: number | string;
  trackCount: number | string;
  coverImage: string;
  singers: string[];
  previewUrl: string;
  explicit: boolean;
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
  const location = useLocation();
  const prefill = (location.state as { prefill?: Prefill } | null)?.prefill || null;
  const { step, setStep } = useSetupContext();
  const reducedMotion = useReducedMotion();
  const [rightTab, setRightTab] = useState('media');
  const { executeRecaptcha } = useGoogleReCaptcha();
  // Cover URL is an escape hatch, not a primary path: hidden until requested.
  const [showCoverUrl, setShowCoverUrl] = useState(false);

  // If arriving with prefill data (rollback from no-media project), start at the media step
  useEffect(() => {
    if (prefill) setStep(2);
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => setStep(1);
  }, [setStep]);

  const lyricsInputRef = useRef<HTMLInputElement | null>(null);
  const lyricsTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const projectNameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // autoFocus removed as requested
  }, [step]);

  // Audio state, the media library and every path that reaches the player live in
  // useSetupMedia — the one state group here that is genuinely its own (see that file).
  const revealMediaPanel = useCallback(() => setRightTab('media'), []);
  const {
    audio,
    setAudioState,
    audioInputRef,
    mediaUploads,
    mediaLoading,
    filteredUploads,
    uploadsFilter,
    setUploadsFilter,
    detectedUrlType,
    ytCheck,
    ytLoading,
    clearYtCheck,
    loadYouTubeVerified,
    handleAudioFile,
    handleLoadUrl,
    handleSelectUpload,
    handleDeleteUpload,
    handleYtKeyDown,
  } = useSetupMedia({ playerRef, userId: user?.id, onPreselectUpload: revealMediaPanel });

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
  // const [lyricsAutoSearch, setLyricsAutoSearch] = useState<{ q: string; v: number } | null>(null);


  const [metadata, setMetadata] = useState<MetadataState>(() => ({
    name: prefill?.name || '',
    description: prefill?.description || '',
    tags: prefill?.tags || [],
    // Public by default for authenticated users, unless specified in preferences.
    // Guests can't toggle it, so their drafts stay private until they sign up.
    isPublic: user ? (user.preferences?.defaultProjectPrivacy !== 'private') : false,
    songName: prefill?.songName || '',
    artists: prefill?.artists || [],
    songAlbum: prefill?.songAlbum || '',
    songYear: prefill?.songYear || '',
    genre: prefill?.genre || '',
    songLanguage: prefill?.songLanguage || '',
    trackNumber: prefill?.trackNumber ?? '',
    trackCount: prefill?.trackCount ?? '',
    coverImage: prefill?.coverImage || '',
    singers: prefill?.singers || [],
    previewUrl: prefill?.previewUrl || '',
    explicit: prefill?.explicit ?? false,
  }));

  const [musicLibrary, setMusicLibrary] = useState<MusicEntry[]>([]);
  const [metaSearching, setMetaSearching] = useState(false);
  // Drives the artist editor from the handlers below (lookup, lyrics search, imported file).
  const artistsRef = useRef<ArtistsSectionHandle>(null);

  const { ready: audioReady, name: audioName, tab: audioTab, source: audioSource, ytUrl, selectedUpload } = audio;
  const { text: lyricsText, parsedLines, fileName: lyricsFileName, editorMode } = lyrics;
  const { name: projectName, description: projectDescription, tags: projectTags, isPublic, songName, artists, songAlbum, songYear, genre, songLanguage, trackNumber, trackCount, coverImage, singers, previewUrl, explicit } = metadata;
  // The server owns `songArtist` (derived from the credits); here only the primary names are needed, for lookups.
  const primaryText = primaryArtistText(artists);

  // State setters
  const setLyricsState = useCallback((val: Partial<LyricsState> | ((p: LyricsState) => Partial<LyricsState>)) => setLyrics(prev => ({ ...prev, ...(typeof val === 'function' ? val(prev) : val) })), []);
  const setMetadataState = useCallback((val: Partial<MetadataState> | ((p: MetadataState) => Partial<MetadataState>)) => setMetadata(prev => ({ ...prev, ...(typeof val === 'function' ? val(prev) : val) })), []);

  // 30s preview clip fetched alongside song metadata. Same pattern as
  // UploadsLibrary's preview toggle: one lazily-created <audio>, paused on unmount.
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  useEffect(() => () => { previewAudioRef.current?.pause(); }, []);

  const togglePreviewPlayback = useCallback(() => {
    if (!previewUrl) return;
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
      previewAudioRef.current.addEventListener('ended', () => setPreviewPlaying(false));
    }
    const audioEl = previewAudioRef.current;
    if (previewPlaying) {
      audioEl.pause();
      setPreviewPlaying(false);
      return;
    }
    if (audioEl.src !== previewUrl) audioEl.src = previewUrl;
    audioEl.play().then(() => setPreviewPlaying(true)).catch(() => setPreviewPlaying(false));
  }, [previewUrl, previewPlaying]);



  const hasLyrics = parsedLines ? parsedLines.length > 0 : lyricsText.trim().length > 0;
  // A project must be nameable: a title, song name or artist (also what its URL slug is built from).
  const hasIdentity = hasProjectIdentity({ title: projectName, metadata: { songName, songArtist: formatArtistDisplay(artists) } });
  const canContinue = audioReady && hasLyrics && hasIdentity;

  // Fetch music library for artist/album autofill
  useEffect(() => {
    if (!getAccessToken()) return;
    getMyMusicLibrary().then((lib) => setMusicLibrary(lib as MusicEntry[])).catch(() => {});
  }, []);

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


  // ── Lyrics handlers ──

  const handleLyricsFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['lrc', 'srt', 'txt'].includes(ext)) { toast.error(t('import.unsupportedFormat')); return; }
    if (file.size > MAX_IMPORT_FILE_SIZE) { toast.error(t('import.tooLarge')); return; }
    try {
      const text = await file.text();
      const { lines, metadata: header } = await lyricsApi.parse(text, file.name) as { lines: EditorLine[]; metadata?: { ti?: string; ar?: string } };
      if (lines.length === 0) { toast.error(t('import.noLines')); return; }
      setLyricsState({ parsedLines: lines, fileName: file.name, editorMode: ext === 'srt' ? 'srt' : 'lrc', text: '' });
      // The file's [ar:] / [ti:] header: offered as artists, confirmed first (the parser flags doubtful splits).
      if (header?.ar?.trim()) artistsRef.current?.offer({ title: header.ti ?? '', artist: header.ar }, 'import');
    } catch { toast.error(t('import.failed')); }
  };

  /**
   * Import from the lyrics search. When the provider returned synced LRC and the
   * user kept the timestamps, parse it straight into lines — that skips manual
   * syncing entirely. Otherwise drop plain text into the textarea so they can
   * still edit before syncing.
   */
  const handleLyricsSearchImport = useCallback(async (text: string, keepTimestamps: boolean, song?: { title: string; artist: string }) => {
    // The search found the song's artists too: offer them (primary only by default).
    if (song?.artist) artistsRef.current?.offer({ title: song.title, artist: song.artist }, 'apply');
    if (keepTimestamps) {
      try {
        const { lines } = await lyricsApi.parse(text, 'lyrics.lrc') as { lines: EditorLine[] };
        if (lines.length > 0) {
          setLyricsState({ parsedLines: lines, fileName: '', editorMode: 'lrc', text: '' });
          toast.success(t('lyricsSearch.importedSynced', { count: lines.length }));
          return;
        }
      } catch {
        // Not parseable as LRC after all — fall through and import as plain text
        // rather than failing the import outright.
      }
    }
    setLyricsState({ parsedLines: null, fileName: '', text: stripLrcTimestamps(text) });
  }, [setLyricsState, t]);

  // Seed the search box from the metadata the user already filled in, so opening
  // the tab shows results instead of an empty field. Memoised: LyricsSearchBar
  // re-runs its search whenever this object's identity changes.
  const lyricsAutoSearch = useMemo(() => {
    const q = [songName, primaryText].filter(Boolean).join(' ').trim();
    return q ? { q } : null;
  }, [songName, primaryText]);

  // ── Metadata handlers ──


  const genreOptions    = useMemo(() => PRIMARY_GENRES.map((k) => ({ value: k, label: (t as TkFn)(`setup.genre.${k}`) })), [t]);
  const languageOptions = useLanguageOptions();

  const albumOptions = useMemo(() => {
    const seen = new Set<string>();
    // The library stores primary artists, so match on the first one.
    const firstPrimary = primaryNames(artists)[0];
    const base = firstPrimary
      ? musicLibrary.filter((e) => e.artist?.toLowerCase() === firstPrimary.toLowerCase())
      : musicLibrary;
    return base
      .filter((e) => !!e.album && !seen.has(e.album.toLowerCase()) && !!seen.add(e.album.toLowerCase()))
      .map((e) => ({ value: e.album as string }));
  }, [musicLibrary, artists]);

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
    if (!songName.trim() || !primaryText.trim() || metaSearching) return;
    setMetaSearching(true);
    try {
      const meta = await songMetadataApi.lookupTrack(songName.trim(), primaryText.trim()) as {
        error?: string; genres?: string[]; name?: string; artist?: string; album?: string; releaseYear?: string; totalTracks?: number; albumArt?: string; previewUrl?: string; explicit?: boolean;
      };
      if (meta && !meta.error) {
        const mappedGenre = matchGenreFromTags(meta.genres || []);
        // The old clip is about to be replaced — stop it so the play button
        // doesn't end up pointing at audio that's no longer loaded.
        previewAudioRef.current?.pause();
        setPreviewPlaying(false);
        setMetadataState({
          songName:   meta.name   || songName,
          songAlbum:  meta.album  || songAlbum,
          songYear:   meta.releaseYear || songYear,
          ...(mappedGenre           ? { genre:      mappedGenre              } : {}),
          ...(meta.totalTracks      ? { trackCount: String(meta.totalTracks) } : {}),
          // Populate coverImage from API art if user hasn't set one
          ...(!coverImage && meta.albumArt ? { coverImage: meta.albumArt }   : {}),
          previewUrl: meta.previewUrl || '',
          explicit: !!meta.explicit,
        });
      } else {
        toast.error(t('setup.metaSearchFailed'));
      }
      // The provider answers with one string ("A, B"); the parser turns it into credits and
      // anything doubtful waits for a confirmation. The lookup's artists lead, yours stay.
      if (meta && !meta.error && meta.artist) artistsRef.current?.proposeFromLookup(meta.artist);
    } catch {
      toast.error(t('setup.metaSearchFailed'));
    } finally {
      setMetaSearching(false);
    }
  }, [songName, primaryText, songAlbum, songYear, coverImage, metaSearching, setMetadataState, t]);

  const handleProceed = () => {
    let finalLines = parsedLines;
    if (!finalLines) {
      finalLines = parseRawLyricsText(lyricsText, singers);
    }
    const parsedTrackNumber = parseInt(String(trackNumber), 10);
    const parsedTrackCount = parseInt(String(trackCount), 10);
    onComplete({ lines: finalLines, editorMode, audioSource, ytUrl, audioName: (audioName && !audioName.includes('://')) ? audioName : null, selectedUpload, name: projectName.trim(), description: projectDescription.trim(), tags: projectTags, isPublic, songName: songName.trim(), artists, songAlbum: songAlbum.trim(), songYear: String(songYear).trim(), genre, songLanguage: songLanguage.trim(), trackNumber: isNaN(parsedTrackNumber) ? null : parsedTrackNumber, trackCount: isNaN(parsedTrackCount) ? null : parsedTrackCount, coverImage: coverImage.trim(), singers, previewUrl: previewUrl.trim(), explicit });
  };

  // Resolves with the uploaded URL and lets failures propagate — CoverDropzone
  // owns the validation messages and the busy state. The previous version
  // swallowed every error, so a rejected file looked like a dead button.
  const uploadCover = useCallback(async (file: File): Promise<string> => {
    const token = await executeRecaptchaSafe(executeRecaptcha, 'upload_cover');
    return await uploadsService.uploadCoverImage(file, token) as string;
  }, [executeRecaptcha]);

  // Which optional fields already carry a value. Drives both the pill on the
  // collapsed header and whether it starts open, so a project that already has
  // metadata never hides it behind a click.
  const filledDetails = [songAlbum, songYear, String(trackNumber ?? ''), genre, songLanguage]
    .filter((v) => !!v && String(v).trim() !== '').length + (projectTags.length > 0 ? 1 : 0);

  return (
    // max-h-[100dvh] is load-bearing: h-full resolves against an ancestor that
    // is taller than the window here, so the column came out 808px tall in a
    // 700px viewport. Its inner scroller then saw scrollHeight === clientHeight,
    // reported itself already at the bottom, and the last ~100px — the media
    // panel's Change / Next buttons — were simply cut off with no way to reach
    // them. dvh rather than vh so a collapsing mobile URL bar is accounted for.
    <div className="flex flex-col h-full max-h-[100dvh] overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 px-4 sm:px-6 pt-4 pb-3">
        {/* Wraps below sm: title, visibility and the primary action do not fit
            on one 390px row, and the action was the part that fell off the
            right edge — the one control the screen exists to reach. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`size-2 rounded-full bg-primary shrink-0 ${reducedMotion ? '' : 'animate-pulse'}`} />
            <h2 className="font-heading text-zinc-100" style={{ fontSize: 'clamp(1.05rem, 2vw, 1.3rem)' }}>
              {t('setup.newProjectTitle')}
            </h2>
          </div>
          <div className="flex items-center gap-4 shrink-0 max-sm:w-full max-sm:justify-between">
            {/* Visibility lives up here rather than at the foot of the form: it
                is a property of the project, not another metadata field, and
                the form below needs the vertical room. */}
            <Tip content={!user ? t('setup.visibilityNeedsAccount') : isPublic ? t('setup.publicHelp') : t('setup.privateHelp')}>
              <div className="flex items-center gap-2">
                <Switch
                  id="project-public"
                  checked={isPublic}
                  onCheckedChange={(checked: boolean) => setMetadataState({ isPublic: checked })}
                  disabled={!user}
                />
                <label
                  htmlFor="project-public"
                  className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 cursor-pointer select-none"
                >
                  {isPublic ? t('setup.public') : t('setup.private')}
                </label>
              </div>
            </Tip>

            <Button
              onClick={handleProceed}
              disabled={!canContinue}
              className="h-9 coarse:h-11 px-5 shrink-0 bg-primary hover:bg-primary-dim text-zinc-950 font-bold rounded-xl gap-2 shadow-glow transition-all text-sm disabled:shadow-none"
            >
              {t('setup.startToSync')}
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex-1 min-h-0 px-6 overflow-y-auto lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-7xl mx-auto pb-3 lg:h-[calc(100%-1rem)] lg:pb-0">

          {/* Project info — left column on desktop */}
          <div className="glass rounded-2xl flex flex-col p-4 gap-3 self-start lg:self-auto lg:overflow-y-auto lg:scrollbar-thin relative lg:order-1">

            {/* Essentials: cover anchors the identity fields beside it */}
            <div className="flex gap-3 shrink-0">
              <CoverDropzone
                value={coverImage}
                onChange={(url) => setMetadataState({ coverImage: url })}
                onUpload={uploadCover}
                onToggleUrl={() => setShowCoverUrl((v) => !v)}
                urlOpen={showCoverUrl}
              />
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <FloatingInput
                  ref={projectNameInputRef}
                  id="project-name"
                  type="text"
                  label={t('setup.projectName')}
                  aria-invalid={audioReady && hasLyrics && !hasIdentity}
                  aria-describedby="project-identity-hint"
                  value={projectName}
                  onChange={(e) => setMetadataState({ name: e.target.value })}
                  placeholder={t('setup.projectNamePlaceholder')}
                  maxLength={200}
                />
                <TitleFeatSuggestion
                  title={projectName}
                  onApply={(cleaned, featured) => setMetadataState((prev) => ({ name: cleaned, artists: mergeCredits(prev.artists, featured) }))}
                />
                <p
                  id="project-identity-hint"
                  className={`text-xs ${audioReady && hasLyrics && !hasIdentity ? 'text-love' : 'text-zinc-500'}`}
                  role={audioReady && hasLyrics && !hasIdentity ? 'alert' : undefined}
                >
                  {t('setup.identityRequired')}
                </p>

                {/* Sits inside the cover's own row so the URL path is next to
                    the thing it sets, and costs no height until asked for. */}
                {showCoverUrl && (
                  <FloatingInput
                    id="cover-image"
                    type="text"
                    label={t('setup.coverUrlLabel')}
                    value={coverImage}
                    onChange={(e) => setMetadataState({ coverImage: e.target.value })}
                    placeholder={t('setup.coverImagePlaceholder')}
                  />
                )}
              </div>
            </div>

            {/* Song name + primary artist are what the lookup needs, so the
                button sits directly under them instead of after the featured
                field, where it read as unrelated to the inputs it uses. */}
            <div className="shrink-0 flex flex-col gap-3">
              <FloatingInput id="song-name" type="text" label={t('setup.songName')} value={songName}
                onChange={(e) => setMetadataState({ songName: e.target.value })}
                maxLength={500} />
              <ArtistsSection
                ref={artistsRef}
                idPrefix="setup-artists"
                value={artists}
                onChange={(next) => setMetadataState({ artists: next })}
                afterPrimary={(
                  <Tip content={songName.trim() && primaryText.trim() ? t('setup.fetchSongInfo') : t('setup.fetchInfoNeedsFields')}>
                    {/* span keeps the tooltip working while the button is disabled */}
                    <span className="block">
                      <Button
                        type="button"
                        variant="sync"
                        onClick={handleFetchSongInfo}
                        disabled={metaSearching || !songName.trim() || !primaryText.trim()}
                        className="w-full h-10 coarse:h-12 gap-2 justify-center font-semibold rounded-xl"
                      >
                        {metaSearching ? <LogoLoader size={16} /> : <Icon name="search" size={16} />}
                        {t('setup.fetchInfo')}
                      </Button>
                    </span>
                  </Tip>
                )}
              />
            </div>

            {/* Only shown once a lookup actually populated one of these — neither
                field has a manual input, so an empty row would just be dead space. */}
            {(previewUrl || explicit) && (
              <div className="shrink-0 flex items-center gap-2 -mt-1">
                {previewUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={togglePreviewPlayback}
                    aria-label={previewPlaying ? t('setup.previewPause') : t('setup.previewPlay')}
                    className="h-8 px-3 gap-1.5 rounded-full text-xs"
                  >
                    <Icon name={previewPlaying ? 'pause' : 'play_arrow'} size={14} filled />
                    {t('setup.previewClip')}
                  </Button>
                )}
                <Tip content={t('setup.explicitHint')}>
                  <button
                    type="button"
                    onClick={() => setMetadataState({ explicit: !explicit })}
                    aria-pressed={explicit}
                    className={`h-8 px-3 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                      explicit ? 'bg-love/20 text-love' : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {t('setup.explicit')}
                  </button>
                </Tip>
              </div>
            )}

            {/* Singers — the song-level roster offered when tagging sections/lines */}
            <div className="shrink-0">
              <SingersInput value={singers} onChange={(next) => setMetadataState({ singers: next })} />
            </div>

            <CollapsibleSection
              title={t('setup.moreDetails')}
              hint={t('setup.moreDetailsHint')}
              filledCount={filledDetails}
              defaultOpen={filledDetails > 0}
            >
              <div className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr] gap-3 items-start">
                <FloatingCombobox
                  id="song-album"
                  label={t('setup.songAlbum')}
                  value={songAlbum}
                  onChange={(v: string) => setMetadataState({ songAlbum: v })}
                  onSelect={handleAlbumSelect}
                  options={albumOptions}
                  maxLength={300}
                  className="col-span-2 sm:col-span-1"
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
                <TrackNumberField
                  id="track"
                  label={t('setup.trackLabel')}
                  ariaLabel={t('setup.trackOfAria')}
                  number={String(trackNumber ?? '')}
                  count={String(trackCount ?? '')}
                  onNumberChange={(v) => setMetadataState({ trackNumber: v })}
                  onCountChange={(v) => setMetadataState({ trackCount: v })}
                />
              </div>

              {/* Three even columns: genre and tags were taking two thirds of a
                  row each for values that are a single short word. */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-start">
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
                <FloatingCombobox
                  id="song-language"
                  label={t('setup.songLanguage')}
                  value={songLanguage}
                  onChange={(v: string) => setMetadataState({ songLanguage: v })}
                  options={languageOptions}
                  maxLength={100}
                  strict
                />
                <div className="col-span-2 sm:col-span-1">
                  <TagsSelector
                    value={projectTags}
                    onChange={(tags: string[]) => setMetadataState({ tags })}
                    genre={genre}
                  />
                  {/* The control looked disabled with no reason given */}
                  {!genre && (
                    <p className="mt-1 text-[11px] text-zinc-500">{t('setup.tagsNeedGenre')}</p>
                  )}
                </div>
              </div>
            </CollapsibleSection>

          </div>

          {/* Media + Lyrics — right column on desktop */}
          <div className="glass rounded-2xl flex flex-col p-5 gap-0 overflow-hidden relative lg:order-2">

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
                  className={`px-4 py-2 coarse:py-3.5 text-xs font-bold border-b-2 -mb-px transition-colors capitalize ${
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
                    // Signed-in only: guests have no stored uploads to pick from.
                    ...(user ? [{ id: 'library', label: t('setup.tabUploads') }] : []),
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setAudioState({ tab: tab.id }); if (ytCheck.state !== 'idle') clearYtCheck(); }}
                      className={`flex-1 h-7 coarse:h-11 rounded-lg text-[11px] font-semibold transition-all ${
                        audioTab === tab.id
                          ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {!audioReady && ytCheck.state === 'checking' && (
                  <div role="status" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-xs text-zinc-300 shrink-0">
                    <LogoLoader size={14} className="text-primary shrink-0" />
                    {t('setup.ytChecking')}
                  </div>
                )}
                {!audioReady && ytCheck.state === 'unavailable' && (
                  <div role="alert" className="flex items-start gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive shrink-0">
                    <Icon name="error" size={14} className="shrink-0 mt-px" />
                    {(t as TkFn)(YT_UNAVAILABLE_KEYS[ytCheck.reason])}
                  </div>
                )}

                {/* Audio ready state */}
                {audioReady ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50 min-h-[140px]">
                    <div className="size-11 rounded-full bg-green-500/15 flex items-center justify-center ring-4 ring-green-500/5">
                      <Icon name="check" size={24} className="text-green-400" />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm font-semibold text-zinc-200">{t('setup.audioReady')}</p>
                      <p className="text-xs text-zinc-400 truncate max-w-xs mt-0.5">{audioName}</p>
                      {audioSource === 'youtube' && ytCheck.state === 'unverified' && (
                        <p role="status" className="flex items-center justify-center gap-1.5 text-xs text-warning mt-2 max-w-xs">
                          <Icon name="warning" size={12} className="shrink-0" />
                          {t('setup.ytCheckFailed')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => { setAudioState({ ready: false, name: '', ytUrl: '', selectedUpload: null, source: null }); clearYtCheck(); }}
                        className="h-8 coarse:h-11 px-3 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-lg"
                      >
                        {t('setup.changeAudio')}
                      </Button>
                      <Button
                        onClick={() => setRightTab('lyrics')}
                        className="h-8 coarse:h-11 px-4 text-xs font-semibold gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50"
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
                          initialQuery={[songName, primaryText].filter(Boolean).join(' ').trim()}
                          onSelect={({ videoId, url, title }: { videoId: string; url: string; title?: string }) => {
                            loadYouTubeVerified(videoId, url, { ytUrl: url, name: title || t('setup.youtubeVideo') });
                          }}
                        />
                      </div>
                    )}

                    {audioTab === 'local' && (
                      <div className="flex-1 flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-0.5">
                        {/* URL + file input */}
                        <div className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/60 focus-within:border-primary/40 transition-all shrink-0">
                          <Tip content={t('setup.uploadAudio')}>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => audioInputRef.current?.click()}
                              aria-label={t('setup.uploadAudio')}
                              className="size-11 lg:size-11"
                            >
                              <Icon name="folder_open" size={20} />
                              <input ref={audioInputRef} id="setup-audio-input" type="file" accept="audio/*" onChange={handleAudioFile} className="hidden" />
                            </Button>
                          </Tip>
                          <div className="relative flex-1 flex items-center">
                            <FloatingInput
                              id="setup-media-url"
                              type="text"
                              label={t('setup.urlPlaceholder')}
                              hasIcon={true}
                              value={ytUrl}
                              onChange={(e) => {
                                setAudioState({ ytUrl: e.target.value });
                                if (ytCheck.state === 'unavailable') clearYtCheck();
                              }}
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
                            {ytLoading ? <LogoLoader size={16} /> : t('player.load')}
                          </Button>
                        </div>

                        {!user && (
                          <p className="text-[11px] text-zinc-500 px-1 flex items-center gap-1.5 shrink-0">
                            <Icon name="lock" size={12} className="text-zinc-600 shrink-0" />
                            {t('setup.guestUploadNote')}{' '}
                            <Link to="/auth?action=signup" className="text-primary hover:text-primary/80 underline underline-offset-2 font-medium">
                              {t('auth.signUp')}
                            </Link>{' '}
                            {t('setup.guestUploadNoteKeep')}
                          </p>
                        )}

                        {/* Recent media — the full list lives in the "Your uploads" tab */}
                        <MediaLibrary
                          loading={mediaLoading}
                          uploads={mediaUploads as ComponentProps<typeof MediaLibrary>['uploads']}
                          onSelect={handleSelectUpload as ComponentProps<typeof MediaLibrary>['onSelect']}
                          onDelete={handleDeleteUpload}
                          onShowAll={() => setAudioState({ tab: 'library' })}
                          selectedId={selectedUpload?.id}
                        />
                      </div>
                    )}

                    {audioTab === 'library' && (
                      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                        {mediaUploads.length > 5 && (
                          <FloatingInput
                            id="setup-uploads-filter"
                            type="search"
                            label={t('setup.uploadsFilter')}
                            value={uploadsFilter}
                            onChange={(e) => setUploadsFilter(e.target.value)}
                            className="shrink-0"
                          />
                        )}
                        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-0.5">
                          {!mediaLoading && mediaUploads.length === 0 ? (
                            <p className="text-xs text-zinc-500 text-center py-8">{t('setup.yourMediaEmpty')}</p>
                          ) : !mediaLoading && filteredUploads.length === 0 ? (
                            <p className="text-xs text-zinc-500 text-center py-8">{t('setup.uploadsNoMatch')}</p>
                          ) : (
                            <MediaLibrary
                              loading={mediaLoading}
                              uploads={filteredUploads as ComponentProps<typeof MediaLibrary>['uploads']}
                              onSelect={handleSelectUpload as ComponentProps<typeof MediaLibrary>['onSelect']}
                              onDelete={handleDeleteUpload}
                              onShowAll={onShowAllUploads}
                              selectedId={selectedUpload?.id}
                              limit={null}
                            />
                          )}
                        </div>
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
                      className="h-8 coarse:h-11 px-3 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-lg"
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
                          className={`flex-1 h-7 coarse:h-11 rounded-lg text-[11px] font-semibold transition-all ${
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
                          ref={lyricsTextareaRef}
                          value={lyricsText}
                          onChange={(e) => setLyricsState({ text: e.target.value })}
                          placeholder={t('setup.pasteLyricsDesc')}
                          className="flex-1 min-h-0 resize-none text-sm p-3 leading-relaxed overflow-y-auto scrollbar-thin"
                        />
                        <RawLyricsSyntaxBar
                          value={lyricsText}
                          onChange={(text) => setLyricsState({ text })}
                          textareaRef={lyricsTextareaRef}
                          singers={singers}
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
                        <LyricsSearchBar
                          onImport={handleLyricsSearchImport}
                          autoSearch={lyricsAutoSearch}
                        />
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
