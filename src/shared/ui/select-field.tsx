import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { cn } from '@/shared/utils/utils';

export type SelectFieldOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectFieldOption[];
  /** Accessible name. Required: a trigger has no <label> association of its own. */
  'aria-label': string;
  id?: string;
  /** Shown when `value` matches no option. */
  placeholder?: string;
  /** `ghost` is the borderless toolbar look used by sort menus. */
  variant?: 'field' | 'ghost';
  size?: 'default' | 'sm';
  disabled?: boolean;
  className?: string;
  /** Applied to the popup, e.g. to widen it past the trigger. */
  contentClassName?: string;
};

// Radix rejects `value=""` on an item (it is how Select represents "nothing chosen"), but
// "All roles" style filters use '' as a real value. Swap it for a sentinel at the boundary so
// callers keep their own '' semantics.
const EMPTY = '__empty__';
const toRadix = (v: string) => (v === '' ? EMPTY : v);
const fromRadix = (v: string) => (v === EMPTY ? '' : v);

/**
 * Styled replacement for a native <select>: a Radix listbox with the app's field look,
 * keyboard typeahead and a popup that follows the theme. Takes an options array instead
 * of <option> children so the label and value stay in one place.
 */
export function SelectField({
  value,
  onValueChange,
  options,
  placeholder,
  variant = 'field',
  size = 'default',
  disabled,
  className,
  contentClassName,
  id,
  'aria-label': ariaLabel,
}: SelectFieldProps) {
  return (
    <Select value={toRadix(value)} onValueChange={(v) => onValueChange(fromRadix(v))} disabled={disabled}>
      <SelectTrigger
        id={id}
        size={size}
        aria-label={ariaLabel}
        className={cn(
          variant === 'ghost' && 'bg-transparent inset-ring-0 text-xs text-subtle hover:bg-raised hover:text-foreground hover:inset-ring-0 data-[state=open]:bg-raised data-[state=open]:inset-ring-0 focus-visible:inset-ring-2',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className={contentClassName}>
        {options.map((o) => (
          <SelectItem key={o.value} value={toRadix(o.value)} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
