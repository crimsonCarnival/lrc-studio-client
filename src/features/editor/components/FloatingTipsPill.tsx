import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

export function FloatingTipsPill() {
  const { t } = useTranslation();
  const location = useLocation();
  const [tipIndex, setTipIndex] = useState(0);

  const isProjectPage = location.pathname.startsWith('/project/');
  const tips = t('home.tips', { returnObjects: true }) as unknown as string[];
  const hasTips = Array.isArray(tips) && tips.length > 0;

  useEffect(() => {
    if (!hasTips) return;
    const id = setInterval(() => setTipIndex(i => (i + 1) % tips.length), 20000);
    return () => clearInterval(id);
  }, [hasTips, tips.length]);

  if (!isProjectPage || !hasTips) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-fade-in">
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950/80 border border-zinc-800/60 rounded-full backdrop-blur-xl shadow-xl pointer-events-auto cursor-help transition-all hover:border-zinc-700/60 hover:bg-zinc-900/80">
        <Icon name="lightbulb" size={14} className="text-amber-400/80 shrink-0" />
        <p className="text-[11px] font-medium text-zinc-400 whitespace-nowrap max-w-[320px] truncate">
          {tips[tipIndex]}
        </p>
      </div>
    </div>
  );
}
