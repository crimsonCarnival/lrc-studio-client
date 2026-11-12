import { useEffect, useRef, useState } from 'react';

/**
 * The "Time single words" card: a short word-by-word stamping run over two sample
 * lines, the second with furigana. It plays once when the card scrolls into view and
 * stops with every word stamped, so it moves for under five seconds and needs no
 * pause control. With reduced motion it renders already fully stamped.
 *
 * Decorative: the card's heading and description carry the meaning, so it is
 * hidden from assistive tech.
 */

// Sample lyric, not UI copy. A word is a run of plain text and ruby (base + reading) parts.
type Part = string | { base: string; reading: string };
const LINES: { cjk?: boolean; className: string; words: Part[][] }[] = [
  {
    className: 'font-extrabold leading-tight',
    words: [['Midnight'], ['echoes'], ['through'], ['the'], ['empty'], ['halls']],
  },
  {
    cjk: true,
    className: 'font-bold leading-[1.9]',
    words: [
      [{ base: '月明', reading: 'つきあ' }, 'かりに'],
      [{ base: '照', reading: 'て' }, 'らされた'],
      [{ base: '道', reading: 'みち' }, 'を'],
    ],
  },
];
const WORD_COUNT = LINES.reduce((n, l) => n + l.words.length, 0);
const STEP_MS = 420;

export default function LandingWordsDemo({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  // Without IntersectionObserver (old browsers, jsdom) there is no "in view" signal: just play.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');
  const [stamped, setStamped] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (inView || !el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  useEffect(() => {
    if (reducedMotion || !inView || stamped >= WORD_COUNT) return;
    const id = setTimeout(() => setStamped((n) => n + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [reducedMotion, inView, stamped]);

  const lit = reducedMotion ? WORD_COUNT : stamped;
  let index = 0;

  return (
    <div ref={ref} aria-hidden="true" className="flex flex-col gap-2.5 p-5 rounded-[calc(var(--radius)*1.4)] bg-zinc-900 font-lyrics text-2xl">
      {LINES.map((line, li) => (
        <p key={li} lang={line.cjk ? 'ja' : undefined} className={line.className}>
          {line.words.map((parts, wi) => {
            const on = index++ < lit;
            return (
              <span key={wi} className={`transition-colors duration-150 ${on ? 'text-primary glow-line' : ''}`}>
                {parts.map((part, pi) => (typeof part === 'string'
                  ? part
                  : <ruby key={pi}>{part.base}<rt>{part.reading}</rt></ruby>))}
                {line.cjk || wi === line.words.length - 1 ? '' : ' '}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
