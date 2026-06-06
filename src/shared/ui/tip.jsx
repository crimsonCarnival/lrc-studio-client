import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

/**
 * Lightweight hover-only text tooltip. Drop-in replacement for `title` attributes.
 * Usage: <Tip content="Tooltip text"><Button>Click</Button></Tip>
 * 
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {import('react').ReactNode} props.content
 * @param {"top" | "right" | "bottom" | "left"} [props.side="top"]
 * @param {"start" | "center" | "end"} [props.align]
 * @param {string} [props.className]
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
