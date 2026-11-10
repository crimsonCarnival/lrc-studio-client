import { Kbd, KbdGroup } from '@ui/kbd';
import { shortcutParts } from '@features/settings/key-symbols';
import { useSettings } from '@/features/settings/useSettings';

interface ShortcutHintProps {
  label: string;
  /** Key of `settings.shortcuts`, e.g. 'togglePlayer'. */
  shortcut: string;
  /** Shown when the viewer has no binding stored for it (the default). */
  fallback: string;
}

/**
 * Tooltip content for a control that has a keyboard shortcut: "Label  [⇧ Shift] [L]", with the
 * viewer's own binding. It reads settings itself, so a page that only renders the tooltip does
 * not re-render on every settings change (tooltip content mounts only while it is open).
 */
export function ShortcutHint({ label, shortcut, fallback }: ShortcutHintProps) {
  const { settings } = useSettings();
  const binding: string = settings.shortcuts?.[shortcut]?.[0] || fallback;
  return (
    <span className="inline-flex items-center gap-2">
      {label}
      <KbdGroup>
        {shortcutParts(binding).map((k, i) => (
          <Kbd key={i}>{k}</Kbd>
        ))}
      </KbdGroup>
    </span>
  );
}
