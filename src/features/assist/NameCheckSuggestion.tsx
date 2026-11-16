import type { FocusEvent, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { useAuthContext } from '@/features/auth/useAuthContext';
import type { NameField } from './assist.types';
import { useNameCheck } from './useNameCheck';

type Props = {
  field: NameField;
  value: string;
  title: string;
  onApply: (next: string) => void;
  children: ReactNode;
};

/** Wraps an artist or album input; on blur it may offer a spelling fix. Never applied on its own. */
export function NameCheckSuggestion({ field, value, title, onApply, children }: Props) {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { suggestion, check, keep } = useNameCheck({ field, value, title, enabled: !!user });

  if (!user) return <>{children}</>;

  const onBlurCapture = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) check();
  };

  return (
    <div onBlurCapture={onBlurCapture} className="flex flex-col gap-2">
      {children}
      {suggestion && (
        <div className="flex flex-wrap items-center gap-2 rounded-[calc(var(--radius)*1.2)] bg-primary-soft px-3 py-2 text-[13px] text-primary-ink" role="status">
          <span className="min-w-0 flex-1">
            <Trans i18nKey="editor.assist.nameCheck.message" values={{ name: suggestion }} components={{ b: <strong /> }} />
          </span>
          <Button type="button" size="sm" onClick={() => onApply(suggestion)}>{t('editor.assist.nameCheck.apply')}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={keep}>{t('editor.assist.nameCheck.keep')}</Button>
        </div>
      )}
    </div>
  );
}
