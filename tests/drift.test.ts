import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  classifyRecommendation,
  detectDrift,
  generateReport,
  type Endpoint,
  type EndpointDriftResult,
} from '../src/index.js'

function loadFixture<T>(name: string): T {
  const raw = readFileSync(
    join(process.cwd(), 'tests', 'fixtures', `${name}.json`),
    'utf8',
  )
  return JSON.parse(raw) as T
}

describe('Contract drift detector', () => {
  it('passes on all sanitized FC26 fixtures', () => {
    const search = detectDrift('clubsSearch', loadFixture('clubs-search'))
    const get = detectDrift('clubsGet', loadFixture('clubs-get'))
    const overall = detectDrift(
      'clubsOverallStats',
      loadFixture('clubs-overall-stats'),
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

  it('detects field_added when an unexpected field appears upstream', () => {
    const fixture = loadFixture<Array<Record<string, unknown>>>('clubs-search')
    const modified = [
      {
        ...fixture[0],
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
    const fixture =
      loadFixture<Record<string, { customKit: Record<string, unknown> }>>(
        'clubs-get',
      )
    const modified = {
      '42': {
        ...fixture['42'],
        customKit: {
          ...fixture['42']?.customKit,
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
    const fixture = loadFixture<Array<Record<string, unknown>>>('matches-list')
    const match = fixture[0] as Record<string, unknown>
    const clubs = match['clubs'] as Record<string, Record<string, unknown>>
    const firstClub = Object.values(clubs)[0]
    if (!firstClub) {
      throw new Error('expected a club map entry')
    }
    firstClub['unexpectedClubField'] = true

    const result = detectDrift('matchesList', [match])
    expect(result.status).toBe('drifted')
    expect(result.issues[0]).toMatchObject({
      kind: 'field_added',
      path: '$[0].clubs.*.unexpectedClubField',
    })
    expect(JSON.stringify(result.issues)).not.toContain('42')
    expect(JSON.stringify(result.issues)).not.toContain('1001')
  })

  it('detects field_removed when a required field is missing', () => {
    const fixture = loadFixture<Array<Record<string, unknown>>>('clubs-search')
    const item = { ...fixture[0] }
    delete (item as { clubId?: unknown }).clubId

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
    const fixture = loadFixture<Array<Record<string, unknown>>>(
      'clubs-overall-stats',
    )
    const item = { ...fixture[0], wins: true } // boolean instead of numberLike

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
    const passedResults: Record<string, EndpointDriftResult> = {
      clubsSearch: { endpoint: 'clubsSearch', status: 'passed', issues: [] },
      clubsGet: { endpoint: 'clubsGet', status: 'passed', issues: [] },
    }
    expect(
      classifyRecommendation(
        passedResults as Record<Endpoint, EndpointDriftResult>,
      ),
    ).toBe('patch')

    const minorResults: Record<string, EndpointDriftResult> = {
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
    }
    expect(
      classifyRecommendation(
        minorResults as Record<Endpoint, EndpointDriftResult>,
      ),
    ).toBe('minor')

    const majorResults: Record<string, EndpointDriftResult> = {
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
    }
    expect(
      classifyRecommendation(
        majorResults as Record<Endpoint, EndpointDriftResult>,
      ),
    ).toBe('major')

    const unverifiedResults: Record<string, EndpointDriftResult> = {
      clubsSearch: {
        endpoint: 'clubsSearch',
        status: 'unverified',
        issues: [],
      },
    }
    expect(
      classifyRecommendation(
        unverifiedResults as Record<Endpoint, EndpointDriftResult>,
      ),
    ).toBe('manual_review')
  })

  it('generates a complete sanitized compatibility report', () => {
    const results: Record<string, EndpointDriftResult> = {
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
    }

    const report = generateReport(
      'common-gen5',
      results as Record<Endpoint, EndpointDriftResult>,
    )

    expect(report.platform).toBe('common-gen5')
    expect(report.summary.status).toBe('supported')
    expect(report.summary.recommendation).toBe('patch')
    expect(report.endpoints.clubsSearch?.status).toBe('passed')
  })
})
