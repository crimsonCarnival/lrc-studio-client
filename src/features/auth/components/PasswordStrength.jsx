const LEVELS = [
  { min: 0,  label: 'Very weak', color: 'bg-red-500' },
  { min: 1,  label: 'Weak',      color: 'bg-orange-500' },
  { min: 2,  label: 'Fair',      color: 'bg-yellow-500' },
  { min: 3,  label: 'Strong',    color: 'bg-lime-500' },
  { min: 4,  label: 'Very strong', color: 'bg-green-500' },
];

function score(password) {
  if (!password) return 0;
  let s = 0;
  if (password.length >= 8)  s++;
  if (password.length >= 12) s++;
  if (/[A-Z]/.test(password)) s++;
  if (/[0-9]/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  return Math.min(s, 4);
}

export default function PasswordStrength({ password }) {
  const s = score(password);
  const level = LEVELS[s];
  const filled = s + 1;

  if (!password) return null;

  return (
    <div className="mt-1 space-y-1">
      <div className="flex gap-1">
        {LEVELS.map((lvl, i) => (
          <div
            key={lvl.min}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < filled ? level.color : 'bg-zinc-700'}`}
          />
        ))}
      </div>
      <p className="text-xs text-zinc-400">{level.label}</p>
    </div>
  );
}
