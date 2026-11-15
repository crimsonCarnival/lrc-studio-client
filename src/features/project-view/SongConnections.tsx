import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getSongConnections } from './song-connections.service';
import type { ConnectionGroup, ConnectionType } from './song-connections.types';

const ORDER: readonly ConnectionType[] = [
  'samples', 'interpolates', 'cover_of', 'remix_of',
  'sampled_in', 'interpolated_by', 'covered_by', 'remixed_by',
];
const MAX_SHOWN = 8;

type SongConnectionsProps = { track: string; artist: string };

/** Genius song relationships. Renders nothing while loading, with no match, or on any failure. */
export function SongConnections({ track, artist }: SongConnectionsProps) {
  const { t } = useTranslation();
  const enabled = track.trim() !== '' && artist.trim() !== '';
  const { data } = useQuery({
    queryKey: ['song-connections', track, artist],
    queryFn: () => getSongConnections(track, artist),
    enabled,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
  if (!enabled || !data) return null;

  const groups = ORDER
    .map((type) => data.groups.find((g) => g.type === type))
    .filter((g): g is ConnectionGroup => !!g && g.songs.length > 0);
  if (groups.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{t('projectView.connections.title')}</h2>
      {groups.map((group) => (
        <div key={group.type} className="flex flex-col gap-1">
          <h3 className="text-[13px] font-semibold text-subtle">{t(`projectView.connections.${group.type}`)}</h3>
          <ul className="flex flex-col gap-0.5 text-sm">
            {group.songs.slice(0, MAX_SHOWN).map((song) => (
              <li key={song.geniusId} className="truncate">
                <a href={song.url} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">{song.title}</a>
                <span className="text-muted-foreground"> · {song.artist}</span>
              </li>
            ))}
          </ul>
          {group.total > Math.min(group.songs.length, MAX_SHOWN) && (
            <a href={data.url} target="_blank" rel="noopener noreferrer" className="w-fit text-xs text-primary hover:underline">
              {t('projectView.connections.more', { count: group.total - Math.min(group.songs.length, MAX_SHOWN) })}
            </a>
          )}
        </div>
      ))}
      <a href={data.url} target="_blank" rel="noopener noreferrer" className="w-fit text-xs text-muted-foreground hover:underline">
        {t('projectView.connections.attribution')}
      </a>
    </section>
  );
}
