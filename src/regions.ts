export const REGION_LABELS = Object.freeze({
  '4543827': 'East Coast US',
  '5723475': 'West Coast US',
  '5719381': 'Western Europe',
  '4539733': 'Eastern Europe',
  '5129557': 'Northern Europe',
  '5457237': 'Southern Europe',
  '4344147': 'British Isles',
  '5456205': 'South America',
  '4407629': 'Central America',
  '4281153': 'Asia',
  '4281683': 'Australia/NewZealand',
} as const)

export type KnownRegionId = keyof typeof REGION_LABELS
export type RegionLabel = (typeof REGION_LABELS)[KnownRegionId]

export function resolveRegionLabel(
  regionId: string | number | null | undefined,
): RegionLabel | undefined {
  if (typeof regionId === 'number') {
    if (!Number.isFinite(regionId)) {
      return undefined
    }
    return lookupRegionLabel(String(regionId))
  }

  if (typeof regionId === 'string') {
    return lookupRegionLabel(regionId.trim())
  }

  return undefined
}

function lookupRegionLabel(regionId: string): RegionLabel | undefined {
  if (!Object.hasOwn(REGION_LABELS, regionId)) {
    return undefined
  }
  return REGION_LABELS[regionId as KnownRegionId]
}
