import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
  type KnownPlatformId,
  type KnownPlayoffResultId,
  type KnownPositionId,
  type KnownReputationId,
  type MatchTypeLabel,
  type PlatformLabel,
  type PlayoffResultLabel,
  type PositionLabel,
  type ReputationLabel,
} from 'proclubs-sdk/metadata'
import {
  NATIONALITY_LABELS,
  resolveNationality,
  type KnownNationalityId,
  type Nationality,
  type NationalityIsoCode,
  type NationalityLabel,
} from 'proclubs-sdk/nationalities'
import {
  REGION_LABELS,
  resolveRegionLabel,
  type KnownRegionId,
  type RegionLabel,
} from 'proclubs-sdk/regions'

function getTransitiveImports(
  filePath: string,
  visited = new Set<string>(),
): string[] {
  if (visited.has(filePath)) {
    return []
  }
  visited.add(filePath)
  const code = readFileSync(filePath, 'utf8')
  const importMatches = [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1] ?? '',
  )
  const results = [...importMatches]
  for (const dep of importMatches) {
    if (dep.startsWith('.')) {
      const depPath = resolve(filePath, '..', dep)
      results.push(...getTransitiveImports(depPath, visited))
    }
  }
  return results
}

describe('Subpath exports', () => {
  it('exposes nationalities without client or native dependencies', () => {
    expect(NATIONALITY_LABELS['14'].label).toBe('England')
    expect(resolveNationality('14')).toEqual({
      id: '14',
      label: 'England',
      isoCode: 'GB-ENG',
    })
    expectTypeOf(resolveNationality).toBeFunction()
    expectTypeOf(NATIONALITY_LABELS['14'].label).toEqualTypeOf<'England'>()
    expectTypeOf<KnownNationalityId>().toEqualTypeOf<
      keyof typeof NATIONALITY_LABELS
    >()
    expectTypeOf<NationalityLabel>().toEqualTypeOf<
      (typeof NATIONALITY_LABELS)[KnownNationalityId]['label']
    >()
    expectTypeOf<NationalityIsoCode>().toEqualTypeOf<
      Extract<
        (typeof NATIONALITY_LABELS)[KnownNationalityId],
        { readonly isoCode: string }
      >['isoCode']
    >()
    expectTypeOf<Nationality>().toEqualTypeOf<{
      readonly id: KnownNationalityId
      readonly label: NationalityLabel
      readonly isoCode?: NationalityIsoCode
    }>()

    const nationalitiesPath = resolve(process.cwd(), 'dist/nationalities.js')
    const deps = getTransitiveImports(nationalitiesPath)
    expect(deps).not.toContain('./client.js')
    expect(deps).not.toContain('impit')
    expect(deps).toEqual([])
  })

  it('exposes regions without client or native dependencies', () => {
    expect(REGION_LABELS['5457237']).toBe('Southern Europe')
    expect(resolveRegionLabel(5457237)).toBe('Southern Europe')
    expectTypeOf(resolveRegionLabel).toBeFunction()
    expectTypeOf(REGION_LABELS['5457237']).toEqualTypeOf<'Southern Europe'>()
    expectTypeOf<KnownRegionId>().toEqualTypeOf<keyof typeof REGION_LABELS>()
    expectTypeOf<RegionLabel>().toEqualTypeOf<
      (typeof REGION_LABELS)[KnownRegionId]
    >()

    const regionsPath = resolve(process.cwd(), 'dist/regions.js')
    const deps = getTransitiveImports(regionsPath)
    expect(deps).not.toContain('./client.js')
    expect(deps).not.toContain('impit')
    expect(deps).toEqual([])
  })

  it('exposes metadata without client or native dependencies', () => {
    expect(PLATFORM_LABELS['common-gen5']).toBe('Crossplatform Current Gen')
    expect(resolvePlatformLabel('common-gen5')).toBe(
      'Crossplatform Current Gen',
    )
    expect(DIVISION_LABELS['1']).toBe('Elite')
    expect(resolveDivisionLabel(1)).toBe('Elite')
    expect(MATCH_TYPE_LABELS.leagueMatch).toBe('League Match')
    expect(MATCH_TYPE_RESPONSE_LABELS['1']).toBe('League Match')
    expect(resolveMatchTypeLabel('1')).toBe('League Match')
    expect(PLAYOFF_RESULT_LABELS['1']).toBe('Champion')
    expect(resolvePlayoffResultLabel(1)).toBe('Champion')
    expect(POSITION_LABELS.midfielder).toBe('Midfielder')
    expect(resolvePositionLabel('midfielder')).toBe('Midfielder')
    expect(REPUTATION_LABELS['3']).toBe('World Renown')
    expect(resolveReputationLabel(3)).toBe('World Renown')
    expect(resolveSeasonLabel('Season 1')).toBe('Season 1')

    expectTypeOf(resolvePlatformLabel).toBeFunction()
    expectTypeOf(resolveDivisionLabel).toBeFunction()
    expectTypeOf(resolveMatchTypeLabel).toBeFunction()
    expectTypeOf(resolvePlayoffResultLabel).toBeFunction()
    expectTypeOf(resolvePositionLabel).toBeFunction()
    expectTypeOf(resolveReputationLabel).toBeFunction()
    expectTypeOf(resolveSeasonLabel).toBeFunction()

    expectTypeOf<KnownPlatformId>().toEqualTypeOf<
      keyof typeof PLATFORM_LABELS
    >()
    expectTypeOf<PlatformLabel>().toEqualTypeOf<
      (typeof PLATFORM_LABELS)[KnownPlatformId]
    >()
    expectTypeOf<KnownDivisionId>().toEqualTypeOf<
      keyof typeof DIVISION_LABELS
    >()
    expectTypeOf<DivisionLabel>().toEqualTypeOf<
      (typeof DIVISION_LABELS)[KnownDivisionId]
    >()
    expectTypeOf<KnownMatchTypeId>().toEqualTypeOf<
      keyof typeof MATCH_TYPE_LABELS
    >()
    expectTypeOf<MatchTypeLabel>().toEqualTypeOf<
      (typeof MATCH_TYPE_LABELS)[KnownMatchTypeId]
    >()
    expectTypeOf<KnownPlayoffResultId>().toEqualTypeOf<
      keyof typeof PLAYOFF_RESULT_LABELS
    >()
    expectTypeOf<PlayoffResultLabel>().toEqualTypeOf<
      (typeof PLAYOFF_RESULT_LABELS)[KnownPlayoffResultId]
    >()
    expectTypeOf<KnownPositionId>().toEqualTypeOf<
      keyof typeof POSITION_LABELS
    >()
    expectTypeOf<PositionLabel>().toEqualTypeOf<
      (typeof POSITION_LABELS)[KnownPositionId]
    >()
    expectTypeOf<KnownReputationId>().toEqualTypeOf<
      keyof typeof REPUTATION_LABELS
    >()
    expectTypeOf<ReputationLabel>().toEqualTypeOf<
      (typeof REPUTATION_LABELS)[KnownReputationId]
    >()

    const metadataPath = resolve(process.cwd(), 'dist/metadata.js')
    const deps = getTransitiveImports(metadataPath)
    expect(deps).not.toContain('./client.js')
    expect(deps).not.toContain('impit')
    expect(deps).toEqual(['./label-lookup.js'])
  })
})
