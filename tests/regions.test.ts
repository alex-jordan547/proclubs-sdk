import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  ProClubsClient,
  REGION_LABELS,
  clubInfoSchema,
  resolveRegionLabel,
  type KnownRegionId,
  type RegionLabel,
} from '../src/index.js'

const EXPECTED_REGION_LABELS = {
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
} as const satisfies Record<KnownRegionId, RegionLabel>

describe('REGION_LABELS and resolveRegionLabel', () => {
  it('exposes the 11 known EA region labels as a public readonly mapping', () => {
    expect(REGION_LABELS).toEqual(EXPECTED_REGION_LABELS)
    expect(Object.keys(REGION_LABELS)).toHaveLength(11)
    expect(Object.isFrozen(REGION_LABELS)).toBe(true)
  })

  it('resolves every known id from both string and number representations', () => {
    for (const [regionId, label] of Object.entries(EXPECTED_REGION_LABELS)) {
      expect(resolveRegionLabel(regionId)).toBe(label)
      expect(resolveRegionLabel(Number(regionId))).toBe(label)
    }
  })

  it('resolves the HEMLE FC Southern Europe id as string or number', () => {
    expect(resolveRegionLabel(5457237)).toBe('Southern Europe')
    expect(resolveRegionLabel('5457237')).toBe('Southern Europe')
  })

  it('trims surrounding whitespace on string ids without fuzzy matching', () => {
    expect(resolveRegionLabel('  5457237  ')).toBe('Southern Europe')
    expect(resolveRegionLabel('\t5457237\n')).toBe('Southern Europe')
    expect(resolveRegionLabel('545')).toBeUndefined()
    expect(resolveRegionLabel('54572370')).toBeUndefined()
    expect(resolveRegionLabel('5457237abc')).toBeUndefined()
  })

  it('returns undefined for unknown, null, and undefined ids without throwing', () => {
    expect(resolveRegionLabel(99_999_999)).toBeUndefined()
    expect(resolveRegionLabel('not-a-region')).toBeUndefined()
    expect(resolveRegionLabel(null)).toBeUndefined()
    expect(resolveRegionLabel(undefined)).toBeUndefined()
    expect(resolveRegionLabel(Number.NaN)).toBeUndefined()
    expect(resolveRegionLabel(Number.POSITIVE_INFINITY)).toBeUndefined()
    expect(() => resolveRegionLabel(99_999_999)).not.toThrow()
    expect(() => resolveRegionLabel(null)).not.toThrow()
    expect(() => resolveRegionLabel(undefined)).not.toThrow()
  })

  it('ignores inherited Object.prototype keys instead of treating them as region ids', () => {
    expect(resolveRegionLabel('toString')).toBeUndefined()
    expect(resolveRegionLabel('constructor')).toBeUndefined()
    expect(resolveRegionLabel('__proto__')).toBeUndefined()
    expect(resolveRegionLabel('hasOwnProperty')).toBeUndefined()
    expect(typeof resolveRegionLabel('toString')).toBe('undefined')
  })

  it('exports stable public types derived from the mapping', () => {
    expectTypeOf(REGION_LABELS['5457237']).toEqualTypeOf<'Southern Europe'>()
    expectTypeOf<KnownRegionId>().toEqualTypeOf<keyof typeof REGION_LABELS>()
    expectTypeOf<RegionLabel>().toEqualTypeOf<
      (typeof REGION_LABELS)[KnownRegionId]
    >()
  })
})

describe('Club regionLabel enrichment', () => {
  it('keeps regionId and adds regionLabel on clubs.get for HEMLE FC', async () => {
    const payload = {
      '42': {
        clubId: 42,
        name: 'HEMLE FC',
        regionId: 5457237,
      },
    }
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(payload), { status: 200 }),
    })

    const club = await client.clubs.get({ clubId: '42' })

    expect(club).toEqual({
      clubId: 42,
      name: 'HEMLE FC',
      regionId: 5457237,
      regionLabel: 'Southern Europe',
    })
    expect(payload['42']).toEqual({
      clubId: 42,
      name: 'HEMLE FC',
      regionId: 5457237,
    })
  })

  it('enriches nested clubInfo on clubs.search when a regionId is present', async () => {
    const payload = [
      {
        clubId: '42',
        clubName: 'HEMLE FC',
        clubInfo: {
          name: 'HEMLE FC',
          clubId: 42,
          regionId: '5457237',
        },
      },
    ]
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(payload), { status: 200 }),
    })

    const [club] = await client.clubs.search({ name: 'HEMLE FC' })

    expect(club?.clubInfo).toEqual({
      name: 'HEMLE FC',
      clubId: 42,
      regionId: '5457237',
      regionLabel: 'Southern Europe',
    })
    expect(payload[0]?.clubInfo).toEqual({
      name: 'HEMLE FC',
      clubId: 42,
      regionId: '5457237',
    })
  })

  it('lets an unknown regionId pass through without regionLabel or rejection', async () => {
    const client = new ProClubsClient({
      transport: async () =>
        new Response(
          JSON.stringify({
            '42': {
              clubId: 42,
              name: 'HEMLE FC',
              regionId: 99_999_999,
            },
          }),
          { status: 200 },
        ),
    })

    const club = await client.clubs.get({ clubId: 42 })

    expect(club).toEqual({
      clubId: 42,
      name: 'HEMLE FC',
      regionId: 99_999_999,
    })
    expect(club).not.toHaveProperty('regionLabel')
  })

  it('drops an upstream regionLabel when the regionId is unknown', async () => {
    const client = new ProClubsClient({
      transport: async () =>
        new Response(
          JSON.stringify({
            '42': {
              clubId: 42,
              name: 'HEMLE FC',
              regionId: 99_999_999,
              regionLabel: 'Not A Real Region',
            },
          }),
          { status: 200 },
        ),
    })

    const club = await client.clubs.get({ clubId: 42 })

    expect(club).toEqual({
      clubId: 42,
      name: 'HEMLE FC',
      regionId: 99_999_999,
    })
    expect(club).not.toHaveProperty('regionLabel')
  })

  it('replaces an upstream regionLabel with the SDK-derived value for known ids', () => {
    const parsed = clubInfoSchema.parse({
      clubId: 42,
      name: 'HEMLE FC',
      regionId: 5457237,
      regionLabel: 'Wrong Upstream Label',
    })

    expect(parsed).toEqual({
      clubId: 42,
      name: 'HEMLE FC',
      regionId: 5457237,
      regionLabel: 'Southern Europe',
    })
  })

  it('does not mutate schema input objects when deriving regionLabel', () => {
    const raw = {
      clubId: 42,
      name: 'HEMLE FC',
      regionId: 5457237,
    }

    const parsed = clubInfoSchema.parse(raw)

    expect(parsed.regionLabel).toBe('Southern Europe')
    expect(raw).toEqual({
      clubId: 42,
      name: 'HEMLE FC',
      regionId: 5457237,
    })
  })

  it('returns cached enriched club info without sharing mutable references', async () => {
    let calls = 0
    const client = new ProClubsClient({
      cache: true,
      transport: async () => {
        calls += 1
        return new Response(
          JSON.stringify({
            '42': {
              clubId: 42,
              name: 'HEMLE FC',
              regionId: 5457237,
            },
          }),
          { status: 200 },
        )
      },
    })

    const first = await client.clubs.get({ clubId: '42' })
    expect(first?.regionId).toBe(5457237)
    expect(first?.regionLabel).toBe('Southern Europe')

    if (first) {
      const mutable = first as { name?: string; regionLabel?: string }
      mutable.regionLabel = 'MUTATED'
      mutable.name = 'MUTATED'
    }

    const second = await client.clubs.get({ clubId: '42' })
    expect(second).toEqual({
      clubId: 42,
      name: 'HEMLE FC',
      regionId: 5457237,
      regionLabel: 'Southern Europe',
    })
    expect(calls).toBe(1)
  })
})
