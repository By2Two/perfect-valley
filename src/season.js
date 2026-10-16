const SEASON_BY_MONTH = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter'];
const MONTHS_PER_YEAR = 12;
const HEMISPHERE_SHIFT_MONTHS = 6;
const SOUTHERN_TIME_ZONES = new RegExp(
  [
    '^(Australia|Antarctica)/',
    '^America/(Sao_Paulo|Bahia|Fortaleza|Recife|Belem|Manaus|Cuiaba|Campo_Grande|Maceio|Araguaina|Porto_Velho|Boa_Vista|Rio_Branco|Noronha|Santarem|Eirunepe)$',
    '^America/(Argentina/|Buenos_Aires|Santiago|Montevideo|Asuncion|La_Paz|Lima)',
    '^Africa/(Johannesburg|Maseru|Mbabane|Windhoek|Harare|Lusaka|Maputo)$',
    '^Pacific/(Auckland|Fiji|Tahiti)$',
    '^Indian/(Mauritius|Reunion|Antananarivo)$',
  ].join('|'),
);

const currentTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';

export const isSouthernHemisphere = (timeZone = currentTimeZone()) => SOUTHERN_TIME_ZONES.test(timeZone);

export function seasonForDate(date = new Date(), timeZone = currentTimeZone()) {
  const shift = isSouthernHemisphere(timeZone) ? HEMISPHERE_SHIFT_MONTHS : 0;
  return SEASON_BY_MONTH[(date.getMonth() + shift) % MONTHS_PER_YEAR];
}

export const resolveSeason = (season) => (season === 'auto' ? seasonForDate() : season);
