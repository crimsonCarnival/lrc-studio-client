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
  /** PROJECT_SHARED only: the sharer's note and tags. */
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  projectTitle: Scalars['String']['output'];
  publicId: Scalars['String']['output'];
  tags?: Maybe<Array<Scalars['String']['output']>>;
  /** Who it was done to: the followed user, or the project's owner for a star, fork or share. Null for the rest, or when they are gone. Only id, accountName, displayName and avatarUrl are populated. */
  target?: Maybe<FollowUser>;
  targetPath?: Maybe<Scalars['String']['output']>;
  type: ActivityType;
};

export type ActivityHeatmapDay = {
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
};

export type ActivityType =
  | 'PLAYLIST_CREATED'
  | 'PROJECT_FORKED'
  | 'PROJECT_PUBLISHED'
  | 'PROJECT_SHARED'
  | 'PROJECT_STARRED'
  | 'USER_FOLLOWED';

export type AddictionLevel = {
  description: LocalizedString;
  id: Scalars['String']['output'];
  order: Scalars['Float']['output'];
  requirements: AddictionLevelRequirements;
  title: LocalizedString;
};

export type AddictionLevelInput = {
  description?: InputMaybe<LocalizedStringInput>;
  id: Scalars['String']['input'];
  order?: InputMaybe<Scalars['Float']['input']>;
  requirements?: InputMaybe<AddictionLevelRequirementsInput>;
  title: LocalizedStringInput;
};

export type AddictionLevelRequirements = {
  karaokeLines?: Maybe<Scalars['Int']['output']>;
  musicSyncedMinutes?: Maybe<Scalars['Int']['output']>;
  publicProjects?: Maybe<Scalars['Int']['output']>;
  starsReceived?: Maybe<Scalars['Int']['output']>;
  syncedLines?: Maybe<Scalars['Int']['output']>;
  totalProjects?: Maybe<Scalars['Int']['output']>;
  wordsTimestamped?: Maybe<Scalars['Int']['output']>;
};

export type AddictionLevelRequirementsInput = {
  karaokeLines?: InputMaybe<Scalars['Int']['input']>;
  musicSyncedMinutes?: InputMaybe<Scalars['Int']['input']>;
  publicProjects?: InputMaybe<Scalars['Int']['input']>;
  starsReceived?: InputMaybe<Scalars['Int']['input']>;
  syncedLines?: InputMaybe<Scalars['Int']['input']>;
  totalProjects?: InputMaybe<Scalars['Int']['input']>;
  wordsTimestamped?: InputMaybe<Scalars['Int']['input']>;
};

export type AddictionLevelUpdateInput = {
  description?: InputMaybe<LocalizedStringInput>;
  order?: InputMaybe<Scalars['Float']['input']>;
  requirements?: InputMaybe<AddictionLevelRequirementsInput>;
  title?: InputMaybe<LocalizedStringInput>;
};

export type AdvancedSettings = {
  autoSave?: Maybe<AutoSaveSettings>;
  autoSaveIndicator?: Maybe<Scalars['String']['output']>;
  confirmDestructive?: Maybe<Scalars['Boolean']['output']>;
  dateStyle?: Maybe<Scalars['String']['output']>;
  hourCycle?: Maybe<Scalars['String']['output']>;
  showUtcOffset?: Maybe<Scalars['Boolean']['output']>;
  timezone?: Maybe<Scalars['String']['output']>;
};

export type AdvancedSettingsInput = {
  autoSave?: InputMaybe<AutoSaveSettingsInput>;
  autoSaveIndicator?: InputMaybe<Scalars['String']['input']>;
  confirmDestructive?: InputMaybe<Scalars['Boolean']['input']>;
  dateStyle?: InputMaybe<Scalars['String']['input']>;
  hourCycle?: InputMaybe<Scalars['String']['input']>;
  showUtcOffset?: InputMaybe<Scalars['Boolean']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type ArtistCredit = {
  artistId?: Maybe<Scalars['ID']['output']>;
  name: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  role: ArtistRole;
};

export type ArtistCreditInput = {
  name: Scalars['String']['input'];
  role: ArtistRole;
};

export type ArtistParseFlag = {
  code: ArtistParseFlagCode;
  source: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type ArtistParseFlagCode =
  | 'ambiguous_separator'
  | 'duplicate_removed'
  | 'empty_feat_segment'
  | 'unbalanced_bracket'
  | 'weak_marker';

export type ArtistRole =
  | 'featured'
  | 'primary';

export type ArtistSuggestion = {
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type ArtistSuggestionPage = {
  items: Array<ArtistSuggestion>;
  total: Scalars['Int']['output'];
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

export type AutoStampSettings = {
  applyMode?: Maybe<Scalars['String']['output']>;
  confidenceThreshold?: Maybe<Scalars['Float']['output']>;
  fuzzyTolerance?: Maybe<Scalars['Float']['output']>;
};

export type AutoStampSettingsInput = {
  applyMode?: InputMaybe<Scalars['String']['input']>;
  confidenceThreshold?: InputMaybe<Scalars['Float']['input']>;
  fuzzyTolerance?: InputMaybe<Scalars['Float']['input']>;
};

export type BadgeDef = {
  autoGrant: Scalars['Boolean']['output'];
  color: Scalars['String']['output'];
  conditionType: Scalars['String']['output'];
  conditionValue?: Maybe<Scalars['Int']['output']>;
  description: LocalizedString;
  holderCount: Scalars['Int']['output'];
  holderPct: Scalars['Float']['output'];
  icon: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isBuiltin: Scalars['Boolean']['output'];
  label: LocalizedString;
  rarity: Scalars['String']['output'];
  xpReward: Scalars['Int']['output'];
};

export type BadgeDefInput = {
  autoGrant?: InputMaybe<Scalars['Boolean']['input']>;
  color: Scalars['String']['input'];
  conditionType: Scalars['String']['input'];
  conditionValue?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<LocalizedStringInput>;
  icon?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  label: LocalizedStringInput;
  rarity?: InputMaybe<Scalars['String']['input']>;
  xpReward?: InputMaybe<Scalars['Int']['input']>;
};

export type BlockedUser = {
  accountName: Scalars['String']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  blockedAt?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
};

export type CollabInvite = {
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  revoked: Scalars['Boolean']['output'];
  /** editor or viewer. */
  role: Scalars['String']['output'];
};

export type CollabKickResult = {
  /** The invite a kicked guest joined with, now revoked, so every other guest on that link is cut off too. Null for a signed-in user. */
  revokedInviteId?: Maybe<Scalars['ID']['output']>;
};

/** Someone in a live collaborative session. subject is user:<id> or guest:<id>. */
export type CollabParticipant = {
  avatarUrl?: Maybe<Scalars['String']['output']>;
  /** 1-8, maps to --color-collab-<n>. */
  colorIndex: Scalars['Int']['output'];
  /** Guests only, owner only: the invite they joined with. Kicking a guest revokes it. */
  inviteId?: Maybe<Scalars['ID']['output']>;
  name: Scalars['String']['output'];
  /** owner, editor or viewer. */
  role: Scalars['String']['output'];
  subject: Scalars['String']['output'];
};

export type CollabSession = {
  allowGuests: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** Owner only; empty for everyone else. */
  invites: Array<CollabInvite>;
  members: Array<CollabParticipant>;
  publicId: Scalars['String']['output'];
};

/** A live session in the caller's session list, with the project it is about. */
export type CollabSessionSummary = {
  createdAt: Scalars['String']['output'];
  lastActivityAt: Scalars['String']['output'];
  memberCount: Scalars['Int']['output'];
  publicId: Scalars['String']['output'];
  /** The caller's role: owner, editor or viewer. */
  role: Scalars['String']['output'];
  songArtist: Scalars['String']['output'];
  songName: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type ContentStats = {
  addictionId: Scalars['String']['output'];
  addictionTitle: LocalizedString;
  averageLinesPerProject: Scalars['Float']['output'];
  averageProjectCompletion: Scalars['Float']['output'];
  completionPercentage: Scalars['Float']['output'];
  currentStreak: Scalars['Int']['output'];
  forksReceived: Scalars['Int']['output'];
  fullySyncedProjects: Scalars['Int']['output'];
  karaokeLines: Scalars['Int']['output'];
  largestProject?: Maybe<ProjectStats>;
  longestStreak: Scalars['Int']['output'];
  mostSyncedProject?: Maybe<ProjectStats>;
  musicSyncedMinutes: Scalars['Int']['output'];
  musicSyncedSeconds: Scalars['Int']['output'];
  publicProjects: Scalars['Int']['output'];
  starsReceived: Scalars['Int']['output'];
  syncTrendPercentage: Scalars['Float']['output'];
  syncedLines: Scalars['Int']['output'];
  totalLines: Scalars['Int']['output'];
  totalProjects: Scalars['Int']['output'];
  wordsTimestamped: Scalars['Int']['output'];
};

export type CreatePlaylistInput = {
  coverImage?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  isPublic?: InputMaybe<Scalars['Boolean']['input']>;
  /** With isPublic: true, false makes the list unlisted. Defaults to listed whenever isPublic changes. */
  listed?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  publicIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  sortMode?: InputMaybe<PlaylistSortMode>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateProjectInput = {
  coverImage?: InputMaybe<Scalars['String']['input']>;
  createdFrom?: InputMaybe<Scalars['String']['input']>;
  /** Set once at creation and never changed. Omitted means song. */
  kind?: InputMaybe<ProjectKind>;
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
  singerColors?: Maybe<Array<Scalars['String']['output']>>;
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
  singerColors?: InputMaybe<Array<Scalars['String']['input']>>;
  translationLayout?: InputMaybe<Scalars['String']['input']>;
};

export type EditorSettings = {
  autoAdvance?: Maybe<AutoAdvanceSettings>;
  autoPauseOnMark?: Maybe<Scalars['Boolean']['output']>;
  display?: Maybe<DisplaySettings>;
  history?: Maybe<HistorySettings>;
  lyricsSearchSpeed?: Maybe<Scalars['String']['output']>;
  nudge?: Maybe<NudgeSettings>;
  overlapThreshold?: Maybe<Scalars['Float']['output']>;
  playerPosition?: Maybe<Scalars['String']['output']>;
  preserveEmptyLines?: Maybe<Scalars['Boolean']['output']>;
  scroll?: Maybe<ScrollSettings>;
  shiftAllAmount?: Maybe<Scalars['Float']['output']>;
  showLineNumbers?: Maybe<Scalars['Boolean']['output']>;
  showShiftAll?: Maybe<Scalars['Boolean']['output']>;
  srt?: Maybe<SrtSettings>;
  syncFlashDuration?: Maybe<Scalars['String']['output']>;
  timestampPrecision?: Maybe<Scalars['String']['output']>;
};

export type EditorSettingsInput = {
  autoAdvance?: InputMaybe<AutoAdvanceSettingsInput>;
  autoPauseOnMark?: InputMaybe<Scalars['Boolean']['input']>;
  display?: InputMaybe<DisplaySettingsInput>;
  history?: InputMaybe<HistorySettingsInput>;
  lyricsSearchSpeed?: InputMaybe<Scalars['String']['input']>;
  nudge?: InputMaybe<NudgeSettingsInput>;
  overlapThreshold?: InputMaybe<Scalars['Float']['input']>;
  playerPosition?: InputMaybe<Scalars['String']['input']>;
  preserveEmptyLines?: InputMaybe<Scalars['Boolean']['input']>;
  scroll?: InputMaybe<ScrollSettingsInput>;
  shiftAllAmount?: InputMaybe<Scalars['Float']['input']>;
  showLineNumbers?: InputMaybe<Scalars['Boolean']['input']>;
  showShiftAll?: InputMaybe<Scalars['Boolean']['input']>;
  srt?: InputMaybe<SrtSettingsInput>;
  syncFlashDuration?: InputMaybe<Scalars['String']['input']>;
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
  includeFeaturedInTitle?: Maybe<Scalars['Boolean']['output']>;
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
  includeFeaturedInTitle?: InputMaybe<Scalars['Boolean']['input']>;
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
  allowsTags: Scalars['Boolean']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  followerCount?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  isFollowedByMe: Scalars['Boolean']['output'];
  level?: Maybe<Scalars['Int']['output']>;
  projectCount?: Maybe<Scalars['Int']['output']>;
  staffRole?: Maybe<Scalars['String']['output']>;
  totalStarsReceived?: Maybe<Scalars['Int']['output']>;
};

export type ForkedFrom = {
  accountName?: Maybe<Scalars['String']['output']>;
  publicId?: Maybe<Scalars['String']['output']>;
  sourceDeleted?: Maybe<Scalars['Boolean']['output']>;
  userId?: Maybe<Scalars['ID']['output']>;
};

export type GoogleInfo = {
  connected: Scalars['Boolean']['output'];
  email?: Maybe<Scalars['String']['output']>;
  googleId?: Maybe<Scalars['String']['output']>;
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

export type InterfaceSettings = {
  /** JSON of the user's own theme (client/src/shared/theme/custom-theme.ts), at most 600 characters. */
  customTheme?: Maybe<Scalars['String']['output']>;
  defaultLanguage?: Maybe<Scalars['String']['output']>;
  /** Show the editor tour on new projects. Default true. */
  editorTourEnabled?: Maybe<Scalars['Boolean']['output']>;
  /** How many times the editor tour has been shown. Non-negative integer. */
  editorTourShown?: Maybe<Scalars['Int']['output']>;
  editorWidth?: Maybe<Scalars['Float']['output']>;
  focusContrast?: Maybe<Scalars['String']['output']>;
  focusMode?: Maybe<Scalars['String']['output']>;
  fontSize?: Maybe<Scalars['String']['output']>;
  fontWeight?: Maybe<Scalars['String']['output']>;
  /** Keep the chosen theme on this browser after signing out. Default true. */
  keepThemeOnSignOut?: Maybe<Scalars['Boolean']['output']>;
  layoutSwap?: Maybe<Scalars['Boolean']['output']>;
  autoHideHeader?: Maybe<Scalars['Boolean']['output']>;
  lockLayout?: Maybe<Scalars['Boolean']['output']>;
  mobileTab?: Maybe<Scalars['String']['output']>;
  playerTop?: Maybe<Scalars['Boolean']['output']>;
  previewAlignment?: Maybe<Scalars['String']['output']>;
  spacing?: Maybe<Scalars['String']['output']>;
  theme?: Maybe<Scalars['String']['output']>;
  toastPosition?: Maybe<Scalars['String']['output']>;
};

export type InterfaceSettingsInput = {
  /** JSON of the user's own theme (client/src/shared/theme/custom-theme.ts), at most 600 characters. */
  customTheme?: InputMaybe<Scalars['String']['input']>;
  defaultLanguage?: InputMaybe<Scalars['String']['input']>;
  /** Show the editor tour on new projects. Default true. */
  editorTourEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** How many times the editor tour has been shown. Non-negative integer. */
  editorTourShown?: InputMaybe<Scalars['Int']['input']>;
  editorWidth?: InputMaybe<Scalars['Float']['input']>;
  focusContrast?: InputMaybe<Scalars['String']['input']>;
  focusMode?: InputMaybe<Scalars['String']['input']>;
  fontSize?: InputMaybe<Scalars['String']['input']>;
  fontWeight?: InputMaybe<Scalars['String']['input']>;
  /** Keep the chosen theme on this browser after signing out. Default true. */
  keepThemeOnSignOut?: InputMaybe<Scalars['Boolean']['input']>;
  layoutSwap?: InputMaybe<Scalars['Boolean']['input']>;
  autoHideHeader?: InputMaybe<Scalars['Boolean']['input']>;
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

export type LeaderboardSort =
  | 'LINES'
  | 'PROJECTS'
  | 'RANK'
  | 'STARS'
  | 'TIME_SYNCED'
  | 'XP';

export type LeaderboardSortDirection =
  | 'ASC'
  | 'DESC';

export type LeaderboardTimeframe =
  | 'ALL_TIME'
  | 'MONTH'
  | 'WEEK';

export type LeaderboardUser = {
  accountName: Scalars['String']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  badges: Array<UserBadge>;
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  periodXp?: Maybe<Scalars['Int']['output']>;
  progression?: Maybe<UserProgression>;
  projectCount: Scalars['Int']['output'];
  rankScore: Scalars['Float']['output'];
  staffRole?: Maybe<Scalars['String']['output']>;
  stats?: Maybe<UserStats>;
  streak?: Maybe<UserStreak>;
  totalForksReceived: Scalars['Int']['output'];
  totalStarsReceived: Scalars['Int']['output'];
};

export type Line = {
  adLibOf?: Maybe<Scalars['Float']['output']>;
  endTime?: Maybe<Scalars['Float']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  mode?: Maybe<Scalars['String']['output']>;
  secondary?: Maybe<Scalars['String']['output']>;
  secondaryWords?: Maybe<Array<Word>>;
  singers?: Maybe<Array<Scalars['String']['output']>>;
  source?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  timestamp?: Maybe<Scalars['Float']['output']>;
  translation?: Maybe<Scalars['String']['output']>;
  translations?: Maybe<Array<Translation>>;
  words?: Maybe<Array<Word>>;
};

export type LineInput = {
  adLibOf?: InputMaybe<Scalars['Float']['input']>;
  depth?: InputMaybe<Scalars['Int']['input']>;
  endTime?: InputMaybe<Scalars['Float']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  mode?: InputMaybe<Scalars['String']['input']>;
  secondary?: InputMaybe<Scalars['String']['input']>;
  secondaryWords?: InputMaybe<Array<WordInput>>;
  singers?: InputMaybe<Array<Scalars['String']['input']>>;
  source?: InputMaybe<Scalars['String']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  timestamp?: InputMaybe<Scalars['Float']['input']>;
  translation?: InputMaybe<Scalars['String']['input']>;
  translations?: InputMaybe<Array<TranslationInput>>;
  type?: InputMaybe<Scalars['String']['input']>;
  words?: InputMaybe<Array<WordInput>>;
};

export type LinePatchInput = {
  line: LineInput;
  lineIdx: Scalars['Int']['input'];
  sectionIdx: Scalars['Int']['input'];
};

export type LocalizedString = {
  en: Scalars['String']['output'];
  es: Scalars['String']['output'];
};

export type LocalizedStringInput = {
  en: Scalars['String']['input'];
  es?: InputMaybe<Scalars['String']['input']>;
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
  album: Scalars['String']['output'];
  artist: Scalars['String']['output'];
  genre?: Maybe<Scalars['String']['output']>;
  language?: Maybe<Scalars['String']['output']>;
  trackCount?: Maybe<Scalars['Int']['output']>;
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  addProjectToPlaylist: Playlist;
  /** Write in a report's conversation (its reporter or a moderator). parentId answers a message. */
  addReportMessage: ReportMessage;
  addWallComment: WallComment;
  adminCreateAddictionLevel: AddictionLevel;
  adminCreateBadge: BadgeDef;
  adminDeleteAddictionLevel: Scalars['Boolean']['output'];
  adminDeleteBadge: Scalars['Boolean']['output'];
  adminGrantBadge: Scalars['Boolean']['output'];
  adminRetroactiveScan: RetroactiveResult;
  adminRevokeBadge: Scalars['Boolean']['output'];
  adminShadowBan: Scalars['Boolean']['output'];
  adminUnshadowBan: Scalars['Boolean']['output'];
  adminUpdateAddictionLevel: AddictionLevel;
  adminUpdateBadge: BadgeDef;
  blockUser: Scalars['Boolean']['output'];
  /** The wall's owner blocks a commenter and removes everything they wrote on the wall. Returns how many. */
  blockWallCommenter: Scalars['Int']['output'];
  cloneProject: Project;
  /** Returns the raw invite token. It is stored hashed and never returned again. */
  createCollabInvite: Scalars['String']['output'];
  createPlaylist: Playlist;
  createProject: Project;
  deleteMedia: Scalars['Boolean']['output'];
  deletePlaylist: Scalars['Boolean']['output'];
  deleteProject: Scalars['Boolean']['output'];
  deleteWallComment: Scalars['Boolean']['output'];
  /** The author only, shortly after posting. */
  editWallComment: WallComment;
  endCollabSession: Scalars['Boolean']['output'];
  /** targetType: wall_comment, user, project or playlist; targetId is its id (a project's publicId also works). reason depends on the type. alsoBlock (accounts only) blocks it too. */
  fileReport: Scalars['Boolean']['output'];
  follow: Scalars['Boolean']['output'];
  incrementPlaylistShare: Scalars['Boolean']['output'];
  incrementPlaylistView: Scalars['Boolean']['output'];
  incrementProjectShare: Scalars['Boolean']['output'];
  kickCollabParticipant: CollabKickResult;
  /** wall.restrict: lift someone's commenting restriction. */
  liftWallRestriction: Scalars['Boolean']['output'];
  /** The wall's owner or a moderator: approve or reject a held comment, hide or unhide one. */
  moderateWallComment: Scalars['Boolean']['output'];
  /** The wall's owner or a moderator: delete everything authorId wrote on the wall. Returns how many. */
  purgeWallComments: Scalars['Int']['output'];
  reactToProject: ProjectReactions;
  registerProjectView?: Maybe<ProjectViewResult>;
  /** Owner only. Removes a collaborator credit and stops it being re-added. id is the credit's subject. */
  removeProjectCollaborator: Scalars['Boolean']['output'];
  removeProjectFromPlaylist: Playlist;
  reorderPlaylist: Playlist;
  /** reason: spam | harassment | hate | sexual | other */
  reportWallComment: Scalars['Boolean']['output'];
  resetSettings: Scalars['Boolean']['output'];
  /** Moderators only. action: dismiss or action. Acting on a project or playlist deletes it and needs sudo. */
  resolveReportGroup: Scalars['Boolean']['output'];
  /** Moderators only. action: dismiss | delete */
  resolveWallReport: Scalars['Boolean']['output'];
  /** wall.restrict: stop someone commenting on walls for hours (1, 24, 168 or 720; null until lifted). Returns the end, or 'forever'. */
  restrictWallCommenter?: Maybe<Scalars['String']['output']>;
  reviewRequest: StaffRequest;
  revokeCollabInvite: Scalars['Boolean']['output'];
  saveMedia: Upload;
  savePlaylist: Scalars['Boolean']['output'];
  sendVerificationEmail: Scalars['Boolean']['output'];
  setCollabGuestAccess: Scalars['Boolean']['output'];
  setCollabRole: Scalars['Boolean']['output'];
  /** What you hear about a followed user's projects: off, uploads or all. */
  setFollowNotify: Scalars['Boolean']['output'];
  setForksEnabled: Project;
  /** The IANA timezone (e.g. America/Bogota) whose calendar days the user's streak and heatmap count. */
  setTimezone: Scalars['Boolean']['output'];
  /** Like (liked: true) or unlike a wall comment. Idempotent. */
  setWallCommentLike: WallLikeResult;
  /** The wall's owner only; one pinned top-level comment per wall. */
  setWallCommentPin: Scalars['Boolean']['output'];
  /** Add (on: true) or take back the viewer's emoji reaction on a comment. */
  setWallCommentReaction: Array<WallReaction>;
  setWallSubscription: Scalars['Boolean']['output'];
  /** Stop (or resume) hearing about replies in the thread the comment belongs to. */
  setWallThreadMute: Scalars['Boolean']['output'];
  /** Put someone else's public project on your profile; your followers see it in their feed. On a project you already shared, edits the note instead. */
  shareToProfile: Scalars['Boolean']['output'];
  starProject: Project;
  /** Idempotent: returns the live session if one exists. */
  startCollabSession: CollabSession;
  submitRequest: StaffRequest;
  unblockUser: Scalars['Boolean']['output'];
  unfollow: Scalars['Boolean']['output'];
  unsavePlaylist: Scalars['Boolean']['output'];
  /** Take a share back, along with its feed entry. Idempotent. */
  unshareFromProfile: Scalars['Boolean']['output'];
  unstarProject: Project;
  updateLyrics: Lyrics;
  updatePlaylist: Playlist;
  updatePreferences: UserPreferences;
  updateProfile: User;
  updateProject: Project;
  updateSettings: Settings;
  updateShowcase: UpdateShowcaseResult;
};


export type MutationAddProjectToPlaylistArgs = {
  playlistId: Scalars['ID']['input'];
  publicId: Scalars['ID']['input'];
};


export type MutationAddReportMessageArgs = {
  body: Scalars['String']['input'];
  parentId?: InputMaybe<Scalars['ID']['input']>;
  reportId: Scalars['ID']['input'];
};


export type MutationAddWallCommentArgs = {
  accountName: Scalars['String']['input'];
  body: Scalars['String']['input'];
  parentId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationAdminCreateAddictionLevelArgs = {
  input: AddictionLevelInput;
};


export type MutationAdminCreateBadgeArgs = {
  input: BadgeDefInput;
};


export type MutationAdminDeleteAddictionLevelArgs = {
  id: Scalars['String']['input'];
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


export type MutationAdminShadowBanArgs = {
  feed: Scalars['Boolean']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  search: Scalars['Boolean']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationAdminUnshadowBanArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationAdminUpdateAddictionLevelArgs = {
  id: Scalars['String']['input'];
  input: AddictionLevelUpdateInput;
};


export type MutationAdminUpdateBadgeArgs = {
  id: Scalars['String']['input'];
  input: BadgeDefInput;
};


export type MutationBlockUserArgs = {
  accountName: Scalars['String']['input'];
};


export type MutationBlockWallCommenterArgs = {
  authorId: Scalars['ID']['input'];
};


export type MutationCloneProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateCollabInviteArgs = {
  publicId: Scalars['String']['input'];
  role: Scalars['String']['input'];
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


export type MutationDeleteWallCommentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationEditWallCommentArgs = {
  body: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};


export type MutationEndCollabSessionArgs = {
  publicId: Scalars['String']['input'];
};


export type MutationFileReportArgs = {
  alsoBlock?: InputMaybe<Scalars['Boolean']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  reason: Scalars['String']['input'];
  targetId: Scalars['ID']['input'];
  targetType: Scalars['String']['input'];
};


export type MutationFollowArgs = {
  accountName: Scalars['String']['input'];
};


export type MutationIncrementPlaylistShareArgs = {
  id: Scalars['ID']['input'];
};


export type MutationIncrementPlaylistViewArgs = {
  id: Scalars['ID']['input'];
};


export type MutationIncrementProjectShareArgs = {
  id: Scalars['ID']['input'];
};


export type MutationKickCollabParticipantArgs = {
  publicId: Scalars['String']['input'];
  subject: Scalars['String']['input'];
};


export type MutationLiftWallRestrictionArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationModerateWallCommentArgs = {
  action: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};


export type MutationPurgeWallCommentsArgs = {
  accountName: Scalars['String']['input'];
  authorId: Scalars['ID']['input'];
};


export type MutationReactToProjectArgs = {
  emoji: Scalars['String']['input'];
  publicId: Scalars['String']['input'];
};


export type MutationRegisterProjectViewArgs = {
  publicId: Scalars['ID']['input'];
};


export type MutationRemoveProjectCollaboratorArgs = {
  id: Scalars['ID']['input'];
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


export type MutationReportWallCommentArgs = {
  id: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  reason: Scalars['String']['input'];
};


export type MutationResolveReportGroupArgs = {
  action: Scalars['String']['input'];
  targetId: Scalars['ID']['input'];
  targetType: Scalars['String']['input'];
};


export type MutationResolveWallReportArgs = {
  action: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};


export type MutationRestrictWallCommenterArgs = {
  hours?: InputMaybe<Scalars['Int']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
};


export type MutationReviewRequestArgs = {
  decision: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRevokeCollabInviteArgs = {
  inviteId: Scalars['ID']['input'];
  publicId: Scalars['String']['input'];
};


export type MutationSaveMediaArgs = {
  input: SaveMediaInput;
};


export type MutationSavePlaylistArgs = {
  playlistId: Scalars['ID']['input'];
};


export type MutationSetCollabGuestAccessArgs = {
  allowGuests: Scalars['Boolean']['input'];
  publicId: Scalars['String']['input'];
};


export type MutationSetCollabRoleArgs = {
  publicId: Scalars['String']['input'];
  role: Scalars['String']['input'];
  subject: Scalars['String']['input'];
};


export type MutationSetFollowNotifyArgs = {
  accountName: Scalars['String']['input'];
  level: Scalars['String']['input'];
};


export type MutationSetForksEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
  publicId: Scalars['ID']['input'];
};


export type MutationSetTimezoneArgs = {
  timezone: Scalars['String']['input'];
};


export type MutationSetWallCommentLikeArgs = {
  id: Scalars['ID']['input'];
  liked: Scalars['Boolean']['input'];
};


export type MutationSetWallCommentPinArgs = {
  id: Scalars['ID']['input'];
  pinned: Scalars['Boolean']['input'];
};


export type MutationSetWallCommentReactionArgs = {
  emoji: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  on: Scalars['Boolean']['input'];
};


export type MutationSetWallSubscriptionArgs = {
  accountName: Scalars['String']['input'];
  subscribed: Scalars['Boolean']['input'];
};


export type MutationSetWallThreadMuteArgs = {
  id: Scalars['ID']['input'];
  muted: Scalars['Boolean']['input'];
};


export type MutationShareToProfileArgs = {
  input?: InputMaybe<ProfileShareInput>;
  publicId: Scalars['ID']['input'];
};


export type MutationStarProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationStartCollabSessionArgs = {
  publicId: Scalars['String']['input'];
};


export type MutationSubmitRequestArgs = {
  payload: Scalars['String']['input'];
  type: Scalars['String']['input'];
};


export type MutationUnblockUserArgs = {
  accountName: Scalars['String']['input'];
};


export type MutationUnfollowArgs = {
  accountName: Scalars['String']['input'];
};


export type MutationUnsavePlaylistArgs = {
  playlistId: Scalars['ID']['input'];
};


export type MutationUnshareFromProfileArgs = {
  publicId: Scalars['ID']['input'];
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


export type MutationUpdatePreferencesArgs = {
  input: UpdatePreferencesInput;
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

/** One of the viewer's own reports. The preview is null once the target is gone or no longer visible to them. */
export type MyReport = {
  comment?: Maybe<ReportCommentTarget>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Messages in this report's conversation. */
  messageCount: Scalars['Int']['output'];
  note: Scalars['String']['output'];
  playlist?: Maybe<ReportPlaylistTarget>;
  project?: Maybe<ReportProjectTarget>;
  reason: Scalars['String']['output'];
  resolvedAt?: Maybe<Scalars['String']['output']>;
  /** open, dismissed or actioned. */
  status: Scalars['String']['output'];
  targetId: Scalars['ID']['output'];
  targetType: Scalars['String']['output'];
  user?: Maybe<ReportUserTarget>;
};

export type MyReports = {
  reports: Array<MyReport>;
  total: Scalars['Int']['output'];
};

export type MyWallReports = {
  reports: Array<WallReport>;
  total: Scalars['Int']['output'];
};

export type NameChange = {
  changedAt: Scalars['String']['output'];
  from: Scalars['String']['output'];
  to: Scalars['String']['output'];
};

export type NotificationPreferences = {
  appeal_result: Scalars['Boolean']['output'];
  badge_awarded: Scalars['Boolean']['output'];
  comment_like: Scalars['Boolean']['output'];
  follow: Scalars['Boolean']['output'];
  followed_project: Scalars['Boolean']['output'];
  fork: Scalars['Boolean']['output'];
  level_up: Scalars['Boolean']['output'];
  mention: Scalars['Boolean']['output'];
  new_device: Scalars['Boolean']['output'];
  playlist_saved: Scalars['Boolean']['output'];
  project_mention: Scalars['Boolean']['output'];
  reaction: Scalars['Boolean']['output'];
  /** Staff with users.ban: a comment, an account, a project or a playlist was reported. */
  report: Scalars['Boolean']['output'];
  report_message: Scalars['Boolean']['output'];
  /** A moderator reviewed one of your reports (any kind). */
  report_reviewed: Scalars['Boolean']['output'];
  star: Scalars['Boolean']['output'];
  star_milestone: Scalars['Boolean']['output'];
  streak_warning: Scalars['Boolean']['output'];
  wall_comment: Scalars['Boolean']['output'];
  /** Staff with users.ban: a wall comment was reported. */
  wall_report: Scalars['Boolean']['output'];
  /** A moderator reviewed one of your reports. */
  wall_report_reviewed: Scalars['Boolean']['output'];
  xp_changed: Scalars['Boolean']['output'];
};

export type NotificationPreferencesInput = {
  appeal_result?: InputMaybe<Scalars['Boolean']['input']>;
  badge_awarded?: InputMaybe<Scalars['Boolean']['input']>;
  comment_like?: InputMaybe<Scalars['Boolean']['input']>;
  follow?: InputMaybe<Scalars['Boolean']['input']>;
  followed_project?: InputMaybe<Scalars['Boolean']['input']>;
  fork?: InputMaybe<Scalars['Boolean']['input']>;
  level_up?: InputMaybe<Scalars['Boolean']['input']>;
  mention?: InputMaybe<Scalars['Boolean']['input']>;
  new_device?: InputMaybe<Scalars['Boolean']['input']>;
  playlist_saved?: InputMaybe<Scalars['Boolean']['input']>;
  project_mention?: InputMaybe<Scalars['Boolean']['input']>;
  reaction?: InputMaybe<Scalars['Boolean']['input']>;
  report?: InputMaybe<Scalars['Boolean']['input']>;
  report_message?: InputMaybe<Scalars['Boolean']['input']>;
  report_reviewed?: InputMaybe<Scalars['Boolean']['input']>;
  star?: InputMaybe<Scalars['Boolean']['input']>;
  star_milestone?: InputMaybe<Scalars['Boolean']['input']>;
  streak_warning?: InputMaybe<Scalars['Boolean']['input']>;
  wall_comment?: InputMaybe<Scalars['Boolean']['input']>;
  wall_report?: InputMaybe<Scalars['Boolean']['input']>;
  wall_report_reviewed?: InputMaybe<Scalars['Boolean']['input']>;
  xp_changed?: InputMaybe<Scalars['Boolean']['input']>;
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

export type ParsedArtistCredit = {
  name: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  role: ArtistRole;
};

export type ParsedArtists = {
  artists: Array<ParsedArtistCredit>;
  display: Scalars['String']['output'];
  flags: Array<ArtistParseFlag>;
  title?: Maybe<Scalars['String']['output']>;
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
  /** False on a public list = unlisted: open by link, absent from discovery. */
  listed: Scalars['Boolean']['output'];
  isSavedByMe: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  owner: FollowUser;
  projectCount: Scalars['Int']['output'];
  projects: Array<Project>;
  savedCount: Scalars['Int']['output'];
  shareCount: Scalars['Int']['output'];
  sortMode: PlaylistSortMode;
  tags: Array<Scalars['String']['output']>;
  trendingScore?: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['String']['output'];
  viewCount: Scalars['Int']['output'];
};

/** Sort order for a user's playlists page. */
export type PlaylistListSort =
  | 'NAME'
  | 'NEWEST'
  | 'SAVES'
  | 'UPDATED';

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

/** Owner-only filter on a user's playlists page; other viewers always get public lists only. */
export type PlaylistVisibilityFilter =
  | 'ALL'
  | 'PRIVATE'
  | 'PUBLIC'
  | 'UNLISTED';

/** description: up to 500 chars. tags: up to 10, each one word of up to 30 chars; a leading # is dropped. */
export type ProfileShareInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  /** On a project already shared: post it again (new date, new feed entry) instead of editing the note. */
  reshare?: InputMaybe<Scalars['Boolean']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type ProfileShareItem = {
  description: Scalars['String']['output'];
  project: Project;
  sharedAt: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
};

export type ProfileShareNote = {
  description: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
};

export type ProfileSharePage = {
  hasMore: Scalars['Boolean']['output'];
  items: Array<ProfileShareItem>;
};

/** song: lyrics synced to a track. subtitles: captions timed against a video, edited in the subtitle studio. */
export type ProjectKind = 'song' | 'subtitles';

export type Project = {
  /** What the project is for. Rows from before this field existed read as song. */
  kind: ProjectKind;
  /** @deprecated Boost became Share to profile; use profileShareCount. */
  boostCount?: Maybe<Scalars['Int']['output']>;
  /** Oldest contribution first. Empty when the viewer cannot read the project. */
  collaborators: Array<ProjectCollaborator>;
  contentUpdatedAt?: Maybe<Scalars['String']['output']>;
  coverImage?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  createdFrom?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['String']['output']>;
  forkCount?: Maybe<Scalars['Int']['output']>;
  forkedFrom?: Maybe<ForkedFrom>;
  forksEnabled?: Maybe<Scalars['Boolean']['output']>;
  hasWordSync?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  /** @deprecated Use isSharedToProfileByMe. */
  isBoostedByMe?: Maybe<Scalars['Boolean']['output']>;
  isForkedByMe?: Maybe<Scalars['Boolean']['output']>;
  isSharedToProfileByMe?: Maybe<Scalars['Boolean']['output']>;
  isStarredByMe?: Maybe<Scalars['Boolean']['output']>;
  lineCount?: Maybe<Scalars['Int']['output']>;
  /** False on a public project = unlisted: open by link, absent from discovery. Absent means listed. */
  listed?: Maybe<Scalars['Boolean']['output']>;
  lyrics?: Maybe<Lyrics>;
  lyricsId?: Maybe<Scalars['ID']['output']>;
  metadata?: Maybe<ProjectMetadata>;
  /** The viewer's own share of this project, null when they have not shared it. */
  myProfileShare?: Maybe<ProfileShareNote>;
  profileShareCount?: Maybe<Scalars['Int']['output']>;
  public?: Maybe<Scalars['Boolean']['output']>;
  publicId: Scalars['String']['output'];
  readOnly?: Maybe<Scalars['Boolean']['output']>;
  shareCount?: Maybe<Scalars['Int']['output']>;
  slug: Scalars['String']['output'];
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
  viewCount?: Maybe<Scalars['Int']['output']>;
};

/** Someone, other than the owner, who edited a project in a collaborative session. */
export type ProjectCollaborator = {
  /** The credit's subject (user:<id> or guest:<id>); pass it to removeProjectCollaborator. */
  id: Scalars['ID']['output'];
  isGuest: Scalars['Boolean']['output'];
  /** Current display name for users, the typed name for guests. */
  name: Scalars['String']['output'];
  /** The signed-in collaborator; null for guests. Only id, accountName, displayName and avatarUrl are guaranteed populated; do not select anything else. */
  user?: Maybe<User>;
};

export type ProjectLyricsInput = {
  editorMode?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  line?: InputMaybe<LineInput>;
  lineIdx?: InputMaybe<Scalars['Int']['input']>;
  lines?: InputMaybe<Array<LinePatchInput>>;
  sectionIdx?: InputMaybe<Scalars['Int']['input']>;
  sections?: InputMaybe<Array<SectionInput>>;
  word?: InputMaybe<WordInput>;
  wordIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type ProjectMetadata = {
  albumArt?: Maybe<Scalars['String']['output']>;
  artists: Array<ArtistCredit>;
  description?: Maybe<Scalars['String']['output']>;
  explicit?: Maybe<Scalars['Boolean']['output']>;
  genre?: Maybe<Scalars['String']['output']>;
  previewUrl?: Maybe<Scalars['String']['output']>;
  singerColors?: Maybe<Array<Scalars['String']['output']>>;
  singers?: Maybe<Array<Scalars['String']['output']>>;
  songAlbum?: Maybe<Scalars['String']['output']>;
  songArtist?: Maybe<Scalars['String']['output']>;
  songGenre?: Maybe<Scalars['String']['output']>;
  songLanguage?: Maybe<Scalars['String']['output']>;
  songName?: Maybe<Scalars['String']['output']>;
  songYear?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  trackCount?: Maybe<Scalars['Int']['output']>;
  trackNumber?: Maybe<Scalars['Int']['output']>;
};

export type ProjectMetadataInput = {
  albumArt?: InputMaybe<Scalars['String']['input']>;
  artists?: InputMaybe<Array<ArtistCreditInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  explicit?: InputMaybe<Scalars['Boolean']['input']>;
  genre?: InputMaybe<Scalars['String']['input']>;
  previewUrl?: InputMaybe<Scalars['String']['input']>;
  singerColors?: InputMaybe<Array<Scalars['String']['input']>>;
  singers?: InputMaybe<Array<Scalars['String']['input']>>;
  songAlbum?: InputMaybe<Scalars['String']['input']>;
  songGenre?: InputMaybe<Scalars['String']['input']>;
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

/**
 * Outcome of registering a view. `counted` is false when the view was seen but
 * deliberately not counted — the viewer already counted today, is the owner, the
 * project is private, or the caller had no stable identity.
 */
export type ProjectViewResult = {
  counted: Scalars['Boolean']['output'];
  viewCount: Scalars['Int']['output'];
};

export type PublicBadgeDef = {
  color: Scalars['String']['output'];
  description: LocalizedString;
  holderCount: Scalars['Int']['output'];
  holderPct: Scalars['Float']['output'];
  icon: Scalars['String']['output'];
  id: Scalars['String']['output'];
  label: LocalizedString;
  rarity: Scalars['String']['output'];
};

export type PublicUser = {
  accountName: Scalars['String']['output'];
  activityHeatmap?: Maybe<Array<ActivityHeatmapDay>>;
  avatarUrl?: Maybe<Scalars['String']['output']>;
  badges: Array<UserBadge>;
  bio?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  coverImageUrl?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  /** off, uploads or all: what the viewer is told about this user's projects. off unless following. */
  followNotify: Scalars['String']['output'];
  followerCount: Scalars['Int']['output'];
  followingCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  isAdmin: Scalars['Boolean']['output'];
  isBlockedByMe: Scalars['Boolean']['output'];
  isFollowedByMe: Scalars['Boolean']['output'];
  isFollowingMe: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  lastOnlineAt?: Maybe<Scalars['String']['output']>;
  miniProfileBadgeIds: Array<Scalars['String']['output']>;
  playlistCount: Scalars['Int']['output'];
  progression?: Maybe<UserProgression>;
  projectCount: Scalars['Int']['output'];
  projects: Array<Project>;
  showFollowers: Scalars['Boolean']['output'];
  showXpProgress: Scalars['Boolean']['output'];
  showcasePublic: Scalars['Boolean']['output'];
  showcasedBadges: Array<ShowcasedBadge>;
  staffRole?: Maybe<Scalars['String']['output']>;
  stats?: Maybe<UserStats>;
  streak?: Maybe<UserStreak>;
  totalForksReceived: Scalars['Int']['output'];
  totalStarsReceived: Scalars['Int']['output'];
};

export type Query = {
  addictionLevels: Array<AddictionLevel>;
  adminAddictionLevels: Array<AddictionLevel>;
  badgeDefinitions: Array<BadgeDef>;
  blockedUsers: Array<BlockedUser>;
  /** The live session, for its owner or a signed-in member; null otherwise. */
  collabSession?: Maybe<CollabSession>;
  exploreStats: ExploreStats;
  feed: FeedResult;
  followList: FollowListResult;
  getShare?: Maybe<Project>;
  health: HealthStatus;
  leaderboard: LeaderboardResult;
  me?: Maybe<User>;
  myArtistSuggestions: ArtistSuggestionPage;
  /** Live sessions the caller owns or is a signed-in member of. */
  myCollabSessions: Array<CollabSessionSummary>;
  myMusicLibrary: Array<MusicLibraryEntry>;
  myPreferences: UserPreferences;
  /** The viewer's own reports and what became of them, newest first. */
  myReports: MyReports;
  myRequests: Array<StaffRequest>;
  /** The viewer's own reports and what became of them. */
  myWallReports: MyWallReports;
  /** Targets with open reports, for moderators (users.ban). */
  openReportCount: Scalars['Int']['output'];
  parseArtists: ParsedArtists;
  pendingRequests: Array<StaffRequest>;
  playlist?: Maybe<Playlist>;
  playlists: Array<Playlist>;
  /** A user's playlists, paged. Non-owners get public lists only and visibility is ignored. */
  playlistsPage: PlaylistPage;
  popularPlaylists: PlaylistPage;
  /** Projects a user shared to their profile, newest share first. */
  profileShares: ProfileSharePage;
  project?: Maybe<Project>;
  projectReactions: ProjectReactions;
  projects: Array<Project>;
  publicBadgeDefinitions: Array<PublicBadgeDef>;
  publicProfile?: Maybe<PublicUser>;
  publicProject?: Maybe<Project>;
  /** Reports grouped by target, for moderators (users.ban). status: open (default), dismissed or actioned; targetType filters. */
  reportGroups: Array<ReportGroup>;
  /** A report's conversation, for its reporter and moderators (users.ban). */
  reportMessages: Array<ReportMessage>;
  requestCapabilities: RequestCapabilities;
  requestCounts: RequestCounts;
  reviewedRequests: Array<StaffRequest>;
  savedPlaylists: Array<Playlist>;
  /** The viewer's saved playlists, newest save first. Requires auth. */
  savedPlaylistsPage: PlaylistPage;
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
  /** A page of a wall (0-based). With focus, the page holding that comment, with the replies on the way to it in full; after is ignored (kept for older clients). */
  wall: Wall;
  /** One comment as the viewer sees it; null when it isn't shown to them. */
  wallComment?: Maybe<WallComment>;
  /** A comment's earlier versions, oldest first, then the current one. */
  wallCommentHistory: Array<WallCommentRevision>;
  wallCommentLikers: WallLikers;
  /** Comments with open reports, for moderators (users.ban). */
  wallOpenReportCount: Scalars['Int']['output'];
  /** More replies to a comment, after the first offset. */
  wallReplies: Array<WallComment>;
  /** Reported wall comments grouped by comment, for moderators (users.ban). */
  wallReportGroups: Array<WallReportGroup>;
  /** Reported wall comments, for moderators (users.ban). */
  wallReports: Array<WallReport>;
  xpLevelCurve: Array<XpLevelThreshold>;
};


export type QueryCollabSessionArgs = {
  publicId: Scalars['String']['input'];
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
  sortBy?: InputMaybe<LeaderboardSort>;
  sortDir?: InputMaybe<LeaderboardSortDirection>;
  timeframe?: InputMaybe<LeaderboardTimeframe>;
};


export type QueryMyArtistSuggestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  prefix: Scalars['String']['input'];
};


export type QueryMyReportsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyWallReportsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryParseArtistsArgs = {
  artist: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPlaylistArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPlaylistsArgs = {
  accountName: Scalars['String']['input'];
};


export type QueryPlaylistsPageArgs = {
  accountName: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<PlaylistListSort>;
  visibility?: InputMaybe<PlaylistVisibilityFilter>;
};


export type QueryPopularPlaylistsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryProfileSharesArgs = {
  accountName: Scalars['String']['input'];
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
  asVisitor?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryPublicProjectArgs = {
  publicId: Scalars['String']['input'];
};


export type QueryReportGroupsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  targetType?: InputMaybe<Scalars['String']['input']>;
};


export type QueryReportMessagesArgs = {
  reportId: Scalars['ID']['input'];
};


export type QuerySavedPlaylistsPageArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
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


export type QueryWallArgs = {
  accountName: Scalars['String']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
  focus?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<Scalars['String']['input']>;
};


export type QueryWallCommentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWallCommentHistoryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWallCommentLikersArgs = {
  id: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryWallRepliesArgs = {
  commentId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryWallReportGroupsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryWallReportsArgs = {
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryXpLevelCurveArgs = {
  maxLevel?: InputMaybe<Scalars['Int']['input']>;
};

export type ReactionSummary = {
  count: Scalars['Int']['output'];
  emoji: Scalars['String']['output'];
};

/** A reported wall comment, with the comment it answers for moderators. */
export type ReportCommentTarget = {
  comment: WallReportComment;
  /** The comment it answers, for context (moderators only); null for a top-level comment. */
  parent?: Maybe<WallReportComment>;
  wallAccountName: Scalars['String']['output'];
};

/** One person's report, as moderators see it. */
export type ReportEntry = {
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Messages in this report's conversation. */
  messageCount: Scalars['Int']['output'];
  note: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  reporter?: Maybe<ReportUser>;
  resolvedAt?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

/** Every report on one target, for moderators. The preview field matching targetType is set; all are null once the target is gone. */
export type ReportGroup = {
  comment?: Maybe<ReportCommentTarget>;
  latestAt: Scalars['String']['output'];
  /** Open reports on this target, whatever status was listed. */
  openCount: Scalars['Int']['output'];
  playlist?: Maybe<ReportPlaylistTarget>;
  project?: Maybe<ReportProjectTarget>;
  reports: Array<ReportEntry>;
  /** Who is accountable: the comment's author, the account itself, or the owner. */
  subject?: Maybe<ReportUser>;
  /** The subject's targets actioned after reports in the last 30 days. */
  subjectActionedCount: Scalars['Int']['output'];
  /** The subject's wall-commenting restriction: an ISO date, 'forever', or null. */
  subjectRestrictedUntil?: Maybe<Scalars['String']['output']>;
  targetId: Scalars['ID']['output'];
  /** wall_comment, user, project or playlist. */
  targetType: Scalars['String']['output'];
  user?: Maybe<ReportUserTarget>;
  /** For a wall comment: the wall's account name, kept once the comment is gone. */
  wallAccountName?: Maybe<Scalars['String']['output']>;
};

/** A message in a report's conversation between its reporter and the moderators. */
export type ReportMessage = {
  /** Null when the viewer may not see who wrote it (a moderator, seen by the reporter). */
  author?: Maybe<ReportUser>;
  body: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  fromReporter: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** The viewer wrote it. */
  mine: Scalars['Boolean']['output'];
  /** Replies to it, oldest first; replies don't nest further. */
  replies: Array<ReportMessage>;
};

/** A reported playlist. */
export type ReportPlaylistTarget = {
  coverImage?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  ownerAccountName: Scalars['String']['output'];
  projectCount: Scalars['Int']['output'];
  public: Scalars['Boolean']['output'];
};

/** A reported project. */
export type ReportProjectTarget = {
  artist?: Maybe<Scalars['String']['output']>;
  coverImage?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  ownerAccountName: Scalars['String']['output'];
  public: Scalars['Boolean']['output'];
  publicId: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

/** A person as reports show them. */
export type ReportUser = {
  accountName: Scalars['String']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  staffRole?: Maybe<Scalars['String']['output']>;
};

/** A reported account. */
export type ReportUserTarget = {
  accountName: Scalars['String']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  banned: Scalars['Boolean']['output'];
  /** The first 200 characters. */
  bio: Scalars['String']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
};

export type RequestCapabilities = {
  reviewable: Array<Scalars['String']['output']>;
  submittable: Array<Scalars['String']['output']>;
};

export type RequestCounts = {
  myPending: Scalars['Int']['output'];
  pendingReview: Scalars['Int']['output'];
};

export type RetroactiveResult = {
  error?: Maybe<Scalars['String']['output']>;
  granted: Scalars['Int']['output'];
  scanned: Scalars['Int']['output'];
};

export type SaveKind =
  | 'auto'
  | 'manual';

export type SaveMediaInput = {
  duration?: InputMaybe<Scalars['Float']['input']>;
  fileName?: InputMaybe<Scalars['String']['input']>;
  publicId?: InputMaybe<Scalars['String']['input']>;
  sizeBytes?: InputMaybe<Scalars['Float']['input']>;
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
  autoStamp?: Maybe<AutoStampSettings>;
  editor?: Maybe<EditorSettings>;
  export?: Maybe<ExportSettings>;
  interface?: Maybe<InterfaceSettings>;
  playback?: Maybe<PlaybackSettings>;
  shortcuts?: Maybe<ShortcutsSettings>;
};

export type ShortcutsSettings = {
  addLine?: Maybe<Array<Scalars['String']['output']>>;
  addSecondary?: Maybe<Array<Scalars['String']['output']>>;
  addTranslation?: Maybe<Array<Scalars['String']['output']>>;
  alignCenter?: Maybe<Array<Scalars['String']['output']>>;
  alignLeft?: Maybe<Array<Scalars['String']['output']>>;
  alignRight?: Maybe<Array<Scalars['String']['output']>>;
  captureAdLib?: Maybe<Array<Scalars['String']['output']>>;
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
  loopClick?: Maybe<Array<Scalars['String']['output']>>;
  playPause?: Maybe<Array<Scalars['String']['output']>>;
  rangeSelect?: Maybe<Array<Scalars['String']['output']>>;
  seekBackward?: Maybe<Array<Scalars['String']['output']>>;
  seekForward?: Maybe<Array<Scalars['String']['output']>>;
  showHelp?: Maybe<Array<Scalars['String']['output']>>;
  speedDown?: Maybe<Array<Scalars['String']['output']>>;
  speedUp?: Maybe<Array<Scalars['String']['output']>>;
  switchMode?: Maybe<Array<Scalars['String']['output']>>;
  toggleFullLyrics?: Maybe<Array<Scalars['String']['output']>>;
  togglePlayer?: Maybe<Array<Scalars['String']['output']>>;
  searchLyrics?: Maybe<Array<Scalars['String']['output']>>;
  loopLine?: Maybe<Array<Scalars['String']['output']>>;
  prevLine?: Maybe<Array<Scalars['String']['output']>>;
  nextLine?: Maybe<Array<Scalars['String']['output']>>;
  duplicateLine?: Maybe<Array<Scalars['String']['output']>>;
  toggleSelect?: Maybe<Array<Scalars['String']['output']>>;
  toggleTranslation?: Maybe<Array<Scalars['String']['output']>>;
  openVisualizer?: Maybe<Array<Scalars['String']['output']>>;
  toggleVisualizer?: Maybe<Array<Scalars['String']['output']>>;
};

export type ShortcutsSettingsInput = {
  addLine?: InputMaybe<Array<Scalars['String']['input']>>;
  addSecondary?: InputMaybe<Array<Scalars['String']['input']>>;
  addTranslation?: InputMaybe<Array<Scalars['String']['input']>>;
  alignCenter?: InputMaybe<Array<Scalars['String']['input']>>;
  alignLeft?: InputMaybe<Array<Scalars['String']['input']>>;
  alignRight?: InputMaybe<Array<Scalars['String']['input']>>;
  captureAdLib?: InputMaybe<Array<Scalars['String']['input']>>;
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
  loopClick?: InputMaybe<Array<Scalars['String']['input']>>;
  playPause?: InputMaybe<Array<Scalars['String']['input']>>;
  rangeSelect?: InputMaybe<Array<Scalars['String']['input']>>;
  seekBackward?: InputMaybe<Array<Scalars['String']['input']>>;
  seekForward?: InputMaybe<Array<Scalars['String']['input']>>;
  showHelp?: InputMaybe<Array<Scalars['String']['input']>>;
  speedDown?: InputMaybe<Array<Scalars['String']['input']>>;
  speedUp?: InputMaybe<Array<Scalars['String']['input']>>;
  switchMode?: InputMaybe<Array<Scalars['String']['input']>>;
  toggleFullLyrics?: InputMaybe<Array<Scalars['String']['input']>>;
  togglePlayer?: InputMaybe<Array<Scalars['String']['input']>>;
  searchLyrics?: InputMaybe<Array<Scalars['String']['input']>>;
  loopLine?: InputMaybe<Array<Scalars['String']['input']>>;
  prevLine?: InputMaybe<Array<Scalars['String']['input']>>;
  nextLine?: InputMaybe<Array<Scalars['String']['input']>>;
  duplicateLine?: InputMaybe<Array<Scalars['String']['input']>>;
  toggleSelect?: InputMaybe<Array<Scalars['String']['input']>>;
  toggleTranslation?: InputMaybe<Array<Scalars['String']['input']>>;
  openVisualizer?: InputMaybe<Array<Scalars['String']['input']>>;
  toggleVisualizer?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type ShowcasedBadge = {
  color: Scalars['String']['output'];
  grantedAt: Scalars['String']['output'];
  holderCount: Scalars['Int']['output'];
  icon: Scalars['String']['output'];
  id: Scalars['String']['output'];
  label: LocalizedString;
  rarity: Scalars['String']['output'];
  /** @deprecated Rarity is preset per badge; always 0. Remove once no client selects it. */
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

export type StaffRequest = {
  createdAt?: Maybe<Scalars['String']['output']>;
  decisionNote?: Maybe<Scalars['String']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  payload?: Maybe<Scalars['String']['output']>;
  requesterId: Scalars['ID']['output'];
  requesterName: Scalars['String']['output'];
  resolvedAt?: Maybe<Scalars['String']['output']>;
  reviewerName?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  summary: Scalars['String']['output'];
  type: Scalars['String']['output'];
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
  /** With isPublic: true, false makes the list unlisted. Defaults to listed whenever isPublic changes. */
  listed?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  sortMode?: InputMaybe<PlaylistSortMode>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdatePreferencesInput = {
  allowTags?: InputMaybe<Scalars['Boolean']['input']>;
  /** ISO 3166-1 alpha-2, or null to clear. */
  country?: InputMaybe<Scalars['String']['input']>;
  countryVisibility?: InputMaybe<Scalars['String']['input']>;
  /** @deprecated Ignored; every new project is private. */
  defaultProjectPrivacy?: InputMaybe<Scalars['String']['input']>;
  lastOnlineVisibility?: InputMaybe<Scalars['String']['input']>;
  miniProfileBadgeIds?: InputMaybe<Array<Scalars['String']['input']>>;
  miniProfileBadgesEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  notifications?: InputMaybe<NotificationPreferencesInput>;
  onlineVisibility?: InputMaybe<Scalars['String']['input']>;
  showActivityHeatmap?: InputMaybe<Scalars['Boolean']['input']>;
  showAddictionTitle?: InputMaybe<Scalars['Boolean']['input']>;
  showFollowers?: InputMaybe<Scalars['Boolean']['input']>;
  showXpProgress?: InputMaybe<Scalars['Boolean']['input']>;
  wallEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  wallHoldFrom?: InputMaybe<Scalars['String']['input']>;
  wallMutedWords?: InputMaybe<Array<Scalars['String']['input']>>;
  wallWhoCanComment?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProfileInput = {
  accountName?: InputMaybe<Scalars['String']['input']>;
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  coverImageUrl?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectInput = {
  coverImage?: InputMaybe<Scalars['String']['input']>;
  lyrics?: InputMaybe<ProjectLyricsInput>;
  /** With public: true, false makes the project unlisted: anyone with the link can open it, but it is not discoverable. Defaults to listed whenever public changes. */
  listed?: InputMaybe<Scalars['Boolean']['input']>;
  metadata?: InputMaybe<ProjectMetadataInput>;
  public?: InputMaybe<Scalars['Boolean']['input']>;
  readOnly?: InputMaybe<Scalars['Boolean']['input']>;
  saveKind?: InputMaybe<SaveKind>;
  state?: InputMaybe<ProjectStateInput>;
  title?: InputMaybe<Scalars['String']['input']>;
  uploadId?: InputMaybe<Scalars['ID']['input']>;
  version?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateSettingsInput = {
  advanced?: InputMaybe<AdvancedSettingsInput>;
  autoStamp?: InputMaybe<AutoStampSettingsInput>;
  editor?: InputMaybe<EditorSettingsInput>;
  export?: InputMaybe<ExportSettingsInput>;
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
  country?: Maybe<Scalars['String']['output']>;
  coverImageUrl?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  emailHistory: Array<EmailChange>;
  google?: Maybe<GoogleInfo>;
  hasPassword: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  isVerified: Scalars['Boolean']['output'];
  lastAccountNameChangedAt?: Maybe<Scalars['String']['output']>;
  lastDevice?: Maybe<Scalars['String']['output']>;
  lastIp?: Maybe<Scalars['String']['output']>;
  lastLoginAt?: Maybe<Scalars['String']['output']>;
  lastOnlineAt?: Maybe<Scalars['String']['output']>;
  lastOnlineVisibility: Scalars['String']['output'];
  miniProfileBadgeIds: Array<Scalars['String']['output']>;
  miniProfileBadgesEnabled: Scalars['Boolean']['output'];
  onlineVisibility: Scalars['String']['output'];
  passwordChangedAt?: Maybe<Scalars['String']['output']>;
  pendingEmail?: Maybe<Scalars['String']['output']>;
  permissions: Array<Scalars['String']['output']>;
  previousAccountNames: Array<NameChange>;
  progression?: Maybe<UserProgression>;
  projects: Array<Project>;
  role: Scalars['String']['output'];
  settings?: Maybe<Settings>;
  showFollowers: Scalars['Boolean']['output'];
  showcasePublic: Scalars['Boolean']['output'];
  showcaseSlots: Scalars['Int']['output'];
  showcasedBadges: Array<Scalars['String']['output']>;
  staffRole?: Maybe<Scalars['String']['output']>;
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

export type UserPreferences = {
  allowTags: Scalars['Boolean']['output'];
  /** ISO 3166-1 alpha-2, chosen by the user; null when unset. */
  country?: Maybe<Scalars['String']['output']>;
  countryVisibility: Scalars['String']['output'];
  /** @deprecated Every new project is private; always the string private. */
  defaultProjectPrivacy: Scalars['String']['output'];
  lastOnlineVisibility: Scalars['String']['output'];
  miniProfileBadgeIds: Array<Scalars['String']['output']>;
  miniProfileBadgesEnabled: Scalars['Boolean']['output'];
  notifications: NotificationPreferences;
  onlineVisibility: Scalars['String']['output'];
  showActivityHeatmap: Scalars['Boolean']['output'];
  showAddictionTitle: Scalars['Boolean']['output'];
  showFollowers: Scalars['Boolean']['output'];
  showXpProgress: Scalars['Boolean']['output'];
  wallEnabled: Scalars['Boolean']['output'];
  /** nobody, new_accounts, not_followed or everyone: whose comments wait for approval. */
  wallHoldFrom: Scalars['String']['output'];
  wallMutedWords: Array<Scalars['String']['output']>;
  /** everyone, following (people the owner follows) or nobody. */
  wallWhoCanComment: Scalars['String']['output'];
};

export type UserProgression = {
  level?: Maybe<Scalars['Int']['output']>;
  xp?: Maybe<Scalars['Float']['output']>;
};

export type UserStats = {
  aiSyncedLines?: Maybe<Scalars['Float']['output']>;
  aiWordsSynced?: Maybe<Scalars['Float']['output']>;
  karaokeLines?: Maybe<Scalars['Float']['output']>;
  minutesSynced?: Maybe<Scalars['Float']['output']>;
  secondsSynced?: Maybe<Scalars['Float']['output']>;
  syncedLines?: Maybe<Scalars['Float']['output']>;
  wordsSynced?: Maybe<Scalars['Float']['output']>;
};

export type UserStreak = {
  current?: Maybe<Scalars['Int']['output']>;
  lastActiveDate?: Maybe<Scalars['String']['output']>;
  longest?: Maybe<Scalars['Int']['output']>;
};

export type Wall = {
  /** The viewer may post: signed in, allowed by the owner's setting, not restricted. */
  canComment: Scalars['Boolean']['output'];
  /** The owner's setting: everyone, following or nobody. */
  commentPolicy: Scalars['String']['output'];
  comments: Array<WallComment>;
  /** False when the owner turned their wall off. */
  enabled: Scalars['Boolean']['output'];
  hasMore: Scalars['Boolean']['output'];
  page: Scalars['Int']['output'];
  /** For the owner and moderators: comments waiting for approval. */
  pendingCount: Scalars['Int']['output'];
  /** The viewer's own commenting restriction: an ISO date, 'forever', or null. */
  restrictedUntil?: Maybe<Scalars['String']['output']>;
  /** newest, oldest or top. */
  sort: Scalars['String']['output'];
  /** Whether the viewer is told about new comments on this wall. */
  subscribed: Scalars['Boolean']['output'];
  /** Top-level comments, not counting replies. */
  total: Scalars['Int']['output'];
  /** Every comment, replies included. */
  totalAll: Scalars['Int']['output'];
};

export type WallAuthor = {
  accountName: Scalars['String']['output'];
  /** Title of their addiction level (the app calls it Melomaniac Level). Only loaded on wall comments. */
  addictionTitle?: Maybe<LocalizedString>;
  /** False when this author switched tagging off. */
  allowsTags: Scalars['Boolean']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  staffRole?: Maybe<Scalars['String']['output']>;
};

export type WallComment = {
  author: WallAuthor;
  /** May contain tag tokens; resolve them through mentions and projectRefs. */
  body: Scalars['String']['output'];
  canDelete: Scalars['Boolean']['output'];
  canEdit: Scalars['Boolean']['output'];
  /** The viewer may approve, hide and unhide it: the wall's owner, or a moderator. */
  canModerate: Scalars['Boolean']['output'];
  createdAt: Scalars['String']['output'];
  /** Its author deleted it; kept, without text or author, so its replies keep their place. */
  deleted: Scalars['Boolean']['output'];
  /** 0 for a comment, 1 for a reply, 2 for a reply to a reply. */
  depth: Scalars['Int']['output'];
  descendantCount: Scalars['Int']['output'];
  editedAt?: Maybe<Scalars['String']['output']>;
  /** For a pending comment: approval (the owner's setting) or muted_word. */
  heldReason?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  likeCount: Scalars['Int']['output'];
  likedByMe: Scalars['Boolean']['output'];
  mentions: Array<WallMention>;
  /** For a top-level comment: the viewer muted replies in its thread. */
  mutedByMe: Scalars['Boolean']['output'];
  pinned: Scalars['Boolean']['output'];
  projectRefs: Array<WallProjectRef>;
  reactions: Array<WallReaction>;
  replies: Array<WallComment>;
  /** Direct replies in total, and everything beneath; replies may hold only the first few. */
  replyCount: Scalars['Int']['output'];
  /** For a reply at the deepest level: the sibling it answers (it is listed right after it). */
  replyToId?: Maybe<Scalars['ID']['output']>;
  /** It answered a sibling that is no longer shown. */
  replyToMissing: Scalars['Boolean']['output'];
  /** How many times it was edited; see wallCommentHistory. */
  revisionCount: Scalars['Int']['output'];
  /** visible, pending (waiting for the owner's approval) or hidden (by the owner or a moderator). */
  status: Scalars['String']['output'];
};

export type WallCommentRevision = {
  body: Scalars['String']['output'];
  current: Scalars['Boolean']['output'];
  /** When this version was written. */
  editedAt: Scalars['String']['output'];
};

export type WallLikeResult = {
  likeCount: Scalars['Int']['output'];
  liked: Scalars['Boolean']['output'];
};

export type WallLikers = {
  total: Scalars['Int']['output'];
  users: Array<WallAuthor>;
};

/** A person tagged in a comment, as @[u:<id>] in its body. */
export type WallMention = {
  accountName: Scalars['String']['output'];
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
};

/** A project tagged in a comment, as @[p:<publicId>] in its body. Only listed when the viewer may see it. */
export type WallProjectRef = {
  coverImage?: Maybe<Scalars['String']['output']>;
  ownerAccountName: Scalars['String']['output'];
  publicId: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type WallReaction = {
  count: Scalars['Int']['output'];
  /** A quick-reaction code or one emoji. */
  emoji: Scalars['String']['output'];
  mine: Scalars['Boolean']['output'];
};

export type WallReport = {
  /** Null once the comment is gone. */
  comment?: Maybe<WallReportComment>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  note: Scalars['String']['output'];
  openCount: Scalars['Int']['output'];
  reason: Scalars['String']['output'];
  reporter?: Maybe<WallAuthor>;
  /** When a moderator settled it. */
  resolvedAt?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  wallAccountName: Scalars['String']['output'];
};

export type WallReportComment = {
  author?: Maybe<WallAuthor>;
  body: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  mentions: Array<WallMention>;
  projectRefs: Array<WallProjectRef>;
  status: Scalars['String']['output'];
};

/** Every report on one comment, for moderators. */
export type WallReportGroup = {
  /** The author's comments removed after reports in the last 30 days. */
  authorActionedCount: Scalars['Int']['output'];
  /** ISO date, 'forever', or null when the author may comment. */
  authorRestrictedUntil?: Maybe<Scalars['String']['output']>;
  /** Null once the comment is gone. */
  comment?: Maybe<WallReportComment>;
  commentId: Scalars['ID']['output'];
  latestAt: Scalars['String']['output'];
  openCount: Scalars['Int']['output'];
  /** The comment it answers, for context. */
  parent?: Maybe<WallReportComment>;
  reports: Array<WallReport>;
  wallAccountName: Scalars['String']['output'];
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

export type XpLevelThreshold = {
  level: Scalars['Int']['output'];
  showcaseSlots: Scalars['Int']['output'];
  xpRequired: Scalars['Int']['output'];
  xpToNext: Scalars['Int']['output'];
};
