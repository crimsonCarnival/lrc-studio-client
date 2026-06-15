import { Music } from 'lucide-react';

/**
 * Displays a project's cover image, or a genre-specific gradient placeholder.
 * Sized via className (default: size-9).
 */

const GENRE_GRADIENTS = {
  pop:         'from-pink-500 to-rose-400',
  rock:        'from-zinc-600 to-zinc-400',
  hip_hop:     'from-yellow-500 to-orange-400',
  rnb:         'from-purple-500 to-fuchsia-400',
  electronic:  'from-cyan-500 to-blue-400',
  jazz:        'from-amber-600 to-yellow-400',
  classical:   'from-slate-500 to-slate-300',
  country:     'from-orange-600 to-amber-400',
  folk:        'from-lime-600 to-green-400',
  metal:       'from-red-700 to-zinc-600',
  blues:       'from-blue-700 to-indigo-500',
  soul:        'from-rose-600 to-orange-400',
  reggae:      'from-green-500 to-yellow-400',
  latin:       'from-red-500 to-pink-400',
  alternative: 'from-violet-600 to-purple-400',
  soundtrack:  'from-teal-600 to-cyan-400',
  world:       'from-emerald-600 to-teal-400',
  other:       'from-zinc-600 to-zinc-500',
};

const DEFAULT_GRADIENT = 'from-zinc-700 to-zinc-600';

export function ProjectListCover({ coverImage, genre, className = 'size-9', iconSize = 'size-4' }) {
  const gradient = GENRE_GRADIENTS[genre] ?? DEFAULT_GRADIENT;

  if (coverImage) {
    return (
      <div className={`${className} rounded-lg flex-shrink-0 overflow-hidden`}>
        <img src={coverImage} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${className} rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
      <Music className={`${iconSize} text-white/60`} />
    </div>
  );
}
