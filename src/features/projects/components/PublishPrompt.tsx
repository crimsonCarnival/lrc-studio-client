import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';

type PublishPromptProps = {
  onPublish: () => void;
  onDismiss: () => void;
};

/** A dismissible offer, shown once per project when every line is timed. Never publishes by itself. */
export function PublishPrompt({ onPublish, onDismiss }: PublishPromptProps) {
  const { t } = useTranslation();
  return (
    <div role="status" className="mx-4 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[calc(var(--radius)*1.4)] bg-primary-soft px-4 py-3 text-primary-ink sm:mx-6">
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-sm font-semibold">{t('project.publishPromptTitle')}</p>
        <p className="text-[13px] opacity-80">{t('project.publishPromptBody')}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" onClick={onDismiss} className="h-10 coarse:h-11 lg:h-10 px-3">{t('project.publishPromptDismiss')}</Button>
        <Button onClick={onPublish} className="h-10 coarse:h-11 lg:h-10 px-4">{t('project.publishPromptAction')}</Button>
      </div>
    </div>
  );
}
