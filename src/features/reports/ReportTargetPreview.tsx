import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { useSettings } from '@/features/settings/useSettings';
import { formatTimeAgo } from '@/features/notifications/time-ago';
import { listPath, profilePath } from '@/features/profile/profile-path';
import { projectPath } from '@/features/projects/project-path';
import CommentBody from '@/features/profile/wall/CommentBody';
import type { ReportComment, ReportCommentTarget, ReportPlaylistTarget, ReportProjectTarget, ReportTargetType, ReportUserTarget } from './reports.service';

type Person = { accountName: string; displayName: string | null; avatarUrl: string | null };

const nameOf = (user: Person) => user.displayName || user.accountName;

/** A small avatar and name, linking to the profile. */
export function PersonLink({ user }: { user: Person }) {
  return (
    <Link to={profilePath(user.accountName)} className="inline-flex items-center gap-1.5 font-medium text-zinc-200 hover:text-primary transition-colors">
      {user.avatarUrl
        ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-5 rounded-full object-cover" />
        : <InitialsAvatar name={nameOf(user)} handle={user.accountName} className="size-5 rounded-full text-[9px]" />}
      {nameOf(user)}
    </Link>
  );
}

/** A small rounded flag ("Banned", "Private") next to a preview. */
function Flag({ children }: { children: string }) {
  return <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{children}</span>;
}

/** Dates arrive as ISO strings or, from some resolvers, epoch milliseconds. */
function toDate(value: string): Date {
  return new Date(/^\d+$/.test(value) ? Number(value) : value);
}

function CommentPreview({ target }: { target: ReportCommentTarget }) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const ago = (when: string) => formatTimeAgo(when, t, settings.advanced?.timezone, i18n.language);
  const { comment, parent, wallAccountName } = target;
  const author = (c: ReportComment) => c.author ? <PersonLink user={c.author} /> : <span className="italic">{t('reports.preview.unknownUser')}</span>;

  return (
    <div className="flex flex-col gap-1.5">
      {parent && (
        <div className="flex flex-col gap-1 border-l-2 border-zinc-700/70 pl-2.5 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1">{t('reports.preview.inReplyTo', { name: parent.author ? nameOf(parent.author) : t('reports.preview.unknownUser') })}</span>
          <p className="whitespace-pre-wrap break-words line-clamp-3"><CommentBody comment={parent} /></p>
        </div>
      )}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
        {author(comment)}
        <span>{ago(comment.createdAt)}</span>
        <Link to={`${profilePath(wallAccountName)}#comment-${comment.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
          <Icon name="open_in_new" size={12} /> {t('reports.preview.onWall', { name: wallAccountName })}
        </Link>
      </p>
      <p className="text-sm text-zinc-200 whitespace-pre-wrap break-words">
        <CommentBody comment={comment} />
      </p>
    </div>
  );
}

function UserPreview({ user }: { user: ReportUserTarget }) {
  const { t, i18n } = useTranslation();
  const joined = user.createdAt ? toDate(user.createdAt) : null;
  return (
    <div className="flex items-start gap-3">
      <Link to={profilePath(user.accountName)} className="shrink-0">
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-10 rounded-full object-cover" />
          : <InitialsAvatar name={nameOf(user)} handle={user.accountName} className="size-10 rounded-full text-sm" />}
      </Link>
      <div className="min-w-0 flex flex-col gap-0.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Link to={profilePath(user.accountName)} className="font-semibold text-zinc-100 hover:text-primary transition-colors">{nameOf(user)}</Link>
          <span className="text-xs text-zinc-500">@{user.accountName}</span>
          {user.banned && <Flag>{t('reports.preview.banned')}</Flag>}
        </p>
        {joined && !Number.isNaN(joined.getTime()) && (
          <p className="text-xs text-zinc-500">{t('reports.preview.joined', { date: joined.toLocaleDateString(i18n.language) })}</p>
        )}
        <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
          {user.bio || <span className="italic text-zinc-500">{t('reports.preview.noBio')}</span>}
        </p>
      </div>
    </div>
  );
}

function Cover({ src }: { src: string | null }) {
  return (
    <div className="size-12 shrink-0 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center">
      {src ? <img src={src} alt="" className="size-full object-cover" /> : <Icon name="music_note" size={18} className="text-zinc-500" />}
    </div>
  );
}

function ProjectPreview({ project }: { project: ReportProjectTarget }) {
  const { t } = useTranslation();
  const href = projectPath({ publicId: project.publicId, slug: project.slug }, project.ownerAccountName);
  return (
    <div className="flex items-center gap-3">
      <Cover src={project.coverImage} />
      <div className="min-w-0 flex flex-col gap-0.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {href
            ? <Link to={href} className="font-semibold text-zinc-100 hover:text-primary transition-colors">{project.title}</Link>
            : <span className="font-semibold text-zinc-100">{project.title}</span>}
          {!project.public && <Flag>{t('reports.preview.private')}</Flag>}
        </p>
        <p className="text-xs text-zinc-500">
          {[project.artist, t('reports.preview.by', { name: project.ownerAccountName })].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  );
}

function PlaylistPreview({ playlist }: { playlist: ReportPlaylistTarget }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <Cover src={playlist.coverImage} />
      <div className="min-w-0 flex flex-col gap-0.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Link to={listPath(playlist.ownerAccountName, playlist.id)} className="font-semibold text-zinc-100 hover:text-primary transition-colors">{playlist.name}</Link>
          {!playlist.public && <Flag>{t('reports.preview.private')}</Flag>}
        </p>
        <p className="text-xs text-zinc-500">
          {t('reports.preview.by', { name: playlist.ownerAccountName })} · {t('playlists.detail.projects', { count: playlist.projectCount })}
        </p>
      </div>
    </div>
  );
}

/**
 * What was reported: the preview matching `targetType`, or a line saying it is gone. Shared by
 * the reporter's history and the moderators' tab (which also gets a comment's parent).
 */
export function ReportTargetPreview({ targetType, comment, user, project, playlist }: {
  targetType: ReportTargetType;
  comment: ReportCommentTarget | null;
  user: ReportUserTarget | null;
  project: ReportProjectTarget | null;
  playlist: ReportPlaylistTarget | null;
}) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  if (targetType === 'wall_comment' && comment) return <CommentPreview target={comment} />;
  if (targetType === 'user' && user) return <UserPreview user={user} />;
  if (targetType === 'project' && project) return <ProjectPreview project={project} />;
  if (targetType === 'playlist' && playlist) return <PlaylistPreview playlist={playlist} />;
  return <p className="text-sm italic text-zinc-500">{tk(`reports.preview.gone.${targetType}`)}</p>;
}
