import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, expectTypeOf, it } from 'vitest'

import type {
  DivisionLabel,
  KnownDivisionId,
  KnownMatchTypeId,
  KnownPlatformId,
  KnownPlayoffResultId,
  KnownPositionId,
  KnownReputationId,
  MatchTypeLabel,
  PlatformLabel,
  PlayoffResultLabel,
  PositionLabel,
  ReputationLabel,
} from '../src/metadata.js'
import type {
  KnownNationalityId,
  Nationality,
  NationalityIsoCode,
  NationalityLabel,
} from '../src/nationalities.js'
import type { KnownRegionId, RegionLabel } from '../src/regions.js'

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
  beforeAll(() => {
    if (!existsSync(resolve(process.cwd(), 'dist/nationalities.js'))) {
      const build = spawnSync('npm', ['run', 'build'], {
        cwd: process.cwd(),
        encoding: 'utf8',
      })
      if (build.status !== 0) {
        throw new Error(`Build failed in subpaths test: ${build.stderr}`)
      }
    }
  })

  it('exposes nationalities without client or native dependencies', async () => {
    const nationalities = await import('proclubs-sdk/nationalities')
    expect(nationalities.NATIONALITY_LABELS['14'].label).toBe('England')
    expect(nationalities.resolveNationality('14')).toEqual({
      id: '14',
      label: 'England',
      isoCode: 'GB-ENG',
    })

    expectTypeOf(nationalities.resolveNationality('14')).toEqualTypeOf<
      Nationality | undefined
    >()
    expectTypeOf(
      nationalities.NATIONALITY_LABELS['14'].label,
    ).toEqualTypeOf<'England'>()
    expectTypeOf<KnownNationalityId>().toEqualTypeOf<
      keyof typeof nationalities.NATIONALITY_LABELS
    >()
    expectTypeOf<NationalityLabel>().toEqualTypeOf<
      (typeof nationalities.NATIONALITY_LABELS)[KnownNationalityId]['label']
    >()
    expectTypeOf<NationalityIsoCode>().toEqualTypeOf<
      Extract<
        (typeof nationalities.NATIONALITY_LABELS)[KnownNationalityId],
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

  it('exposes regions without client or native dependencies', async () => {
    const regions = await import('proclubs-sdk/regions')
    expect(regions.REGION_LABELS['5457237']).toBe('Southern Europe')
    expect(regions.resolveRegionLabel(5457237)).toBe('Southern Europe')

    expectTypeOf(regions.resolveRegionLabel(5457237)).toEqualTypeOf<
      RegionLabel | undefined
    >()
    expectTypeOf(
      regions.REGION_LABELS['5457237'],
    ).toEqualTypeOf<'Southern Europe'>()
    expectTypeOf<KnownRegionId>().toEqualTypeOf<
      keyof typeof regions.REGION_LABELS
    >()
    expectTypeOf<RegionLabel>().toEqualTypeOf<
      (typeof regions.REGION_LABELS)[KnownRegionId]
    >()

    const regionsPath = resolve(process.cwd(), 'dist/regions.js')
    const deps = getTransitiveImports(regionsPath)
    expect(deps).not.toContain('./client.js')
    expect(deps).not.toContain('impit')
    expect(deps).toEqual([])
  })

  it('exposes metadata without client or native dependencies', async () => {
    const metadata = await import('proclubs-sdk/metadata')
    expect(metadata.PLATFORM_LABELS['common-gen5']).toBe(
      'Crossplatform Current Gen',
    )
    expect(metadata.resolvePlatformLabel('common-gen5')).toBe(
      'Crossplatform Current Gen',
    )
    expect(metadata.DIVISION_LABELS['1']).toBe('Elite')
    expect(metadata.resolveDivisionLabel(1)).toBe('Elite')
    expect(metadata.MATCH_TYPE_LABELS.leagueMatch).toBe('League Match')
    expect(metadata.MATCH_TYPE_RESPONSE_LABELS['1']).toBe('League Match')
    expect(metadata.resolveMatchTypeLabel('1')).toBe('League Match')
    expect(metadata.PLAYOFF_RESULT_LABELS['1']).toBe('Champion')
    expect(metadata.resolvePlayoffResultLabel(1)).toBe('Champion')
    expect(metadata.POSITION_LABELS.midfielder).toBe('Midfielder')
    expect(metadata.resolvePositionLabel('midfielder')).toBe('Midfielder')
    expect(metadata.REPUTATION_LABELS['3']).toBe('World Renown')
    expect(metadata.resolveReputationLabel(3)).toBe('World Renown')
    expect(metadata.resolveSeasonLabel('Season 1')).toBe('Season 1')

    expectTypeOf(metadata.resolvePlatformLabel('common-gen5')).toEqualTypeOf<
      PlatformLabel | undefined
    >()
    expectTypeOf(metadata.resolveDivisionLabel(1)).toEqualTypeOf<
      DivisionLabel | undefined
    >()
    expectTypeOf(metadata.resolveMatchTypeLabel('1')).toEqualTypeOf<
      MatchTypeLabel | undefined
    >()
    expectTypeOf(metadata.resolvePlayoffResultLabel(1)).toEqualTypeOf<
      PlayoffResultLabel | undefined
    >()
    expectTypeOf(metadata.resolvePositionLabel('midfielder')).toEqualTypeOf<
      PositionLabel | undefined
    >()
    expectTypeOf(metadata.resolveReputationLabel(1)).toEqualTypeOf<
      ReputationLabel | undefined
    >()
    expectTypeOf(metadata.resolveSeasonLabel('Season 1')).toEqualTypeOf<
      string | undefined
    >()

    expectTypeOf<KnownPlatformId>().toEqualTypeOf<
      keyof typeof metadata.PLATFORM_LABELS
    >()
    expectTypeOf<PlatformLabel>().toEqualTypeOf<
      (typeof metadata.PLATFORM_LABELS)[KnownPlatformId]
    >()
    expectTypeOf<KnownDivisionId>().toEqualTypeOf<
      keyof typeof metadata.DIVISION_LABELS
    >()
    expectTypeOf<DivisionLabel>().toEqualTypeOf<
      (typeof metadata.DIVISION_LABELS)[KnownDivisionId]
    >()
    expectTypeOf<KnownMatchTypeId>().toEqualTypeOf<
      keyof typeof metadata.MATCH_TYPE_LABELS
    >()
    expectTypeOf<MatchTypeLabel>().toEqualTypeOf<
      (typeof metadata.MATCH_TYPE_LABELS)[KnownMatchTypeId]
    >()
    expectTypeOf<KnownPlayoffResultId>().toEqualTypeOf<
      keyof typeof metadata.PLAYOFF_RESULT_LABELS
    >()
    expectTypeOf<PlayoffResultLabel>().toEqualTypeOf<
      (typeof metadata.PLAYOFF_RESULT_LABELS)[KnownPlayoffResultId]
    >()
    expectTypeOf<KnownPositionId>().toEqualTypeOf<
      keyof typeof metadata.POSITION_LABELS
    >()
    expectTypeOf<PositionLabel>().toEqualTypeOf<
      (typeof metadata.POSITION_LABELS)[KnownPositionId]
    >()
    expectTypeOf<KnownReputationId>().toEqualTypeOf<
      keyof typeof metadata.REPUTATION_LABELS
    >()
    expectTypeOf<ReputationLabel>().toEqualTypeOf<
      (typeof metadata.REPUTATION_LABELS)[KnownReputationId]
    >()

    const metadataPath = resolve(process.cwd(), 'dist/metadata.js')
    const deps = getTransitiveImports(metadataPath)
    expect(deps).not.toContain('./client.js')
    expect(deps).not.toContain('impit')
    expect(deps).toEqual(['./label-lookup.js'])
  })

  it('runs isolated in a child Node process without loading impit or client.js', () => {
    const script = `
      import { resolveNationality } from 'proclubs-sdk/nationalities'
      import { resolveRegionLabel } from 'proclubs-sdk/regions'
      import { resolveDivisionLabel } from 'proclubs-sdk/metadata'

      const nation = resolveNationality(14)
      const region = resolveRegionLabel(5457237)
      const div = resolveDivisionLabel(1)

      if (!nation || nation.label !== 'England') process.exit(2)
      if (region !== 'Southern Europe') process.exit(3)
      if (div !== 'Elite') process.exit(4)

      // Ensure native impit was not loaded
      if (globalThis.__impit_loaded__ || process.features?.inspector === false) {
        process.exit(5)
      }
    `
    const result = spawnSync('node', ['--input-type=module', '-e', script], {
      cwd: process.cwd(),
      encoding: 'utf8',
    })
    expect(result.status).toBe(0)
  })
})
