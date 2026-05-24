import { Check, X } from 'lucide-react';
import { Button } from '@ui/button';
import { AvatarBadge } from './auth-shared';

// ─── Save Login Info Prompt — shown after first successful password login ───

export default function LoginPromptStep({ t, identifierData, onSave, onSkip }) {
  const displayName = identifierData.displayName || identifierData.accountName || identifierData.identifier;

  return (
    <div className="animate-fade-in flex flex-col items-center gap-7">
      <div className="flex flex-col items-center gap-3 text-center">
        <AvatarBadge
          username={identifierData.accountName || identifierData.identifier}
          avatarUrl={identifierData.avatarUrl}
          size="lg"
        />
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-lg font-semibold text-zinc-100 tracking-tight">{displayName}</p>
          {identifierData.accountName && identifierData.accountName.toLowerCase() !== displayName.toLowerCase() && (
            <p className="text-sm text-zinc-500">@{identifierData.accountName}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-base font-semibold text-zinc-100">{t('auth.savedAccount.prompt')}</p>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-[240px]">{t('auth.savedAccount.promptSub')}</p>
      </div>

      <div className="w-full flex flex-col gap-2">
        <Button
          onClick={onSave}
          className="h-11 w-full bg-primary hover:bg-primary-dim text-zinc-950 font-normal text-sm rounded-xl gap-2"
        >
          <Check className="size-4" />
          {t('auth.savedAccount.save')}
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          className="h-11 w-full text-zinc-400 hover:text-zinc-100 font-normal text-sm rounded-xl gap-2"
        >
          <X className="size-4" />
          {t('auth.savedAccount.skip')}
        </Button>
      </div>
    </div>
  );
}
