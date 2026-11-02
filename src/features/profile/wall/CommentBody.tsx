import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserHoverCard } from '@ui/UserHoverCard';
import { profilePath } from '../profile-path';
import { projectPath } from '@/features/projects/project-path';
import { bodySegments } from './wall-tags';
import { Icon } from '@/shared/ui/Icon';
import { ProjectHoverCard } from '@/features/projects/components/ProjectHoverCard';
import type { WallComment } from './wall.service';

// A pill that reads as part of the sentence: tinted, not boxed, sitting on the text's baseline.
const CARD_CLASS = 'mx-0.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary-soft py-0.5 pl-0.5 pr-2.5 align-[-0.3em] text-[13px] font-semibold text-primary-ink ring-1 ring-inset ring-primary/25';

/** A tagged project as an inline pill: its cover (or a note glyph), its title and, when known, its owner. */
export function ProjectTagCard({ title, coverImage, owner, href }: { title: string; coverImage: string | null; owner?: string; href?: string | null }) {
  const { t } = useTranslation();
  const content = (
    <>
      {coverImage
        ? <img src={coverImage} alt="" referrerPolicy="no-referrer" className="size-5 shrink-0 rounded-full object-cover" />
        : <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/20"><Icon name="music_note" size={12} /></span>}
      <span className="max-w-[14rem] truncate">{title || t('library.untitled')}</span>
      {owner && <span className="hidden truncate font-mono text-[11px] font-medium text-primary-ink/70 sm:inline">@{owner}</span>}
    </>
  );
  return href
    ? <Link to={href} className={`${CARD_CLASS} transition-colors hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-focus`}>{content}</Link>
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
          return (
            <ProjectHoverCard key={i} publicId={ref.publicId}>
              <ProjectTagCard title={ref.title} coverImage={ref.coverImage} owner={ref.ownerAccountName} href={href} />
            </ProjectHoverCard>
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
