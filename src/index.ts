export { ProClubsClient } from './client.js'
export type {
  ProClubsCacheMode,
  ProClubsCacheOptions,
} from './cache.js'
export type {
  ProClubsEvent,
  ProClubsEventHandler,
} from './events.js'
export type {
  ProClubsClientOptions,
  ProClubsRequestInit,
  ProClubsRequestOptions,
  ProClubsResponse,
  ProClubsTransport,
} from './client.js'
export {
  DEFAULT_PLATFORM,
  MATCH_TYPES,
  PLATFORMS,
} from './constants.js'
export type {
  Endpoint,
  MatchType,
  Platform,
  ProClubsEndpoint,
} from './constants.js'
export { REGION_LABELS, resolveRegionLabel } from './regions.js'
export type { KnownRegionId, RegionLabel } from './regions.js'
export {
  DIVISION_LABELS,
  MATCH_TYPE_LABELS,
  MATCH_TYPE_RESPONSE_LABELS,
  PLATFORM_LABELS,
  PLAYOFF_RESULT_LABELS,
  POSITION_LABELS,
  REPUTATION_LABELS,
  resolveDivisionLabel,
  resolveMatchTypeLabel,
  resolvePlatformLabel,
  resolvePlayoffResultLabel,
  resolvePositionLabel,
  resolveReputationLabel,
  resolveSeasonLabel,
} from './metadata.js'
export type {
  DivisionLabel,
  KnownDivisionId,
  KnownMatchTypeId,
  KnownMatchTypeResponseId,
  KnownPlatformId,
  KnownPlayoffResultId,
  KnownPositionId,
  KnownReputationId,
  MatchTypeLabel,
  PlatformLabel,
  PlayoffResultLabel,
  PositionLabel,
  ReputationLabel,
} from './metadata.js'
export { EA_CREST_ASSET_BASE_URL, resolveClubCrestUrl } from './crests.js'
export type { ClubCrestInput } from './crests.js'
export {
  ProClubsAbortError,
  ProClubsError,
  ProClubsHttpError,
  ProClubsNetworkError,
  ProClubsResponseError,
  ProClubsTimeoutError,
  ProClubsValidationError,
} from './errors.js'
export type {
  ProClubsErrorCode,
  ProClubsHttpErrorOptions,
} from './errors.js'
export {
  clubInfoResponseSchema,
  clubInfoSchema,
  clubMatchesResponseSchema,
  clubMatchSchema,
  clubMemberSchema,
  clubMemberStatsSchema,
  clubOverallStatsResponseSchema,
  clubOverallStatsSchema,
  clubSearchResponseSchema,
  clubSummaryInfoSchema,
  clubSummarySchema,
  customKitSchema,
  listMatchesInputSchema,
  matchAggregateStatsSchema,
  matchClubDetailsSchema,
  matchPlayerStatsSchema,
  matchTimeAgoSchema,
  rankingEntrySchema,
  rankingListInputSchema,
  rankingListResponseSchema,
  rankingSearchInputSchema,
  playoffAchievementSchema,
  playoffAchievementsInputSchema,
  playoffAchievementsResponseSchema,
  clubRequestSchema,
  searchClubsInputSchema,
} from './schemas.js'
export type {
  ClubInfo,
  ClubInfoDerivedLabels,
  ClubInfoResponse,
  ClubMatch,
  ClubMatchesResponse,
  ClubMember,
  ClubMemberCareerStats,
  ClubMemberStats,
  ClubOverallStats,
  ClubOverallStatsResponse,
  ClubRequest,
  ClubSearchResponse,
  ClubSummary,
  ClubSummaryInfo,
  CustomKit,
  ListMatchesInput,
  MatchAggregateStats,
  MatchClubDetails,
  MatchPlayerStats,
  MatchTimeAgo,
  RankingEntry,
  RankingListInput,
  RankingListResponse,
  RankingSearchInput,
  PlayoffAchievement,
  PlayoffAchievementDerivedLabels,
  PlayoffAchievementsInput,
  PlayoffAchievementsResponse,
  SearchClubsInput,
} from './schemas.js'
export {
  ENDPOINT_CONTRACTS,
  classifyRecommendation,
  detectDrift,
  generateReport,
} from './drift.js'
export type {
  CompatibilityReport,
  DriftIssue,
  DriftIssueKind,
  EndpointDriftResult,
  EndpointDriftResults,
  FieldContract,
  JsonValue,
  PayloadContract,
} from './drift.js'
export { runCompatibilityCheck } from './compatibility.js'
export type {
  CompatibilityCheckResult,
  CompatibilityRunnerOptions,
} from './compatibility.js'
