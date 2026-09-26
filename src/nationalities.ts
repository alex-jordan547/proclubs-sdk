// Captured 2026-09-26 from https://www.ea.com/games/ea-sports-fc/ratings
// (props.pageProps.ratingsFilters.nationality in the page __NEXT_DATA__).
// Labels are EA's. isoCode is ISO 3166-1 alpha-2 when one exists, or an
// ISO 3166-2 subdivision for England, Scotland, Wales, and Northern Ireland.
// Chinese Taipei and Kosovo have no isoCode. See docs/reference/nationalities.mdx.
const NATIONALITY_ENTRIES = {
  '1': { label: 'Albania', isoCode: 'AL' },
  '2': { label: 'Andorra', isoCode: 'AD' },
  '3': { label: 'Armenia', isoCode: 'AM' },
  '4': { label: 'Austria', isoCode: 'AT' },
  '5': { label: 'Azerbaijan', isoCode: 'AZ' },
  '6': { label: 'Belarus', isoCode: 'BY' },
  '7': { label: 'Belgium', isoCode: 'BE' },
  '8': { label: 'Bosnia and Herzegovina', isoCode: 'BA' },
  '9': { label: 'Bulgaria', isoCode: 'BG' },
  '10': { label: 'Croatia', isoCode: 'HR' },
  '11': { label: 'Cyprus', isoCode: 'CY' },
  '12': { label: 'Czech Republic', isoCode: 'CZ' },
  '13': { label: 'Denmark', isoCode: 'DK' },
  '14': { label: 'England', isoCode: 'GB-ENG' },
  '15': { label: 'Montenegro', isoCode: 'ME' },
  '16': { label: 'Faroe Islands', isoCode: 'FO' },
  '17': { label: 'Finland', isoCode: 'FI' },
  '18': { label: 'France', isoCode: 'FR' },
  '19': { label: 'North Macedonia', isoCode: 'MK' },
  '20': { label: 'Georgia', isoCode: 'GE' },
  '21': { label: 'Germany', isoCode: 'DE' },
  '22': { label: 'Greece', isoCode: 'GR' },
  '23': { label: 'Hungary', isoCode: 'HU' },
  '24': { label: 'Iceland', isoCode: 'IS' },
  '25': { label: 'Republic of Ireland', isoCode: 'IE' },
  '26': { label: 'Israel', isoCode: 'IL' },
  '27': { label: 'Italy', isoCode: 'IT' },
  '28': { label: 'Latvia', isoCode: 'LV' },
  '29': { label: 'Liechtenstein', isoCode: 'LI' },
  '30': { label: 'Lithuania', isoCode: 'LT' },
  '31': { label: 'Luxembourg', isoCode: 'LU' },
  '32': { label: 'Malta', isoCode: 'MT' },
  '33': { label: 'Moldova', isoCode: 'MD' },
  '34': { label: 'Holland', isoCode: 'NL' },
  '35': { label: 'Northern Ireland', isoCode: 'GB-NIR' },
  '36': { label: 'Norway', isoCode: 'NO' },
  '37': { label: 'Poland', isoCode: 'PL' },
  '38': { label: 'Portugal', isoCode: 'PT' },
  '39': { label: 'Romania', isoCode: 'RO' },
  '40': { label: 'Russia', isoCode: 'RU' },
  '42': { label: 'Scotland', isoCode: 'GB-SCT' },
  '43': { label: 'Slovakia', isoCode: 'SK' },
  '44': { label: 'Slovenia', isoCode: 'SI' },
  '45': { label: 'Spain', isoCode: 'ES' },
  '46': { label: 'Sweden', isoCode: 'SE' },
  '47': { label: 'Switzerland', isoCode: 'CH' },
  '48': { label: 'Turkey', isoCode: 'TR' },
  '49': { label: 'Ukraine', isoCode: 'UA' },
  '50': { label: 'Wales', isoCode: 'GB-WLS' },
  '51': { label: 'Serbia', isoCode: 'RS' },
  '52': { label: 'Argentina', isoCode: 'AR' },
  '53': { label: 'Bolivia', isoCode: 'BO' },
  '54': { label: 'Brazil', isoCode: 'BR' },
  '55': { label: 'Chile', isoCode: 'CL' },
  '56': { label: 'Colombia', isoCode: 'CO' },
  '57': { label: 'Ecuador', isoCode: 'EC' },
  '58': { label: 'Paraguay', isoCode: 'PY' },
  '59': { label: 'Peru', isoCode: 'PE' },
  '60': { label: 'Uruguay', isoCode: 'UY' },
  '61': { label: 'Venezuela', isoCode: 'VE' },
  '63': { label: 'Antigua and Barbuda', isoCode: 'AG' },
  '66': { label: 'Barbados', isoCode: 'BB' },
  '68': { label: 'Bermuda', isoCode: 'BM' },
  '70': { label: 'Canada', isoCode: 'CA' },
  '72': { label: 'Costa Rica', isoCode: 'CR' },
  '73': { label: 'Cuba', isoCode: 'CU' },
  '76': { label: 'El Salvador', isoCode: 'SV' },
  '77': { label: 'Grenada', isoCode: 'GD' },
  '78': { label: 'Guatemala', isoCode: 'GT' },
  '79': { label: 'Guyana', isoCode: 'GY' },
  '80': { label: 'Haiti', isoCode: 'HT' },
  '81': { label: 'Honduras', isoCode: 'HN' },
  '82': { label: 'Jamaica', isoCode: 'JM' },
  '83': { label: 'Mexico', isoCode: 'MX' },
  '84': { label: 'Montserrat', isoCode: 'MS' },
  '85': { label: 'Curaçao', isoCode: 'CW' },
  '87': { label: 'Panama', isoCode: 'PA' },
  '88': { label: 'Puerto Rico', isoCode: 'PR' },
  '89': { label: 'St. Kitts and Nevis', isoCode: 'KN' },
  '90': { label: 'St. Lucia', isoCode: 'LC' },
  '92': { label: 'Suriname', isoCode: 'SR' },
  '93': { label: 'Trinidad and Tobago', isoCode: 'TT' },
  '95': { label: 'United States', isoCode: 'US' },
  '97': { label: 'Algeria', isoCode: 'DZ' },
  '98': { label: 'Angola', isoCode: 'AO' },
  '99': { label: 'Benin', isoCode: 'BJ' },
  '101': { label: 'Burkina Faso', isoCode: 'BF' },
  '102': { label: 'Burundi', isoCode: 'BI' },
  '103': { label: 'Cameroon', isoCode: 'CM' },
  '104': { label: 'Cape Verde Islands', isoCode: 'CV' },
  '105': { label: 'Central African Republic', isoCode: 'CF' },
  '106': { label: 'Chad', isoCode: 'TD' },
  '107': { label: 'Congo', isoCode: 'CG' },
  '108': { label: "Côte d'Ivoire", isoCode: 'CI' },
  '110': { label: 'Congo DR', isoCode: 'CD' },
  '111': { label: 'Egypt', isoCode: 'EG' },
  '112': { label: 'Equatorial Guinea', isoCode: 'GQ' },
  '113': { label: 'Eritrea', isoCode: 'ER' },
  '115': { label: 'Gabon', isoCode: 'GA' },
  '116': { label: 'Gambia', isoCode: 'GM' },
  '117': { label: 'Ghana', isoCode: 'GH' },
  '118': { label: 'Guinea', isoCode: 'GN' },
  '119': { label: 'Guinea-Bissau', isoCode: 'GW' },
  '120': { label: 'Kenya', isoCode: 'KE' },
  '122': { label: 'Liberia', isoCode: 'LR' },
  '123': { label: 'Libya', isoCode: 'LY' },
  '124': { label: 'Madagascar', isoCode: 'MG' },
  '125': { label: 'Malawi', isoCode: 'MW' },
  '126': { label: 'Mali', isoCode: 'ML' },
  '127': { label: 'Mauritania', isoCode: 'MR' },
  '128': { label: 'Mauritius', isoCode: 'MU' },
  '129': { label: 'Morocco', isoCode: 'MA' },
  '130': { label: 'Mozambique', isoCode: 'MZ' },
  '131': { label: 'Namibia', isoCode: 'NA' },
  '132': { label: 'Niger', isoCode: 'NE' },
  '133': { label: 'Nigeria', isoCode: 'NG' },
  '134': { label: 'Rwanda', isoCode: 'RW' },
  '135': { label: 'São Tomé e Príncipe', isoCode: 'ST' },
  '136': { label: 'Senegal', isoCode: 'SN' },
  '138': { label: 'Sierra Leone', isoCode: 'SL' },
  '139': { label: 'Somalia', isoCode: 'SO' },
  '140': { label: 'South Africa', isoCode: 'ZA' },
  '143': { label: 'Tanzania', isoCode: 'TZ' },
  '144': { label: 'Togo', isoCode: 'TG' },
  '145': { label: 'Tunisia', isoCode: 'TN' },
  '146': { label: 'Uganda', isoCode: 'UG' },
  '147': { label: 'Zambia', isoCode: 'ZM' },
  '148': { label: 'Zimbabwe', isoCode: 'ZW' },
  '149': { label: 'Afghanistan', isoCode: 'AF' },
  '151': { label: 'Bangladesh', isoCode: 'BD' },
  '155': { label: 'China PR', isoCode: 'CN' },
  '158': { label: 'Hong Kong', isoCode: 'HK' },
  '159': { label: 'India', isoCode: 'IN' },
  '160': { label: 'Indonesia', isoCode: 'ID' },
  '161': { label: 'Iran', isoCode: 'IR' },
  '162': { label: 'Iraq', isoCode: 'IQ' },
  '163': { label: 'Japan', isoCode: 'JP' },
  '164': { label: 'Jordan', isoCode: 'JO' },
  '165': { label: 'Kazakhstan', isoCode: 'KZ' },
  '166': { label: 'Korea DPR', isoCode: 'KP' },
  '167': { label: 'Korea Republic', isoCode: 'KR' },
  '171': { label: 'Lebanon', isoCode: 'LB' },
  '178': { label: 'Oman', isoCode: 'OM' },
  '179': { label: 'Pakistan', isoCode: 'PK' },
  '180': { label: 'Palestine', isoCode: 'PS' },
  '181': { label: 'Philippines', isoCode: 'PH' },
  '182': { label: 'Qatar', isoCode: 'QA' },
  '183': { label: 'Saudi Arabia', isoCode: 'SA' },
  '185': { label: 'Sri Lanka', isoCode: 'LK' },
  '186': { label: 'Syria', isoCode: 'SY' },
  '188': { label: 'Thailand', isoCode: 'TH' },
  '190': { label: 'United Arab Emirates', isoCode: 'AE' },
  '191': { label: 'Uzbekistan', isoCode: 'UZ' },
  '193': { label: 'Yemen', isoCode: 'YE' },
  '195': { label: 'Australia', isoCode: 'AU' },
  '198': { label: 'New Zealand', isoCode: 'NZ' },
  '204': { label: 'Vanuatu', isoCode: 'VU' },
  '205': { label: 'Gibraltar', isoCode: 'GI' },
  '207': { label: 'Dominican Republic', isoCode: 'DO' },
  '208': { label: 'Estonia', isoCode: 'EE' },
  '213': { label: 'Chinese Taipei' },
  '214': { label: 'Comoros', isoCode: 'KM' },
  '215': { label: 'New Caledonia', isoCode: 'NC' },
  '219': { label: 'Kosovo' },
} as const

for (const entry of Object.values(NATIONALITY_ENTRIES)) {
  Object.freeze(entry)
}

export const NATIONALITY_LABELS = Object.freeze(NATIONALITY_ENTRIES)

export type KnownNationalityId = keyof typeof NATIONALITY_LABELS
type NationalityRecord = (typeof NATIONALITY_LABELS)[KnownNationalityId]
export type NationalityLabel = NationalityRecord['label']
export type NationalityIsoCode = Extract<
  NationalityRecord,
  { readonly isoCode: string }
>['isoCode']

export type Nationality = {
  readonly id: KnownNationalityId
  readonly label: NationalityLabel
  readonly isoCode?: NationalityIsoCode
}

export function resolveNationality(
  proNationality: string | number | null | undefined,
): Nationality | undefined {
  if (proNationality === null || proNationality === undefined) {
    return undefined
  }

  const tag = Object.prototype.toString.call(proNationality)
  if (tag === '[object Number]') {
    const numericId = Number(proNationality)
    if (!Number.isFinite(numericId)) {
      return undefined
    }
    return lookupNationality(String(numericId))
  }

  if (tag === '[object String]') {
    return lookupNationality(String(proNationality).trim())
  }

  return undefined
}

function lookupNationality(id: string): Nationality | undefined {
  if (!Object.hasOwn(NATIONALITY_LABELS, id)) {
    return undefined
  }
  // SAFETY: Object.hasOwn confirmed id is an own key of NATIONALITY_LABELS.
  const knownId = id as KnownNationalityId
  const entry = NATIONALITY_LABELS[knownId]
  if ('isoCode' in entry) {
    return { id: knownId, label: entry.label, isoCode: entry.isoCode }
  }
  return { id: knownId, label: entry.label }
}
