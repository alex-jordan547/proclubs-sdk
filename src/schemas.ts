import { z } from 'zod'

import { MATCH_TYPES, PLATFORMS } from './constants.js'

const idSchema = z.union([z.string(), z.number()])
const numberLikeSchema = z.union([z.string(), z.number(), z.null()])

export const searchClubsInputSchema = z.object({
  name: z.string().trim().min(1).max(32),
  platform: z.enum(PLATFORMS).optional(),
})

export const clubRequestSchema = z.object({
  clubId: z.union([z.string().trim().min(1), z.number().int()]),
  platform: z.enum(PLATFORMS).optional(),
})

export const listMatchesInputSchema = clubRequestSchema.extend({
  type: z.enum(MATCH_TYPES).optional(),
  limit: z.number().int().min(1).max(10).optional(),
})

export const clubSummarySchema = z.looseObject({
  clubId: idSchema,
  clubName: z.string().optional(),
  platform: z.string().optional(),
  wins: numberLikeSchema.optional(),
  losses: numberLikeSchema.optional(),
  ties: numberLikeSchema.optional(),
  gamesPlayed: numberLikeSchema.optional(),
  clubInfo: z.looseObject({}).optional(),
})

export const clubSearchResponseSchema = z.array(clubSummarySchema)

export const clubInfoSchema = z.looseObject({
  clubId: idSchema.optional(),
  name: z.string().optional(),
  regionId: numberLikeSchema.optional(),
  teamId: numberLikeSchema.optional(),
  customKit: z.looseObject({}).optional(),
})

export const clubInfoResponseSchema = z.record(z.string(), clubInfoSchema)

export const clubOverallStatsSchema = z.looseObject({
  clubId: idSchema.optional(),
  wins: numberLikeSchema.optional(),
  losses: numberLikeSchema.optional(),
  ties: numberLikeSchema.optional(),
  gamesPlayed: numberLikeSchema.optional(),
})

export const clubOverallStatsResponseSchema = z.array(clubOverallStatsSchema)

export const clubMemberSchema = z.looseObject({
  name: z.string().optional(),
  gamesPlayed: numberLikeSchema.optional(),
  goals: numberLikeSchema.optional(),
  assists: numberLikeSchema.optional(),
  ratingAve: numberLikeSchema.optional(),
})

export const clubMemberStatsSchema = z.looseObject({
  members: z.array(clubMemberSchema).default([]),
  positionCount: z.record(z.string(), z.number()).default({}),
})

export const clubMatchSchema = z.looseObject({
  matchId: idSchema.optional(),
  timestamp: numberLikeSchema.optional(),
  clubs: z.record(z.string(), z.unknown()).optional(),
  players: z.record(z.string(), z.unknown()).optional(),
  aggregate: z.record(z.string(), z.unknown()).optional(),
})

export const clubMatchesResponseSchema = z.array(clubMatchSchema)

export type SearchClubsInput = z.input<typeof searchClubsInputSchema>
export type ClubRequest = z.input<typeof clubRequestSchema>
export type ListMatchesInput = z.input<typeof listMatchesInputSchema>
export type ClubSummary = z.output<typeof clubSummarySchema>
export type ClubInfo = z.output<typeof clubInfoSchema>
export type ClubOverallStats = z.output<typeof clubOverallStatsSchema>
export type ClubMember = z.output<typeof clubMemberSchema>
export type ClubMemberStats = z.output<typeof clubMemberStatsSchema>
export type ClubMemberCareerStats = ClubMemberStats
export type ClubMatch = z.output<typeof clubMatchSchema>
