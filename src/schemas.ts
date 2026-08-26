import { z } from 'zod'

import { MATCH_TYPES, PLATFORMS } from './constants.js'
import {
  resolveDivisionLabel,
  resolvePlayoffResultLabel,
  resolveSeasonLabel,
  type DivisionLabel,
  type PlayoffResultLabel,
} from './metadata.js'
import { resolveRegionLabel, type RegionLabel } from './regions.js'

const idSchema = z.union([z.string(), z.number()])
const numberLikeSchema = z.union([z.string(), z.number(), z.null()])

export const searchClubsInputSchema = z.object({
  name: z.string().trim().min(1).max(32),
  platform: z.enum(PLATFORMS).optional(),
})

export const rankingListInputSchema = z.object({
  platform: z.enum(PLATFORMS).optional(),
})

export const rankingSearchInputSchema = searchClubsInputSchema

export const clubRequestSchema = z.object({
  clubId: z.union([z.string().trim().min(1), z.number().int()]),
  platform: z.enum(PLATFORMS).optional(),
})

export const playoffAchievementsInputSchema = clubRequestSchema

export const listMatchesInputSchema = clubRequestSchema.extend({
  type: z.enum(MATCH_TYPES).optional(),
  limit: z.number().int().min(1).max(10).optional(),
})

export const customKitSchema = z.looseObject({
  stadName: z.string().optional(),
  kitId: numberLikeSchema.optional(),
  seasonalTeamId: numberLikeSchema.optional(),
  seasonalKitId: numberLikeSchema.optional(),
  selectedKitType: numberLikeSchema.optional(),
  customKitId: numberLikeSchema.optional(),
  customAwayKitId: numberLikeSchema.optional(),
  customThirdKitId: numberLikeSchema.optional(),
  customKeeperKitId: numberLikeSchema.optional(),
  kitColor1: numberLikeSchema.optional(),
  kitColor2: numberLikeSchema.optional(),
  kitColor3: numberLikeSchema.optional(),
  kitColor4: numberLikeSchema.optional(),
  kitAColor1: numberLikeSchema.optional(),
  kitAColor2: numberLikeSchema.optional(),
  kitAColor3: numberLikeSchema.optional(),
  kitAColor4: numberLikeSchema.optional(),
  kitThrdColor1: numberLikeSchema.optional(),
  kitThrdColor2: numberLikeSchema.optional(),
  kitThrdColor3: numberLikeSchema.optional(),
  kitThrdColor4: numberLikeSchema.optional(),
  dCustomKit: numberLikeSchema.optional(),
  crestColor: numberLikeSchema.optional(),
  crestAssetId: numberLikeSchema.optional(),
})

const clubInfoObjectSchema = z.looseObject({
  name: z.string().optional(),
  clubId: idSchema.optional(),
  regionId: numberLikeSchema.optional(),
  teamId: numberLikeSchema.optional(),
  customKit: customKitSchema.optional(),
})

type ClubInfoObject = z.output<typeof clubInfoObjectSchema>
type ClubInfoWithRegionLabel = ClubInfoObject & { regionLabel?: RegionLabel }

function enrichClubRegion(club: ClubInfoObject): ClubInfoWithRegionLabel {
  const enriched: ClubInfoWithRegionLabel = { ...club }
  delete enriched.regionLabel

  const regionLabel = resolveRegionLabel(enriched.regionId)
  if (regionLabel === undefined) {
    return enriched
  }
  enriched.regionLabel = regionLabel
  return enriched
}

export const clubInfoSchema = clubInfoObjectSchema.transform(enrichClubRegion)
export const clubSummaryInfoSchema = clubInfoSchema

export const clubSummarySchema = z.looseObject({
  clubId: idSchema,
  clubName: z.string().optional(),
  platform: z.string().optional(),
  wins: numberLikeSchema.optional(),
  losses: numberLikeSchema.optional(),
  ties: numberLikeSchema.optional(),
  gamesPlayed: numberLikeSchema.optional(),
  gamesPlayedPlayoff: numberLikeSchema.optional(),
  goals: numberLikeSchema.optional(),
  goalsAgainst: numberLikeSchema.optional(),
  cleanSheets: numberLikeSchema.optional(),
  points: numberLikeSchema.optional(),
  reputationtier: numberLikeSchema.optional(),
  promotions: numberLikeSchema.optional(),
  relegations: numberLikeSchema.optional(),
  bestDivision: numberLikeSchema.optional(),
  currentDivision: numberLikeSchema.optional(),
  clubInfo: clubSummaryInfoSchema.optional(),
})

export const clubSearchResponseSchema = z.array(clubSummarySchema)

export const rankingEntrySchema = clubSummarySchema.extend({
  rank: z.number().optional(),
  skillRating: numberLikeSchema.optional(),
  reputationlevel: numberLikeSchema.optional(),
  bestFinishGroup: numberLikeSchema.optional(),
  goalsPerGame: numberLikeSchema.optional(),
  goalsAgainstPerGame: numberLikeSchema.optional(),
})

export const rankingListResponseSchema = z.array(rankingEntrySchema)

const playoffAchievementObjectSchema = z.looseObject({
  seasonId: numberLikeSchema,
  seasonName: z.string(),
  bestDivision: numberLikeSchema,
  bestFinishGroup: numberLikeSchema,
  clubInfo: clubSummaryInfoSchema.optional(),
})

type PlayoffAchievementObject = z.output<typeof playoffAchievementObjectSchema>
type PlayoffAchievementWithLabels = PlayoffAchievementObject & {
  divisionLabel?: DivisionLabel
  finishLabel?: PlayoffResultLabel
  seasonLabel?: string
}

function enrichPlayoffAchievement(
  achievement: PlayoffAchievementObject,
): PlayoffAchievementWithLabels {
  const enriched: PlayoffAchievementWithLabels = { ...achievement }

  const divisionLabel = resolveDivisionLabel(enriched.bestDivision)
  if (divisionLabel !== undefined && enriched.divisionLabel === undefined) {
    enriched.divisionLabel = divisionLabel
  }

  const finishLabel = resolvePlayoffResultLabel(enriched.bestFinishGroup)
  if (finishLabel !== undefined && enriched.finishLabel === undefined) {
    enriched.finishLabel = finishLabel
  }

  const seasonLabel = resolveSeasonLabel(enriched.seasonName, enriched.seasonId)
  if (seasonLabel !== undefined && enriched.seasonLabel === undefined) {
    enriched.seasonLabel = seasonLabel
  }

  return enriched
}

export const playoffAchievementSchema =
  playoffAchievementObjectSchema.transform(enrichPlayoffAchievement)
export const playoffAchievementsResponseSchema = z.array(
  playoffAchievementSchema,
)

export const clubInfoResponseSchema = z.record(z.string(), clubInfoSchema)

export const clubOverallStatsSchema = z.looseObject({
  clubId: idSchema.optional(),
  bestDivision: numberLikeSchema.optional(),
  bestFinishGroup: numberLikeSchema.optional(),
  finishesInDivision1Group1: numberLikeSchema.optional(),
  finishesInDivision2Group1: numberLikeSchema.optional(),
  finishesInDivision3Group1: numberLikeSchema.optional(),
  finishesInDivision4Group1: numberLikeSchema.optional(),
  finishesInDivision5Group1: numberLikeSchema.optional(),
  finishesInDivision6Group1: numberLikeSchema.optional(),
  gamesPlayed: numberLikeSchema.optional(),
  gamesPlayedPlayoff: numberLikeSchema.optional(),
  goals: numberLikeSchema.optional(),
  goalsAgainst: numberLikeSchema.optional(),
  promotions: numberLikeSchema.optional(),
  relegations: numberLikeSchema.optional(),
  losses: numberLikeSchema.optional(),
  ties: numberLikeSchema.optional(),
  wins: numberLikeSchema.optional(),
  lastMatch0: numberLikeSchema.optional(),
  lastMatch1: numberLikeSchema.optional(),
  lastMatch2: numberLikeSchema.optional(),
  lastMatch3: numberLikeSchema.optional(),
  lastMatch4: numberLikeSchema.optional(),
  lastMatch5: numberLikeSchema.optional(),
  lastMatch6: numberLikeSchema.optional(),
  lastMatch7: numberLikeSchema.optional(),
  lastMatch8: numberLikeSchema.optional(),
  lastMatch9: numberLikeSchema.optional(),
  lastOpponent0: idSchema.optional(),
  lastOpponent1: idSchema.optional(),
  lastOpponent2: idSchema.optional(),
  lastOpponent3: idSchema.optional(),
  lastOpponent4: idSchema.optional(),
  lastOpponent5: idSchema.optional(),
  lastOpponent6: idSchema.optional(),
  lastOpponent7: idSchema.optional(),
  lastOpponent8: idSchema.optional(),
  lastOpponent9: idSchema.optional(),
  wstreak: numberLikeSchema.optional(),
  unbeatenstreak: numberLikeSchema.optional(),
  skillRating: numberLikeSchema.optional(),
  reputationtier: numberLikeSchema.optional(),
  leagueAppearances: numberLikeSchema.optional(),
})

export const clubOverallStatsResponseSchema = z.array(clubOverallStatsSchema)

export const clubMemberSchema = z.looseObject({
  name: z.string().optional(),
  gamesPlayed: numberLikeSchema.optional(),
  winRate: numberLikeSchema.optional(),
  goals: numberLikeSchema.optional(),
  assists: numberLikeSchema.optional(),
  cleanSheetsDef: numberLikeSchema.optional(),
  cleanSheetsGK: numberLikeSchema.optional(),
  shotSuccessRate: numberLikeSchema.optional(),
  passesMade: numberLikeSchema.optional(),
  passSuccessRate: numberLikeSchema.optional(),
  ratingAve: numberLikeSchema.optional(),
  tacklesMade: numberLikeSchema.optional(),
  tackleSuccessRate: numberLikeSchema.optional(),
  proName: z.string().optional(),
  proPos: z.string().optional(),
  proStyle: numberLikeSchema.optional(),
  proHeight: numberLikeSchema.optional(),
  proNationality: numberLikeSchema.optional(),
  proOverall: numberLikeSchema.optional(),
  proOverallStr: z.string().optional(),
  manOfTheMatch: numberLikeSchema.optional(),
  redCards: numberLikeSchema.optional(),
  prevGoals: numberLikeSchema.optional(),
  prevGoals1: numberLikeSchema.optional(),
  prevGoals2: numberLikeSchema.optional(),
  prevGoals3: numberLikeSchema.optional(),
  prevGoals4: numberLikeSchema.optional(),
  prevGoals5: numberLikeSchema.optional(),
  prevGoals6: numberLikeSchema.optional(),
  prevGoals7: numberLikeSchema.optional(),
  prevGoals8: numberLikeSchema.optional(),
  prevGoals9: numberLikeSchema.optional(),
  prevGoals10: numberLikeSchema.optional(),
  favoritePosition: z.string().optional(),
})

export const clubMemberStatsSchema = z.looseObject({
  members: z.array(clubMemberSchema),
  positionCount: z.record(z.string(), z.number()),
})

export const matchTimeAgoSchema = z.looseObject({
  number: z.number().optional(),
  unit: z.string().optional(),
})

export const matchClubDetailsSchema = z.looseObject({
  date: numberLikeSchema.optional(),
  gameNumber: numberLikeSchema.optional(),
  goals: numberLikeSchema.optional(),
  goalsAgainst: numberLikeSchema.optional(),
  losses: numberLikeSchema.optional(),
  matchType: numberLikeSchema.optional(),
  result: numberLikeSchema.optional(),
  score: numberLikeSchema.optional(),
  season_id: numberLikeSchema.optional(),
  TEAM: numberLikeSchema.optional(),
  ties: numberLikeSchema.optional(),
  winnerByDnf: numberLikeSchema.optional(),
  wins: numberLikeSchema.optional(),
  details: clubInfoSchema.optional(),
})

export const matchPlayerStatsSchema = z.looseObject({
  playername: z.string().optional(),
  pos: z.string().optional(),
  rating: numberLikeSchema.optional(),
  goals: numberLikeSchema.optional(),
  assists: numberLikeSchema.optional(),
  shots: numberLikeSchema.optional(),
  saves: numberLikeSchema.optional(),
  passesmade: numberLikeSchema.optional(),
  passattempts: numberLikeSchema.optional(),
  tacklesmade: numberLikeSchema.optional(),
  tackleattempts: numberLikeSchema.optional(),
  redcards: numberLikeSchema.optional(),
  mom: numberLikeSchema.optional(),
  archetypeid: numberLikeSchema.optional(),
  cleansheetsany: numberLikeSchema.optional(),
  cleansheetsdef: numberLikeSchema.optional(),
  cleansheetsgk: numberLikeSchema.optional(),
  secondsPlayed: numberLikeSchema.optional(),
  gameTime: numberLikeSchema.optional(),
  realtimegame: numberLikeSchema.optional(),
  realtimeidle: numberLikeSchema.optional(),
  SCORE: numberLikeSchema.optional(),
  wins: numberLikeSchema.optional(),
  losses: numberLikeSchema.optional(),
  vproattr: z.string().optional(),
  vprohackreason: numberLikeSchema.optional(),
  ballDiveSaves: numberLikeSchema.optional(),
  crossSaves: numberLikeSchema.optional(),
  goalsconceded: numberLikeSchema.optional(),
  goodDirectionSaves: numberLikeSchema.optional(),
  namespace: numberLikeSchema.optional(),
  parrySaves: numberLikeSchema.optional(),
  punchSaves: numberLikeSchema.optional(),
  reflexSaves: numberLikeSchema.optional(),
  userResult: numberLikeSchema.optional(),
  match_event_aggregate_0: z.string().optional(),
  match_event_aggregate_1: z.string().optional(),
  match_event_aggregate_2: z.string().optional(),
  match_event_aggregate_3: z.string().optional(),
})

export const matchAggregateStatsSchema = z.looseObject({
  archetypeid: numberLikeSchema.optional(),
  assists: numberLikeSchema.optional(),
  ballDiveSaves: numberLikeSchema.optional(),
  cleansheetsany: numberLikeSchema.optional(),
  cleansheetsdef: numberLikeSchema.optional(),
  cleansheetsgk: numberLikeSchema.optional(),
  crossSaves: numberLikeSchema.optional(),
  gameTime: numberLikeSchema.optional(),
  goals: numberLikeSchema.optional(),
  goalsconceded: numberLikeSchema.optional(),
  goodDirectionSaves: numberLikeSchema.optional(),
  losses: numberLikeSchema.optional(),
  match_event_aggregate_0: numberLikeSchema.optional(),
  match_event_aggregate_1: numberLikeSchema.optional(),
  match_event_aggregate_2: numberLikeSchema.optional(),
  match_event_aggregate_3: numberLikeSchema.optional(),
  mom: numberLikeSchema.optional(),
  namespace: numberLikeSchema.optional(),
  parrySaves: numberLikeSchema.optional(),
  passattempts: numberLikeSchema.optional(),
  passesmade: numberLikeSchema.optional(),
  pos: numberLikeSchema.optional(),
  punchSaves: numberLikeSchema.optional(),
  rating: numberLikeSchema.optional(),
  realtimegame: numberLikeSchema.optional(),
  realtimeidle: numberLikeSchema.optional(),
  redcards: numberLikeSchema.optional(),
  reflexSaves: numberLikeSchema.optional(),
  saves: numberLikeSchema.optional(),
  SCORE: numberLikeSchema.optional(),
  secondsPlayed: numberLikeSchema.optional(),
  shots: numberLikeSchema.optional(),
  tackleattempts: numberLikeSchema.optional(),
  tacklesmade: numberLikeSchema.optional(),
  userResult: numberLikeSchema.optional(),
  vproattr: numberLikeSchema.optional(),
  vprohackreason: numberLikeSchema.optional(),
  wins: numberLikeSchema.optional(),
})

export const clubMatchSchema = z.looseObject({
  matchId: idSchema.optional(),
  timestamp: numberLikeSchema.optional(),
  timeAgo: matchTimeAgoSchema.optional(),
  clubs: z.record(z.string(), matchClubDetailsSchema).optional(),
  players: z
    .record(z.string(), z.record(z.string(), matchPlayerStatsSchema))
    .optional(),
  aggregate: z.record(z.string(), matchAggregateStatsSchema).optional(),
})

export const clubMatchesResponseSchema = z.array(clubMatchSchema)

export type SearchClubsInput = z.input<typeof searchClubsInputSchema>
export type RankingListInput = z.input<typeof rankingListInputSchema>
export type RankingSearchInput = z.input<typeof rankingSearchInputSchema>
export type ClubRequest = z.input<typeof clubRequestSchema>
export type ListMatchesInput = z.input<typeof listMatchesInputSchema>
export type CustomKit = z.output<typeof customKitSchema>
export type ClubSummaryInfo = z.output<typeof clubSummaryInfoSchema>
export type ClubSummary = z.output<typeof clubSummarySchema>
export type ClubSearchResponse = z.output<typeof clubSearchResponseSchema>
export type RankingEntry = z.output<typeof rankingEntrySchema>
export type RankingListResponse = z.output<typeof rankingListResponseSchema>
export type PlayoffAchievementsInput = z.input<
  typeof playoffAchievementsInputSchema
>
export type PlayoffAchievement = z.output<typeof playoffAchievementSchema>
export type PlayoffAchievementsResponse = z.output<
  typeof playoffAchievementsResponseSchema
>
export type ClubInfo = z.output<typeof clubInfoSchema>
export type ClubInfoResponse = z.output<typeof clubInfoResponseSchema>
export type ClubOverallStats = z.output<typeof clubOverallStatsSchema>
export type ClubOverallStatsResponse = z.output<
  typeof clubOverallStatsResponseSchema
>
export type ClubMember = z.output<typeof clubMemberSchema>
export type ClubMemberStats = z.output<typeof clubMemberStatsSchema>
export type ClubMemberCareerStats = ClubMemberStats
export type MatchTimeAgo = z.output<typeof matchTimeAgoSchema>
export type MatchClubDetails = z.output<typeof matchClubDetailsSchema>
export type MatchPlayerStats = z.output<typeof matchPlayerStatsSchema>
export type MatchAggregateStats = z.output<typeof matchAggregateStatsSchema>
export type ClubMatch = z.output<typeof clubMatchSchema>
export type ClubMatchesResponse = z.output<typeof clubMatchesResponseSchema>
