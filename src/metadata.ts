import { lookupNumericIdLabel, lookupStringCodeLabel } from './label-lookup.js'

export const PLATFORM_LABELS = Object.freeze({
  'common-gen5': 'Crossplatform Current Gen',
  'common-gen4': 'Crossplatform Last Gen',
  nx: 'Switch',
} as const)

export type KnownPlatformId = keyof typeof PLATFORM_LABELS
export type PlatformLabel = (typeof PLATFORM_LABELS)[KnownPlatformId]

export function resolvePlatformLabel(
  platform: string | number | null | undefined,
): PlatformLabel | undefined {
  return lookupStringCodeLabel(PLATFORM_LABELS, platform)
}

export const MATCH_TYPE_LABELS = Object.freeze({
  friendlyMatch: 'Friendly Match',
  leagueMatch: 'League Match',
  playoffMatch: 'Playoff Match',
} as const)

export const MATCH_TYPE_RESPONSE_LABELS = Object.freeze({
  '1': 'League Match',
  '3': 'Playoff Match',
  '5': 'Friendly Match',
} as const)

export type KnownMatchTypeId = keyof typeof MATCH_TYPE_LABELS
export type KnownMatchTypeResponseId = keyof typeof MATCH_TYPE_RESPONSE_LABELS
export type MatchTypeLabel = (typeof MATCH_TYPE_LABELS)[KnownMatchTypeId]

export function resolveMatchTypeLabel(
  matchType: string | number | null | undefined,
): MatchTypeLabel | undefined {
  const fromRequestCode = lookupStringCodeLabel(MATCH_TYPE_LABELS, matchType)
  if (fromRequestCode !== undefined) {
    return fromRequestCode
  }

  return lookupNumericIdLabel(MATCH_TYPE_RESPONSE_LABELS, matchType)
}

export const POSITION_LABELS = Object.freeze({
  defender: 'Defender',
  forward: 'Forward',
  goalkeeper: 'Goalkeeper',
  midfielder: 'Midfielder',
} as const)

export type KnownPositionId = keyof typeof POSITION_LABELS
export type PositionLabel = (typeof POSITION_LABELS)[KnownPositionId]

export function resolvePositionLabel(
  position: string | number | null | undefined,
): PositionLabel | undefined {
  return lookupStringCodeLabel(POSITION_LABELS, position)
}

export const REPUTATION_LABELS = Object.freeze({
  '0': 'Hometown Heroes',
  '1': 'Emerging Stars',
  '2': 'Well Known',
  '3': 'World Renown',
} as const)

export type KnownReputationId = keyof typeof REPUTATION_LABELS
export type ReputationLabel = (typeof REPUTATION_LABELS)[KnownReputationId]

export function resolveReputationLabel(
  reputationId: string | number | null | undefined,
): ReputationLabel | undefined {
  return lookupNumericIdLabel(REPUTATION_LABELS, reputationId)
}

export const DIVISION_LABELS = Object.freeze({
  '1': 'Elite',
  '2': 'Division 1',
  '3': 'Division 2',
  '4': 'Division 3',
  '5': 'Division 4',
  '6': 'Division 5',
} as const)

export type KnownDivisionId = keyof typeof DIVISION_LABELS
export type DivisionLabel = (typeof DIVISION_LABELS)[KnownDivisionId]

export function resolveDivisionLabel(
  divisionId: string | number | null | undefined,
): DivisionLabel | undefined {
  return lookupNumericIdLabel(DIVISION_LABELS, divisionId)
}

export const PLAYOFF_RESULT_LABELS = Object.freeze({
  '1': 'Champion',
  '2': 'Runner-Up',
  '3': 'Competitive',
  '4': 'Mid-Table',
  '5': 'Also-ran',
  '6': 'Participant',
} as const)

export type KnownPlayoffResultId = keyof typeof PLAYOFF_RESULT_LABELS
export type PlayoffResultLabel =
  (typeof PLAYOFF_RESULT_LABELS)[KnownPlayoffResultId]

export function resolvePlayoffResultLabel(
  resultId: string | number | null | undefined,
): PlayoffResultLabel | undefined {
  return lookupNumericIdLabel(PLAYOFF_RESULT_LABELS, resultId)
}

export function resolveSeasonLabel(
  seasonName: string | null | undefined,
  seasonId?: string | number | null,
): string | undefined {
  const normalizedName = seasonName?.trim()
  const seasonCode = normalizedName?.match(/(?:^|_)SEASON_(\d+)$/i)?.[1]
  if (seasonCode !== undefined) {
    return `Season ${Number(seasonCode)}`
  }

  const seasonIdTag = Object.prototype.toString.call(seasonId)
  const normalizedId =
    seasonIdTag === '[object Number]'
      ? Number.isFinite(Number(seasonId))
        ? String(seasonId)
        : undefined
      : seasonIdTag === '[object String]'
        ? String(seasonId).trim() || undefined
        : undefined
  if (normalizedId !== undefined && /^\d+$/.test(normalizedId)) {
    return `Season ${Number(normalizedId)}`
  }

  return normalizedName || undefined
}
