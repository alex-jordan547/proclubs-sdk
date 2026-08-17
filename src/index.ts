export const GAME_PROFILES = ['fc26'] as const
export type GameProfile = (typeof GAME_PROFILES)[number]

export const PLATFORMS = ['common-gen5', 'common-gen4', 'nx'] as const
export type Platform = (typeof PLATFORMS)[number]

export const MATCH_TYPES = [
  'friendlyMatch',
  'leagueMatch',
  'playoffMatch',
] as const
export type MatchType = (typeof MATCH_TYPES)[number]
