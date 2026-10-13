import { splitMatch } from '../split-match';

/** Renders `text` with the part that matched the search query marked (redesign sheet 19). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const parts = splitMatch(text, query);
  if (!parts) return <>{text}</>;
  const [before, match, after] = parts;
  return (
    <>
      {before}
      <mark className="rounded-[3px] bg-mark px-px text-inherit">{match}</mark>
      {after}
    </>
  );
}
