import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { profilePath } from '../profile-path';
import { projectPath } from '@/features/projects/project-path';
import { bodySegments } from './wall-tags';
import type { WallComment } from './wall.service';

/** A comment's text with its tags drawn in: people as primary-coloured links, projects as mini cards. */
export default function CommentBody({ comment }: { comment: WallComment }) {
  const { t } = useTranslation();
  return (
    <>
      {bodySegments(comment.body, comment.mentions, comment.projectRefs).map((segment, i) => {
        if (segment.kind === 'text') return <span key={i}>{segment.text}</span>;
        if (segment.kind === 'user') {
          const { accountName } = segment.mention;
          return (
            <Link key={i} to={profilePath(accountName)} className="font-medium text-primary hover:underline">
              @{accountName}
            </Link>
          );
        }
        if (segment.kind === 'project') {
          const { ref } = segment;
          const href = projectPath({ publicId: ref.publicId, slug: ref.slug, title: ref.title }, ref.ownerAccountName);
          const title = ref.title || t('library.untitled');
          return (
            <Link
              key={i}
              to={href ?? '#'}
              className="mx-0.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/70 px-1.5 py-0.5 align-middle text-xs font-medium text-zinc-100 transition-colors hover:border-primary/50 hover:bg-zinc-800"
            >
              {ref.coverImage && <img src={ref.coverImage} alt="" referrerPolicy="no-referrer" className="-ml-1 size-5 shrink-0 rounded object-cover" />}
              <span className="max-w-[14rem] truncate">{title}</span>
            </Link>
          );
        }
        // Deleted since, or a project the viewer may no longer see.
        return (
          <span key={i} className="italic text-zinc-500">
            {segment.tag === 'user' ? t('profile.wall.tagUnknownUser') : t('profile.wall.tagHiddenProject')}
          </span>
        );
      })}
    </>
  );
}
