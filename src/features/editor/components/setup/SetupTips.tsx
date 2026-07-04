import { Icon } from '@/shared/ui/Icon';
import { useState, useEffect } from 'react';

const EMPTY_TIPS: string[] = [];

export default function SetupTips({ tips = EMPTY_TIPS }: { tips?: string[] }) {
  const [tipIndex, setTipIndex] = useState(0);
  const hasTips = Array.isArray(tips) && tips.length > 0;

  useEffect(() => {
    if (!hasTips) return;
    const id = setInterval(() => setTipIndex(p => (p + 1) % tips.length), 20000);
    return () => clearInterval(id);
  }, [hasTips, tips.length]);

  if (!hasTips) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 flex items-center justify-center pointer-events-none z-40 animate-fade-in">
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800/60 rounded-full backdrop-blur-md shadow-lg max-w-sm sm:max-w-md">
        <Icon name="lightbulb" size={12} className="text-amber-400/80 shrink-0" />
        <p className="text-[11px] font-medium text-zinc-400 truncate">
          {tips[tipIndex]}
        </p>
      </div>
    </div>
  );
}
