import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import zxcvbn from 'zxcvbn';

// score 0–4 → i18n key + bar colour
const LEVELS = [
  { key: 'veryWeak', color: 'bg-red-500' },
  { key: 'weak',     color: 'bg-orange-500' },
  { key: 'fair',     color: 'bg-yellow-500' },
  { key: 'strong',   color: 'bg-lime-500' },
  { key: 'veryStrong', color: 'bg-green-500' },
];

// Maps zxcvbn's fixed English warning strings → auth.passwordWarnings.<key>
const WARNING_KEY_MAP = {
  'Straight rows of keys are easy to guess':                              'keyboardRow',
  'Short keyboard patterns are easy to guess':                           'keyboardShort',
  'Repeats like "aaa" are easy to guess':                                'repeatSingle',
  'Repeats like "abcabc" are only slightly harder to guess than "abc"':  'repeatGroup',
  'Sequences like abc or 6543 are easy to guess':                        'sequence',
  'Recent years are easy to guess':                                      'recentYear',
  'Dates are often easy to guess':                                       'date',
  'This is a top-10 common password':                                    'commonTop10',
  'This is a top-100 common password':                                   'commonTop100',
  'This is a very common password':                                      'veryCommon',
  'This is similar to a commonly used password':                         'similarCommon',
  'A word by itself is easy to guess':                                   'wordOnly',
  'Names and surnames by themselves are easy to guess':                  'nameOrSurname',
  'Common names and surnames are easy to guess':                         'commonName',
};

export default function PasswordStrength({ password }) {
  const { t } = useTranslation();

  const result = useMemo(() => (password ? zxcvbn(password) : null), [password]);

  if (!result) return null;

  const score = result.score; // 0–4
  const level = LEVELS[score];
  const filled = score + 1;

  const rawWarning = result.feedback.warning;
  const warningKey = rawWarning ? WARNING_KEY_MAP[rawWarning] : null;
  const warning = warningKey
    ? t(`auth.passwordWarnings.${warningKey}`)
    : rawWarning; // unmapped warning — keep English as fallback

  return (
    <div className="mt-1 space-y-1">
      <div className="flex gap-1">
        {LEVELS.map((lvl, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < filled ? level.color : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-zinc-400">
          {t(`auth.passwordStrength.${level.key}`)}
        </p>
        {warning && (
          <p className="text-xs text-zinc-500 truncate">{warning}</p>
        )}
      </div>
    </div>
  );
}
