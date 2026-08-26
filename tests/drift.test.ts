import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  classifyRecommendation,
  detectDrift,
  type EndpointDriftResults,
  generateReport,
  type JsonValue,
} from '../src/index.js'

function loadFixture(name: string): JsonValue {
  const raw = readFileSync(
    join(process.cwd(), 'tests', 'fixtures', `${name}.json`),
    'utf8',
  )
  // SAFETY: fixture files are curated JSON snapshots checked into the repo.
  return JSON.parse(raw) as JsonValue
}

function jsonTag(value: JsonValue): string {
  return Object.prototype.toString.call(value)
}

function isJsonObject(
  value: JsonValue,
): value is { readonly [key: string]: JsonValue } {
  return (
    value !== null &&
    !Array.isArray(value) &&
    jsonTag(value) === '[object Object]'
  )
}

function driftResults(
  overrides: Partial<EndpointDriftResults>,
): EndpointDriftResults {
  return {
    clubsSearch: {
      endpoint: 'clubsSearch',
      status: 'unverified',
      issues: [],
    },
    clubsGet: { endpoint: 'clubsGet', status: 'unverified', issues: [] },
    clubsOverallStats: {
      endpoint: 'clubsOverallStats',
      status: 'unverified',
      issues: [],
    },
    clubsPlayoffAchievements: {
      endpoint: 'clubsPlayoffAchievements',
      status: 'unverified',
      issues: [],
    },
    membersStats: {
      endpoint: 'membersStats',
      status: 'unverified',
      issues: [],
    },
    membersCareerStats: {
      endpoint: 'membersCareerStats',
      status: 'unverified',
      issues: [],
    },
    matchesList: {
      endpoint: 'matchesList',
      status: 'unverified',
      issues: [],
    },
    rankingsAllTime: {
      endpoint: 'rankingsAllTime',
      status: 'unverified',
      issues: [],
    },
    rankingsSearchAllTime: {
      endpoint: 'rankingsSearchAllTime',
      status: 'unverified',
      issues: [],
    },
    rankingsCurrentSeason: {
      endpoint: 'rankingsCurrentSeason',
      status: 'unverified',
      issues: [],
    },
    rankingsSearchCurrentSeason: {
      endpoint: 'rankingsSearchCurrentSeason',
      status: 'unverified',
      issues: [],
    },
    ...overrides,
  }
}

describe('Contract drift detector', () => {
  it('passes on all sanitized FC26 fixtures', () => {
    const search = detectDrift('clubsSearch', loadFixture('clubs-search'))
    const get = detectDrift('clubsGet', loadFixture('clubs-get'))
    const overall = detectDrift(
      'clubsOverallStats',
      loadFixture('clubs-overall-stats'),
    )
    const playoffs = detectDrift(
      'clubsPlayoffAchievements',
      loadFixture('playoff-achievements'),
    )
    const members = detectDrift('membersStats', loadFixture('members-stats'))
    const career = detectDrift(
      'membersCareerStats',
      loadFixture('members-career-stats'),
    )
    const matches = detectDrift('matchesList', loadFixture('matches-list'))

    expect(search).toEqual({
      endpoint: 'clubsSearch',
      status: 'passed',
      issues: [],
      itemCount: 1,
    })
    expect(get).toEqual({
      endpoint: 'clubsGet',
      status: 'passed',
      issues: [],
    })
    expect(overall).toEqual({
      endpoint: 'clubsOverallStats',
      status: 'passed',
      issues: [],
      itemCount: 1,
    })
    expect(playoffs).toEqual({
      endpoint: 'clubsPlayoffAchievements',
      status: 'passed',
      issues: [],
      itemCount: 2,
    })
    expect(members).toEqual({
      endpoint: 'membersStats',
      status: 'passed',
      issues: [],
      itemCount: 1,
    })
    expect(career).toEqual({
      endpoint: 'membersCareerStats',
      status: 'passed',
      issues: [],
      itemCount: 1,
    })
    expect(matches).toEqual({
      endpoint: 'matchesList',
      status: 'passed',
      issues: [],
      itemCount: 1,
    })
  })

  it('passes each populated ranking fixture and accepts an empty search', () => {
    const fixtures = [
      ['rankingsAllTime', 'rankings-all-time', 2],
      ['rankingsSearchAllTime', 'rankings-search-all-time', 1],
      ['rankingsCurrentSeason', 'rankings-current-season', 2],
      ['rankingsSearchCurrentSeason', 'rankings-search-current-season', 1],
    ] as const

    for (const [endpoint, fixture, itemCount] of fixtures) {
      expect(detectDrift(endpoint, loadFixture(fixture))).toEqual({
        endpoint,
        status: 'passed',
        issues: [],
        itemCount,
      })
    }

    expect(
      detectDrift(
        'rankingsSearchCurrentSeason',
        loadFixture('rankings-search-empty'),
      ),
    ).toEqual({
      endpoint: 'rankingsSearchCurrentSeason',
      status: 'unverified',
      issues: [],
      itemCount: 0,
    })
  })

  it('detects ranking contract drift and permits missing optional fields', () => {
    const valid = {
      clubId: '42',
      rank: 1,
      goalsPerGame: '4.47',
    }

    expect(
      detectDrift('rankingsAllTime', [{ ...valid, unexpectedRankBand: 'A' }])
        .issues[0],
    ).toMatchObject({
      kind: 'field_added',
      path: '$[0].unexpectedRankBand',
    })

    expect(
      detectDrift('rankingsAllTime', [{ rank: 1 }]).issues[0],
    ).toMatchObject({
      kind: 'field_removed',
      path: '$[0].clubId',
    })
    expect(
      detectDrift('rankingsAllTime', [{ ...valid, rank: '1' }]).issues[0],
    ).toMatchObject({
      kind: 'type_changed',
      path: '$[0].rank',
    })
    expect(
      detectDrift('rankingsAllTime', { entries: [valid] }).issues[0],
    ).toMatchObject({
      kind: 'envelope_changed',
      path: '$',
    })
    expect(detectDrift('rankingsCurrentSeason', [{ clubId: '42' }])).toEqual({
      endpoint: 'rankingsCurrentSeason',
      status: 'passed',
      issues: [],
      itemCount: 1,
    })
  })

  it('detects unknown playoff IDs without rejecting the raw response shape', () => {
    const result = detectDrift('clubsPlayoffAchievements', [
      {
        seasonId: '9',
        seasonName: 'EA_NEW_SEASON_FORMAT',
        bestDivision: '99',
        bestFinishGroup: '99',
      },
    ])

    expect(result.status).toBe('passed')
    expect(result.issues).toEqual([
      {
        kind: 'unknown_value',
        path: '$[0].bestDivision',
        message:
          'Unknown bestDivision at $[0].bestDivision; update DIVISION_LABELS after confirming the EA label',
        expected: 'known division id',
        actual: '99',
      },
      {
        kind: 'unknown_value',
        path: '$[0].bestFinishGroup',
        message:
          'Unknown bestFinishGroup at $[0].bestFinishGroup; update PLAYOFF_RESULT_LABELS after confirming the EA label',
        expected: 'known playoff result id',
        actual: '99',
      },
    ])
  })

  it('detects playoff fields added, removed, or changed upstream', () => {
    const valid = {
      seasonId: '7',
      seasonName: 'CLUBS_LEAGUE_SEASON_07',
      bestDivision: '3',
      bestFinishGroup: '1',
    }

    expect(
      detectDrift('clubsPlayoffAchievements', [
        { seasonId: '7', seasonName: valid.seasonName, bestDivision: '3' },
      ]).issues[0],
    ).toMatchObject({
      kind: 'field_removed',
      path: '$[0].bestFinishGroup',
    })
    expect(
      detectDrift('clubsPlayoffAchievements', [{ ...valid, seasonId: [] }])
        .issues[0],
    ).toMatchObject({
      kind: 'type_changed',
      path: '$[0].seasonId',
    })
    expect(
      detectDrift('clubsPlayoffAchievements', [
        { ...valid, unexpectedField: true },
      ]).issues[0],
    ).toMatchObject({
      kind: 'field_added',
      path: '$[0].unexpectedField',
    })
  })

  it('detects field_added when an unexpected field appears upstream', () => {
    const fixture = loadFixture('clubs-search')
    if (!Array.isArray(fixture)) {
      throw new Error('expected clubs-search fixture to be an array')
    }
    const first = fixture[0]
    if (!isJsonObject(first)) {
      throw new Error('expected clubs-search item to be an object')
    }
    const modified = [
      {
        ...first,
        newSeasonalRank: 42,
      },
    ]

    const result = detectDrift('clubsSearch', modified)
    expect(result.status).toBe('drifted')
    expect(result.issues).toEqual([
      {
        kind: 'field_added',
        path: '$[0].newSeasonalRank',
        message: 'Unexpected field $[0].newSeasonalRank added upstream',
        actual: 'number',
      },
    ])
  })

  it('detects nested field_added in custom kit or club details', () => {
    const fixture = loadFixture('clubs-get')
    if (!isJsonObject(fixture)) {
      throw new Error('expected clubs-get fixture to be an object')
    }
    const club = fixture['42']
    if (club === undefined || !isJsonObject(club)) {
      throw new Error('expected club 42 in clubs-get fixture')
    }
    const customKit = club['customKit']
    if (customKit === undefined || !isJsonObject(customKit)) {
      throw new Error('expected customKit on club 42')
    }
    const modified = {
      '42': {
        ...club,
        customKit: {
          ...customKit,
          sponsorLogoUrl: 'https://example.com/logo.png',
        },
      },
    }

    const result = detectDrift('clubsGet', modified)
    expect(result.status).toBe('drifted')
    expect(result.issues[0]).toMatchObject({
      kind: 'field_added',
      path: '$.*.customKit.sponsorLogoUrl',
    })
  })

  it('redacts dynamic club and player ids from drift paths', () => {
    const fixture = loadFixture('matches-list')
    if (!Array.isArray(fixture)) {
      throw new Error('expected matches-list fixture to be an array')
    }
    const match = structuredClone(fixture[0])
    if (!isJsonObject(match)) {
      throw new Error('expected first match to be an object')
    }
    const clubs = match['clubs']
    if (clubs === undefined || !isJsonObject(clubs)) {
      throw new Error('expected match clubs map')
    }
    const firstClubEntry = Object.entries(clubs)[0]
    if (!firstClubEntry) {
      throw new Error('expected a club map entry')
    }
    const [clubId, firstClub] = firstClubEntry
    if (!isJsonObject(firstClub)) {
      throw new Error('expected a club map entry')
    }
    const modifiedMatch = {
      ...match,
      clubs: {
        ...clubs,
        [clubId]: {
          ...firstClub,
          unexpectedClubField: true,
        },
      },
    }

    const result = detectDrift('matchesList', [modifiedMatch])
    expect(result.status).toBe('drifted')
    expect(result.issues[0]).toMatchObject({
      kind: 'field_added',
      path: '$[0].clubs.*.unexpectedClubField',
    })
    expect(JSON.stringify(result.issues)).not.toContain('42')
    expect(JSON.stringify(result.issues)).not.toContain('1001')
  })

  it('detects field_removed when a required field is missing', () => {
    const fixture = loadFixture('clubs-search')
    if (!Array.isArray(fixture)) {
      throw new Error('expected clubs-search fixture to be an array')
    }
    const first = fixture[0]
    if (!isJsonObject(first)) {
      throw new Error('expected clubs-search item to be an object')
    }
    const { clubId: _removed, ...item } = first

    const result = detectDrift('clubsSearch', [item])
    expect(result.status).toBe('drifted')
    expect(result.issues).toEqual([
      {
        kind: 'field_removed',
        path: '$[0].clubId',
        message: 'Required field $[0].clubId is missing',
        expected: 'id',
        actual: 'undefined',
      },
    ])
  })

  it('detects type_changed when a field data type is altered', () => {
    const fixture = loadFixture('clubs-overall-stats')
    if (!Array.isArray(fixture)) {
      throw new Error('expected clubs-overall-stats fixture to be an array')
    }
    const first = fixture[0]
    if (!isJsonObject(first)) {
      throw new Error('expected clubs-overall-stats item to be an object')
    }
    const item = { ...first, wins: true }

    const result = detectDrift('clubsOverallStats', [item])
    expect(result.status).toBe('drifted')
    expect(result.issues[0]).toMatchObject({
      kind: 'type_changed',
      path: '$[0].wins',
      actual: 'boolean',
    })
  })

  it('detects envelope_changed when response root structure differs', () => {
    const arrayResult = detectDrift('clubsGet', [{ name: 'ALL STAR 237' }])
    expect(arrayResult.status).toBe('drifted')
    expect(arrayResult.issues[0]).toMatchObject({
      kind: 'envelope_changed',
      path: '$',
    })

    const objectResult = detectDrift('clubsSearch', { clubId: '42' })
    expect(objectResult.status).toBe('drifted')
    expect(objectResult.issues[0]).toMatchObject({
      kind: 'envelope_changed',
      path: '$',
    })
  })

  it('detects upstream error payloads such as Forbidden as envelope_changed', () => {
    const errorBody = { error: 'Forbidden' }
    const membersResult = detectDrift('membersStats', errorBody)
    expect(membersResult.status).toBe('drifted')
    expect(membersResult.issues[0]).toMatchObject({
      kind: 'envelope_changed',
      actual: 'error_response',
    })

    const getResult = detectDrift('clubsGet', errorBody)
    expect(getResult.status).toBe('drifted')
    expect(getResult.issues[0]).toMatchObject({
      kind: 'envelope_changed',
      actual: 'error_response',
    })
  })

  it('reports unknown regionId values without treating them as a breaking type change', () => {
    const fixture = loadFixture('clubs-get')
    if (!isJsonObject(fixture)) {
      throw new Error('expected clubs-get fixture to be an object')
    }
    const club = fixture['42']
    if (club === undefined || !isJsonObject(club)) {
      throw new Error('expected club 42 in clubs-get fixture')
    }
    const modified = {
      '42': {
        ...club,
        regionId: 99_999_999,
      },
    }

    const result = detectDrift('clubsGet', modified)
    expect(result.status).toBe('passed')
    expect(result.issues).toEqual([
      {
        kind: 'unknown_value',
        path: '$.*.regionId',
        message:
          'Unknown regionId at $.*.regionId; update REGION_LABELS after confirming the EA label',
        expected: 'known regionId',
        actual: '99999999',
      },
    ])
    expect(classifyRecommendation(driftResults({ clubsGet: result }))).toBe(
      'minor',
    )
  })

  it('does not report drift for a known regionId string or number', () => {
    expect(
      detectDrift('clubsGet', {
        '42': { regionId: 5457237 },
      }).status,
    ).toBe('passed')
    expect(
      detectDrift('clubsGet', {
        '42': { regionId: '5457237' },
      }).status,
    ).toBe('passed')
    expect(
      detectDrift('clubsGet', {
        '42': { regionId: null },
      }).status,
    ).toBe('passed')
  })

  it('reports unknown values while keeping an otherwise compatible endpoint passed', () => {
    const result = detectDrift('clubsPlayoffAchievements', [
      {
        seasonId: '9',
        seasonName: 'EA_NEW_SEASON_FORMAT',
        bestDivision: '99',
        bestFinishGroup: '99',
      },
    ])

    expect(result.status).toBe('passed')
    expect(result.issues).toHaveLength(2)

    const results = driftResults({ clubsPlayoffAchievements: result })
    const report = generateReport('common-gen5', {
      ...results,
      clubsSearch: { endpoint: 'clubsSearch', status: 'passed', issues: [] },
      clubsGet: { endpoint: 'clubsGet', status: 'passed', issues: [] },
      clubsOverallStats: {
        endpoint: 'clubsOverallStats',
        status: 'passed',
        issues: [],
      },
      membersStats: { endpoint: 'membersStats', status: 'passed', issues: [] },
      membersCareerStats: {
        endpoint: 'membersCareerStats',
        status: 'passed',
        issues: [],
      },
      matchesList: { endpoint: 'matchesList', status: 'passed', issues: [] },
      rankingsAllTime: {
        endpoint: 'rankingsAllTime',
        status: 'passed',
        issues: [],
      },
      rankingsSearchAllTime: {
        endpoint: 'rankingsSearchAllTime',
        status: 'passed',
        issues: [],
      },
      rankingsCurrentSeason: {
        endpoint: 'rankingsCurrentSeason',
        status: 'passed',
        issues: [],
      },
      rankingsSearchCurrentSeason: {
        endpoint: 'rankingsSearchCurrentSeason',
        status: 'passed',
        issues: [],
      },
    })

    expect(report.summary.status).toBe('supported')
    expect(report.summary.recommendation).toBe('minor')
  })

  it('keeps unknown values non-blocking but marks mixed structural drift', () => {
    const result = detectDrift('clubsPlayoffAchievements', [
      {
        seasonId: '9',
        seasonName: 'EA_NEW_SEASON_FORMAT',
        bestDivision: '99',
        bestFinishGroup: [],
      },
    ])

    expect(result.status).toBe('drifted')
    expect(result.issues.map((issue) => issue.kind)).toEqual([
      'unknown_value',
      'type_changed',
    ])
  })

  it('accepts missing optional fields without reporting drift', () => {
    const minimalSearch = [{ clubId: '42' }]
    const result = detectDrift('clubsSearch', minimalSearch)
    expect(result.status).toBe('passed')
    expect(result.issues).toEqual([])
  })

  it('accepts volatile business values without false positives', () => {
    const modifiedSearch = [
      {
        clubId: '99999',
        clubName: 'RANDOM CLUB NAME',
        wins: '999',
        losses: 12,
        ties: null,
      },
    ]
    const result = detectDrift('clubsSearch', modifiedSearch)
    expect(result.status).toBe('passed')
    expect(result.issues).toEqual([])
  })

  it('marks empty array envelopes as unverified rather than drifted', () => {
    const result = detectDrift('matchesList', [])
    expect(result.status).toBe('unverified')
    expect(result.issues).toEqual([])
    expect(result.itemCount).toBe(0)
  })

  it('correctly classifies recommendation based on issue severity', () => {
    expect(
      classifyRecommendation(
        driftResults({
          clubsSearch: {
            endpoint: 'clubsSearch',
            status: 'passed',
            issues: [],
          },
          clubsGet: { endpoint: 'clubsGet', status: 'passed', issues: [] },
          clubsOverallStats: {
            endpoint: 'clubsOverallStats',
            status: 'passed',
            issues: [],
          },
          clubsPlayoffAchievements: {
            endpoint: 'clubsPlayoffAchievements',
            status: 'passed',
            issues: [],
          },
          membersStats: {
            endpoint: 'membersStats',
            status: 'passed',
            issues: [],
          },
          membersCareerStats: {
            endpoint: 'membersCareerStats',
            status: 'passed',
            issues: [],
          },
          matchesList: {
            endpoint: 'matchesList',
            status: 'passed',
            issues: [],
          },
          rankingsAllTime: {
            endpoint: 'rankingsAllTime',
            status: 'passed',
            issues: [],
          },
          rankingsSearchAllTime: {
            endpoint: 'rankingsSearchAllTime',
            status: 'passed',
            issues: [],
          },
          rankingsCurrentSeason: {
            endpoint: 'rankingsCurrentSeason',
            status: 'passed',
            issues: [],
          },
          rankingsSearchCurrentSeason: {
            endpoint: 'rankingsSearchCurrentSeason',
            status: 'passed',
            issues: [],
          },
        }),
      ),
    ).toBe('patch')

    expect(
      classifyRecommendation(
        driftResults({
          clubsSearch: {
            endpoint: 'clubsSearch',
            status: 'drifted',
            issues: [
              {
                kind: 'field_added',
                path: '$[0].newField',
                message: 'added',
              },
            ],
          },
        }),
      ),
    ).toBe('minor')

    expect(
      classifyRecommendation(
        driftResults({
          clubsSearch: {
            endpoint: 'clubsSearch',
            status: 'drifted',
            issues: [
              {
                kind: 'unknown_value',
                path: '$[0].clubInfo.regionId',
                message: 'unknown region',
              },
            ],
          },
        }),
      ),
    ).toBe('minor')

    expect(
      classifyRecommendation(
        driftResults({
          clubsSearch: {
            endpoint: 'clubsSearch',
            status: 'drifted',
            issues: [
              {
                kind: 'type_changed',
                path: '$[0].wins',
                message: 'changed',
              },
            ],
          },
        }),
      ),
    ).toBe('major')

    expect(
      classifyRecommendation(
        driftResults({
          clubsSearch: {
            endpoint: 'clubsSearch',
            status: 'unverified',
            issues: [],
          },
        }),
      ),
    ).toBe('manual_review')
  })

  it('generates a complete sanitized compatibility report', () => {
    const results = driftResults({
      clubsSearch: { endpoint: 'clubsSearch', status: 'passed', issues: [] },
      clubsGet: { endpoint: 'clubsGet', status: 'passed', issues: [] },
      clubsOverallStats: {
        endpoint: 'clubsOverallStats',
        status: 'passed',
        issues: [],
      },
      clubsPlayoffAchievements: {
        endpoint: 'clubsPlayoffAchievements',
        status: 'passed',
        issues: [],
      },
      membersStats: { endpoint: 'membersStats', status: 'passed', issues: [] },
      membersCareerStats: {
        endpoint: 'membersCareerStats',
        status: 'passed',
        issues: [],
      },
      matchesList: { endpoint: 'matchesList', status: 'passed', issues: [] },
      rankingsAllTime: {
        endpoint: 'rankingsAllTime',
        status: 'passed',
        issues: [],
      },
      rankingsSearchAllTime: {
        endpoint: 'rankingsSearchAllTime',
        status: 'passed',
        issues: [],
      },
      rankingsCurrentSeason: {
        endpoint: 'rankingsCurrentSeason',
        status: 'passed',
        issues: [],
      },
      rankingsSearchCurrentSeason: {
        endpoint: 'rankingsSearchCurrentSeason',
        status: 'passed',
        issues: [],
      },
    })

    const report = generateReport('common-gen5', results)

    expect(report.platform).toBe('common-gen5')
    expect(report.summary.status).toBe('supported')
    expect(report.summary.recommendation).toBe('patch')
    expect(report.endpoints.clubsSearch?.status).toBe('passed')
  })
})
