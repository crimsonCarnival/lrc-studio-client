import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

/**
 * Lightweight hover-only text tooltip. Drop-in replacement for `title` attributes.
 * Usage: <Tip content="Tooltip text"><Button>Click</Button></Tip>
 */
export function Tip({ children, content, side = 'top', align, className, ...props }) {
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
