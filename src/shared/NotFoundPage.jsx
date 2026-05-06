import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import {
  FileQuestion,
  FolderSearch,
  UserX,
  Ghost,
  ArrowLeft,
  Home as HomeIcon,
} from 'lucide-react';

export default function NotFoundPage({ type = 'general' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Differentiate content based on type
  const config = {
    project: {
      icon: <FolderSearch className="w-16 h-16 text-amber-400" />,
      title: t('error.projectNotFoundTitle', 'Project Not Found'),
      description: t('error.projectNotFoundDesc', "The project you're looking for doesn't exist or has been deleted."),
      primaryAction: {
        label: t('app.backToLibrary', 'Back to Library'),
        onClick: () => navigate('/library')
      }
    },
    upload: {
      icon: <FileQuestion className="w-16 h-16 text-blue-400" />,
      title: t('error.uploadNotFoundTitle', 'Media Not Found'),
      description: t('error.uploadNotFoundDesc', "We couldn't find the audio or video file you're trying to access."),
      primaryAction: {
        label: t('app.viewUploads', 'View Uploads'),
        onClick: () => navigate('/uploads')
      }
    },
    user: {
      icon: <UserX className="w-16 h-16 text-rose-400" />,
      title: t('error.userNotFoundTitle', 'User Not Found'),
      description: t('error.userNotFoundDesc', "The profile you're looking for doesn't exist in our records."),
      primaryAction: {
        label: t('app.backToDashboard', 'Back to Home'),
        onClick: () => navigate('/home')
      }
    },
    general: {
      icon: <Ghost className="w-16 h-16 text-zinc-500" />,
      title: t('error.pageNotFoundTitle', 'Lost in Space?'),
      description: t('error.pageNotFoundDesc', "The page you're looking for moved, changed, or never existed in the first place."),
      primaryAction: {
        label: t('app.backHome', 'Return Home'),
        onClick: () => navigate('/home')
      }
    }
  };

  const current = config[type] || config.general;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-md">
        <div className="mb-8 p-6 bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-zinc-800/50 shadow-elevated animate-slide-up-fade">
          {current.icon}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4 tracking-tight font-heading">
          {current.title}
        </h1>

        <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
          {current.description}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
          <Button
            variant="primary"
            size="lg"
            onClick={current.primaryAction.onClick}
            className="w-full sm:flex-1 h-12 text-base font-semibold glow-primary"
          >
            <HomeIcon className="w-5 h-5 mr-2" />
            {current.primaryAction.label}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate(-1)}
            className="w-full sm:flex-1 h-12 text-base text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:bg-zinc-800/50"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('app.goBack', 'Go Back')}
          </Button>
        </div>
      </div>
    </div>
  );
}
