import { useState } from 'react';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { AvatarBadge } from './auth-shared';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { toast } from 'react-hot-toast';

interface IdentifierData {
  displayName?: string;
  accountName?: string;
  identifier?: string;
  avatarUrl?: string;
}

interface LoginPromptStepProps {
  t: TFunction;
  identifierData: IdentifierData;
  onSave: () => void;
  onSkip: () => void;
  onPasskeySuccess: () => void;
}

// ─── Save Login Info Prompt — shown after first successful password login ───

export default function LoginPromptStep({ t, identifierData, onSave, onSkip, onPasskeySuccess }: LoginPromptStepProps) {
  const displayName = identifierData.displayName || identifierData.accountName || identifierData.identifier || '';
  const { registerPasskey } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCreatePasskey = async () => {
    setLoading(true);
    try {
      const success = await registerPasskey();
      if (success) {
        toast.success(t('auth.passkey.created'));
        onPasskeySuccess(); // Save info and proceed
      }
    } catch (err) {
      if ((err as { code?: string })?.code === 'email_not_verified') {
        toast.error(t('auth.passkey.emailNotVerified'));
        onSkip();
        navigate('/settings');
      } else {
        toast.error(t('auth.passkey.createFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col items-center gap-7">
      <div className="flex flex-col items-center gap-3 text-center">
        <AvatarBadge
          accountName={identifierData.accountName || identifierData.identifier}
          avatarUrl={identifierData.avatarUrl}
          size="lg"
        />
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-lg font-semibold text-zinc-100 tracking-tight">{displayName}</p>
          {identifierData.accountName && identifierData.accountName.toLowerCase() !== displayName.toLowerCase() && (
            <p className="text-sm text-zinc-500">{identifierData.accountName}</p>
          )}
        </div>
      </div>

      {/* Passkey card: icon tile + what it is, then the actions. */}
      <div className="flex w-full flex-col gap-3.5 rounded-2xl bg-background p-[18px] inset-ring inset-ring-hl">
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] bg-primary-soft text-primary-ink">
            <Icon name="fingerprint" size={24} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[17px] font-semibold text-foreground">{t('auth.savedAccount.prompt')}</p>
            <p className="text-sm text-subtle">{t('auth.savedAccount.promptSub')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleCreatePasskey} loading={loading} className="h-[52px] w-full text-[17px] lg:h-[52px] lg:text-[17px]">
            {t('auth.savedAccount.createPasskey')}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onSave} disabled={loading} variant="outline" className="h-[52px] text-[17px] lg:h-[52px] lg:text-[17px]">
              {t('auth.savedAccount.save')}
            </Button>
            <Button onClick={onSkip} disabled={loading} variant="ghost" className="h-11 text-[15px] lg:h-11 lg:text-[15px]">
              {t('auth.savedAccount.skip')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
