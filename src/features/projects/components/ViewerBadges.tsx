import { useTranslation } from 'react-i18next';
import { Tip } from '@ui/tip';
import type { ProjectViewer } from '../hooks/useProjectViewers';

const MAX_AVATARS = 5;

/**
 * Overlapping avatar stack of who is viewing this project right now. Rendered
 * for the project owner only — the server never sends this roster to anyone
 * else, so there is nothing here a non-owner could populate.
 *
 * Renders nothing when nobody is watching, rather than an empty row.
 */
export function ViewerBadges({ viewers, anonymousCount }: {
  viewers: ProjectViewer[];
  anonymousCount: number;
}) {
  const { t } = useTranslation();
  if (viewers.length === 0 && anonymousCount === 0) return null;

  const shown = viewers.slice(0, MAX_AVATARS);
  const overflow = viewers.length - shown.length;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{t('projectView.viewersNow')}</span>

      {shown.length > 0 && (
        <div className="flex items-center">
          {shown.map((viewer) => (
            <Tip key={viewer.userId} content={viewer.displayName || viewer.accountName}>
              <span className="-ml-1.5 first:ml-0 inline-flex">
                {viewer.avatarUrl ? (
                  <img
                    src={viewer.avatarUrl}
                    alt={viewer.displayName || viewer.accountName}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover ring-2 ring-background"
                  />
                ) : (
                  <span
                    role="img"
                    aria-label={viewer.displayName || viewer.accountName}
                    className="w-6 h-6 rounded-full ring-2 ring-background bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center uppercase"
                  >
                    {(viewer.displayName || viewer.accountName || '?').charAt(0)}
                  </span>
                )}
              </span>
            </Tip>
          ))}

          {overflow > 0 && (
            <span
              role="img"
              aria-label={t('projectView.viewersMore', { count: overflow })}
              className="-ml-1.5 w-6 h-6 rounded-full ring-2 ring-background bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center tabular-nums"
            >
              +{overflow}
            </span>
          )}
        </div>
      )}

      {anonymousCount > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {t('projectView.viewersAnonymous', { count: anonymousCount })}
        </span>
      )}
    </div>
  );
}
