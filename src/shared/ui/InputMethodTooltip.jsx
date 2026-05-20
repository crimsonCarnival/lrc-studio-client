import useInputMethod from '../hooks/useInputMethod.js';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip.tsx';
import { TapPopover } from './TapPopover.jsx';

export const InputMethodTooltip = ({ hint, children, side = 'top' }) => {
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
