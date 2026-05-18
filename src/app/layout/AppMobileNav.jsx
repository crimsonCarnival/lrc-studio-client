import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutList, Music2, BookOpen, UploadCloud } from 'lucide-react';

/**
 * Fixed bottom tab bar — mobile only (hidden on lg+).
 */
export function AppMobileNav({ mobileTab, setMobileTab, activeProjectId, isReady }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isReady) return null;

  const tabs = [
    { id: 'editor',  label: t('app.tab.editor', 'Editor'),   Icon: LayoutList  },
    { id: 'preview', label: t('app.tab.preview', 'Preview'),  Icon: Music2      },
    { id: 'library', label: t('library.title'),               Icon: BookOpen    },
    { id: 'uploads', label: t('uploads.title'),               Icon: UploadCloud },
  ];

  const isActive = (id) => {
    if (id === 'library') return location.pathname.startsWith('/library');
    if (id === 'uploads') return location.pathname.startsWith('/uploads');
    return location.pathname.startsWith('/project/') && mobileTab === id;
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-nav h-14 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-700/50 flex items-stretch pb-safe">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => {
            if (id === 'library') {
              navigate('/library');
            } else if (id === 'uploads') {
              navigate('/uploads');
            } else {
              if (!location.pathname.startsWith('/project/')) {
                navigate(activeProjectId ? `/project/${activeProjectId}` : '/project/new');
              }
              setMobileTab(id);
            }
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
            isActive(id) ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          aria-label={label}
        >
          <Icon className="size-5" strokeWidth={mobileTab === id ? 2.5 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
