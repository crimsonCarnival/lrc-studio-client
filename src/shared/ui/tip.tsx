import type { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface TipProps {
  children: ReactNode;
  content?: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

/**
 * Lightweight hover-only text tooltip. Drop-in replacement for `title` attributes.
 * Usage: <Tip content="Tooltip text"><Button>Click</Button></Tip>
 */
export function Tip({ children, content, side = 'top', align, className, ...props }: TipProps) {
  if (!content) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={className} {...props}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
