import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import type { SuggestionReason as Reason } from '@/types/graphql';
import { suggestionReasonText } from '../suggestion-reason';

const ICON: Record<Reason['kind'], string> = {
  MUTUAL: 'group',
  TASTE: 'music_note',
  NEW: 'eco',
};

export function SuggestionReason({ reason, className }: { reason?: Reason | null; className?: string }) {
  const { t } = useTranslation();
  if (!reason) return null;
  return (
    <p className={cn('flex items-start gap-1.5 text-xs leading-snug text-subtle', className)}>
      <Icon name={ICON[reason.kind]} size={14} className="mt-px shrink-0" />
      <span className="min-w-0">{suggestionReasonText(reason, t)}</span>
    </p>
  );
}
