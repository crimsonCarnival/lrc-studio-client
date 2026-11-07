import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { useGuestAuth } from './use-guest-auth';
import type { EditorLine } from '@/features/editor/editor.types';

interface GuestAuthButtonsProps {
  isReady: boolean;
  lines: EditorLine[];
  mediaTitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildProjectPayload?: () => Record<string, any>;
}

export function GuestAuthButtons({ isReady, lines, mediaTitle, buildProjectPayload }: GuestAuthButtonsProps) {
  const { t } = useTranslation();

  const goToAuth = useGuestAuth({ isReady, lines, mediaTitle, buildProjectPayload });

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <div className="relative hidden sm:flex items-center flex-shrink-0">
        <Button
          variant="outline"
          onClick={() => goToAuth('signin')}
          className="h-8 text-xs coarse:h-11 lg:coarse:h-11"
        >
          {t('auth.signIn')}
        </Button>
      </div>
      <div className="relative flex items-center flex-shrink-0">
        <Button
          onClick={() => goToAuth('signup')}
          className="h-8 text-xs coarse:h-11 lg:coarse:h-11"
        >
          {t('auth.signUp')}
        </Button>
      </div>
    </div>
  );
}
