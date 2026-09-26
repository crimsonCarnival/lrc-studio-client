import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/utils';
import { LOGO_URL } from '@/shared/constants/brand';

interface LogoLoaderProps {
  size?: number;
  className?: string;
}

/**
 * App-wide loading indicator: the logo fills up from the bottom over a dimmed copy of itself.
 * Use it for every loading state instead of a spinner.
 */
export function LogoLoader({ size = 16, className }: LogoLoaderProps) {
  const { t } = useTranslation();
  return (
    <span
      role="status"
      aria-label={t('common.loading')}
      className={cn('logo-loader relative inline-block shrink-0 align-middle', className)}
      style={{ width: size, height: size }}
    >
      <img src={LOGO_URL} alt="" draggable={false} className="logo-loader-track absolute inset-0 size-full object-contain" />
      <img src={LOGO_URL} alt="" draggable={false} className="logo-loader-fill absolute inset-0 size-full object-contain" />
    </span>
  );
}
