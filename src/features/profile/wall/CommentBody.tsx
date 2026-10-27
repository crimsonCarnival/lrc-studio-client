import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserHoverCard } from '@ui/UserHoverCard';
import { profilePath } from '../profile-path';
import { projectPath } from '@/features/projects/project-path';
import { bodySegments } from './wall-tags';
import type { WallComment } from './wall.service';

const CARD_CLASS = 'mx-0.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800/70 px-1.5 py-0.5 align-middle text-xs font-medium text-zinc-100';

/** A tagged project as an inline mini card: its cover, if it has one, and its title. */
export function ProjectTagCard({ title, coverImage, href }: { title: string; coverImage: string | null; href?: string | null }) {
  const { t } = useTranslation();
  const content = (
    <>
      {coverImage && <img src={coverImage} alt="" referrerPolicy="no-referrer" className="-ml-1 size-5 shrink-0 rounded object-cover" />}
      <span className="max-w-[14rem] truncate">{title || t('library.untitled')}</span>
    </>
  );
  return href
    ? <Link to={href} className={`${CARD_CLASS} transition-colors hover:border-primary/50 hover:bg-zinc-800`}>{content}</Link>
    : <span className={CARD_CLASS}>{content}</span>;
}

/** A comment's text with its tags drawn in: people as primary-coloured links, projects as mini cards. */
export default function CommentBody({ comment }: { comment: Pick<WallComment, 'body' | 'mentions' | 'projectRefs'> }) {
  const { t } = useTranslation();
  return (
    <>
      {bodySegments(comment.body, comment.mentions, comment.projectRefs).map((segment, i) => {
        if (segment.kind === 'text') return <span key={i}>{segment.text}</span>;
        if (segment.kind === 'user') {
          const { accountName } = segment.mention;
          return (
            <UserHoverCard key={i} accountName={accountName} userId={segment.mention.id}>
              <Link to={profilePath(accountName)} className="font-medium text-primary hover:underline">
                @{accountName}
              </Link>
            </UserHoverCard>
          );
        }
        if (segment.kind === 'project') {
          const { ref } = segment;
          const href = projectPath({ publicId: ref.publicId, slug: ref.slug, title: ref.title }, ref.ownerAccountName);
          return <ProjectTagCard key={i} title={ref.title} coverImage={ref.coverImage} href={href} />;
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
