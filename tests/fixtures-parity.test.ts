import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  ProClubsClient,
  type ClubInfo,
  type ClubInfoResponse,
  type ClubMatch,
  type ClubMatchesResponse,
  type ClubMember,
  type ClubMemberCareerStats,
  type ClubMemberStats,
  type ClubOverallStats,
  type ClubOverallStatsResponse,
  type ClubSearchResponse,
  type ClubSummary,
  type ClubSummaryInfo,
  type CustomKit,
  type MatchAggregateStats,
  type MatchClubDetails,
  type MatchPlayerStats,
  type MatchTimeAgo,
} from '../src/index.js'

function loadFixture<T>(name: string): T {
  const raw = readFileSync(
    join(process.cwd(), 'tests', 'fixtures', `${name}.json`),
    'utf8',
  )
  return JSON.parse(raw) as T
}

describe('Fixtures parity and client mapping', () => {
  it('verifies clubs.search returns exact raw fixture data', async () => {
    const rawFixture = loadFixture<ClubSearchResponse>('clubs-search')
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(rawFixture), { status: 200 }),
    })

    const result = await client.clubs.search({ name: 'ALL STAR 237' })

    expect(result).toEqual(rawFixture)
    expect(result[0]?.clubId).toBe('42')
    expect(result[0]?.clubInfo?.customKit?.stadName).toBe('Stade de Wembley')
  })

  it('verifies clubs.get unwraps indexed envelope without losing any fields', async () => {
    const rawFixture = loadFixture<ClubInfoResponse>('clubs-get')
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(rawFixture), { status: 200 }),
    })

    const result = await client.clubs.get({ clubId: '42' })

    expect(result).toEqual(rawFixture['42'])
    expect(result?.name).toBe('ALL STAR 237')
    expect(result?.customKit?.crestAssetId).toBe('99140109')
  })

  it('verifies clubs.overallStats unwraps matching item without losing fields', async () => {
    const rawFixture = loadFixture<ClubOverallStatsResponse>(
      'clubs-overall-stats',
    )
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(rawFixture), { status: 200 }),
    })

    const result = await client.clubs.overallStats({ clubId: '42' })

    expect(result).toEqual(rawFixture[0])
    expect(result?.wins).toBe('531')
    expect(result?.lastMatch0).toBe('1')
    expect(result?.lastOpponent0).toBe('43')
  })

  it('verifies members.stats returns exact raw fixture data', async () => {
    const rawFixture = loadFixture<ClubMemberStats>('members-stats')
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(rawFixture), { status: 200 }),
    })

    const result = await client.members.stats({ clubId: '42' })

    expect(result).toEqual(rawFixture)
    expect(result.members[0]?.name).toBe('mrjordan_237')
    expect(result.members[0]?.proOverallStr).toBe('86')
    expect((result.positionCount as { midfielder?: number }).midfielder).toBe(
      11,
    )
  })

  it('verifies members.careerStats returns exact raw fixture data', async () => {
    const rawFixture = loadFixture<ClubMemberCareerStats>(
      'members-career-stats',
    )
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(rawFixture), { status: 200 }),
    })

    const result = await client.members.careerStats({ clubId: '42' })

    expect(result).toEqual(rawFixture)
    expect(result.members[0]?.name).toBe('mrjordan237')
    expect(result.members[0]?.goals).toBe('352')
    expect((result.positionCount as { defender?: number }).defender).toBe(4)
  })

  it('verifies matches.list returns exact raw fixture data', async () => {
    const rawFixture = loadFixture<ClubMatchesResponse>('matches-list')
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(rawFixture), { status: 200 }),
    })

    const result = await client.matches.list({ clubId: '42' })

    expect(result).toEqual(rawFixture)
    expect(result[0]?.matchId).toBe('983294691180495')
    expect(result[0]?.timeAgo?.unit).toBe('days')
    expect(result[0]?.clubs?.['42']?.details?.name).toBe('ALL STAR 237')
    expect(result[0]?.players?.['42']?.['1001']?.playername).toBe(
      'mrjordan_237',
    )
    expect(result[0]?.aggregate?.['42']?.goals).toBe(4)
  })

  it('preserves unknown properties at multiple nesting depths', async () => {
    const payloadWithExtras = [
      {
        clubId: '42',
        clubName: 'ALL STAR 237',
        unknownTopLevel: 'preserved_value',
        nestedExtraObject: { deepKey: 123 },
        clubInfo: {
          name: 'ALL STAR 237',
          clubId: 42,
          unknownClubInfoField: true,
          customKit: {
            stadName: 'Stade de Wembley',
            unknownKitFeature: 'special_collar',
          },
        },
      },
    ]

    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(payloadWithExtras), { status: 200 }),
    })

    const result = await client.clubs.search({ name: 'ALL STAR 237' })
    type ExtendedSummary = ClubSummary & {
      unknownTopLevel?: string
      nestedExtraObject?: { deepKey: number }
      clubInfo?: ClubSummaryInfo & {
        unknownClubInfoField?: boolean
        customKit?: CustomKit & {
          unknownKitFeature?: string
        }
      }
    }
    const first = result[0] as ExtendedSummary

    expect(first.unknownTopLevel).toBe('preserved_value')
    expect(first.nestedExtraObject).toEqual({ deepKey: 123 })
    expect(first.clubInfo?.unknownClubInfoField).toBe(true)
    expect(first.clubInfo?.customKit?.unknownKitFeature).toBe('special_collar')
  })

  it('verifies static TypeScript type declarations match observed shapes', () => {
    expectTypeOf<ClubSummary>().toHaveProperty('clubId')
    expectTypeOf<ClubSummary>().toHaveProperty('gamesPlayedPlayoff')
    expectTypeOf<ClubSummary>().toHaveProperty('clubInfo')
    expectTypeOf<ClubSummaryInfo>().toHaveProperty('customKit')
    expectTypeOf<CustomKit>().toHaveProperty('stadName')
    expectTypeOf<CustomKit>().toHaveProperty('crestAssetId')

    expectTypeOf<ClubInfo>().toHaveProperty('name')
    expectTypeOf<ClubInfo>().toHaveProperty('customKit')

    expectTypeOf<ClubOverallStats>().toHaveProperty('bestDivision')
    expectTypeOf<ClubOverallStats>().toHaveProperty('lastOpponent0')
    expectTypeOf<ClubOverallStats>().toHaveProperty('wstreak')

    expectTypeOf<ClubMember>().toHaveProperty('winRate')
    expectTypeOf<ClubMember>().toHaveProperty('proOverallStr')
    expectTypeOf<ClubMember>().toHaveProperty('favoritePosition')

    expectTypeOf<ClubMatch>().toHaveProperty('matchId')
    expectTypeOf<ClubMatch>().toHaveProperty('timeAgo')
    expectTypeOf<ClubMatch>().toHaveProperty('clubs')
    expectTypeOf<ClubMatch>().toHaveProperty('players')
    expectTypeOf<ClubMatch>().toHaveProperty('aggregate')

    expectTypeOf<MatchTimeAgo>().toHaveProperty('number')
    expectTypeOf<MatchTimeAgo>().toHaveProperty('unit')
    expectTypeOf<MatchClubDetails>().toHaveProperty('winnerByDnf')
    expectTypeOf<MatchClubDetails>().toHaveProperty('details')
    expectTypeOf<MatchPlayerStats>().toHaveProperty('playername')
    expectTypeOf<MatchPlayerStats>().toHaveProperty('match_event_aggregate_0')
    expectTypeOf<MatchAggregateStats>().toHaveProperty('realtimegame')
  })
})
