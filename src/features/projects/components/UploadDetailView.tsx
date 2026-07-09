import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import { Icon } from '@/shared/ui/Icon';
import { YoutubeIcon } from '@/shared/ui/YoutubeIcon';
import { uploads } from '@/app/api';
import { Button } from '@ui/button';
import NotFoundPage from '@/app/NotFoundPage';
import ClientOnlyDate from '@shared/ui/ClientOnlyDate';

interface UploadProject {
  publicId: string;
  title?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

interface MediaDetail {
  source?: string | null;
  title?: string | null;
  fileName?: string | null;
  createdAt?: string | null;
  uploadUrl?: string | null;
  duration?: number | null;
  projects?: UploadProject[] | null;
}

export default function UploadDetailView({ onBack }: { onBack: () => void }) {
  const { id } = useParams();
  const { t, dt } = useDynamicTranslation();
  const navigate = useNavigate();

  const [media, setMedia] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadMedia() {
      try {
        setLoading(true);
        setError('');
        const data = await uploads.getMedia(id!);
        setMedia(data.upload ?? null);
      } catch (err) {
        setError((err as { message?: string }).message || 'Failed to load media details');
      } finally {
        setLoading(false);
      }
    }
    if (id) loadMedia();
  }, [id]);

  if (loading) {
    return (
      <div className="glass rounded-xl sm:rounded-2xl p-5 flex flex-col h-full animate-pulse">
        <div className="h-8 w-1/3 bg-zinc-800 rounded-lg mb-6"></div>
        <div className="h-32 w-full bg-zinc-800 rounded-xl mb-4"></div>
        <div className="h-20 w-full bg-zinc-800 rounded-xl"></div>
      </div>
    );
  }

  if (error || !media) {
    if (!error) {
      return <NotFoundPage type="upload" />;
    }
    return (
      <div className="glass rounded-xl sm:rounded-2xl p-5 flex flex-col items-center justify-center h-full">
        <Icon name="audio_file" size={48} className="text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-300 mb-2">{t('uploads.errorLoading')}</h2>
        <p className="text-zinc-500 mb-6 text-center max-w-sm">{error || dt('uploads.notFound')}</p>
        <Button onClick={onBack} variant="outline" className="px-6 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700">
          <Icon name="chevron_left" size={16} className="mr-2" />
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const isYouTube = media.source === 'youtube';

  return (
    <div className="flex flex-col h-full pt-16 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col h-full overflow-hidden relative">

        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-zinc-700/50 flex-shrink-0">
          <Button
            onClick={onBack}
            variant="outline"
            className="size-8 sm:size-10 p-0 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700 shadow-sm"
            aria-label={t('common.back')}
          >
            <Icon name="chevron_left" size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 truncate tracking-tight">{media.title || media.fileName || t('uploads.unnamed')}</h2>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-500 mt-1.5">
              <span className="flex items-center gap-1.5">
                <Icon name="calendar_today" size={14} />
                <ClientOnlyDate date={media.createdAt} options={{ dateStyle: 'medium' }} />
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/50">
                {isYouTube ? <YoutubeIcon simple className="size-3 text-red-500" /> : <Icon name="audio_file" size={12} className="text-primary" />}
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">{isYouTube ? t('uploads.youtube') : t('uploads.audioFile')}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1 sm:pr-2 space-y-6 sm:space-y-8 custom-scrollbar">
          {/* Details Section */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 shadow-inner">
            <h3 className="text-sm sm:text-base font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <Icon name="audio_file" size={20} className="text-zinc-400" />
              {t('uploads.details')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/30">
                <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">{t('uploads.source')}</p>
                <p className="text-sm sm:text-base text-zinc-300 truncate">
                  {isYouTube ? (
                    <a href={media.uploadUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">
                      {media.uploadUrl}
                    </a>
                  ) : (
                    media.fileName || t('uploads.unknownFile')
                  )}
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/30">
                <p className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">{t('uploads.duration')}</p>
                <p className="text-sm sm:text-base text-zinc-300 flex items-center gap-1.5">
                  <Icon name="schedule" size={16} className="text-zinc-500" />
                  {media.duration ? `${Math.floor(media.duration / 60)}:${Math.floor(media.duration % 60).toString().padStart(2, '0')}` : t('uploads.unknown')}
                </p>
              </div>
            </div>
          </div>

          {/* Associated Projects Section */}
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <Icon name="music_note" size={20} className="text-primary" />
              {t('uploads.associatedProjects')}
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs ml-1 font-medium">{media.projects?.length || 0}</span>
            </h3>

            {media.projects && media.projects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {media.projects.map(project => (
                  <button
                    key={project.publicId}
                    type="button"
                    className="group relative bg-zinc-900/60 border border-zinc-800 hover:border-primary/50 hover:bg-zinc-800/60 rounded-xl p-4 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer overflow-hidden flex flex-col text-left focus:ring-2 focus:ring-primary/50 outline-none"
                    onClick={() => navigate(`/project/${project.publicId}/edit`)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="flex items-start gap-3 relative z-10">
                      <div className="size-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <Icon name="music_note" size={20} className="text-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-200 truncate group-hover:text-primary transition-colors">{project.title || t('project.untitled')}</h4>
                        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                          <Icon name="calendar_today" size={12} />
                          <ClientOnlyDate date={project.updatedAt || project.createdAt} options={{ dateStyle: 'medium' }} />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-900/30 border border-dashed border-zinc-700/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <Icon name="music_note" size={40} className="text-zinc-600 mb-3" />
                <p className="text-sm text-zinc-400 font-medium">{dt('uploads.noProjects')}</p>
                <p className="text-xs text-zinc-500 mt-1">{t('uploads.startNewProject')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
