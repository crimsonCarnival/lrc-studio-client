interface OnlineDotProps {
  className?: string;
}

export function OnlineDot({ className = '' }: OnlineDotProps) {
  return (
    <span
      className={`absolute bottom-0 right-0 size-2.5 rounded-full bg-green-500 border-2 border-zinc-900 ${className}`}
      aria-label="Online"
    />
  );
}
