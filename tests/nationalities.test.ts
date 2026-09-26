import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  NATIONALITY_LABELS,
  ProClubsClient,
  clubMemberSchema,
  resolveNationality,
  type KnownNationalityId,
  type Nationality,
  type NationalityLabel,
} from '../src/index.js'

type NationalityFixture = {
  source: {
    url: string
    capturedOn: string
    method: string
  }
  duplicateIdsCollapsed: string[]
  entries: {
    id: string
    label: string
    isoCode?: string
  }[]
  crossCheck: {
    ratingsPlayers: {
      name: string
      id: string
      label: string
    }[]
    proClubsMembers: {
      name: string
      clubName: string
      clubId: string
      id: string
      label: string
    }[]
  }
}

function loadNationalityFixture(): NationalityFixture {
  const raw = readFileSync(
    join(process.cwd(), 'tests', 'fixtures', 'nationalities.json'),
    'utf8',
  )
  // SAFETY: the fixture shape is checked by the assertions in this file.
  return JSON.parse(raw) as NationalityFixture
}

function expectedNationality(entry: NationalityFixture['entries'][number]) {
  if (entry.isoCode === undefined) {
    return { label: entry.label }
  }
  return { label: entry.label, isoCode: entry.isoCode }
}

describe('NATIONALITY_LABELS and resolveNationality', () => {
  const fixture = loadNationalityFixture()

  it('matches the captured EA nation table', () => {
    expect(fixture.source).toMatchObject({
      url: 'https://www.ea.com/games/ea-sports-fc/ratings',
      capturedOn: '2026-09-26',
    })
    expect(fixture.source.method).toContain('ratingsFilters.nationality')
    expect(fixture.duplicateIdsCollapsed).toEqual(['214'])
    expect(fixture.entries).toHaveLength(174)

    const expected = Object.fromEntries(
      fixture.entries.map((entry) => [entry.id, expectedNationality(entry)]),
    )
    expect(NATIONALITY_LABELS).toEqual(expected)
    expect(Object.keys(NATIONALITY_LABELS)).toHaveLength(174)
    expect(Object.isFrozen(NATIONALITY_LABELS)).toBe(true)
    for (const entry of Object.values(NATIONALITY_LABELS)) {
      expect(Object.isFrozen(entry)).toBe(true)
    }
  })

  it('resolves every captured id from both string and number representations', () => {
    for (const entry of fixture.entries) {
      const resolved = {
        id: entry.id,
        ...expectedNationality(entry),
      }
      expect(resolveNationality(entry.id)).toEqual(resolved)
      expect(resolveNationality(Number(entry.id))).toEqual(resolved)
    }
  })

  it('resolves England, the home nations, Holland, and nations without an ISO code', () => {
    expect(resolveNationality(14)).toEqual({
      id: '14',
      label: 'England',
      isoCode: 'GB-ENG',
    })
    expect(resolveNationality('42')).toEqual({
      id: '42',
      label: 'Scotland',
      isoCode: 'GB-SCT',
    })
    expect(resolveNationality(50)).toEqual({
      id: '50',
      label: 'Wales',
      isoCode: 'GB-WLS',
    })
    expect(resolveNationality(35)).toEqual({
      id: '35',
      label: 'Northern Ireland',
      isoCode: 'GB-NIR',
    })
    expect(resolveNationality(34)).toEqual({
      id: '34',
      label: 'Holland',
      isoCode: 'NL',
    })
    expect(resolveNationality(213)).toEqual({
      id: '213',
      label: 'Chinese Taipei',
    })
    expect(resolveNationality('219')).toEqual({
      id: '219',
      label: 'Kosovo',
    })
    expect(resolveNationality(213)).not.toHaveProperty('isoCode')
    expect(resolveNationality(219)).not.toHaveProperty('isoCode')
  })

  it('resolves nation ids absent from the ratings filter but used by Pro Clubs', () => {
    expect(resolveNationality(67)).toEqual({
      id: '67',
      label: 'Belize',
      isoCode: 'BZ',
    })
    expect(resolveNationality(86)).toEqual({
      id: '86',
      label: 'Nicaragua',
      isoCode: 'NI',
    })
    expect(resolveNationality(114)).toEqual({
      id: '114',
      label: 'Ethiopia',
      isoCode: 'ET',
    })
    expect(resolveNationality(142)).toEqual({
      id: '142',
      label: 'Swaziland',
      isoCode: 'SZ',
    })
    expect(resolveNationality(152)).toEqual({
      id: '152',
      label: 'Bhutan',
      isoCode: 'BT',
    })
    expect(resolveNationality(153)).toEqual({
      id: '153',
      label: 'Brunei Darussalam',
      isoCode: 'BN',
    })
    expect(resolveNationality(157)).toEqual({
      id: '157',
      label: 'Guam',
      isoCode: 'GU',
    })
    expect(resolveNationality(173)).toEqual({
      id: '173',
      label: 'Malaysia',
      isoCode: 'MY',
    })
    expect(resolveNationality(175)).toEqual({
      id: '175',
      label: 'Mongolia',
      isoCode: 'MN',
    })
    expect(resolveNationality(201)).toEqual({
      id: '201',
      label: 'Solomon Islands',
      isoCode: 'SB',
    })
  })

  it('trims surrounding whitespace on string ids without fuzzy matching', () => {
    expect(resolveNationality('  14  ')).toEqual({
      id: '14',
      label: 'England',
      isoCode: 'GB-ENG',
    })
    expect(resolveNationality('\t18\n')).toEqual({
      id: '18',
      label: 'France',
      isoCode: 'FR',
    })
    expect(resolveNationality('1')).toMatchObject({ label: 'Albania' })
    expect(resolveNationality('014')).toBeUndefined()
    expect(resolveNationality('14abc')).toBeUndefined()
    expect(resolveNationality('14.0')).toBeUndefined()
  })

  it('returns undefined for unknown, empty, null, and undefined ids without throwing', () => {
    expect(resolveNationality(999_999)).toBeUndefined()
    expect(resolveNationality('not-a-nation')).toBeUndefined()
    expect(resolveNationality('')).toBeUndefined()
    expect(resolveNationality('   ')).toBeUndefined()
    expect(resolveNationality(null)).toBeUndefined()
    expect(resolveNationality(undefined)).toBeUndefined()
    expect(resolveNationality(Number.NaN)).toBeUndefined()
    expect(resolveNationality(Number.POSITIVE_INFINITY)).toBeUndefined()
    expect(() => resolveNationality(999_999)).not.toThrow()
    expect(() => resolveNationality(null)).not.toThrow()
    expect(() => resolveNationality('')).not.toThrow()
    expect(() => resolveNationality(undefined)).not.toThrow()
  })

  it('ignores inherited Object.prototype keys instead of treating them as nation ids', () => {
    expect(resolveNationality('toString')).toBeUndefined()
    expect(resolveNationality('constructor')).toBeUndefined()
    expect(resolveNationality('__proto__')).toBeUndefined()
    expect(resolveNationality('hasOwnProperty')).toBeUndefined()
  })

  it('matches nations shown beside real players on the EA ratings page', () => {
    expect(fixture.crossCheck.ratingsPlayers.length).toBeGreaterThanOrEqual(10)
    for (const player of fixture.crossCheck.ratingsPlayers) {
      expect(resolveNationality(player.id), player.name).toMatchObject({
        id: player.id,
        label: player.label,
      })
    }
  })

  it('resolves proNationality ids observed on live Pro Clubs members', () => {
    const frequent = new Set([
      'England',
      'France',
      'Germany',
      'Spain',
      'Brazil',
      'Argentina',
      'Holland',
      'Portugal',
      'Italy',
      'United States',
    ])
    const labels = fixture.crossCheck.proClubsMembers.map(
      (member) => member.label,
    )
    for (const label of frequent) {
      expect(labels).toContain(label)
    }
    for (const member of fixture.crossCheck.proClubsMembers) {
      expect(resolveNationality(member.id), member.name).toMatchObject({
        id: member.id,
        label: member.label,
      })
    }
  })

  it('exports stable public types derived from the mapping', () => {
    expectTypeOf(NATIONALITY_LABELS['14'].label).toEqualTypeOf<'England'>()
    expectTypeOf(NATIONALITY_LABELS['14'].isoCode).toEqualTypeOf<'GB-ENG'>()
    expectTypeOf<KnownNationalityId>().toEqualTypeOf<
      keyof typeof NATIONALITY_LABELS
    >()
    expectTypeOf<NationalityLabel>().toEqualTypeOf<
      (typeof NATIONALITY_LABELS)[KnownNationalityId]['label']
    >()
    expectTypeOf(resolveNationality('14')).toEqualTypeOf<
      Nationality | undefined
    >()
  })
})

describe('Member nationality enrichment', () => {
  it('keeps proNationality and adds nationality for known members', async () => {
    const payload = {
      members: [
        { name: 'known-string', proNationality: '14' },
        { name: 'known-number', proNationality: 18 },
        { name: 'empty', proNationality: '' },
        { name: 'blank', proNationality: '   ' },
        { name: 'missing' },
        { name: 'nullish', proNationality: null },
        { name: 'unknown', proNationality: 999_999 },
      ],
      positionCount: { midfielder: 1 },
    }
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(payload), { status: 200 }),
    })

    const stats = await client.members.stats({ clubId: '35303' })
    const career = await client.members.careerStats({ clubId: '35303' })

    expect(stats.members).toEqual([
      {
        name: 'known-string',
        proNationality: '14',
        nationality: { id: '14', label: 'England', isoCode: 'GB-ENG' },
      },
      {
        name: 'known-number',
        proNationality: 18,
        nationality: { id: '18', label: 'France', isoCode: 'FR' },
      },
      { name: 'empty', proNationality: '' },
      { name: 'blank', proNationality: '   ' },
      { name: 'missing' },
      { name: 'nullish', proNationality: null },
      { name: 'unknown', proNationality: 999_999 },
    ])
    expect(stats.members[2]).not.toHaveProperty('nationality')
    expect(stats.members[3]).not.toHaveProperty('nationality')
    expect(stats.members[4]).not.toHaveProperty('nationality')
    expect(stats.members[5]).not.toHaveProperty('nationality')
    expect(stats.members[6]).not.toHaveProperty('nationality')
    expect(career.members).toEqual(stats.members)
    expect(payload.members[0]).toEqual({
      name: 'known-string',
      proNationality: '14',
    })
  })

  it('preserves an upstream nationality and exposes the derived value separately', () => {
    const parsed = clubMemberSchema.parse({
      name: 'upstream',
      proNationality: '54',
      nationality: 'Brazil raw',
      derivedLabels: { existingLabel: 'preserved' },
    })

    expect(parsed).toEqual({
      name: 'upstream',
      proNationality: '54',
      nationality: 'Brazil raw',
      derivedLabels: {
        existingLabel: 'preserved',
        nationality: { id: '54', label: 'Brazil', isoCode: 'BR' },
      },
    })
  })

  it('replaces a non-object derivedLabels with the calculated nationality', () => {
    const parsed = clubMemberSchema.parse({
      name: 'bad-derived',
      proNationality: '18',
      nationality: 'France raw',
      derivedLabels: null,
    })

    expect(parsed).toEqual({
      name: 'bad-derived',
      proNationality: '18',
      nationality: 'France raw',
      derivedLabels: {
        nationality: { id: '18', label: 'France', isoCode: 'FR' },
      },
    })
  })

  it('preserves a null upstream nationality', () => {
    const parsed = clubMemberSchema.parse({
      name: 'null-upstream',
      proNationality: 52,
      nationality: null,
    })

    expect(parsed).toEqual({
      name: 'null-upstream',
      proNationality: 52,
      nationality: null,
      derivedLabels: {
        nationality: { id: '52', label: 'Argentina', isoCode: 'AR' },
      },
    })
  })
})
