import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, GitFork, Globe } from 'lucide-react';

const TYPE_ICONS = {
  PROJECT_PUBLISHED: Globe,
  PROJECT_STARRED:   Star,
  PROJECT_FORKED:    GitFork,
};

const TYPE_I18N_KEY = {
  PROJECT_PUBLISHED: 'project_published',
  PROJECT_STARRED:   'project_starred',
  PROJECT_FORKED:    'project_forked',
};

// Deterministic pick from an array based on a string seed (activity id).
// Keeps the same variant across re-renders for the same activity.
function pick(arr, seed) {
  if (!Array.isArray(arr)) return arr;
  const hash = [...String(seed)].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return arr[hash % arr.length];
}

function relativeTime(isoString, t) {
  const diff  = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return t('library.justNow');
  if (mins  < 60) return t('library.minutesAgo', { count: mins });
  if (hours < 24) return t('library.hoursAgo',   { count: hours });
  return t('library.daysAgo', { count: days });
}

export function ActivityCard({ activity }) {
  const { t } = useTranslation();
  const { id, actor, type, projectId, projectTitle, coverImage, createdAt } = activity;
  const Icon    = TYPE_ICONS[type] ?? Star;
  const i18nKey = TYPE_I18N_KEY[type] ?? 'project_starred';

  // t() with returnObjects returns the raw array; pick a stable variant
  const actionText = pick(t(`feed.action.${i18nKey}`, { returnObjects: true }), id);

  return (
    <div className="flex gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/70 transition-colors">
      <Link to={`/${actor.accountName}`} className="shrink-0">
        {actor.avatarUrl ? (
          <img
            src={actor.avatarUrl}
            alt={actor.displayName || actor.accountName}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/50 to-violet-500/50 flex items-center justify-center text-sm font-bold text-white">
            {(actor.displayName || actor.accountName || '?').charAt(0).toUpperCase()}
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 leading-snug">
          <Link
            to={`/${actor.accountName}`}
            className="font-semibold text-white hover:text-primary transition-colors"
          >
            {actor.displayName || actor.accountName}
          </Link>
          {' '}
          <span className="text-zinc-400">{actionText}</span>
        </p>

        <Link
          to={`/project/${projectId}`}
          className="mt-1.5 flex items-center gap-2 group"
        >
          {coverImage && (
            <img
              src={coverImage}
              alt=""
              className="w-8 h-8 rounded object-cover shrink-0"
            />
          )}
          <span className="text-sm font-medium text-zinc-200 group-hover:text-primary transition-colors truncate">
            {projectTitle || t('feed.untitled')}
          </span>
        </Link>

        <p className="text-xs text-zinc-500 mt-1.5">
          {relativeTime(createdAt, t)}
        </p>
      </div>

      <Icon className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
    </div>
  );
}
