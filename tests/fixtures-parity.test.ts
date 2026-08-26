import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
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
  ProClubsClient,
  type RankingEntry,
  type RankingListResponse,
  type PlayoffAchievementDerivedLabels,
  type PlayoffAchievement,
  type PlayoffAchievementsResponse,
  type RegionLabel,
  resolveRegionLabel,
} from '../src/index.js'

function loadFixture<T>(name: string): T {
  const raw = readFileSync(
    join(process.cwd(), 'tests', 'fixtures', `${name}.json`),
    'utf8',
  )
  // SAFETY: T matches the fixture schema verified by downstream assertions.
  return JSON.parse(raw) as T
}

function withRegionLabel<
  T extends { regionId?: string | number | null | undefined },
>(club: T): T & { regionLabel?: RegionLabel } {
  const regionLabel = resolveRegionLabel(club.regionId)
  if (regionLabel === undefined) {
    return { ...club }
  }
  return { ...club, regionLabel }
}

describe('Fixtures parity and client mapping', () => {
  it('verifies clubs.search preserves raw fields and adds regionLabel', async () => {
    const rawFixture = loadFixture<ClubSearchResponse>('clubs-search')
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(rawFixture), { status: 200 }),
    })

    const result = await client.clubs.search({ name: 'ALL STAR 237' })
    const expected = structuredClone(rawFixture)
    const firstSummary = expected[0]
    if (firstSummary?.clubInfo) {
      expected[0] = {
        ...firstSummary,
        clubInfo: withRegionLabel(firstSummary.clubInfo),
      }
    }

    expect(result).toEqual(expected)
    expect(result[0]?.clubId).toBe('42')
    expect(result[0]?.clubInfo?.regionId).toBe(5457237)
    expect(result[0]?.clubInfo?.regionLabel).toBe('Southern Europe')
    expect(result[0]?.clubInfo?.customKit?.stadName).toBe('Stade de Wembley')
    expect(rawFixture[0]?.clubInfo).not.toHaveProperty('regionLabel')
  })

  it('verifies clubs.get unwraps indexed envelope without losing any fields', async () => {
    const rawFixture = loadFixture<ClubInfoResponse>('clubs-get')
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(rawFixture), { status: 200 }),
    })

    const result = await client.clubs.get({ clubId: '42' })
    const selected = rawFixture['42']
    expect(selected).toBeDefined()
    if (!selected) {
      throw new Error('expected club 42 in clubs-get fixture')
    }

    expect(result).toEqual(withRegionLabel(selected))
    expect(result?.name).toBe('ALL STAR 237')
    expect(result?.regionId).toBe(5457237)
    expect(result?.regionLabel).toBe('Southern Europe')
    expect(result?.customKit?.crestAssetId).toBe('99140109')
    expect(selected).not.toHaveProperty('regionLabel')
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
    expect(result.positionCount?.['midfielder']).toBe(11)
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
    expect(result.positionCount?.['defender']).toBe(4)
  })

  it('verifies matches.list preserves raw fields and adds regionLabel on club details', async () => {
    const rawFixture = loadFixture<ClubMatchesResponse>('matches-list')
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(rawFixture), { status: 200 }),
    })

    const result = await client.matches.list({ clubId: '42' })
    const expected = structuredClone(rawFixture)
    const clubs = expected[0]?.clubs
    if (clubs) {
      for (const [clubId, details] of Object.entries(clubs)) {
        if (details.details) {
          clubs[clubId] = {
            ...details,
            details: withRegionLabel(details.details),
          }
        }
      }
    }

    expect(result).toEqual(expected)
    expect(result[0]?.matchId).toBe('100000000000001')
    expect(result[0]?.timeAgo?.unit).toBe('days')
    expect(result[0]?.clubs?.['42']?.details?.name).toBe('ALL STAR 237')
    expect(result[0]?.clubs?.['42']?.details?.regionLabel).toBe(
      'Southern Europe',
    )
    expect(result[0]?.players?.['42']?.['1001']?.playername).toBe(
      'mrjordan_237',
    )
    expect(result[0]?.aggregate?.['42']?.goals).toBe(4)
    expect(rawFixture[0]?.clubs?.['42']?.details).not.toHaveProperty(
      'regionLabel',
    )
  })

  it('verifies ranking methods preserve fixtures and enrich nested clubInfo', async () => {
    const fixtures = {
      allTime: loadFixture<RankingListResponse>('rankings-all-time'),
      searchAllTime: loadFixture<RankingListResponse>(
        'rankings-search-all-time',
      ),
      currentSeason: loadFixture<RankingListResponse>(
        'rankings-current-season',
      ),
      searchCurrentSeason: loadFixture<RankingListResponse>(
        'rankings-search-current-season',
      ),
    }
    const client = new ProClubsClient({
      transport: async (url) => {
        const pathname = new URL(url).pathname
        const fixture =
          pathname === '/api/fc/allTimeLeaderboard'
            ? fixtures.allTime
            : pathname === '/api/fc/allTimeLeaderboard/search'
              ? fixtures.searchAllTime
              : pathname === '/api/fc/currentSeasonLeaderboard'
                ? fixtures.currentSeason
                : fixtures.searchCurrentSeason
        return new Response(JSON.stringify(fixture), { status: 200 })
      },
    })

    const results = {
      allTime: await client.rankings.allTime(),
      searchAllTime: await client.rankings.searchAllTime({
        name: 'ALL STAR 237',
      }),
      currentSeason: await client.rankings.currentSeason(),
      searchCurrentSeason: await client.rankings.searchCurrentSeason({
        name: 'ALL STAR 237',
      }),
    }

    for (const key of [
      'allTime',
      'searchAllTime',
      'currentSeason',
      'searchCurrentSeason',
    ] as const) {
      const expected = fixtures[key].map((entry) =>
        entry.clubInfo
          ? { ...entry, clubInfo: withRegionLabel(entry.clubInfo) }
          : entry,
      )
      expect(results[key]).toEqual(expected)
      expect(results[key][0]?.clubInfo?.regionLabel).toBe('Southern Europe')
      expect(fixtures[key][0]?.clubInfo).not.toHaveProperty('regionLabel')
    }
  })

  it('verifies playoff achievements preserve raw fields and add labels', async () => {
    const rawFixture = loadFixture<PlayoffAchievementsResponse>(
      'playoff-achievements',
    )
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(rawFixture), { status: 200 }),
    })

    const result = await client.clubs.playoffAchievements({ clubId: '42' })
    const expected = rawFixture.map((achievement) => ({
      ...achievement,
      divisionLabel:
        achievement.bestDivision === '3' ? 'Division 2' : 'Division 3',
      finishLabel:
        achievement.bestFinishGroup === '1' ? 'Champion' : 'Runner-Up',
      seasonLabel: achievement.seasonId === '7' ? 'Season 7' : 'Season 6',
      clubInfo: achievement.clubInfo
        ? withRegionLabel(achievement.clubInfo)
        : undefined,
    }))

    expect(result).toEqual(expected)
    expect(result[0]).toMatchObject<Partial<PlayoffAchievement>>({
      seasonId: '7',
      bestDivision: '3',
      bestFinishGroup: '1',
      divisionLabel: 'Division 2',
      finishLabel: 'Champion',
      seasonLabel: 'Season 7',
    })
    expect(rawFixture[0]).not.toHaveProperty('seasonLabel')

    const collisionFixture = rawFixture.map((achievement, index) =>
      index === 0
        ? {
            ...achievement,
            divisionLabel: 'EA raw division label',
            finishLabel: 'EA raw finish label',
            seasonLabel: 'EA raw season label',
          }
        : achievement,
    )
    const collisionClient = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(collisionFixture), { status: 200 }),
    })
    const collisionResult = await collisionClient.clubs.playoffAchievements({
      clubId: '42',
    })
    const collisionExpected = collisionFixture.map((achievement) => {
      const expected = {
        ...achievement,
        clubInfo: achievement.clubInfo
          ? withRegionLabel(achievement.clubInfo)
          : undefined,
      }
      const derivedLabels: PlayoffAchievementDerivedLabels = {}

      if (achievement.divisionLabel === undefined) {
        expected.divisionLabel =
          achievement.bestDivision === '3' ? 'Division 2' : 'Division 3'
      } else {
        derivedLabels.divisionLabel =
          achievement.bestDivision === '3' ? 'Division 2' : 'Division 3'
      }

      if (achievement.finishLabel === undefined) {
        expected.finishLabel =
          achievement.bestFinishGroup === '1' ? 'Champion' : 'Runner-Up'
      } else {
        derivedLabels.finishLabel =
          achievement.bestFinishGroup === '1' ? 'Champion' : 'Runner-Up'
      }

      if (achievement.seasonLabel === undefined) {
        expected.seasonLabel =
          achievement.seasonId === '7' ? 'Season 7' : 'Season 6'
      } else {
        derivedLabels.seasonLabel =
          achievement.seasonId === '7' ? 'Season 7' : 'Season 6'
      }

      if (Object.keys(derivedLabels).length > 0) {
        expected.derivedLabels = derivedLabels
      }

      return expected
    })

    expect(collisionResult).toEqual(collisionExpected)
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
          regionId: 5457237,
          regionLabel: 'EA raw region label',
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
    const first = result[0]

    expect(first?.['unknownTopLevel']).toBe('preserved_value')
    expect(first?.['nestedExtraObject']).toEqual({ deepKey: 123 })
    expect(first?.clubInfo?.regionLabel).toBe('EA raw region label')
    expect(first?.clubInfo?.['unknownClubInfoField']).toBe(true)
    expect(first?.clubInfo?.customKit?.['unknownKitFeature']).toBe(
      'special_collar',
    )
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
    expectTypeOf<ClubInfo>().toHaveProperty('regionLabel')
    expectTypeOf<ClubSummaryInfo>().toHaveProperty('regionLabel')
    expectTypeOf<ClubInfo['regionLabel']>().toEqualTypeOf<string | undefined>()

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

    expectTypeOf<RankingEntry>().toHaveProperty('rank')
    expectTypeOf<RankingEntry>().toHaveProperty('goalsPerGame')
    expectTypeOf<RankingEntry>().toHaveProperty('clubId')
    expectTypeOf<PlayoffAchievement>().toHaveProperty('seasonId')
    expectTypeOf<PlayoffAchievement>().toHaveProperty('seasonName')
    expectTypeOf<PlayoffAchievement>().toHaveProperty('bestDivision')
    expectTypeOf<PlayoffAchievement>().toHaveProperty('bestFinishGroup')
    expectTypeOf<PlayoffAchievement>().toHaveProperty('divisionLabel')
    expectTypeOf<PlayoffAchievement>().toHaveProperty('finishLabel')
    expectTypeOf<PlayoffAchievement>().toHaveProperty('seasonLabel')
    expectTypeOf<PlayoffAchievement['divisionLabel']>().toEqualTypeOf<
      string | undefined
    >()
    expectTypeOf<PlayoffAchievement['finishLabel']>().toEqualTypeOf<
      string | undefined
    >()
    expectTypeOf<PlayoffAchievement>().toHaveProperty('derivedLabels')
    expectTypeOf<PlayoffAchievement['derivedLabels']>().toEqualTypeOf<
      PlayoffAchievementDerivedLabels | undefined
    >()
  })

  it('declares precise union types for string | number | null and id fields', () => {
    // idSchema: string | number (club identifiers, match identifiers)
    expectTypeOf<ClubSummary['clubId']>().toEqualTypeOf<string | number>()
    expectTypeOf<ClubInfo['clubId']>().toEqualTypeOf<
      string | number | undefined
    >()
    expectTypeOf<ClubOverallStats['clubId']>().toEqualTypeOf<
      string | number | undefined
    >()
    expectTypeOf<ClubMatch['matchId']>().toEqualTypeOf<
      string | number | undefined
    >()

    // numberLikeSchema: string | number | null (volatile EA numerics)
    expectTypeOf<CustomKit['kitId']>().toEqualTypeOf<
      string | number | null | undefined
    >()
    expectTypeOf<ClubSummaryInfo['regionId']>().toEqualTypeOf<
      string | number | null | undefined
    >()
    expectTypeOf<MatchPlayerStats['rating']>().toEqualTypeOf<
      string | number | null | undefined
    >()
    expectTypeOf<RankingEntry['rank']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<RankingEntry['goalsPerGame']>().toEqualTypeOf<
      string | number | null | undefined
    >()
    expectTypeOf<RankingEntry['clubId']>().toEqualTypeOf<string | number>()

    expectTypeOf<PlayoffAchievement['seasonId']>().toEqualTypeOf<
      string | number | null
    >()
    expectTypeOf<PlayoffAchievement['seasonName']>().toEqualTypeOf<string>()
    expectTypeOf<PlayoffAchievement['bestDivision']>().toEqualTypeOf<
      string | number | null
    >()
    expectTypeOf<PlayoffAchievement['bestFinishGroup']>().toEqualTypeOf<
      string | number | null
    >()

    // Nested resource references keep their precise optional shape.
    expectTypeOf<ClubSummaryInfo['customKit']>().toEqualTypeOf<
      CustomKit | undefined
    >()
  })
})
