import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover.tsx';

export const TapPopover = ({ content, children, side = 'top', align = 'center' }) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="cursor-pointer">{children}</div>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className="max-w-xs text-sm">
        {content}
      </PopoverContent>
    </Popover>
  );
};
