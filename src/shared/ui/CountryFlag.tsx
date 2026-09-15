import { Tip } from './tip';

export function CountryFlag({ countryCode }: { countryCode?: string | null }) {
  if (!countryCode) return null;
  
  let countryName = countryCode;
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
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
