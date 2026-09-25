import { Tip } from './tip';
import { Icon } from './Icon';
import { useTranslation } from 'react-i18next';

export function CountryFlag({ countryCode }: { countryCode?: string | null }) {
  const { t, i18n } = useTranslation();
  if (!countryCode) return null;
  
  if (countryCode === 'LOCAL') {
    return (
      <Tip content={t('common.localNetwork')}>
        <div className="flex items-center justify-center bg-zinc-800/50 rounded shadow-[0_0_0_1px_rgba(255,255,255,0.1)] cursor-help" style={{ height: '11px', width: '16px' }}>
          <Icon name="dns" size={10} className="text-zinc-400" />
        </div>
      </Tip>
    );
  }

  let countryName = countryCode;
  try {
    const displayNames = new Intl.DisplayNames([i18n.language || 'en', 'en'], { type: 'region' });
    countryName = displayNames.of(countryCode) ?? countryCode;
  } catch {
    // Ignore invalid codes
  }

  return (
    <Tip content={countryName}>
      <img
        src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`}
        srcSet={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png 2x`}
        width="16"
        alt={countryCode}
        className="inline-block shadow-[0_0_0_1px_rgba(255,255,255,0.1)] cursor-help object-contain"
        style={{ height: '11px', width: '16px' }}
      />
    </Tip>
  );
}
