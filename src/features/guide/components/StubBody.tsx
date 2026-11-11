import { useTranslation } from 'react-i18next';

// Placeholder body: shows the section's written copy until its interactive
// demo or static mock lands. Replaced per section by pointing `load` elsewhere.
export default function StubBody({ id }: { id: string }) {
  const { t, i18n } = useTranslation();
  // Keys are built from a section id at runtime, so they cannot satisfy the typed key union.
  const paragraphs = [1, 2, 3].map((n) => `guide.sections.${id}.body${n}`).filter((key) => i18n.exists(key));
  return (
    <>
      {paragraphs.map((key) => (
        <p key={key} className="text-sm text-zinc-400 leading-relaxed">{t(key as never)}</p>
      ))}
    </>
  );
}
