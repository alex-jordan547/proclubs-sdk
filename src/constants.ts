export const PLATFORMS = ['common-gen5', 'common-gen4', 'nx'] as const
export type Platform = (typeof PLATFORMS)[number]

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
  membersStats: 'members/stats',
  membersCareerStats: 'members/career/stats',
  matchesList: 'clubs/matches',
} as const

export type Endpoint = keyof typeof EA_ROUTES
