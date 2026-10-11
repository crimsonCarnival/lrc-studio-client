import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { Icon } from '@/shared/ui/Icon';
import { ModePill } from './LandingDemo';

/**
 * "How it works": four steps, each paired with a still mock of the setup
 * screen as the user will actually see it. The mocks are illustrations —
 * hidden from assistive tech, since the step copy beside each one already
 * says what it shows.
 */

// Sample song used across the mocks. A title, not UI copy.
const SONG = 'Midnight Echoes';
const PREVIEW_LINES = [
  { time: '00:12.40', text: 'The stars align above the city lights' },
  { time: '00:15.60', text: 'Midnight echoes through the empty halls' },
  { time: '00:18.80', text: 'She sang a melody that broke the night' },
];

const CARD = 'min-w-0 rounded-[22px] bg-zinc-900 border border-zinc-800 font-lyrics text-zinc-100';
const WELL = 'rounded-xl bg-zinc-950 border border-zinc-800';
const FIELD_LABEL = 'block text-[10px] font-bold tracking-[0.08em] uppercase text-primary';
const THUMB = 'shrink-0 rounded-lg bg-zinc-700';

function TimePill({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return (
    <span
      className={`shrink-0 inline-flex items-center rounded-full border font-mono font-medium tabular-nums ${
        strong ? 'bg-primary/25 border-primary/50 text-primary' : 'bg-primary/10 border-primary/20 text-primary'
      }`}
    >
      {children}
    </span>
  );
}

function Step({ stamp, title, desc, last, children }: { stamp: string; title: string; desc: string; last?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-16 gap-y-8">
      <div className="flex-[1_1_300px] max-w-[420px] flex flex-col gap-3.5">
        <span
          className={`self-start inline-flex items-center h-[26px] px-[11px] rounded-full border font-mono text-xs font-medium ${
            last ? 'bg-primary/25 border-primary/50 text-primary' : 'bg-primary/10 border-primary/20 text-primary'
          }`}
        >
          {stamp}
        </span>
        <h3 className="text-[26px] leading-[1.15] font-extrabold tracking-tight">{title}</h3>
        <p className="text-foreground/65">{desc}</p>
      </div>
      <div aria-hidden="true" className="flex-[999_1_560px] min-w-0">{children}</div>
    </div>
  );
}

function Tabs({ t, active }: { t: TFunction; active: 'media' | 'lyrics' }) {
  const tab = (on: boolean) => `px-4 py-2.5 ${on ? 'text-primary border-b-2 border-primary' : ''}`;
  return (
    <div className="flex gap-1 text-sm font-bold">
      <span className={tab(active === 'media')}>{t('landing.mock.media')}</span>
      <span className={tab(active === 'lyrics')}>{t('landing.mock.lyrics')}</span>
    </div>
  );
}

function Segmented({ left, right, active }: { left: string; right: string; active: 'left' | 'right' }) {
  const seg = (on: boolean) => `p-[9px] rounded-[9px] ${on ? 'bg-zinc-800' : ''}`;
  return (
    <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 text-[13px] font-bold text-center">
      <span className={seg(active === 'left')}>{left}</span>
      <span className={seg(active === 'right')}>{right}</span>
    </div>
  );
}

function ProjectInfoMock({ t }: { t: TFunction }) {
  return (
    <div className={`${CARD} p-5 flex flex-col gap-4`}>
      <div className="flex gap-4">
        <div className="shrink-0 flex flex-col items-center gap-2.5">
          <div className={`${WELL} size-[84px] rounded-[14px] flex flex-col items-center justify-center gap-1.5`}>
            <Icon name="image" size={18} />
            <span className="text-[10px] font-bold tracking-wider uppercase">{t('landing.mock.cover')}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground/80"><Icon name="link" size={12} />URL</span>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          <div className={`${WELL} px-3.5 py-2`}>
            <span className={FIELD_LABEL}>{t('landing.mock.projectName')} *</span>
            <span className="font-medium">{t('landing.mock.projectNameValue')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`${WELL} px-3.5 py-2 min-w-0`}>
              <span className={FIELD_LABEL}>{t('landing.mock.songTitle')}</span>
              <span className="block font-medium truncate">{SONG}</span>
            </div>
            <div className={`${WELL} px-3.5 py-2 min-w-0 flex items-center gap-2`}>
              <span className="flex-1 min-w-0">
                <span className={FIELD_LABEL}>{t('landing.mock.artist')}</span>
                <span className="block font-medium truncate text-foreground/65">{t('landing.mock.artistValue')}</span>
              </span>
              <Icon name="expand_more" size={14} />
            </div>
          </div>
        </div>
      </div>
      <span className="h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center gap-2 text-sm font-bold text-primary">
        <Icon name="search" size={14} />{t('landing.mock.search')}
      </span>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold tracking-wider uppercase">{t('landing.mock.singers')}</span>
        <div className="h-12 pl-4 pr-2 rounded-xl bg-zinc-950 flex items-center gap-2">
          <span className="flex-1 text-foreground/80">{t('landing.mock.addSinger')}</span>
          <span className="size-8 rounded-lg border border-zinc-700 inline-flex items-center justify-center text-foreground/45"><Icon name="add" size={14} /></span>
        </div>
        <span className="text-[13px] text-foreground/80">{t('landing.mock.singersHint')}</span>
      </div>
      <div className="flex items-center gap-2.5 flex-wrap text-[13px]">
        <span className="inline-flex items-center gap-2 font-bold tracking-wider uppercase"><Icon name="chevron_right" size={12} />{t('landing.mock.moreDetails')}</span>
        <span className="ml-auto text-foreground/80">{t('landing.mock.moreDetailsHint')}</span>
      </div>
    </div>
  );
}

function MediaMock({ t }: { t: TFunction }) {
  const query = `${SONG} ${t('landing.mock.artistValue')}`;
  const results = [
    { title: SONG, by: t('landing.mock.topicChannel'), picked: true },
    { title: `${SONG.toUpperCase()} (${t('landing.mock.lyricVideo')})`, by: t('landing.mock.channel') },
    { title: `${SONG} — ${t('landing.mock.live')}`, by: t('landing.mock.channel'), faded: true },
  ];
  return (
    <div className={`${CARD} px-6 pt-4 pb-[22px] flex flex-col gap-4`}>
      <Tabs t={t} active="media" />
      <Segmented left="YouTube" right={t('landing.mock.fileUrl')} active="left" />
      <div className="flex gap-2.5">
        <div className="flex-1 min-w-0 h-[46px] px-3.5 rounded-xl bg-zinc-950 flex items-center gap-2.5">
          <span className="shrink-0 w-[18px] h-[13px] rounded-[3.5px] bg-destructive" />
          <span className="flex-1 min-w-0 truncate">{query}</span>
          <Icon name="close" size={12} />
        </div>
        <span className="shrink-0 w-[58px] h-[46px] rounded-xl bg-destructive text-zinc-950 inline-flex items-center justify-center"><Icon name="search" size={16} /></span>
      </div>
      <ul className="flex flex-col gap-3">
        {results.map((r) => (
          <li
            key={r.title}
            className={`flex items-center gap-3.5 p-1.5 rounded-xl border ${r.picked ? 'bg-zinc-800 border-zinc-700' : 'border-transparent'} ${r.faded ? 'opacity-50' : ''}`}
          >
            <span className={`${THUMB} w-32 aspect-video`} />
            <span className="min-w-0">
              <span className="block font-semibold truncate">{r.title}</span>
              <span className="text-[13px] text-foreground/80">{r.by}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LyricsMock({ t }: { t: TFunction }) {
  const artist = t('landing.mock.artistValue');
  return (
    <div className="flex flex-wrap gap-4 font-lyrics text-zinc-100">
      <div className={`${CARD} flex-[1_1_260px] px-[18px] pt-4 pb-5 flex flex-col gap-3.5`}>
        <Tabs t={t} active="lyrics" />
        <Segmented left={t('landing.mock.pasteLyrics')} right={t('lyricsSearch.tabLabel')} active="right" />
        <div className="h-10 px-3 rounded-[10px] border border-zinc-800 flex items-center gap-2 text-sm">
          <Icon name="search" size={13} /><span className="truncate">{SONG} {artist}</span>
        </div>
        <div className="flex items-center gap-3 p-1.5 rounded-[10px] bg-zinc-800">
          <span className={`${THUMB} size-11 rounded-md`} />
          <span className="min-w-0"><span className="block text-[15px] font-semibold">{SONG}</span><span className="text-[13px] text-foreground/80">{artist}</span></span>
        </div>
        <div className="flex items-center gap-3 p-1.5 opacity-60">
          <span className={`${THUMB} size-11 rounded-md`} />
          <span className="min-w-0"><span className="block text-[15px] font-semibold truncate">{SONG} ({t('landing.mock.translation')})</span><span className="text-[13px] text-foreground/80">{t('landing.mock.source')}</span></span>
        </div>
      </div>

      <div className="flex-[1_1_300px] min-w-0 rounded-[18px] bg-zinc-800 border border-zinc-700 shadow-elevated p-5 flex flex-col gap-3.5">
        <div>
          <p className="font-heading text-[17px] font-extrabold">{t('lyricsSearch.preview')}</p>
          <p className="mt-0.5 text-[13px] text-foreground/80">{SONG} — {artist}</p>
        </div>
        <div className="px-3 py-2.5 rounded-[10px] bg-primary/10 border border-primary/25 text-[13px]">
          <span className="block font-semibold text-primary">{t('lyricsSearch.syncedTitle')}</span>
          <span className="text-foreground/80">{t('landing.mock.syncedShort')}</span>
        </div>
        <ol className="flex flex-col gap-2 text-sm">
          {PREVIEW_LINES.map((line, i) => (
            <li key={line.time} className={`flex items-center gap-2.5 ${i === PREVIEW_LINES.length - 1 ? 'opacity-55' : ''}`}>
              <TimePill><span className="h-[22px] px-[9px] inline-flex items-center text-[11px]">{line.time}</span></TimePill>
              <span className="truncate">{line.text}</span>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2.5 flex-wrap pt-3 border-t border-zinc-700 text-[13px]">
          <span className="inline-flex items-center gap-2 mr-auto">
            <span className="size-4 rounded bg-primary text-primary-foreground inline-flex items-center justify-center"><Icon name="check" size={12} /></span>
            {t('lyricsSearch.keepTimestamps')}
          </span>
          <span className="px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold">{t('lyricsSearch.useLyrics')}</span>
        </div>
      </div>
    </div>
  );
}

function StartSyncingMock({ t }: { t: TFunction }) {
  return (
    <div className="flex flex-col font-lyrics text-zinc-100">
      <div className="rounded-[22px] border border-zinc-800 bg-zinc-950 px-5 pt-[18px] pb-5 flex flex-col gap-3.5">
        <span className="font-mono text-[11px] font-medium text-foreground/45">{t('landing.mock.setupPage')}</span>
        <div className="flex items-center gap-3.5 flex-wrap">
          <span className="inline-flex items-center gap-2.5 mr-auto font-heading text-[22px] font-extrabold tracking-tight">
            <span className="size-2 rounded-full bg-primary/80" />{t('landing.mock.newProject')}
          </span>
          <span className="inline-flex items-center gap-2.5 text-xs font-bold tracking-wider uppercase">
            <span className="relative w-10 h-[22px] rounded-full bg-primary"><span className="absolute right-[3px] top-[3px] size-4 rounded-full bg-primary-foreground" /></span>
            {t('landing.mock.public')}
          </span>
          <span className="h-10 px-4 rounded-[10px] bg-primary text-primary-foreground inline-flex items-center gap-2 text-sm font-bold ring-4 ring-primary/20">
            {t('landing.mock.startSyncing')}<Icon name="arrow_forward" size={14} />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[['w-3/5', 'w-[85%]', 'w-2/5'], ['w-[30%]', 'w-[90%]', 'w-[70%]']].map((bars, i) => (
            <div key={i} className="h-[72px] rounded-[14px] bg-zinc-900 border border-zinc-800 p-3 flex flex-col gap-2">
              {bars.map((w, k) => <span key={w} className={`${w} h-2 rounded ${k === 0 ? 'bg-zinc-700' : 'bg-zinc-800'}`} />)}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 py-3.5 pl-[34px] text-[13px] text-foreground/65">
        <Icon name="arrow_downward" size={18} className="text-primary" />
        {t('landing.mock.opensEditor')}
      </div>

      <div className={`${CARD} px-5 pt-[18px] pb-5 flex flex-col gap-4`}>
        <div className="flex items-center gap-4 text-foreground/80">
          <span className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.08em] uppercase text-zinc-100"><Icon name="description" size={15} />{t('landing.demo.editor')}</span>
          <span className="ml-auto inline-flex items-center gap-2 h-7 px-3 rounded-full border border-zinc-700 font-mono text-xs font-medium">
            <span className="size-1.5 rounded-full bg-primary" />{t('landing.demo.progress', { done: 1, total: 12, words: 84 })}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3.5 min-h-[50px] px-3.5 rounded-xl bg-zinc-800/50">
            <TimePill><span className="h-6 px-2.5 inline-flex items-center text-xs text-foreground/65">{PREVIEW_LINES[0].time}</span></TimePill>
            <span className="text-[15px] truncate">{PREVIEW_LINES[0].text}</span>
          </div>
          <div className="flex items-center gap-3.5 min-h-[50px] pl-3.5 pr-2 rounded-xl bg-zinc-800 border border-dashed border-zinc-700">
            <TimePill strong><span className="h-6 px-2.5 inline-flex items-center text-xs">{PREVIEW_LINES[1].time}</span></TimePill>
            <span className="flex-1 min-w-0 text-[15px] font-semibold truncate">{PREVIEW_LINES[1].text}</span>
            <Kbd>{t('landing.demo.enterKey')}</Kbd>
          </div>
        </div>
        <div className="flex justify-center"><ModePill t={t} /></div>
      </div>
    </div>
  );
}

export function Kbd({ children, square }: { children: ReactNode; square?: boolean }) {
  return (
    <kbd
      className={`shrink-0 h-8 inline-flex items-center justify-center rounded-[7px] border border-b-[3px] border-zinc-700 bg-zinc-800 font-mono text-[13px] font-medium text-zinc-100 ${
        square ? 'w-8' : 'min-w-16 px-2.5'
      }`}
    >
      {children}
    </kbd>
  );
}

export default function LandingSteps({ t }: { t: TFunction }) {
  return (
    <>
      <Step stamp="00:01.00" title={t('landing.how.s1Title')} desc={t('landing.how.s1Desc')}><ProjectInfoMock t={t} /></Step>
      <Step stamp="00:02.00" title={t('landing.how.s2Title')} desc={t('landing.how.s2Desc')}><MediaMock t={t} /></Step>
      <Step stamp="00:03.00" title={t('landing.how.s3Title')} desc={t('landing.how.s3Desc')}><LyricsMock t={t} /></Step>
      <Step stamp="00:04.00" title={t('landing.how.s4Title')} desc={t('landing.how.s4Desc')} last><StartSyncingMock t={t} /></Step>
    </>
  );
}
