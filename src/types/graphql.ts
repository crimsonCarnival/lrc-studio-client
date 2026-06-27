/**
 * GraphQL TypeScript types. HAND-MAINTAINED — codegen was removed (its cli/plugin
 * version skew duplicated every base type). When the server GraphQL schema changes,
 * edit the affected type here by hand (add/remove fields, types, enum members).
 * Operation result/variables types are not generated; call sites type gqlRequest
 * inline (e.g. gqlRequest<{ field: T }>(QUERY)).
 */

/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Activity = {
  actor: FollowUser;
  coverImage?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  projectTitle: Scalars['String']['output'];
  publicId: Scalars['String']['output'];
  targetPath?: Maybe<Scalars['String']['output']>;
  type: ActivityType;
};

export type ActivityHeatmapDay = {
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
};

export type ActivityType =
  | 'PLAYLIST_CREATED'
  | 'PROJECT_BOOSTED'
  | 'PROJECT_FORKED'
  | 'PROJECT_PUBLISHED'
  | 'PROJECT_STARRED'
  | 'USER_FOLLOWED';

export type AdvancedSettings = {
  autoSave?: Maybe<AutoSaveSettings>;
  confirmDestructive?: Maybe<Scalars['Boolean']['output']>;
  timezone?: Maybe<Scalars['String']['output']>;
};

export type AdvancedSettingsInput = {
  autoSave?: InputMaybe<AutoSaveSettingsInput>;
  confirmDestructive?: InputMaybe<Scalars['Boolean']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type AutoAdvanceSettings = {
  enabled?: Maybe<Scalars['Boolean']['output']>;
  mode?: Maybe<Scalars['String']['output']>;
  skipBlank?: Maybe<Scalars['Boolean']['output']>;
};

export type AutoAdvanceSettingsInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  mode?: InputMaybe<Scalars['String']['input']>;
  skipBlank?: InputMaybe<Scalars['Boolean']['input']>;
};

export type AutoRewindSettings = {
  enabled?: Maybe<Scalars['Boolean']['output']>;
  seconds?: Maybe<Scalars['Float']['output']>;
};

export type AutoRewindSettingsInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  seconds?: InputMaybe<Scalars['Float']['input']>;
};

export type AutoSaveSettings = {
  enabled?: Maybe<Scalars['Boolean']['output']>;
  timeInterval?: Maybe<Scalars['Float']['output']>;
};

export type AutoSaveSettingsInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  timeInterval?: InputMaybe<Scalars['Float']['input']>;
};

export type BadgeDef = {
  autoGrant: Scalars['Boolean']['output'];
  color: Scalars['String']['output'];
  conditionType: Scalars['String']['output'];
  conditionValue?: Maybe<Scalars['Int']['output']>;
  description: Scalars['String']['output'];
  holderCount: Scalars['Int']['output'];
  icon: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isBuiltin: Scalars['Boolean']['output'];
  label: Scalars['String']['output'];
  xpReward: Scalars['Int']['output'];
};

export type BadgeDefInput = {
  autoGrant?: InputMaybe<Scalars['Boolean']['input']>;
  color: Scalars['String']['input'];
  conditionType: Scalars['String']['input'];
  conditionValue?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  icon: Scalars['String']['input'];
  id?: InputMaybe<Scalars['String']['input']>;
  label: Scalars['String']['input'];
  xpReward?: InputMaybe<Scalars['Int']['input']>;
};

export type ContentStats = {
  averageLinesPerProject: Scalars['Int']['output'];
  averageProjectCompletion: Scalars['Int']['output'];
  completionPercentage: Scalars['Int']['output'];
  forksReceived: Scalars['Int']['output'];
  fullySyncedProjects: Scalars['Int']['output'];
  karaokeLines: Scalars['Int']['output'];
  largestProject?: Maybe<ProjectStats>;
  mostSyncedProject?: Maybe<ProjectStats>;
  musicSyncedMinutes: Scalars['Int']['output'];
  publicProjects: Scalars['Int']['output'];
  starsReceived: Scalars['Int']['output'];
  syncTrendPercentage: Scalars['Int']['output'];
  syncedLines: Scalars['Int']['output'];
  totalLines: Scalars['Int']['output'];
  totalProjects: Scalars['Int']['output'];
  wordsTimestamped: Scalars['Int']['output'];
};

export type CreatePlaylistInput = {
  coverImage?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  publicIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  sortMode?: InputMaybe<PlaylistSortMode>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateProjectInput = {
  coverImage?: InputMaybe<Scalars['String']['input']>;
  lyrics?: InputMaybe<ProjectLyricsInput>;
  metadata?: InputMaybe<ProjectMetadataInput>;
  public?: InputMaybe<Scalars['Boolean']['input']>;
  readOnly?: InputMaybe<Scalars['Boolean']['input']>;
  recaptchaToken?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<ProjectStateInput>;
  title?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
  uploadId?: InputMaybe<Scalars['ID']['input']>;
};

export type DisplaySettings = {
  activeHighlight?: Maybe<Scalars['String']['output']>;
  dualLine?: Maybe<Scalars['Boolean']['output']>;
  karaokeFillEasing?: Maybe<Scalars['String']['output']>;
  karaokeFillTrack?: Maybe<Scalars['String']['output']>;
  languageLayout?: Maybe<Scalars['String']['output']>;
  readingFormat?: Maybe<Scalars['String']['output']>;
  showNextLine?: Maybe<Scalars['Boolean']['output']>;
  translationLayout?: Maybe<Scalars['String']['output']>;
};

export type DisplaySettingsInput = {
  activeHighlight?: InputMaybe<Scalars['String']['input']>;
  dualLine?: InputMaybe<Scalars['Boolean']['input']>;
  karaokeFillEasing?: InputMaybe<Scalars['String']['input']>;
  karaokeFillTrack?: InputMaybe<Scalars['String']['input']>;
  languageLayout?: InputMaybe<Scalars['String']['input']>;
  readingFormat?: InputMaybe<Scalars['String']['input']>;
  showNextLine?: InputMaybe<Scalars['Boolean']['input']>;
  translationLayout?: InputMaybe<Scalars['String']['input']>;
};

export type EditorSettings = {
  autoAdvance?: Maybe<AutoAdvanceSettings>;
  autoPauseOnMark?: Maybe<Scalars['Boolean']['output']>;
  display?: Maybe<DisplaySettings>;
  history?: Maybe<HistorySettings>;
  nudge?: Maybe<NudgeSettings>;
  scroll?: Maybe<ScrollSettings>;
  shiftAllAmount?: Maybe<Scalars['Float']['output']>;
  showLineNumbers?: Maybe<Scalars['Boolean']['output']>;
  showShiftAll?: Maybe<Scalars['Boolean']['output']>;
  srt?: Maybe<SrtSettings>;
  timestampPrecision?: Maybe<Scalars['String']['output']>;
};

export type EditorSettingsInput = {
  autoAdvance?: InputMaybe<AutoAdvanceSettingsInput>;
  autoPauseOnMark?: InputMaybe<Scalars['Boolean']['input']>;
  display?: InputMaybe<DisplaySettingsInput>;
  history?: InputMaybe<HistorySettingsInput>;
  nudge?: InputMaybe<NudgeSettingsInput>;
  scroll?: InputMaybe<ScrollSettingsInput>;
  shiftAllAmount?: InputMaybe<Scalars['Float']['input']>;
  showLineNumbers?: InputMaybe<Scalars['Boolean']['input']>;
  showShiftAll?: InputMaybe<Scalars['Boolean']['input']>;
  srt?: InputMaybe<SrtSettingsInput>;
  timestampPrecision?: InputMaybe<Scalars['String']['input']>;
};

export type EmailChange = {
  changedAt: Scalars['String']['output'];
  from: Scalars['String']['output'];
  to: Scalars['String']['output'];
};

export type ExploreStats = {
  totalPlaylists: Scalars['Int']['output'];
  totalProjects: Scalars['Int']['output'];
  totalUsers: Scalars['Int']['output'];
};

export type ExportSettings = {
  copyFormat?: Maybe<Scalars['String']['output']>;
  defaultFilenamePattern?: Maybe<Scalars['String']['output']>;
  downloadFormat?: Maybe<Scalars['String']['output']>;
  includeMetadata?: Maybe<Scalars['Boolean']['output']>;
  lineEndings?: Maybe<Scalars['String']['output']>;
  normalizeTimestamps?: Maybe<Scalars['Boolean']['output']>;
  stripEmptyLines?: Maybe<Scalars['Boolean']['output']>;
  timestampPrecision?: Maybe<Scalars['String']['output']>;
  wordTimestampPrecision?: Maybe<Scalars['String']['output']>;
};

export type ExportSettingsInput = {
  copyFormat?: InputMaybe<Scalars['String']['input']>;
  defaultFilenamePattern?: InputMaybe<Scalars['String']['input']>;
  downloadFormat?: InputMaybe<Scalars['String']['input']>;
  includeMetadata?: InputMaybe<Scalars['Boolean']['input']>;
  lineEndings?: InputMaybe<Scalars['String']['input']>;
  normalizeTimestamps?: InputMaybe<Scalars['Boolean']['input']>;
  stripEmptyLines?: InputMaybe<Scalars['Boolean']['input']>;
  timestampPrecision?: InputMaybe<Scalars['String']['input']>;
  wordTimestampPrecision?: InputMaybe<Scalars['String']['input']>;
};

export type FeedResult = {
  activities: Array<Activity>;
  hasMore: Scalars['Boolean']['output'];
};

export type FollowListResult = {
  total: Scalars['Int']['output'];
  users: Array<FollowUser>;
};

export type FollowListType =
  | 'FOLLOWERS'
  | 'FOLLOWING'
  | 'FRIENDS';

export type FollowUser = {
  accountName: Scalars['String']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isFollowedByMe: Scalars['Boolean']['output'];
};

export type ForkedFrom = {
  accountName?: Maybe<Scalars['String']['output']>;
  publicId?: Maybe<Scalars['String']['output']>;
  userId?: Maybe<Scalars['ID']['output']>;
};

export type GoogleInfo = {
  connected: Scalars['Boolean']['output'];
  email?: Maybe<Scalars['String']['output']>;
  googleId?: Maybe<Scalars['String']['output']>;
  /** Supplied by the REST /me payload, not the GraphQL schema. */
  lastUsedAt?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  pictureUrl?: Maybe<Scalars['String']['output']>;
};

export type HealthStatus = {
  status: Scalars['String']['output'];
  uptime?: Maybe<Scalars['Float']['output']>;
  version?: Maybe<Scalars['String']['output']>;
};

export type HistorySettings = {
  groupingThresholdMs?: Maybe<Scalars['Float']['output']>;
  limit?: Maybe<Scalars['Int']['output']>;
};

export type HistorySettingsInput = {
  groupingThresholdMs?: InputMaybe<Scalars['Float']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type ImportSettings = {
  expandRepeats?: Maybe<Scalars['Boolean']['output']>;
};

export type ImportSettingsInput = {
  expandRepeats?: InputMaybe<Scalars['Boolean']['input']>;
};

export type InterfaceSettings = {
  defaultLanguage?: Maybe<Scalars['String']['output']>;
  editorWidth?: Maybe<Scalars['Float']['output']>;
  focusMode?: Maybe<Scalars['String']['output']>;
  fontSize?: Maybe<Scalars['String']['output']>;
  layoutSwap?: Maybe<Scalars['Boolean']['output']>;
  lockLayout?: Maybe<Scalars['Boolean']['output']>;
  mobileTab?: Maybe<Scalars['String']['output']>;
  playerTop?: Maybe<Scalars['Boolean']['output']>;
  previewAlignment?: Maybe<Scalars['String']['output']>;
  spacing?: Maybe<Scalars['String']['output']>;
  theme?: Maybe<Scalars['String']['output']>;
  toastPosition?: Maybe<Scalars['String']['output']>;
};

export type InterfaceSettingsInput = {
  defaultLanguage?: InputMaybe<Scalars['String']['input']>;
  editorWidth?: InputMaybe<Scalars['Float']['input']>;
  focusMode?: InputMaybe<Scalars['String']['input']>;
  fontSize?: InputMaybe<Scalars['String']['input']>;
  layoutSwap?: InputMaybe<Scalars['Boolean']['input']>;
  lockLayout?: InputMaybe<Scalars['Boolean']['input']>;
  mobileTab?: InputMaybe<Scalars['String']['input']>;
  playerTop?: InputMaybe<Scalars['Boolean']['input']>;
  previewAlignment?: InputMaybe<Scalars['String']['input']>;
  spacing?: InputMaybe<Scalars['String']['input']>;
  theme?: InputMaybe<Scalars['String']['input']>;
  toastPosition?: InputMaybe<Scalars['String']['input']>;
};

export type LeaderboardResult = {
  hasMore: Scalars['Boolean']['output'];
  total: Scalars['Int']['output'];
  users: Array<LeaderboardUser>;
};

export type LeaderboardUser = {
  accountName: Scalars['String']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  badges: Array<UserBadge>;
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  progression?: Maybe<UserProgression>;
  projectCount: Scalars['Int']['output'];
  stats?: Maybe<UserStats>;
  streak?: Maybe<UserStreak>;
  totalForksReceived: Scalars['Int']['output'];
  totalStarsReceived: Scalars['Int']['output'];
};

export type Line = {
  endTime?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  mode?: Maybe<Scalars['String']['output']>;
  secondary?: Maybe<Scalars['String']['output']>;
  secondaryWords?: Maybe<Array<Word>>;
  singers?: Maybe<Array<Scalars['String']['output']>>;
  text?: Maybe<Scalars['String']['output']>;
  timestamp?: Maybe<Scalars['Float']['output']>;
  translation?: Maybe<Scalars['String']['output']>;
  translations?: Maybe<Array<Translation>>;
  words?: Maybe<Array<Word>>;
};

export type LineInput = {
  depth?: InputMaybe<Scalars['Int']['input']>;
  endTime?: InputMaybe<Scalars['Float']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  mode?: InputMaybe<Scalars['String']['input']>;
  secondary?: InputMaybe<Scalars['String']['input']>;
  secondaryWords?: InputMaybe<Array<WordInput>>;
  singers?: InputMaybe<Array<Scalars['String']['input']>>;
  text?: InputMaybe<Scalars['String']['input']>;
  timestamp?: InputMaybe<Scalars['Float']['input']>;
  translation?: InputMaybe<Scalars['String']['input']>;
  translations?: InputMaybe<Array<TranslationInput>>;
  type?: InputMaybe<Scalars['String']['input']>;
  words?: InputMaybe<Array<WordInput>>;
};

export type Lyrics = {
  createdAt?: Maybe<Scalars['String']['output']>;
  editorMode: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  language?: Maybe<Scalars['String']['output']>;
  publicId: Scalars['String']['output'];
  sections: Array<Section>;
  updatedAt?: Maybe<Scalars['String']['output']>;
  version?: Maybe<Scalars['Int']['output']>;
};

export type MusicLibraryEntry = {
  album?: Maybe<Scalars['String']['output']>;
  artist?: Maybe<Scalars['String']['output']>;
  genre?: Maybe<Scalars['String']['output']>;
  language?: Maybe<Scalars['String']['output']>;
  trackCount?: Maybe<Scalars['Int']['output']>;
};

export type Mutation = {
  addProjectToPlaylist: Playlist;
  adminCreateBadge: BadgeDef;
  adminDeleteBadge: Scalars['Boolean']['output'];
  adminGrantBadge: Scalars['Boolean']['output'];
  adminRetroactiveScan: RetroactiveResult;
  adminRevokeBadge: Scalars['Boolean']['output'];
  adminUpdateBadge: BadgeDef;
  boostProject: Scalars['Boolean']['output'];
  cloneProject: Project;
  createPlaylist: Playlist;
  createProject: Project;
  deleteMedia: Scalars['Boolean']['output'];
  deletePlaylist: Scalars['Boolean']['output'];
  deleteProject: Scalars['Boolean']['output'];
  follow: Scalars['Boolean']['output'];
  reactToProject: ProjectReactions;
  removeProjectFromPlaylist: Playlist;
  reorderPlaylist: Playlist;
  resetSettings: Scalars['Boolean']['output'];
  saveMedia: Upload;
  savePlaylist: Scalars['Boolean']['output'];
  sendVerificationEmail: Scalars['Boolean']['output'];
  setForksEnabled: Project;
  starProject: Project;
  unfollow: Scalars['Boolean']['output'];
  unsavePlaylist: Scalars['Boolean']['output'];
  unstarProject: Project;
  updateLyrics: Lyrics;
  updatePlaylist: Playlist;
  updateProfile: User;
  updateProject: Project;
  updateSettings: Settings;
  updateShowcase: UpdateShowcaseResult;
};


export type MutationAddProjectToPlaylistArgs = {
  playlistId: Scalars['ID']['input'];
  publicId: Scalars['ID']['input'];
};


export type MutationAdminCreateBadgeArgs = {
  input: BadgeDefInput;
};


export type MutationAdminDeleteBadgeArgs = {
  id: Scalars['String']['input'];
};


export type MutationAdminGrantBadgeArgs = {
  badgeId: Scalars['String']['input'];
  userIdentifier: Scalars['String']['input'];
};


export type MutationAdminRetroactiveScanArgs = {
  badgeId: Scalars['String']['input'];
};


export type MutationAdminRevokeBadgeArgs = {
  badgeId: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationAdminUpdateBadgeArgs = {
  id: Scalars['String']['input'];
  input: BadgeDefInput;
};


export type MutationBoostProjectArgs = {
  publicId: Scalars['ID']['input'];
};


export type MutationCloneProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreatePlaylistArgs = {
  input: CreatePlaylistInput;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationDeleteMediaArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePlaylistArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationFollowArgs = {
  accountName: Scalars['String']['input'];
};


export type MutationReactToProjectArgs = {
  emoji: Scalars['String']['input'];
  publicId: Scalars['String']['input'];
};


export type MutationRemoveProjectFromPlaylistArgs = {
  playlistId: Scalars['ID']['input'];
  publicId: Scalars['ID']['input'];
};


export type MutationReorderPlaylistArgs = {
  playlistId: Scalars['ID']['input'];
  publicIds: Array<Scalars['ID']['input']>;
};


export type MutationSaveMediaArgs = {
  input: SaveMediaInput;
};


export type MutationSavePlaylistArgs = {
  playlistId: Scalars['ID']['input'];
};


export type MutationSetForksEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
  publicId: Scalars['ID']['input'];
};


export type MutationStarProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUnfollowArgs = {
  accountName: Scalars['String']['input'];
};


export type MutationUnsavePlaylistArgs = {
  playlistId: Scalars['ID']['input'];
};


export type MutationUnstarProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateLyricsArgs = {
  input: UpdateLyricsInput;
  publicId: Scalars['String']['input'];
};


export type MutationUpdatePlaylistArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePlaylistInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdateProjectArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProjectInput;
};


export type MutationUpdateSettingsArgs = {
  input: UpdateSettingsInput;
};


export type MutationUpdateShowcaseArgs = {
  badgeIds: Array<Scalars['String']['input']>;
  showcasePublic?: InputMaybe<Scalars['Boolean']['input']>;
};

export type NameChange = {
  changedAt: Scalars['String']['output'];
  from: Scalars['String']['output'];
  to: Scalars['String']['output'];
};

export type NudgeSettings = {
  coarse?: Maybe<Scalars['Float']['output']>;
  default?: Maybe<Scalars['Float']['output']>;
  fine?: Maybe<Scalars['Float']['output']>;
};

export type NudgeSettingsInput = {
  coarse?: InputMaybe<Scalars['Float']['input']>;
  default?: InputMaybe<Scalars['Float']['input']>;
  fine?: InputMaybe<Scalars['Float']['input']>;
};

export type PlaybackSettings = {
  autoRewindOnPause?: Maybe<AutoRewindSettings>;
  loopCurrentLine?: Maybe<Scalars['Boolean']['output']>;
  muted?: Maybe<Scalars['Boolean']['output']>;
  seekPlays?: Maybe<Scalars['Boolean']['output']>;
  seekTime?: Maybe<Scalars['Float']['output']>;
  showWaveform?: Maybe<Scalars['Boolean']['output']>;
  speedBounds?: Maybe<SpeedBoundsSettings>;
  speedPresets?: Maybe<Array<Scalars['Float']['output']>>;
  volume?: Maybe<Scalars['Float']['output']>;
  waveformSnap?: Maybe<Scalars['Boolean']['output']>;
};

export type PlaybackSettingsInput = {
  autoRewindOnPause?: InputMaybe<AutoRewindSettingsInput>;
  loopCurrentLine?: InputMaybe<Scalars['Boolean']['input']>;
  muted?: InputMaybe<Scalars['Boolean']['input']>;
  seekPlays?: InputMaybe<Scalars['Boolean']['input']>;
  seekTime?: InputMaybe<Scalars['Float']['input']>;
  showWaveform?: InputMaybe<Scalars['Boolean']['input']>;
  speedBounds?: InputMaybe<SpeedBoundsSettingsInput>;
  speedPresets?: InputMaybe<Array<Scalars['Float']['input']>>;
  volume?: InputMaybe<Scalars['Float']['input']>;
  waveformSnap?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Playlist = {
  coverImage?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isPublic: Scalars['Boolean']['output'];
  isSavedByMe: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  owner: FollowUser;
  projectCount: Scalars['Int']['output'];
  projects: Array<Project>;
  savedCount: Scalars['Int']['output'];
  sortMode: PlaylistSortMode;
  tags: Array<Scalars['String']['output']>;
  trendingScore?: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type PlaylistPage = {
  hasMore: Scalars['Boolean']['output'];
  playlists: Array<Playlist>;
  total: Scalars['Int']['output'];
};

export type PlaylistSortMode =
  | 'ALPHABETICAL'
  | 'DATE_ADDED'
  | 'MANUAL'
  | 'STARS';

export type Project = {
  coverImage?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['String']['output']>;
  forkCount?: Maybe<Scalars['Int']['output']>;
  forkedFrom?: Maybe<ForkedFrom>;
  forksEnabled?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  isForkedByMe?: Maybe<Scalars['Boolean']['output']>;
  isStarredByMe?: Maybe<Scalars['Boolean']['output']>;
  lineCount?: Maybe<Scalars['Int']['output']>;
  lyrics?: Maybe<Lyrics>;
  lyricsId?: Maybe<Scalars['ID']['output']>;
  metadata?: Maybe<ProjectMetadata>;
  public?: Maybe<Scalars['Boolean']['output']>;
  publicId: Scalars['String']['output'];
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  starCount?: Maybe<Scalars['Int']['output']>;
  state?: Maybe<ProjectState>;
  syncedLineCount?: Maybe<Scalars['Int']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  trendingScore?: Maybe<Scalars['Float']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['String']['output']>;
  upload?: Maybe<Upload>;
  uploadId?: Maybe<Scalars['ID']['output']>;
  user?: Maybe<User>;
  userId?: Maybe<Scalars['ID']['output']>;
};

export type ProjectLyricsInput = {
  editorMode?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  line?: InputMaybe<LineInput>;
  lineIdx?: InputMaybe<Scalars['Int']['input']>;
  sectionIdx?: InputMaybe<Scalars['Int']['input']>;
  sections?: InputMaybe<Array<SectionInput>>;
  word?: InputMaybe<WordInput>;
  wordIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type ProjectMetadata = {
  description?: Maybe<Scalars['String']['output']>;
  genre?: Maybe<Scalars['String']['output']>;
  songAlbum?: Maybe<Scalars['String']['output']>;
  songArtist?: Maybe<Scalars['String']['output']>;
  songLanguage?: Maybe<Scalars['String']['output']>;
  songName?: Maybe<Scalars['String']['output']>;
  songYear?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  trackCount?: Maybe<Scalars['Int']['output']>;
  trackNumber?: Maybe<Scalars['Int']['output']>;
};

export type ProjectMetadataInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  genre?: InputMaybe<Scalars['String']['input']>;
  songAlbum?: InputMaybe<Scalars['String']['input']>;
  songArtist?: InputMaybe<Scalars['String']['input']>;
  songLanguage?: InputMaybe<Scalars['String']['input']>;
  songName?: InputMaybe<Scalars['String']['input']>;
  songYear?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  trackCount?: InputMaybe<Scalars['Int']['input']>;
  trackNumber?: InputMaybe<Scalars['Int']['input']>;
};

export type ProjectPage = {
  hasMore: Scalars['Boolean']['output'];
  projects: Array<Project>;
  total: Scalars['Int']['output'];
};

export type ProjectReactions = {
  myReaction?: Maybe<Scalars['String']['output']>;
  reactions: Array<ReactionSummary>;
};

export type ProjectState = {
  activeLineIndex?: Maybe<Scalars['Int']['output']>;
  playbackPosition?: Maybe<Scalars['Float']['output']>;
  playbackSpeed?: Maybe<Scalars['Float']['output']>;
  saveTime?: Maybe<Scalars['String']['output']>;
  syncMode?: Maybe<Scalars['Boolean']['output']>;
};

export type ProjectStateInput = {
  activeLineIndex?: InputMaybe<Scalars['Int']['input']>;
  playbackPosition?: InputMaybe<Scalars['Float']['input']>;
  playbackSpeed?: InputMaybe<Scalars['Float']['input']>;
  saveTime?: InputMaybe<Scalars['String']['input']>;
  syncMode?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ProjectStats = {
  count: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type PublicUser = {
  accountName: Scalars['String']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  badges: Array<UserBadge>;
  bio?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  followerCount: Scalars['Int']['output'];
  followingCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  isAdmin: Scalars['Boolean']['output'];
  isBlockedByMe: Scalars['Boolean']['output'];
  isFollowedByMe: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  progression?: Maybe<UserProgression>;
  projectCount: Scalars['Int']['output'];
  projects: Array<Project>;
  showFollowers: Scalars['Boolean']['output'];
  showcasePublic: Scalars['Boolean']['output'];
  showcasedBadges: Array<ShowcasedBadge>;
  stats?: Maybe<UserStats>;
  streak?: Maybe<UserStreak>;
  totalForksReceived: Scalars['Int']['output'];
  totalStarsReceived: Scalars['Int']['output'];
};

export type Query = {
  badgeDefinitions: Array<BadgeDef>;
  exploreStats: ExploreStats;
  feed: FeedResult;
  followList: FollowListResult;
  getShare?: Maybe<Project>;
  health: HealthStatus;
  leaderboard: LeaderboardResult;
  me?: Maybe<User>;
  myMusicLibrary: Array<MusicLibraryEntry>;
  playlist?: Maybe<Playlist>;
  playlists: Array<Playlist>;
  popularPlaylists: PlaylistPage;
  project?: Maybe<Project>;
  projectReactions: ProjectReactions;
  projects: Array<Project>;
  publicProfile?: Maybe<PublicUser>;
  publicProject?: Maybe<Project>;
  savedPlaylists: Array<Playlist>;
  searchProjects: SearchResult;
  searchUsers: Array<FollowUser>;
  settings?: Maybe<Settings>;
  suggestedUsers: Array<FollowUser>;
  trendingProjects: ProjectPage;
  upload?: Maybe<Upload>;
  uploads: Array<Upload>;
  userActivity: FeedResult;
  userActivityHeatmap: Array<ActivityHeatmapDay>;
  userContentStats: ContentStats;
  userShowcase: Array<ShowcasedBadge>;
};


export type QueryFeedArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryFollowListArgs = {
  accountName: Scalars['String']['input'];
  offset?: InputMaybe<Scalars['Int']['input']>;
  type: FollowListType;
};


export type QueryGetShareArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPlaylistArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPlaylistsArgs = {
  accountName: Scalars['String']['input'];
};


export type QueryPopularPlaylistsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProjectReactionsArgs = {
  publicId: Scalars['String']['input'];
};


export type QueryProjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPublicProfileArgs = {
  accountName: Scalars['String']['input'];
};


export type QueryPublicProjectArgs = {
  publicId: Scalars['String']['input'];
};


export type QuerySearchProjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  sortBy?: InputMaybe<SearchSort>;
};


export type QuerySearchUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QuerySuggestedUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTrendingProjectsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUploadArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUploadsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUserActivityArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryUserShowcaseArgs = {
  accountName: Scalars['String']['input'];
};

export type ReactionSummary = {
  count: Scalars['Int']['output'];
  emoji: Scalars['String']['output'];
};

export type RetroactiveResult = {
  error?: Maybe<Scalars['String']['output']>;
  granted: Scalars['Int']['output'];
  scanned: Scalars['Int']['output'];
};

export type SaveMediaInput = {
  duration?: InputMaybe<Scalars['Float']['input']>;
  fileName?: InputMaybe<Scalars['String']['input']>;
  publicId?: InputMaybe<Scalars['String']['input']>;
  source: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  uploadUrl?: InputMaybe<Scalars['String']['input']>;
};

export type ScrollSettings = {
  alignment?: Maybe<Scalars['String']['output']>;
  mode?: Maybe<Scalars['String']['output']>;
};

export type ScrollSettingsInput = {
  alignment?: InputMaybe<Scalars['String']['input']>;
  mode?: InputMaybe<Scalars['String']['input']>;
};

export type SearchResult = {
  projects: Array<Project>;
  total: Scalars['Int']['output'];
};

export type SearchSort =
  | 'NEWEST'
  | 'RELEVANCE'
  | 'STARS';



export type Section = {
  depth?: Maybe<Scalars['Int']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  lines: Array<Line>;
  singers?: Maybe<Array<Scalars['String']['output']>>;
  timestamp?: Maybe<Scalars['Float']['output']>;
};

export type SectionInput = {
  depth?: InputMaybe<Scalars['Int']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  lines?: InputMaybe<Array<LineInput>>;
  singers?: InputMaybe<Array<Scalars['String']['input']>>;
  timestamp?: InputMaybe<Scalars['Float']['input']>;
};

export type Settings = {
  advanced?: Maybe<AdvancedSettings>;
  editor?: Maybe<EditorSettings>;
  export?: Maybe<ExportSettings>;
  import?: Maybe<ImportSettings>;
  interface?: Maybe<InterfaceSettings>;
  playback?: Maybe<PlaybackSettings>;
  shortcuts?: Maybe<ShortcutsSettings>;
};

export type ShortcutsSettings = {
  addLine?: Maybe<Array<Scalars['String']['output']>>;
  addSecondary?: Maybe<Array<Scalars['String']['output']>>;
  addTranslation?: Maybe<Array<Scalars['String']['output']>>;
  clearTimestamp?: Maybe<Array<Scalars['String']['output']>>;
  deleteLine?: Maybe<Array<Scalars['String']['output']>>;
  deselect?: Maybe<Array<Scalars['String']['output']>>;
  focusPlayback?: Maybe<Array<Scalars['String']['output']>>;
  focusPreview?: Maybe<Array<Scalars['String']['output']>>;
  focusSync?: Maybe<Array<Scalars['String']['output']>>;
  mark?: Maybe<Array<Scalars['String']['output']>>;
  mute?: Maybe<Array<Scalars['String']['output']>>;
  nudgeLeft?: Maybe<Array<Scalars['String']['output']>>;
  nudgeLeftFine?: Maybe<Array<Scalars['String']['output']>>;
  nudgeRight?: Maybe<Array<Scalars['String']['output']>>;
  nudgeRightFine?: Maybe<Array<Scalars['String']['output']>>;
  playPause?: Maybe<Array<Scalars['String']['output']>>;
  rangeSelect?: Maybe<Array<Scalars['String']['output']>>;
  seekBackward?: Maybe<Array<Scalars['String']['output']>>;
  seekForward?: Maybe<Array<Scalars['String']['output']>>;
  showHelp?: Maybe<Array<Scalars['String']['output']>>;
  speedDown?: Maybe<Array<Scalars['String']['output']>>;
  speedUp?: Maybe<Array<Scalars['String']['output']>>;
  switchMode?: Maybe<Array<Scalars['String']['output']>>;
  toggleSelect?: Maybe<Array<Scalars['String']['output']>>;
  toggleTranslation?: Maybe<Array<Scalars['String']['output']>>;
};

export type ShortcutsSettingsInput = {
  addLine?: InputMaybe<Array<Scalars['String']['input']>>;
  addSecondary?: InputMaybe<Array<Scalars['String']['input']>>;
  addTranslation?: InputMaybe<Array<Scalars['String']['input']>>;
  clearTimestamp?: InputMaybe<Array<Scalars['String']['input']>>;
  deleteLine?: InputMaybe<Array<Scalars['String']['input']>>;
  deselect?: InputMaybe<Array<Scalars['String']['input']>>;
  focusPlayback?: InputMaybe<Array<Scalars['String']['input']>>;
  focusPreview?: InputMaybe<Array<Scalars['String']['input']>>;
  focusSync?: InputMaybe<Array<Scalars['String']['input']>>;
  mark?: InputMaybe<Array<Scalars['String']['input']>>;
  mute?: InputMaybe<Array<Scalars['String']['input']>>;
  nudgeLeft?: InputMaybe<Array<Scalars['String']['input']>>;
  nudgeLeftFine?: InputMaybe<Array<Scalars['String']['input']>>;
  nudgeRight?: InputMaybe<Array<Scalars['String']['input']>>;
  nudgeRightFine?: InputMaybe<Array<Scalars['String']['input']>>;
  playPause?: InputMaybe<Array<Scalars['String']['input']>>;
  rangeSelect?: InputMaybe<Array<Scalars['String']['input']>>;
  seekBackward?: InputMaybe<Array<Scalars['String']['input']>>;
  seekForward?: InputMaybe<Array<Scalars['String']['input']>>;
  showHelp?: InputMaybe<Array<Scalars['String']['input']>>;
  speedDown?: InputMaybe<Array<Scalars['String']['input']>>;
  speedUp?: InputMaybe<Array<Scalars['String']['input']>>;
  switchMode?: InputMaybe<Array<Scalars['String']['input']>>;
  toggleSelect?: InputMaybe<Array<Scalars['String']['input']>>;
  toggleTranslation?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type ShowcasedBadge = {
  color: Scalars['String']['output'];
  grantedAt: Scalars['String']['output'];
  holderCount: Scalars['Int']['output'];
  icon: Scalars['String']['output'];
  id: Scalars['String']['output'];
  label: Scalars['String']['output'];
  rarity: Scalars['String']['output'];
  rarityPct: Scalars['Float']['output'];
};

export type SpeedBoundsSettings = {
  max?: Maybe<Scalars['Float']['output']>;
  min?: Maybe<Scalars['Float']['output']>;
};

export type SpeedBoundsSettingsInput = {
  max?: InputMaybe<Scalars['Float']['input']>;
  min?: InputMaybe<Scalars['Float']['input']>;
};

export type SrtSettings = {
  defaultSubtitleDuration?: Maybe<Scalars['Float']['output']>;
  minSubtitleGap?: Maybe<Scalars['Float']['output']>;
  snapToNextLine?: Maybe<Scalars['Boolean']['output']>;
};

export type SrtSettingsInput = {
  defaultSubtitleDuration?: InputMaybe<Scalars['Float']['input']>;
  minSubtitleGap?: InputMaybe<Scalars['Float']['input']>;
  snapToNextLine?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Translation = {
  language: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type TranslationInput = {
  language: Scalars['String']['input'];
  text: Scalars['String']['input'];
};

export type UpdateLyricsInput = {
  editorMode?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  sections?: InputMaybe<Array<SectionInput>>;
};

export type UpdatePlaylistInput = {
  coverImage?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  sortMode?: InputMaybe<PlaylistSortMode>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateProfileInput = {
  accountName?: InputMaybe<Scalars['String']['input']>;
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  showFollowers?: InputMaybe<Scalars['Boolean']['input']>;
  onlineVisibility?: InputMaybe<Scalars['String']['input']>;
  miniProfileBadgesEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  miniProfileBadgeIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UserPreferencesNotifications = {
  follow: Scalars['Boolean']['output'];
  reaction: Scalars['Boolean']['output'];
  star: Scalars['Boolean']['output'];
  fork: Scalars['Boolean']['output'];
  badge_awarded: Scalars['Boolean']['output'];
  xp_changed: Scalars['Boolean']['output'];
};

export type UserPreferences = {
  showFollowers: Scalars['Boolean']['output'];
  onlineVisibility: Scalars['String']['output'];
  miniProfileBadgesEnabled: Scalars['Boolean']['output'];
  miniProfileBadgeIds: Array<Scalars['String']['output']>;
  notifications: UserPreferencesNotifications;
};

export type UpdatePreferencesNotificationsInput = {
  follow?: InputMaybe<Scalars['Boolean']['input']>;
  reaction?: InputMaybe<Scalars['Boolean']['input']>;
  star?: InputMaybe<Scalars['Boolean']['input']>;
  fork?: InputMaybe<Scalars['Boolean']['input']>;
  badge_awarded?: InputMaybe<Scalars['Boolean']['input']>;
  xp_changed?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdatePreferencesInput = {
  showFollowers?: InputMaybe<Scalars['Boolean']['input']>;
  onlineVisibility?: InputMaybe<Scalars['String']['input']>;
  miniProfileBadgesEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  miniProfileBadgeIds?: InputMaybe<Array<Scalars['String']['input']>>;
  notifications?: InputMaybe<UpdatePreferencesNotificationsInput>;
};

export type UpdateProjectInput = {
  coverImage?: InputMaybe<Scalars['String']['input']>;
  lyrics?: InputMaybe<ProjectLyricsInput>;
  metadata?: InputMaybe<ProjectMetadataInput>;
  public?: InputMaybe<Scalars['Boolean']['input']>;
  readOnly?: InputMaybe<Scalars['Boolean']['input']>;
  state?: InputMaybe<ProjectStateInput>;
  title?: InputMaybe<Scalars['String']['input']>;
  uploadId?: InputMaybe<Scalars['ID']['input']>;
  version?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateSettingsInput = {
  advanced?: InputMaybe<AdvancedSettingsInput>;
  editor?: InputMaybe<EditorSettingsInput>;
  export?: InputMaybe<ExportSettingsInput>;
  import?: InputMaybe<ImportSettingsInput>;
  interface?: InputMaybe<InterfaceSettingsInput>;
  playback?: InputMaybe<PlaybackSettingsInput>;
  shortcuts?: InputMaybe<ShortcutsSettingsInput>;
};

export type UpdateShowcaseResult = {
  error?: Maybe<Scalars['String']['output']>;
  level: Scalars['Int']['output'];
  showcasePublic: Scalars['Boolean']['output'];
  showcaseSlots: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type Upload = {
  coverImage?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  duration?: Maybe<Scalars['Float']['output']>;
  fileName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  projects: Array<Project>;
  publicId?: Maybe<Scalars['String']['output']>;
  source: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
  uploadUrl?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type User = {
  accountName?: Maybe<Scalars['String']['output']>;
  accountNameChangeCount: Scalars['Int']['output'];
  appeal?: Maybe<UserAppeal>;
  avatarUrl?: Maybe<Scalars['String']['output']>;
  badges: Array<UserBadge>;
  ban?: Maybe<UserBan>;
  bio?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  emailHistory: Array<EmailChange>;
  google?: Maybe<GoogleInfo>;
  hasPassword: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  isVerified: Scalars['Boolean']['output'];
  lastAccountNameChangedAt?: Maybe<Scalars['String']['output']>;
  passwordChangedAt?: Maybe<Scalars['String']['output']>;
  pendingEmail?: Maybe<Scalars['String']['output']>;
  previousAccountNames: Array<NameChange>;
  progression?: Maybe<UserProgression>;
  projects: Array<Project>;
  preferences?: Maybe<UserPreferences>;
  role: Scalars['String']['output'];
  settings?: Maybe<Settings>;
  showFollowers: Scalars['Boolean']['output'];
  onlineVisibility: Scalars['String']['output'];
  miniProfileBadgesEnabled: Scalars['Boolean']['output'];
  miniProfileBadgeIds: Array<Scalars['String']['output']>;
  showcaseSlots: Scalars['Int']['output'];
  showcasedBadges: Array<Scalars['String']['output']>;
  stats?: Maybe<UserStats>;
  streak?: Maybe<UserStreak>;
  uploads: Array<Upload>;
  wasJustUnbanned?: Maybe<Scalars['Boolean']['output']>;
};

export type UserAppeal = {
  resolvedAt?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  submittedAt?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
};

export type UserBadge = {
  grantedAt: Scalars['String']['output'];
  grantedBy: Scalars['String']['output'];
  id: Scalars['String']['output'];
};

export type UserBan = {
  active: Scalars['Boolean']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  until?: Maybe<Scalars['String']['output']>;
};

export type UserProgression = {
  level?: Maybe<Scalars['Int']['output']>;
  xp?: Maybe<Scalars['Float']['output']>;
};

export type UserStats = {
  karaokeLines?: Maybe<Scalars['Float']['output']>;
  minutesSynced?: Maybe<Scalars['Float']['output']>;
  wordsSynced?: Maybe<Scalars['Float']['output']>;
};

export type UserStreak = {
  current?: Maybe<Scalars['Int']['output']>;
  lastActiveDate?: Maybe<Scalars['String']['output']>;
  longest?: Maybe<Scalars['Int']['output']>;
};

export type Word = {
  reading?: Maybe<Scalars['String']['output']>;
  singerIndex?: Maybe<Scalars['Int']['output']>;
  time?: Maybe<Scalars['Float']['output']>;
  word: Scalars['String']['output'];
};

export type WordInput = {
  id?: InputMaybe<Scalars['String']['input']>;
  reading?: InputMaybe<Scalars['String']['input']>;
  singerIndex?: InputMaybe<Scalars['Int']['input']>;
  time?: InputMaybe<Scalars['Float']['input']>;
  word: Scalars['String']['input'];
};

export type AdminBadgeDefinitionsQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminBadgeDefinitionsQuery = { badgeDefinitions: Array<{ id: string, label: string, description: string, icon: string, color: string, conditionType: string, conditionValue: number | null, autoGrant: boolean, isBuiltin: boolean, holderCount: number, xpReward: number }> };

export type CreateBadgeMutationVariables = Exact<{
  input: BadgeDefInput;
}>;


export type CreateBadgeMutation = { adminCreateBadge: { id: string, label: string, description: string, icon: string, color: string, conditionType: string, conditionValue: number | null, autoGrant: boolean, isBuiltin: boolean, holderCount: number } };

export type UpdateBadgeMutationVariables = Exact<{
  id: string;
  input: BadgeDefInput;
}>;


export type UpdateBadgeMutation = { adminUpdateBadge: { id: string, label: string, description: string, icon: string, color: string, conditionType: string, conditionValue: number | null, autoGrant: boolean, isBuiltin: boolean, holderCount: number, xpReward: number } };

export type DeleteBadgeMutationVariables = Exact<{
  id: string;
}>;


export type DeleteBadgeMutation = { adminDeleteBadge: boolean };

export type RetroMutationVariables = Exact<{
  badgeId: string;
}>;


export type RetroMutation = { adminRetroactiveScan: { granted: number, scanned: number, error: string | null } };

export type GrantMutationVariables = Exact<{
  userIdentifier: string;
  badgeId: string;
}>;


export type GrantMutation = { adminGrantBadge: boolean };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, accountName: string | null, displayName: string | null, email: string | null, pendingEmail: string | null, avatarUrl: string | null, bio: string | null, isVerified: boolean, lastAccountNameChangedAt: string | null, accountNameChangeCount: number, wasJustUnbanned: boolean | null, role: string, createdAt: string | null, passwordChangedAt: string | null, hasPassword: boolean, showFollowers: boolean, showcasedBadges: Array<string>, showcaseSlots: number, previousAccountNames: Array<{ from: string, to: string, changedAt: string }>, emailHistory: Array<{ from: string, to: string, changedAt: string }>, ban: { active: boolean, reason: string | null, until: string | null } | null, appeal: { text: string | null, status: string | null, submittedAt: string | null, resolvedAt: string | null } | null, google: { connected: boolean, googleId: string | null, email: string | null, name: string | null, pictureUrl: string | null } | null, badges: Array<{ id: string, grantedAt: string, grantedBy: string }>, stats: { minutesSynced: number | null, wordsSynced: number | null, karaokeLines: number | null } | null, streak: { current: number | null, longest: number | null, lastActiveDate: string | null } | null, progression: { xp: number | null, level: number | null } | null } | null };

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileMutation = { updateProfile: { id: string, accountName: string | null, displayName: string | null, email: string | null, pendingEmail: string | null, avatarUrl: string | null, bio: string | null, showFollowers: boolean, lastAccountNameChangedAt: string | null } };

export type SendVerificationEmailMutationVariables = Exact<{ [key: string]: never; }>;


export type SendVerificationEmailMutation = { sendVerificationEmail: boolean };

export type UpdateShowcaseMutationVariables = Exact<{
  badgeIds: Array<string> | string;
  showcasePublic?: boolean | null | undefined;
}>;


export type UpdateShowcaseMutation = { updateShowcase: { success: boolean, error: string | null, showcaseSlots: number, level: number, showcasePublic: boolean } };

export type MyMusicLibraryQueryVariables = Exact<{ [key: string]: never; }>;


export type MyMusicLibraryQuery = { myMusicLibrary: Array<{ artist: string | null, album: string | null, genre: string | null, language: string | null, trackCount: number | null }> };

export type TrendingProjectsQueryVariables = Exact<{
  offset?: number | null | undefined;
  limit?: number | null | undefined;
}>;


export type TrendingProjectsQuery = { trendingProjects: { total: number, hasMore: boolean, projects: Array<{ id: string, publicId: string, title: string | null, coverImage: string | null, trendingScore: number | null, starCount: number | null, forkCount: number | null, user: { id: string, accountName: string | null, displayName: string | null, avatarUrl: string | null } | null }> } };

export type PopularPlaylistsQueryVariables = Exact<{
  offset?: number | null | undefined;
  limit?: number | null | undefined;
}>;


export type PopularPlaylistsQuery = { popularPlaylists: { total: number, hasMore: boolean, playlists: Array<{ id: string, name: string, description: string | null, coverImage: string | null, trendingScore: number | null, savedCount: number, projectCount: number, isPublic: boolean, owner: { id: string, accountName: string, displayName: string | null, avatarUrl: string | null } }> } };

export type SuggestedUsersQueryVariables = Exact<{
  limit?: number | null | undefined;
}>;


export type SuggestedUsersQuery = { suggestedUsers: Array<{ id: string, accountName: string, displayName: string | null, avatarUrl: string | null }> };

export type FeedQueryVariables = Exact<{
  offset?: number | null | undefined;
  limit?: number | null | undefined;
}>;


export type FeedQuery = { feed: { hasMore: boolean, activities: Array<{ id: string, type: ActivityType, publicId: string, projectTitle: string, coverImage: string | null, targetPath: string | null, createdAt: string, actor: { id: string, accountName: string, displayName: string | null, avatarUrl: string | null } }> } };

export type LeaderboardQueryVariables = Exact<{
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type LeaderboardQuery = { leaderboard: { total: number, hasMore: boolean, users: Array<{ id: string, accountName: string, displayName: string | null, avatarUrl: string | null, projectCount: number, totalStarsReceived: number, totalForksReceived: number, badges: Array<{ id: string, grantedAt: string }>, stats: { minutesSynced: number | null, wordsSynced: number | null, karaokeLines: number | null } | null, progression: { xp: number | null, level: number | null } | null, streak: { current: number | null } | null }> } };

export type GetMyProjectsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyProjectsQuery = { projects: Array<{ id: string, publicId: string, title: string | null, metadata: { songName: string | null, songArtist: string | null } | null }> };

export type PlaylistFieldsFragment = { id: string, name: string, description: string | null, coverImage: string | null, tags: Array<string>, isPublic: boolean, sortMode: PlaylistSortMode, projectCount: number, savedCount: number, isSavedByMe: boolean, createdAt: string, updatedAt: string, owner: { id: string, accountName: string, displayName: string | null, avatarUrl: string | null }, projects: Array<{ id: string, publicId: string, title: string | null, starCount: number | null, forkCount: number | null, coverImage: string | null, metadata: { songName: string | null, songArtist: string | null, genre: string | null } | null, upload: { source: string, uploadUrl: string | null, coverImage: string | null } | null }> };

export type GetPlaylistsQueryVariables = Exact<{
  accountName: string;
}>;


export type GetPlaylistsQuery = { playlists: Array<{ id: string, name: string, description: string | null, coverImage: string | null, tags: Array<string>, isPublic: boolean, sortMode: PlaylistSortMode, projectCount: number, savedCount: number, isSavedByMe: boolean, createdAt: string, updatedAt: string, owner: { id: string, accountName: string, displayName: string | null, avatarUrl: string | null }, projects: Array<{ id: string, publicId: string, title: string | null, starCount: number | null, forkCount: number | null, coverImage: string | null, metadata: { songName: string | null, songArtist: string | null, genre: string | null } | null, upload: { source: string, uploadUrl: string | null, coverImage: string | null } | null }> }> };

export type GetPlaylistQueryVariables = Exact<{
  id: string;
}>;


export type GetPlaylistQuery = { playlist: { id: string, name: string, description: string | null, coverImage: string | null, tags: Array<string>, isPublic: boolean, sortMode: PlaylistSortMode, projectCount: number, savedCount: number, isSavedByMe: boolean, createdAt: string, updatedAt: string, owner: { id: string, accountName: string, displayName: string | null, avatarUrl: string | null }, projects: Array<{ id: string, publicId: string, title: string | null, starCount: number | null, forkCount: number | null, coverImage: string | null, metadata: { songName: string | null, songArtist: string | null, genre: string | null } | null, upload: { source: string, uploadUrl: string | null, coverImage: string | null } | null }> } | null };

export type CreatePlaylistMutationVariables = Exact<{
  input: CreatePlaylistInput;
}>;


export type CreatePlaylistMutation = { createPlaylist: { id: string, name: string, description: string | null, coverImage: string | null, tags: Array<string>, isPublic: boolean, sortMode: PlaylistSortMode, projectCount: number, savedCount: number, isSavedByMe: boolean, createdAt: string, updatedAt: string, owner: { id: string, accountName: string, displayName: string | null, avatarUrl: string | null }, projects: Array<{ id: string, publicId: string, title: string | null, starCount: number | null, forkCount: number | null, coverImage: string | null, metadata: { songName: string | null, songArtist: string | null, genre: string | null } | null, upload: { source: string, uploadUrl: string | null, coverImage: string | null } | null }> } };

export type UpdatePlaylistMutationVariables = Exact<{
  id: string;
  input: UpdatePlaylistInput;
}>;


export type UpdatePlaylistMutation = { updatePlaylist: { id: string, name: string, description: string | null, coverImage: string | null, tags: Array<string>, isPublic: boolean, sortMode: PlaylistSortMode, projectCount: number, savedCount: number, isSavedByMe: boolean, createdAt: string, updatedAt: string, owner: { id: string, accountName: string, displayName: string | null, avatarUrl: string | null }, projects: Array<{ id: string, publicId: string, title: string | null, starCount: number | null, forkCount: number | null, coverImage: string | null, metadata: { songName: string | null, songArtist: string | null, genre: string | null } | null, upload: { source: string, uploadUrl: string | null, coverImage: string | null } | null }> } };

export type AddProjectToPlaylistMutationVariables = Exact<{
  playlistId: string;
  publicId: string;
}>;


export type AddProjectToPlaylistMutation = { addProjectToPlaylist: { id: string, name: string, description: string | null, coverImage: string | null, tags: Array<string>, isPublic: boolean, sortMode: PlaylistSortMode, projectCount: number, savedCount: number, isSavedByMe: boolean, createdAt: string, updatedAt: string, owner: { id: string, accountName: string, displayName: string | null, avatarUrl: string | null }, projects: Array<{ id: string, publicId: string, title: string | null, starCount: number | null, forkCount: number | null, coverImage: string | null, metadata: { songName: string | null, songArtist: string | null, genre: string | null } | null, upload: { source: string, uploadUrl: string | null, coverImage: string | null } | null }> } };

export type RemoveProjectFromPlaylistMutationVariables = Exact<{
  playlistId: string;
  publicId: string;
}>;


export type RemoveProjectFromPlaylistMutation = { removeProjectFromPlaylist: { id: string, name: string, description: string | null, coverImage: string | null, tags: Array<string>, isPublic: boolean, sortMode: PlaylistSortMode, projectCount: number, savedCount: number, isSavedByMe: boolean, createdAt: string, updatedAt: string, owner: { id: string, accountName: string, displayName: string | null, avatarUrl: string | null }, projects: Array<{ id: string, publicId: string, title: string | null, starCount: number | null, forkCount: number | null, coverImage: string | null, metadata: { songName: string | null, songArtist: string | null, genre: string | null } | null, upload: { source: string, uploadUrl: string | null, coverImage: string | null } | null }> } };

export type DeletePlaylistMutationVariables = Exact<{
  id: string;
}>;


export type DeletePlaylistMutation = { deletePlaylist: boolean };

export type SavePlaylistMutationVariables = Exact<{
  playlistId: string;
}>;


export type SavePlaylistMutation = { savePlaylist: boolean };

export type UnsavePlaylistMutationVariables = Exact<{
  playlistId: string;
}>;


export type UnsavePlaylistMutation = { unsavePlaylist: boolean };

export type GetPublicProfileQueryVariables = Exact<{
  accountName: string;
}>;


export type GetPublicProfileQuery = { publicProfile: { id: string, accountName: string, displayName: string | null, avatarUrl: string | null, bio: string | null, isVerified: boolean, isAdmin: boolean, createdAt: string | null, projectCount: number, totalStarsReceived: number, totalForksReceived: number, followerCount: number, followingCount: number, isFollowedByMe: boolean, showFollowers: boolean, showcasePublic: boolean, badges: Array<{ id: string, grantedAt: string }>, progression: { xp: number | null, level: number | null } | null, stats: { minutesSynced: number | null } | null, streak: { current: number | null } | null, showcasedBadges: Array<{ id: string, label: string, icon: string, color: string, rarity: string, rarityPct: number, holderCount: number, grantedAt: string }>, projects: Array<{ id: string, publicId: string, title: string | null, starCount: number | null, forkCount: number | null, coverImage: string | null, public: boolean | null, createdAt: string | null, updatedAt: string | null, metadata: { songName: string | null, songArtist: string | null, songAlbum: string | null, songYear: string | null, genre: string | null, description: string | null, tags: Array<string> | null } | null, upload: { source: string, uploadUrl: string | null } | null }> } | null };

export type FollowUserMutationVariables = Exact<{
  accountName: string;
}>;


export type FollowUserMutation = { follow: boolean };

export type UnfollowUserMutationVariables = Exact<{
  accountName: string;
}>;


export type UnfollowUserMutation = { unfollow: boolean };

export type GetFollowListQueryVariables = Exact<{
  accountName: string;
  type: FollowListType;
  offset?: number | null | undefined;
}>;


export type GetFollowListQuery = { followList: { total: number, users: Array<{ id: string, accountName: string, displayName: string | null, avatarUrl: string | null, isFollowedByMe: boolean }> } };

export type GetPublicProjectQueryVariables = Exact<{
  publicId: string;
}>;


export type GetPublicProjectQuery = { publicProject: { id: string, publicId: string, title: string | null, coverImage: string | null, starCount: number | null, forkCount: number | null, isStarredByMe: boolean | null, isForkedByMe: boolean | null, forksEnabled: boolean | null, createdAt: string | null, metadata: { description: string | null, genre: string | null, tags: Array<string> | null, songName: string | null, songArtist: string | null, songAlbum: string | null, songYear: string | null, songLanguage: string | null, trackNumber: number | null, trackCount: number | null } | null, upload: { id: string, source: string, uploadUrl: string | null, duration: number | null, coverImage: string | null } | null, user: { id: string, accountName: string | null, displayName: string | null, avatarUrl: string | null } | null, lyrics: { editorMode: string, sections: Array<{ label: string | null, depth: number | null, id: string | null, singers: Array<string> | null, timestamp: number | null, lines: Array<{ id: string | null, text: string | null, timestamp: number | null, endTime: number | null, secondary: string | null, translation: string | null, singers: Array<string> | null, words: Array<{ word: string, time: number | null, reading: string | null, singerIndex: number | null }> | null, secondaryWords: Array<{ word: string, time: number | null }> | null }> }> } | null, forkedFrom: { publicId: string | null, accountName: string | null } | null } | null };

export type GetProjectsQueryVariables = Exact<{
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type GetProjectsQuery = { projects: Array<{ id: string, publicId: string, title: string | null, type: string | null, readOnly: boolean | null, public: boolean | null, createdAt: string | null, updatedAt: string | null, forkCount: number | null, starCount: number | null, lineCount: number | null, syncedLineCount: number | null, coverImage: string | null, forkedFrom: { publicId: string | null, userId: string | null, accountName: string | null } | null, metadata: { description: string | null, genre: string | null, tags: Array<string> | null, songName: string | null, songArtist: string | null, songAlbum: string | null, songYear: string | null, songLanguage: string | null, trackNumber: number | null, trackCount: number | null } | null, upload: { id: string, fileName: string, title: string, source: string, duration: number | null, uploadUrl: string | null } | null }> };

export type GetProjectQueryVariables = Exact<{
  id: string;
}>;


export type GetProjectQuery = { project: { id: string, publicId: string, title: string | null, type: string | null, readOnly: boolean | null, public: boolean | null, createdAt: string | null, updatedAt: string | null, coverImage: string | null, forkedFrom: { publicId: string | null, userId: string | null, accountName: string | null } | null, state: { syncMode: boolean | null, activeLineIndex: number | null, playbackPosition: number | null, playbackSpeed: number | null, saveTime: string | null } | null, metadata: { description: string | null, genre: string | null, tags: Array<string> | null, songName: string | null, songArtist: string | null, songAlbum: string | null, songYear: string | null, songLanguage: string | null, trackNumber: number | null, trackCount: number | null } | null, upload: { id: string, fileName: string, title: string, source: string, duration: number | null, uploadUrl: string | null } | null, lyrics: { id: string, publicId: string, editorMode: string, version: number | null, sections: Array<{ id: string | null, label: string | null, depth: number | null, singers: Array<string> | null, timestamp: number | null, lines: Array<{ id: string | null, text: string | null, timestamp: number | null, endTime: number | null, secondary: string | null, singers: Array<string> | null, translation: string | null, translations: Array<{ language: string, text: string }> | null, words: Array<{ word: string, time: number | null, reading: string | null }> | null, secondaryWords: Array<{ word: string, time: number | null }> | null }> }> } | null, user: { id: string, accountName: string | null, avatarUrl: string | null } | null } | null };

export type CreateProjectMutationVariables = Exact<{
  input: CreateProjectInput;
}>;


export type CreateProjectMutation = { createProject: { id: string, publicId: string, title: string | null } };

export type UpdateProjectMutationVariables = Exact<{
  id: string;
  input: UpdateProjectInput;
}>;


export type UpdateProjectMutation = { updateProject: { id: string, publicId: string, title: string | null, public: boolean | null, readOnly: boolean | null } };

export type DeleteProjectMutationVariables = Exact<{
  id: string;
}>;


export type DeleteProjectMutation = { deleteProject: boolean };

export type GetShareQueryVariables = Exact<{
  id: string;
}>;


export type GetShareQuery = { getShare: { id: string, publicId: string, title: string | null, public: boolean | null, readOnly: boolean | null, createdAt: string | null, forkCount: number | null, starCount: number | null, isStarredByMe: boolean | null, uploadId: string | null, forkedFrom: { publicId: string | null, userId: string | null, accountName: string | null } | null, metadata: { description: string | null, genre: string | null, tags: Array<string> | null, songName: string | null, songArtist: string | null, songAlbum: string | null, songYear: string | null, songLanguage: string | null, trackNumber: number | null, trackCount: number | null } | null, user: { id: string, accountName: string | null, displayName: string | null, avatarUrl: string | null } | null, upload: { id: string, source: string, fileName: string, title: string, uploadUrl: string | null, publicId: string | null, duration: number | null } | null, lyrics: { id: string, publicId: string, editorMode: string, sections: Array<{ id: string | null, label: string | null, depth: number | null, singers: Array<string> | null, timestamp: number | null, lines: Array<{ id: string | null, text: string | null, timestamp: number | null, endTime: number | null, secondary: string | null, singers: Array<string> | null, translation: string | null, translations: Array<{ language: string, text: string }> | null, words: Array<{ word: string, time: number | null, reading: string | null }> | null, secondaryWords: Array<{ word: string, time: number | null }> | null }> }> } | null } | null };

export type CloneProjectMutationVariables = Exact<{
  id: string;
}>;


export type CloneProjectMutation = { cloneProject: { id: string, publicId: string } };

export type StarProjectMutationVariables = Exact<{
  id: string;
}>;


export type StarProjectMutation = { starProject: { publicId: string, starCount: number | null, isStarredByMe: boolean | null } };

export type UnstarProjectMutationVariables = Exact<{
  id: string;
}>;


export type UnstarProjectMutation = { unstarProject: { publicId: string, starCount: number | null, isStarredByMe: boolean | null } };

export type SetForksEnabledMutationVariables = Exact<{
  publicId: string;
  enabled: boolean;
}>;


export type SetForksEnabledMutation = { setForksEnabled: { id: string, publicId: string, forksEnabled: boolean | null } };

export type BoostProjectMutationVariables = Exact<{
  publicId: string;
}>;


export type BoostProjectMutation = { boostProject: boolean };

export type ListMediaQueryVariables = Exact<{
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type ListMediaQuery = { uploads: Array<{ id: string, source: string, fileName: string, title: string, duration: number | null, uploadUrl: string | null, publicId: string | null, createdAt: string | null, updatedAt: string | null }> };

export type GetMediaQueryVariables = Exact<{
  id: string;
}>;


export type GetMediaQuery = { upload: { id: string, source: string, fileName: string, title: string, duration: number | null, uploadUrl: string | null, publicId: string | null, createdAt: string | null, updatedAt: string | null, projects: Array<{ id: string, publicId: string, title: string | null, updatedAt: string | null }> } | null };

export type SaveMediaMutationVariables = Exact<{
  input: SaveMediaInput;
}>;


export type SaveMediaMutation = { saveMedia: { id: string, source: string, fileName: string, title: string } };

export type DeleteMediaMutationVariables = Exact<{
  id: string;
}>;


export type DeleteMediaMutation = { deleteMedia: boolean };

export type ProjectReactionsQueryVariables = Exact<{
  publicId: string;
}>;


export type ProjectReactionsQuery = { projectReactions: { myReaction: string | null, reactions: Array<{ emoji: string, count: number }> } };

export type ReactToProjectMutationVariables = Exact<{
  publicId: string;
  emoji: string;
}>;


export type ReactToProjectMutation = { reactToProject: { myReaction: string | null, reactions: Array<{ emoji: string, count: number }> } };

export type HeaderSearchQueryVariables = Exact<{
  query: string;
  pLimit?: number | null | undefined;
  uLimit?: number | null | undefined;
}>;


export type HeaderSearchQuery = { searchProjects: { total: number, projects: Array<{ id: string, publicId: string, title: string | null, coverImage: string | null, starCount: number | null, forkCount: number | null, forkedFrom: { publicId: string | null, accountName: string | null } | null, metadata: { songName: string | null, songArtist: string | null } | null }> }, searchUsers: Array<{ id: string, accountName: string, displayName: string | null, avatarUrl: string | null }> };

export type SearchProjectsQueryVariables = Exact<{
  query: string;
  sortBy?: SearchSort | null | undefined;
  offset?: number | null | undefined;
  limit?: number | null | undefined;
}>;


export type SearchProjectsQuery = { searchProjects: { total: number, projects: Array<{ id: string, publicId: string, title: string | null, coverImage: string | null, starCount: number | null, forkCount: number | null, createdAt: string | null, forkedFrom: { publicId: string | null, accountName: string | null } | null, metadata: { songName: string | null, songArtist: string | null, genre: string | null, tags: Array<string> | null } | null }> } };

export type SearchUsersQueryVariables = Exact<{
  query: string;
  limit?: number | null | undefined;
}>;


export type SearchUsersQuery = { searchUsers: Array<{ id: string, accountName: string, displayName: string | null, avatarUrl: string | null }> };

export type ProfileBadgeDefinitionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ProfileBadgeDefinitionsQuery = { badgeDefinitions: Array<{ id: string, holderCount: number }> };

export type UserActivityQueryVariables = Exact<{
  offset?: number | null | undefined;
  limit?: number | null | undefined;
}>;


export type UserActivityQuery = { userActivity: { hasMore: boolean, activities: Array<{ id: string, type: ActivityType, publicId: string, projectTitle: string, coverImage: string | null, targetPath: string | null, createdAt: string, actor: { id: string, accountName: string, displayName: string | null, avatarUrl: string | null } }> } };

export type UserActivityHeatmapQueryVariables = Exact<{ [key: string]: never; }>;


export type UserActivityHeatmapQuery = { userActivityHeatmap: Array<{ date: string, count: number }> };

export type UserContentStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type UserContentStatsQuery = { userContentStats: { totalProjects: number, totalLines: number, syncedLines: number, completionPercentage: number, averageProjectCompletion: number, averageLinesPerProject: number, fullySyncedProjects: number, musicSyncedMinutes: number, wordsTimestamped: number, karaokeLines: number, publicProjects: number, starsReceived: number, forksReceived: number, syncTrendPercentage: number, mostSyncedProject: { title: string, count: number } | null, largestProject: { title: string, count: number } | null } };

export type GetSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSettingsQuery = { settings: { playback: { volume: number | null, muted: boolean | null, showWaveform: boolean | null, waveformSnap: boolean | null, loopCurrentLine: boolean | null, speedPresets: Array<number> | null, seekTime: number | null, seekPlays: boolean | null, autoRewindOnPause: { enabled: boolean | null, seconds: number | null } | null, speedBounds: { min: number | null, max: number | null } | null } | null, editor: { autoPauseOnMark: boolean | null, showShiftAll: boolean | null, shiftAllAmount: number | null, showLineNumbers: boolean | null, timestampPrecision: string | null, nudge: { fine: number | null, coarse: number | null, default: number | null } | null, autoAdvance: { enabled: boolean | null, skipBlank: boolean | null, mode: string | null } | null, srt: { defaultSubtitleDuration: number | null, minSubtitleGap: number | null, snapToNextLine: boolean | null } | null, history: { limit: number | null, groupingThresholdMs: number | null } | null, display: { activeHighlight: string | null, showNextLine: boolean | null, dualLine: boolean | null, languageLayout: string | null, translationLayout: string | null, readingFormat: string | null, karaokeFillTrack: string | null, karaokeFillEasing: string | null } | null, scroll: { mode: string | null, alignment: string | null } | null } | null, export: { lineEndings: string | null, copyFormat: string | null, downloadFormat: string | null, timestampPrecision: string | null, defaultFilenamePattern: string | null, includeMetadata: boolean | null, stripEmptyLines: boolean | null, normalizeTimestamps: boolean | null, wordTimestampPrecision: string | null } | null, interface: { theme: string | null, defaultLanguage: string | null, fontSize: string | null, spacing: string | null, previewAlignment: string | null, focusMode: string | null, layoutSwap: boolean | null, playerTop: boolean | null, editorWidth: number | null, lockLayout: boolean | null, mobileTab: string | null, toastPosition: string | null } | null, shortcuts: { mark: Array<string> | null, nudgeLeft: Array<string> | null, nudgeRight: Array<string> | null, nudgeLeftFine: Array<string> | null, nudgeRightFine: Array<string> | null, addLine: Array<string> | null, deleteLine: Array<string> | null, clearTimestamp: Array<string> | null, switchMode: Array<string> | null, deselect: Array<string> | null, showHelp: Array<string> | null, rangeSelect: Array<string> | null, toggleSelect: Array<string> | null, playPause: Array<string> | null, seekForward: Array<string> | null, seekBackward: Array<string> | null, mute: Array<string> | null, speedUp: Array<string> | null, speedDown: Array<string> | null, addSecondary: Array<string> | null, addTranslation: Array<string> | null, toggleTranslation: Array<string> | null, focusSync: Array<string> | null, focusPreview: Array<string> | null, focusPlayback: Array<string> | null } | null, import: { expandRepeats: boolean | null } | null, advanced: { confirmDestructive: boolean | null, timezone: string | null, autoSave: { enabled: boolean | null, timeInterval: number | null } | null } | null } | null };

export type UpdateSettingsMutationVariables = Exact<{
  input: UpdateSettingsInput;
}>;


export type UpdateSettingsMutation = { updateSettings: { interface: { theme: string | null, fontSize: string | null, spacing: string | null } | null } };

export type ResetSettingsMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetSettingsMutation = { resetSettings: boolean };

export type GetShareProjectIdQueryVariables = Exact<{
  id: string;
}>;


export type GetShareProjectIdQuery = { getShare: { publicId: string } | null };
