import { useTranslation } from 'react-i18next';
import { SAMPLE_LINES } from '../demos/sample-lines';
import { Icon } from '@/shared/ui/Icon';

const PILL = 'inline-flex h-8 items-center gap-1.5 rounded-pill px-3 text-xs font-semibold';
const BLOCKS = [{ left: 4, width: 26 }, { left: 32, width: 28 }, { left: 64, width: 30 }];

// The project-type choice at setup, the studio's stage / timeline / status chip, and the three export formats.
export default function SubtitlesMock() {
  const { t } = useTranslation();
  return (
    <div aria-hidden="true" className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-subtle">{t('setup.kindLabel')}</span>
        <span className="inline-flex rounded-pill bg-zinc-800 p-0.5">
          <span className={`${PILL} text-zinc-400`}><Icon name="music_note" size={14} />{t('setup.kindSong')}</span>
          <span className={`${PILL} bg-primary text-primary-foreground`}><Icon name="subtitles" size={14} />{t('setup.kindSubtitles')}</span>
        </span>
      </div>
      <div className="flex flex-col gap-2 rounded-lg bg-zinc-950 p-3">
        <div className="flex h-24 items-end justify-center rounded-md bg-zinc-800 pb-2">
          <span className="rounded-xs bg-zinc-950/80 px-2 py-0.5 text-xs text-zinc-100">{String(t(SAMPLE_LINES[1].key as never))}</span>
        </div>
        <div className="relative h-8 rounded-md bg-zinc-900">
          {BLOCKS.map((b) => (
            <span key={b.left} className="absolute inset-y-1 rounded bg-primary/25 border border-primary/50" style={{ left: `${b.left}%`, width: `${b.width}%` }} />
          ))}
        </div>
        <span className={`${PILL} w-fit border border-zinc-700 text-foreground`}><Icon name="check" size={14} />{t('editor.studio.chipReady')}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-subtle">{t('export.subtitleFile')}</span>
        {(['containerSrt', 'containerVtt', 'containerSbv'] as const).map((key) => (
          <span key={key} className={`${PILL} border border-zinc-700 text-zinc-200`}>{t(`export.${key}`)}</span>
        ))}
      </div>
    </div>
  );
}
