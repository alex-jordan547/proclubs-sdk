export const EA_CREST_ASSET_BASE_URL =
  'https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l'

export type ClubCrestInput = {
  readonly teamId?: string | number | null
  readonly customKit?: {
    readonly selectedKitType?: string | number | null
    readonly crestAssetId?: string | number | null
  } | null
}

export function resolveClubCrestUrl(
  club: ClubCrestInput | null | undefined,
): string | undefined {
  if (club === null || club === undefined) {
    return undefined
  }

  let assetId: string | undefined
  if (isCustomCrestSelected(club.customKit?.selectedKitType)) {
    assetId = normalizeAssetId(club.customKit?.crestAssetId)
  }
  if (assetId === undefined) {
    assetId = normalizeAssetId(club.teamId)
  }
  if (assetId === undefined) {
    return undefined
  }

  return `${EA_CREST_ASSET_BASE_URL}${assetId}.png`
}

function isCustomCrestSelected(
  selectedKitType: string | number | null | undefined,
): boolean {
  if (selectedKitType === null || selectedKitType === undefined) {
    return false
  }

  const tag = Object.prototype.toString.call(selectedKitType)
  if (tag === '[object Number]') {
    return Number(selectedKitType) === 1
  }
  if (tag === '[object String]') {
    return String(selectedKitType).trim() === '1'
  }

  return false
}

const ASSET_ID_PATTERN = /^\d+$/

function normalizeAssetId(
  value: string | number | null | undefined,
): string | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  const tag = Object.prototype.toString.call(value)
  if (tag === '[object Number]') {
    const numericId = Number(value)
    if (!Number.isFinite(numericId)) {
      return undefined
    }
    return isAssetId(String(numericId)) ? String(numericId) : undefined
  }

  if (tag === '[object String]') {
    const trimmed = String(value).trim()
    return isAssetId(trimmed) ? trimmed : undefined
  }

  return undefined
}

function isAssetId(value: string): boolean {
  return ASSET_ID_PATTERN.test(value)
}
