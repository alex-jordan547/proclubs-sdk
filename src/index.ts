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
  clubRequestSchema,
  searchClubsInputSchema,
} from './schemas.js'
export type {
  ClubInfo,
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
  SearchClubsInput,
} from './schemas.js'
export {
  ENDPOINT_CONTRACTS,
  classifyRecommendation,
  detectDrift,
  generateReport,
} from './drift.js'
export type {
  AllowedType,
  CompatibilityReport,
  ContractNode,
  DriftIssue,
  DriftIssueKind,
  EndpointDriftResult,
  ShapeContract,
} from './drift.js'
export { runCompatibilityCheck } from './compatibility.js'
export type {
  CompatibilityCheckResult,
  CompatibilityRunnerOptions,
} from './compatibility.js'
