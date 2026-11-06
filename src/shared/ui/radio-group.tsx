import * as React from 'react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';

import { cn } from '@/shared/utils/utils';

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn('flex flex-wrap gap-4', className)} {...props} />;
}

/** Same outlined-box language as Checkbox, round, with a filled dot when selected. */
function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        'peer relative flex size-4 shrink-0 items-center justify-center rounded-full border-0 bg-transparent inset-ring-[1.5px] inset-ring-faint transition-[background-color,box-shadow] duration-[var(--duration-state)] outline-none after:absolute after:-inset-x-3 after:-inset-y-2 hover:inset-ring-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:inset-ring-primary',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-primary" />
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
