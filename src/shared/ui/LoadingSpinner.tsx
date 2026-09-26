import { LogoLoader } from './LogoLoader';

type SpinnerSize = 'sm' | 'md' | 'lg';

const SIZES: Record<SpinnerSize, number> = { sm: 24, md: 32, lg: 48 };

export function LoadingSpinner({ size = 'md' }: { size?: SpinnerSize }) {
  return <LogoLoader size={SIZES[size] ?? SIZES.md} />;
}
