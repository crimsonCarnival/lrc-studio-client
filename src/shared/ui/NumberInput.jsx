export default function NumberInput({ value, onChange, onKeyDown, min, max, step = 1, placeholder, className, disabled, id }) {
  const handleIncrement = () => {
    if (disabled) return;
    const current = parseFloat(value) || 0;
    const next = current + step;
    if (max !== undefined && next > max) return;
    onChange({ target: { value: next.toFixed(String(step).split('.')[1]?.length || 0) } });
  };

  const handleDecrement = () => {
    if (disabled) return;
    const current = parseFloat(value) || 0;
    const next = current - step;
    if (min !== undefined && next < min) return;
    onChange({ target: { value: next.toFixed(String(step).split('.')[1]?.length || 0) } });
  };

  return (
    <div className={`relative flex items-center ${className} overflow-hidden bg-zinc-900 border border-zinc-700 rounded-lg group focus-within:border-primary/50 transition-all`}>
      <input
        id={id}
        type="number"
        value={value ?? ''}
        onChange={onChange}
        onKeyDown={onKeyDown}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-200 text-xs font-mono text-center appearance-none pr-5 py-1.5"
        style={{ MozAppearance: 'textfield' }}
      />
      
      {/* Custom Spin Buttons */}
      <div className="absolute right-0 inset-y-0 flex flex-col border-l border-zinc-700/50 w-5 bg-zinc-800/50 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && parseFloat(value) >= max)}
          className="flex-1 flex items-center justify-center hover:bg-zinc-700 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          tabIndex={-1}
        >
          <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <div className="h-px w-full bg-zinc-700/30" />
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || (min !== undefined && parseFloat(value) <= min)}
          className="flex-1 flex items-center justify-center hover:bg-zinc-700 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          tabIndex={-1}
        >
          <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
