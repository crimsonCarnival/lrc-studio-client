import type { ReactNode } from 'react';
import useInputMethod from '../hooks/useInputMethod.js';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { TapPopover } from './TapPopover';

interface InputMethodTooltipProps {
  hint: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export const InputMethodTooltip = ({ hint, children, side = 'top' }: InputMethodTooltipProps) => {
  const inputMethod = useInputMethod();
  const isTouchDevice = inputMethod === 'touch';

  if (isTouchDevice) {
    return <TapPopover content={hint} side={side}>{children}</TapPopover>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{hint}</TooltipContent>
    </Tooltip>
  );
};
