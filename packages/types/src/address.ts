export const isoAlpha2States = [
  ['Alabama', 'AL'] as const,
  ['Alaska', 'AK'] as const,
  ['Arizona', 'AZ'] as const,
  ['Arkansas', 'AR'] as const,
  ['California', 'CA'] as const,
  ['Colorado', 'CO'] as const,
  ['Connecticut', 'CT'] as const,
  ['Delaware', 'DE'] as const,
  ['District of Columbia', 'DC'] as const,
  ['Florida', 'FL'] as const,
  ['Georgia', 'GA'] as const,
  ['Hawaii', 'HI'] as const,
  ['Idaho', 'ID'] as const,
  ['Illinois', 'IL'] as const,
  ['Indiana', 'IN'] as const,
  ['Iowa', 'IA'] as const,
  ['Kansas', 'KS'] as const,
  ['Kentucky', 'KY'] as const,
  ['Louisiana', 'LA'] as const,
  ['Maine', 'ME'] as const,
  ['Maryland', 'MD'] as const,
  ['Massachusetts', 'MA'] as const,
  ['Michigan', 'MI'] as const,
  ['Minnesota', 'MN'] as const,
  ['Mississippi', 'MS'] as const,
  ['Missouri', 'MO'] as const,
  ['Montana', 'MT'] as const,
  ['Nebraska', 'NE'] as const,
  ['Nevada', 'NV'] as const,
  ['New Hampshire', 'NH'] as const,
  ['New Jersey', 'NJ'] as const,
  ['New Mexico', 'NM'] as const,
  ['New York', 'NY'] as const,
  ['North Carolina', 'NC'] as const,
  ['North Dakota', 'ND'] as const,
  ['Ohio', 'OH'] as const,
  ['Oklahoma', 'OK'] as const,
  ['Oregon', 'OR'] as const,
  ['Pennsylvania', 'PA'] as const,
  ['Rhode Island', 'RI'] as const,
  ['South Carolina', 'SC'] as const,
  ['South Dakota', 'SD'] as const,
  ['Tennessee', 'TN'] as const,
  ['Texas', 'TX'] as const,
  ['Utah', 'UT'] as const,
  ['Vermont', 'VT'] as const,
  ['Virginia', 'VA'] as const,
  ['Washington', 'WA'] as const,
  ['West Virginia', 'WV'] as const,
  ['Wisconsin', 'WI'] as const,
  ['Wyoming', 'WY'] as const,
] as const;

export const isoAlpha2StateAbbreviations = isoAlpha2States.flatMap(([, name]) => name);

export type IsoAlpha2StateTypes = (typeof isoAlpha2StateAbbreviations)[0];

/**
 * Country codes https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3
 */
export type ISOAlpha3 = 'USA';
export type ISOAlpha2 = 'US';
