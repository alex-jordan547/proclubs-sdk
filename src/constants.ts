export const PLATFORMS = ['common-gen5', 'common-gen4', 'nx'] as const
export type Platform = (typeof PLATFORMS)[number]

/**
 * Platforms EA no longer serves. Since the FC 27 switchover, EA rejects
 * `common-gen4` with HTTP 400 on every endpoint. The value stays in
 * `PLATFORMS` so existing code keeps compiling.
 */
export const DEPRECATED_PLATFORMS: readonly Platform[] = ['common-gen4']

export const MATCH_TYPES = [
  'friendlyMatch',
  'leagueMatch',
  'playoffMatch',
] as const
export type MatchType = (typeof MATCH_TYPES)[number]

export const DEFAULT_PLATFORM: Platform = 'common-gen5'

export const EA_BASE_URL = new URL('https://proclubs.ea.com/api/fc/')

export const EA_ROUTES = {
  clubsSearch: 'allTimeLeaderboard/search',
  clubsGet: 'clubs/info',
  clubsOverallStats: 'clubs/overallStats',
  clubsPlayoffAchievements: 'club/playoffAchievements',
  rankingsAllTime: 'allTimeLeaderboard',
  rankingsSearchAllTime: 'allTimeLeaderboard/search',
  rankingsCurrentSeason: 'currentSeasonLeaderboard',
  rankingsSearchCurrentSeason: 'currentSeasonLeaderboard/search',
  membersStats: 'members/stats',
  membersCareerStats: 'members/career/stats',
  matchesList: 'clubs/matches',
} as const

export type ProClubsEndpoint = keyof typeof EA_ROUTES
export type Endpoint = ProClubsEndpoint
