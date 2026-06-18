import { useState } from 'react';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import { Check, X, Fingerprint, Loader2 } from 'lucide-react';
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
          onClick={handleCreatePasskey}
          disabled={loading}
          className="h-11 w-full bg-primary hover:bg-primary-dim text-zinc-950 font-normal text-sm rounded-xl gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Fingerprint className="size-4" />}
          {t('auth.savedAccount.createPasskey')}
        </Button>
        <Button
          onClick={onSave}
          disabled={loading}
          variant="outline"
          className="h-11 w-full border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/50 font-normal text-sm rounded-xl gap-2"
        >
          <Check className="size-4" />
          {t('auth.savedAccount.save')}
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={loading}
          className="h-11 w-full text-zinc-500 hover:text-zinc-300 font-normal text-sm rounded-xl gap-2 mt-1"
        >
          <X className="size-4" />
          {t('auth.savedAccount.skip')}
        </Button>
      </div>
    </div>
  );
}
