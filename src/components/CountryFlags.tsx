'use client';

interface CountryFlagsProps {
  countries: string[];
}

export function CountryFlags({ countries }: CountryFlagsProps) {
  if (!countries || countries.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1">
      {countries.map((countryCode) => (
        <img
          key={countryCode}
          src={`https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`}
          alt={`${countryCode} flag`}
          className="border border-gray-200 dark:border-white/10 rounded-sm"
          title={countryCode.toUpperCase()}
        />
      ))}
    </div>
  );
}
