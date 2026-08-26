import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  DIVISION_LABELS,
  MATCH_TYPE_LABELS,
  MATCH_TYPE_RESPONSE_LABELS,
  PLATFORM_LABELS,
  PLAYOFF_RESULT_LABELS,
  POSITION_LABELS,
  REPUTATION_LABELS,
  resolveDivisionLabel,
  resolveMatchTypeLabel,
  resolvePlatformLabel,
  resolvePlayoffResultLabel,
  resolvePositionLabel,
  resolveReputationLabel,
  resolveSeasonLabel,
  type DivisionLabel,
  type KnownDivisionId,
  type KnownMatchTypeId,
  type KnownMatchTypeResponseId,
  type KnownPlatformId,
  type KnownPlayoffResultId,
  type KnownPositionId,
  type KnownReputationId,
  type MatchTypeLabel,
  type PlatformLabel,
  type PlayoffResultLabel,
  type PositionLabel,
  type ReputationLabel,
} from '../src/metadata.js'
import { EA_CREST_ASSET_BASE_URL, resolveClubCrestUrl } from '../src/crests.js'
import { PLATFORMS, MATCH_TYPES } from '../src/constants.js'

const EXPECTED_PLATFORM_LABELS = {
  'common-gen5': 'Crossplatform Current Gen',
  'common-gen4': 'Crossplatform Last Gen',
  nx: 'Switch',
} as const satisfies Record<KnownPlatformId, PlatformLabel>

const EXPECTED_MATCH_TYPE_LABELS = {
  friendlyMatch: 'Friendly Match',
  leagueMatch: 'League Match',
  playoffMatch: 'Playoff Match',
} as const satisfies Record<KnownMatchTypeId, MatchTypeLabel>

const EXPECTED_MATCH_TYPE_RESPONSE_LABELS = {
  '1': 'League Match',
  '3': 'Playoff Match',
  '5': 'Friendly Match',
} as const satisfies Record<KnownMatchTypeResponseId, MatchTypeLabel>

const EXPECTED_POSITION_LABELS = {
  defender: 'Defender',
  forward: 'Forward',
  goalkeeper: 'Goalkeeper',
  midfielder: 'Midfielder',
} as const satisfies Record<KnownPositionId, PositionLabel>

const EXPECTED_REPUTATION_LABELS = {
  '0': 'Hometown Heroes',
  '1': 'Emerging Stars',
  '2': 'Well Known',
  '3': 'World Renown',
} as const satisfies Record<KnownReputationId, ReputationLabel>

const EXPECTED_DIVISION_LABELS = {
  '1': 'Elite',
  '2': 'Division 1',
  '3': 'Division 2',
  '4': 'Division 3',
  '5': 'Division 4',
  '6': 'Division 5',
} as const satisfies Record<KnownDivisionId, DivisionLabel>

const EXPECTED_PLAYOFF_RESULT_LABELS = {
  '1': 'Champion',
  '2': 'Runner-Up',
  '3': 'Competitive',
  '4': 'Mid-Table',
  '5': 'Also-ran',
  '6': 'Participant',
} as const satisfies Record<KnownPlayoffResultId, PlayoffResultLabel>

const ALL_STAR_237_CLUB = {
  teamId: 112809,
  customKit: {
    selectedKitType: '1',
    crestAssetId: '99140109',
  },
} as const

function expectMappingContract<const T extends Record<string, string>>(
  labels: T,
  resolve: (id: string | number | null | undefined) => string | undefined,
  expected: Record<keyof T, string>,
) {
  expect(Object.isFrozen(labels)).toBe(true)

  for (const [id, label] of Object.entries(expected)) {
    expect(resolve(id)).toBe(label)
    expect(resolve(Number(id))).toBe(label)
    expect(resolve(`  ${id}  `)).toBe(label)
  }

  expect(resolve(null)).toBeUndefined()
  expect(resolve(undefined)).toBeUndefined()
  expect(resolve('unknown-id')).toBeUndefined()
  expect(() => resolve('unknown-id')).not.toThrow()
}

describe('PLATFORM_LABELS and resolvePlatformLabel', () => {
  it('exposes the known EA platform labels as a public readonly mapping', () => {
    expect(PLATFORM_LABELS).toEqual(EXPECTED_PLATFORM_LABELS)
    expect(Object.keys(PLATFORM_LABELS)).toHaveLength(3)
    expect(PLATFORMS).toEqual(Object.keys(PLATFORM_LABELS))
  })

  it('resolves every known platform code without throwing', () => {
    for (const [platform, label] of Object.entries(EXPECTED_PLATFORM_LABELS)) {
      expect(resolvePlatformLabel(platform)).toBe(label)
      expect(resolvePlatformLabel(`  ${platform}  `)).toBe(label)
    }

    expect(resolvePlatformLabel(null)).toBeUndefined()
    expect(resolvePlatformLabel(undefined)).toBeUndefined()
    expect(resolvePlatformLabel('unknown-platform')).toBeUndefined()
    expect(resolvePlatformLabel(1)).toBeUndefined()
    expect(() => resolvePlatformLabel('unknown-platform')).not.toThrow()
  })
})

describe('MATCH_TYPE_LABELS and resolveMatchTypeLabel', () => {
  it('exposes the known EA match type labels as a public readonly mapping', () => {
    expect(MATCH_TYPE_LABELS).toEqual(EXPECTED_MATCH_TYPE_LABELS)
    expect(Object.keys(MATCH_TYPE_LABELS)).toHaveLength(3)
    expect(MATCH_TYPES).toEqual(Object.keys(MATCH_TYPE_LABELS))
  })

  it('exposes the numeric matchType ids observed on matches.list responses', () => {
    expect(MATCH_TYPE_RESPONSE_LABELS).toEqual(
      EXPECTED_MATCH_TYPE_RESPONSE_LABELS,
    )
    expect(Object.keys(MATCH_TYPE_RESPONSE_LABELS)).toHaveLength(3)
    expect(Object.isFrozen(MATCH_TYPE_RESPONSE_LABELS)).toBe(true)
  })

  it('resolves request codes and response ids to the same labels', () => {
    for (const [matchType, label] of Object.entries(
      EXPECTED_MATCH_TYPE_LABELS,
    )) {
      expect(resolveMatchTypeLabel(matchType)).toBe(label)
      expect(resolveMatchTypeLabel(`  ${matchType}  `)).toBe(label)
    }

    expectMappingContract(
      MATCH_TYPE_RESPONSE_LABELS,
      resolveMatchTypeLabel,
      EXPECTED_MATCH_TYPE_RESPONSE_LABELS,
    )
    expect(resolveMatchTypeLabel('1')).toBe('League Match')
  })

  it('returns undefined for unknown match types without throwing', () => {
    expect(resolveMatchTypeLabel(null)).toBeUndefined()
    expect(resolveMatchTypeLabel('unknown-match')).toBeUndefined()
    expect(resolveMatchTypeLabel('2')).toBeUndefined()
    expect(resolveMatchTypeLabel(2)).toBeUndefined()
    expect(() => resolveMatchTypeLabel('unknown-match')).not.toThrow()
  })
})

describe('POSITION_LABELS and resolvePositionLabel', () => {
  it('exposes the known EA position labels as a public readonly mapping', () => {
    expect(POSITION_LABELS).toEqual(EXPECTED_POSITION_LABELS)
    expect(Object.keys(POSITION_LABELS)).toHaveLength(4)
  })

  it('resolves every known position without throwing', () => {
    for (const [position, label] of Object.entries(EXPECTED_POSITION_LABELS)) {
      expect(resolvePositionLabel(position)).toBe(label)
      expect(resolvePositionLabel(`  ${position}  `)).toBe(label)
    }

    expect(resolvePositionLabel(null)).toBeUndefined()
    expect(resolvePositionLabel('striker')).toBeUndefined()
    expect(resolvePositionLabel(1)).toBeUndefined()
  })
})

describe('REPUTATION_LABELS and resolveReputationLabel', () => {
  it('exposes the known EA reputation labels as a public readonly mapping', () => {
    expect(REPUTATION_LABELS).toEqual(EXPECTED_REPUTATION_LABELS)
    expect(Object.keys(REPUTATION_LABELS)).toHaveLength(4)
  })

  it('resolves every known reputation id without throwing', () => {
    expectMappingContract(
      REPUTATION_LABELS,
      resolveReputationLabel,
      EXPECTED_REPUTATION_LABELS,
    )
  })

  it('keeps unknown reputationtier values accessible without a label', () => {
    const reputationtier = '6'
    expect(resolveReputationLabel(reputationtier)).toBeUndefined()
    expect(reputationtier).toBe('6')
    expect(() => resolveReputationLabel(reputationtier)).not.toThrow()
  })
})

describe('DIVISION_LABELS and resolveDivisionLabel', () => {
  it('exposes the six current-division labels as a public readonly mapping', () => {
    expect(DIVISION_LABELS).toEqual(EXPECTED_DIVISION_LABELS)
    expect(Object.keys(DIVISION_LABELS)).toHaveLength(6)
  })

  it('resolves every known division id without throwing', () => {
    expectMappingContract(
      DIVISION_LABELS,
      resolveDivisionLabel,
      EXPECTED_DIVISION_LABELS,
    )
  })
})

describe('PLAYOFF_RESULT_LABELS and resolvePlayoffResultLabel', () => {
  it('exposes the known EA playoff result labels as a public readonly mapping', () => {
    expect(PLAYOFF_RESULT_LABELS).toEqual(EXPECTED_PLAYOFF_RESULT_LABELS)
    expect(Object.keys(PLAYOFF_RESULT_LABELS)).toHaveLength(6)
  })

  it('resolves every known playoff result id without throwing', () => {
    expectMappingContract(
      PLAYOFF_RESULT_LABELS,
      resolvePlayoffResultLabel,
      EXPECTED_PLAYOFF_RESULT_LABELS,
    )
  })
})

describe('resolveSeasonLabel', () => {
  it('turns EA season keys into readable labels', () => {
    expect(resolveSeasonLabel('CLUBS_LEAGUE_SEASON_07', '7')).toBe('Season 7')
    expect(resolveSeasonLabel('CLUBS_LEAGUE_SEASON_07')).toBe('Season 7')
  })

  it('falls back to the raw season ID for unknown keys', () => {
    expect(resolveSeasonLabel('EA_NEW_SEASON_FORMAT', '9')).toBe('Season 9')
    expect(resolveSeasonLabel(undefined, 10)).toBe('Season 10')
  })

  it('returns a non-empty unknown name when no numeric ID exists', () => {
    expect(resolveSeasonLabel('EA_NEW_SEASON_FORMAT')).toBe(
      'EA_NEW_SEASON_FORMAT',
    )
    expect(resolveSeasonLabel('  ', null)).toBeUndefined()
  })
})

describe('metadata prototype pollution guards', () => {
  it('ignores inherited Object.prototype keys for numeric resolvers', () => {
    expect(resolveReputationLabel('toString')).toBeUndefined()
    expect(resolveDivisionLabel('constructor')).toBeUndefined()
    expect(resolvePlayoffResultLabel('__proto__')).toBeUndefined()
    expect(resolveMatchTypeLabel('hasOwnProperty')).toBeUndefined()
  })
})

describe('metadata public types', () => {
  it('exports stable public types derived from the mappings', () => {
    expectTypeOf(
      PLATFORM_LABELS['common-gen5'],
    ).toEqualTypeOf<'Crossplatform Current Gen'>()
    expectTypeOf<KnownPlatformId>().toEqualTypeOf<
      keyof typeof PLATFORM_LABELS
    >()
    expectTypeOf<ReputationLabel>().toEqualTypeOf<
      (typeof REPUTATION_LABELS)[KnownReputationId]
    >()
  })
})

describe('resolveClubCrestUrl', () => {
  it('uses crestAssetId when a custom crest is selected', () => {
    expect(resolveClubCrestUrl(ALL_STAR_237_CLUB)).toBe(
      `${EA_CREST_ASSET_BASE_URL}99140109.png`,
    )
  })

  it('falls back to teamId when custom crest data is unavailable', () => {
    expect(
      resolveClubCrestUrl({
        teamId: 112809,
        customKit: {
          selectedKitType: '0',
          crestAssetId: '99140109',
        },
      }),
    ).toBe(`${EA_CREST_ASSET_BASE_URL}112809.png`)

    expect(
      resolveClubCrestUrl({
        teamId: 112809,
        customKit: {
          selectedKitType: '1',
        },
      }),
    ).toBe(`${EA_CREST_ASSET_BASE_URL}112809.png`)
  })

  it('returns undefined when no usable crest identifier exists', () => {
    expect(resolveClubCrestUrl({})).toBeUndefined()
    expect(resolveClubCrestUrl(null)).toBeUndefined()
    expect(resolveClubCrestUrl(undefined)).toBeUndefined()
    expect(
      resolveClubCrestUrl({
        customKit: {
          selectedKitType: '1',
          crestAssetId: '   ',
        },
      }),
    ).toBeUndefined()
  })

  it('accepts numeric ids and selectedKitType values observed from EA', () => {
    expect(
      resolveClubCrestUrl({
        teamId: '112809',
        customKit: {
          selectedKitType: 1,
          crestAssetId: 99140109,
        },
      }),
    ).toBe(`${EA_CREST_ASSET_BASE_URL}99140109.png`)
  })

  it('rejects asset ids that would alter the crest URL path', () => {
    expect(
      resolveClubCrestUrl({
        teamId: '../other',
        customKit: {
          selectedKitType: '1',
          crestAssetId: '99140109?x',
        },
      }),
    ).toBeUndefined()
    expect(
      resolveClubCrestUrl({
        teamId: '112809#fragment',
      }),
    ).toBeUndefined()
  })

  it('does not mutate the input club object', () => {
    const club = {
      teamId: 112809,
      customKit: {
        selectedKitType: '1',
        crestAssetId: '99140109',
      },
    }

    const url = resolveClubCrestUrl(club)

    expect(url).toBe(`${EA_CREST_ASSET_BASE_URL}99140109.png`)
    expect(club).toEqual({
      teamId: 112809,
      customKit: {
        selectedKitType: '1',
        crestAssetId: '99140109',
      },
    })
  })
})
