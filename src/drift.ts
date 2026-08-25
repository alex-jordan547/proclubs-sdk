import type { Endpoint, Platform } from './constants.js'
import { resolveRegionLabel } from './regions.js'

export type AllowedType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'numberLike' // string | number | null
  | 'id' // string | number
  | 'array'
  | 'object'
  | 'record'

export type DriftIssueKind =
  | 'field_added'
  | 'field_removed'
  | 'type_changed'
  | 'envelope_changed'
  | 'unknown_value'

export interface DriftIssue {
  readonly kind: DriftIssueKind
  readonly path: string
  readonly message: string
  readonly expected?: string
  readonly actual?: string
}

export type JsonPrimitive = string | number | boolean | null
export type JsonObject = { readonly [key: string]: JsonValue }
export type JsonArray = readonly JsonValue[]
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

export type FieldContractMap = Record<string, FieldContract>

export interface FieldContract {
  readonly types: readonly AllowedType[]
  readonly required?: boolean
  readonly elementContract?: PayloadContract
  readonly fields?: FieldContractMap
  readonly recordValueContract?: PayloadContract
  readonly recordValueTypes?: readonly AllowedType[]
}

export interface PayloadContract {
  readonly kind: 'array' | 'object' | 'record'
  readonly required?: boolean
  readonly elementContract?: PayloadContract
  readonly fields?: FieldContractMap
  readonly recordValueContract?: PayloadContract
  readonly recordValueTypes?: readonly AllowedType[]
}

export interface EndpointDriftResult {
  readonly endpoint: Endpoint
  readonly status: 'passed' | 'drifted' | 'unverified'
  readonly issues: readonly DriftIssue[]
  readonly itemCount?: number
}

export type EndpointDriftResults = {
  [E in Endpoint]: EndpointDriftResult
}

export interface CompatibilityReport {
  readonly timestamp: string
  readonly platform: Platform
  readonly summary: {
    readonly status: 'supported' | 'drifted' | 'stopped' | 'unverified'
    readonly recommendation: 'patch' | 'minor' | 'major' | 'manual_review'
  }
  readonly endpoints: EndpointDriftResults
}

type EndpointContracts = {
  readonly [E in Endpoint]: PayloadContract
}

const customKitFields = {
  stadName: { types: ['string'] },
  kitId: { types: ['numberLike'] },
  seasonalTeamId: { types: ['numberLike'] },
  seasonalKitId: { types: ['numberLike'] },
  selectedKitType: { types: ['numberLike'] },
  customKitId: { types: ['numberLike'] },
  customAwayKitId: { types: ['numberLike'] },
  customThirdKitId: { types: ['numberLike'] },
  customKeeperKitId: { types: ['numberLike'] },
  kitColor1: { types: ['numberLike'] },
  kitColor2: { types: ['numberLike'] },
  kitColor3: { types: ['numberLike'] },
  kitColor4: { types: ['numberLike'] },
  kitAColor1: { types: ['numberLike'] },
  kitAColor2: { types: ['numberLike'] },
  kitAColor3: { types: ['numberLike'] },
  kitAColor4: { types: ['numberLike'] },
  kitThrdColor1: { types: ['numberLike'] },
  kitThrdColor2: { types: ['numberLike'] },
  kitThrdColor3: { types: ['numberLike'] },
  kitThrdColor4: { types: ['numberLike'] },
  dCustomKit: { types: ['numberLike'] },
  crestColor: { types: ['numberLike'] },
  crestAssetId: { types: ['numberLike'] },
} satisfies FieldContractMap

const clubInfoFields = {
  name: { types: ['string'] },
  clubId: { types: ['id'] },
  regionId: { types: ['numberLike'] },
  teamId: { types: ['numberLike'] },
  customKit: {
    types: ['object'],
    fields: customKitFields,
  },
} satisfies FieldContractMap

const clubSummaryFields = {
  clubId: { types: ['id'], required: true },
  clubName: { types: ['string'] },
  platform: { types: ['string'] },
  wins: { types: ['numberLike'] },
  losses: { types: ['numberLike'] },
  ties: { types: ['numberLike'] },
  gamesPlayed: { types: ['numberLike'] },
  gamesPlayedPlayoff: { types: ['numberLike'] },
  goals: { types: ['numberLike'] },
  goalsAgainst: { types: ['numberLike'] },
  cleanSheets: { types: ['numberLike'] },
  points: { types: ['numberLike'] },
  reputationtier: { types: ['numberLike'] },
  promotions: { types: ['numberLike'] },
  relegations: { types: ['numberLike'] },
  bestDivision: { types: ['numberLike'] },
  currentDivision: { types: ['numberLike'] },
  clubInfo: {
    types: ['object'],
    fields: clubInfoFields,
  },
} satisfies FieldContractMap

const clubOverallStatsFields = {
  clubId: { types: ['id'] },
  bestDivision: { types: ['numberLike'] },
  bestFinishGroup: { types: ['numberLike'] },
  finishesInDivision1Group1: { types: ['numberLike'] },
  finishesInDivision2Group1: { types: ['numberLike'] },
  finishesInDivision3Group1: { types: ['numberLike'] },
  finishesInDivision4Group1: { types: ['numberLike'] },
  finishesInDivision5Group1: { types: ['numberLike'] },
  finishesInDivision6Group1: { types: ['numberLike'] },
  gamesPlayed: { types: ['numberLike'] },
  gamesPlayedPlayoff: { types: ['numberLike'] },
  goals: { types: ['numberLike'] },
  goalsAgainst: { types: ['numberLike'] },
  promotions: { types: ['numberLike'] },
  relegations: { types: ['numberLike'] },
  losses: { types: ['numberLike'] },
  ties: { types: ['numberLike'] },
  wins: { types: ['numberLike'] },
  lastMatch0: { types: ['numberLike'] },
  lastMatch1: { types: ['numberLike'] },
  lastMatch2: { types: ['numberLike'] },
  lastMatch3: { types: ['numberLike'] },
  lastMatch4: { types: ['numberLike'] },
  lastMatch5: { types: ['numberLike'] },
  lastMatch6: { types: ['numberLike'] },
  lastMatch7: { types: ['numberLike'] },
  lastMatch8: { types: ['numberLike'] },
  lastMatch9: { types: ['numberLike'] },
  lastOpponent0: { types: ['id'] },
  lastOpponent1: { types: ['id'] },
  lastOpponent2: { types: ['id'] },
  lastOpponent3: { types: ['id'] },
  lastOpponent4: { types: ['id'] },
  lastOpponent5: { types: ['id'] },
  lastOpponent6: { types: ['id'] },
  lastOpponent7: { types: ['id'] },
  lastOpponent8: { types: ['id'] },
  lastOpponent9: { types: ['id'] },
  wstreak: { types: ['numberLike'] },
  unbeatenstreak: { types: ['numberLike'] },
  skillRating: { types: ['numberLike'] },
  reputationtier: { types: ['numberLike'] },
  leagueAppearances: { types: ['numberLike'] },
} satisfies FieldContractMap

const clubMemberFields = {
  name: { types: ['string'] },
  gamesPlayed: { types: ['numberLike'] },
  winRate: { types: ['numberLike'] },
  goals: { types: ['numberLike'] },
  assists: { types: ['numberLike'] },
  cleanSheetsDef: { types: ['numberLike'] },
  cleanSheetsGK: { types: ['numberLike'] },
  shotSuccessRate: { types: ['numberLike'] },
  passesMade: { types: ['numberLike'] },
  passSuccessRate: { types: ['numberLike'] },
  ratingAve: { types: ['numberLike'] },
  tacklesMade: { types: ['numberLike'] },
  tackleSuccessRate: { types: ['numberLike'] },
  proName: { types: ['string'] },
  proPos: { types: ['string'] },
  proStyle: { types: ['numberLike'] },
  proHeight: { types: ['numberLike'] },
  proNationality: { types: ['numberLike'] },
  proOverall: { types: ['numberLike'] },
  proOverallStr: { types: ['string'] },
  manOfTheMatch: { types: ['numberLike'] },
  redCards: { types: ['numberLike'] },
  prevGoals: { types: ['numberLike'] },
  prevGoals1: { types: ['numberLike'] },
  prevGoals2: { types: ['numberLike'] },
  prevGoals3: { types: ['numberLike'] },
  prevGoals4: { types: ['numberLike'] },
  prevGoals5: { types: ['numberLike'] },
  prevGoals6: { types: ['numberLike'] },
  prevGoals7: { types: ['numberLike'] },
  prevGoals8: { types: ['numberLike'] },
  prevGoals9: { types: ['numberLike'] },
  prevGoals10: { types: ['numberLike'] },
  favoritePosition: { types: ['string'] },
} satisfies FieldContractMap

const matchClubDetailsFields = {
  date: { types: ['numberLike'] },
  gameNumber: { types: ['numberLike'] },
  goals: { types: ['numberLike'] },
  goalsAgainst: { types: ['numberLike'] },
  losses: { types: ['numberLike'] },
  matchType: { types: ['numberLike'] },
  result: { types: ['numberLike'] },
  score: { types: ['numberLike'] },
  season_id: { types: ['numberLike'] },
  TEAM: { types: ['numberLike'] },
  ties: { types: ['numberLike'] },
  winnerByDnf: { types: ['numberLike'] },
  wins: { types: ['numberLike'] },
  details: {
    types: ['object'],
    fields: clubInfoFields,
  },
} satisfies FieldContractMap

const matchPlayerStatsFields = {
  playername: { types: ['string'] },
  pos: { types: ['string'] },
  rating: { types: ['numberLike'] },
  goals: { types: ['numberLike'] },
  assists: { types: ['numberLike'] },
  shots: { types: ['numberLike'] },
  saves: { types: ['numberLike'] },
  passesmade: { types: ['numberLike'] },
  passattempts: { types: ['numberLike'] },
  tacklesmade: { types: ['numberLike'] },
  tackleattempts: { types: ['numberLike'] },
  redcards: { types: ['numberLike'] },
  mom: { types: ['numberLike'] },
  archetypeid: { types: ['numberLike'] },
  cleansheetsany: { types: ['numberLike'] },
  cleansheetsdef: { types: ['numberLike'] },
  cleansheetsgk: { types: ['numberLike'] },
  secondsPlayed: { types: ['numberLike'] },
  gameTime: { types: ['numberLike'] },
  realtimegame: { types: ['numberLike'] },
  realtimeidle: { types: ['numberLike'] },
  SCORE: { types: ['numberLike'] },
  wins: { types: ['numberLike'] },
  losses: { types: ['numberLike'] },
  vproattr: { types: ['string'] },
  vprohackreason: { types: ['numberLike'] },
  ballDiveSaves: { types: ['numberLike'] },
  crossSaves: { types: ['numberLike'] },
  goalsconceded: { types: ['numberLike'] },
  goodDirectionSaves: { types: ['numberLike'] },
  namespace: { types: ['numberLike'] },
  parrySaves: { types: ['numberLike'] },
  punchSaves: { types: ['numberLike'] },
  reflexSaves: { types: ['numberLike'] },
  userResult: { types: ['numberLike'] },
  match_event_aggregate_0: { types: ['string'] },
  match_event_aggregate_1: { types: ['string'] },
  match_event_aggregate_2: { types: ['string'] },
  match_event_aggregate_3: { types: ['string'] },
} satisfies FieldContractMap

const matchAggregateStatsFields = {
  archetypeid: { types: ['numberLike'] },
  assists: { types: ['numberLike'] },
  ballDiveSaves: { types: ['numberLike'] },
  cleansheetsany: { types: ['numberLike'] },
  cleansheetsdef: { types: ['numberLike'] },
  cleansheetsgk: { types: ['numberLike'] },
  crossSaves: { types: ['numberLike'] },
  gameTime: { types: ['numberLike'] },
  goals: { types: ['numberLike'] },
  goalsconceded: { types: ['numberLike'] },
  goodDirectionSaves: { types: ['numberLike'] },
  losses: { types: ['numberLike'] },
  match_event_aggregate_0: { types: ['numberLike'] },
  match_event_aggregate_1: { types: ['numberLike'] },
  match_event_aggregate_2: { types: ['numberLike'] },
  match_event_aggregate_3: { types: ['numberLike'] },
  mom: { types: ['numberLike'] },
  namespace: { types: ['numberLike'] },
  parrySaves: { types: ['numberLike'] },
  passattempts: { types: ['numberLike'] },
  passesmade: { types: ['numberLike'] },
  pos: { types: ['numberLike'] },
  punchSaves: { types: ['numberLike'] },
  rating: { types: ['numberLike'] },
  realtimegame: { types: ['numberLike'] },
  realtimeidle: { types: ['numberLike'] },
  redcards: { types: ['numberLike'] },
  reflexSaves: { types: ['numberLike'] },
  saves: { types: ['numberLike'] },
  SCORE: { types: ['numberLike'] },
  secondsPlayed: { types: ['numberLike'] },
  shots: { types: ['numberLike'] },
  tackleattempts: { types: ['numberLike'] },
  tacklesmade: { types: ['numberLike'] },
  userResult: { types: ['numberLike'] },
  vproattr: { types: ['numberLike'] },
  vprohackreason: { types: ['numberLike'] },
  wins: { types: ['numberLike'] },
} satisfies FieldContractMap

export const ENDPOINT_CONTRACTS = {
  clubsSearch: {
    kind: 'array',
    elementContract: {
      kind: 'object',
      fields: clubSummaryFields,
    },
  },
  clubsGet: {
    kind: 'record',
    recordValueContract: {
      kind: 'object',
      fields: clubInfoFields,
    },
  },
  clubsOverallStats: {
    kind: 'array',
    elementContract: {
      kind: 'object',
      fields: clubOverallStatsFields,
    },
  },
  membersStats: {
    kind: 'object',
    fields: {
      members: {
        types: ['array'],
        required: true,
        elementContract: {
          kind: 'object',
          fields: clubMemberFields,
        },
      },
      positionCount: {
        types: ['record'],
        required: true,
        recordValueTypes: ['number'],
      },
    },
  },
  membersCareerStats: {
    kind: 'object',
    fields: {
      members: {
        types: ['array'],
        required: true,
        elementContract: {
          kind: 'object',
          fields: clubMemberFields,
        },
      },
      positionCount: {
        types: ['record'],
        required: true,
        recordValueTypes: ['number'],
      },
    },
  },
  matchesList: {
    kind: 'array',
    elementContract: {
      kind: 'object',
      fields: {
        matchId: { types: ['id'] },
        timestamp: { types: ['numberLike'] },
        timeAgo: {
          types: ['object'],
          fields: {
            number: { types: ['number'] },
            unit: { types: ['string'] },
          },
        },
        clubs: {
          types: ['record'],
          recordValueContract: {
            kind: 'object',
            fields: matchClubDetailsFields,
          },
        },
        players: {
          types: ['record'],
          recordValueContract: {
            kind: 'record',
            recordValueContract: {
              kind: 'object',
              fields: matchPlayerStatsFields,
            },
          },
        },
        aggregate: {
          types: ['record'],
          recordValueContract: {
            kind: 'object',
            fields: matchAggregateStatsFields,
          },
        },
      },
    },
  },
} satisfies EndpointContracts

function jsonTag(value: JsonValue): string {
  return Object.prototype.toString.call(value)
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return (
    value !== null &&
    !Array.isArray(value) &&
    jsonTag(value) === '[object Object]'
  )
}

function isJsonString(value: JsonValue): value is string {
  return jsonTag(value) === '[object String]'
}

function isJsonNumber(value: JsonValue): value is number {
  return jsonTag(value) === '[object Number]'
}

function isJsonBoolean(value: JsonValue): value is boolean {
  return jsonTag(value) === '[object Boolean]'
}

function isUnknownRegionId(value: JsonValue): boolean {
  if (isJsonNumber(value)) {
    return Number.isFinite(value) && resolveRegionLabel(value) === undefined
  }
  if (isJsonString(value)) {
    return value.trim() !== '' && resolveRegionLabel(value) === undefined
  }
  return false
}

function getTypeCategory(value: JsonValue): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (isJsonString(value)) return 'string'
  if (isJsonNumber(value)) return 'number'
  if (isJsonBoolean(value)) return 'boolean'
  if (isJsonObject(value)) return 'object'
  return 'object'
}

function matchesAllowedType(actualType: string, allowed: AllowedType): boolean {
  if (allowed === 'numberLike') {
    return (
      actualType === 'string' ||
      actualType === 'number' ||
      actualType === 'null'
    )
  }
  if (allowed === 'id') {
    return actualType === 'string' || actualType === 'number'
  }
  if (allowed === 'record' && actualType === 'object') {
    return true
  }
  return actualType === allowed
}

function hasUpstreamErrorField(value: JsonObject): boolean {
  return Object.hasOwn(value, 'error') && value['error'] !== undefined
}

function jsonObjectValues(value: JsonObject): readonly JsonValue[] {
  return Object.values(value)
}

function validateAgainstContract(
  data: JsonValue,
  contract: PayloadContract,
  path: string,
  issues: DriftIssue[],
): void {
  if (contract.kind === 'array') {
    if (!Array.isArray(data)) {
      issues.push({
        kind: 'envelope_changed',
        path,
        message: `Expected array at ${path}, received ${getTypeCategory(data)}`,
        expected: 'array',
        actual: getTypeCategory(data),
      })
      return
    }
    if (contract.elementContract) {
      for (let i = 0; i < data.length; i += 1) {
        const item = data[i]
        if (item === undefined) {
          continue
        }
        validateAgainstContract(
          item,
          contract.elementContract,
          `${path}[${i}]`,
          issues,
        )
      }
    }
    return
  }

  if (contract.kind === 'record') {
    if (!isJsonObject(data)) {
      issues.push({
        kind: 'envelope_changed',
        path,
        message: `Expected record map at ${path}, received ${getTypeCategory(data)}`,
        expected: 'record',
        actual: getTypeCategory(data),
      })
      return
    }
    if (hasUpstreamErrorField(data)) {
      issues.push({
        kind: 'envelope_changed',
        path,
        message: `Received upstream error object at ${path} instead of valid record`,
        expected: 'record',
        actual: 'error_response',
      })
      return
    }
    if (contract.recordValueContract) {
      for (const val of jsonObjectValues(data)) {
        validateAgainstContract(
          val,
          contract.recordValueContract,
          `${path}.*`,
          issues,
        )
      }
    }
    return
  }

  if (contract.kind === 'object') {
    if (!isJsonObject(data)) {
      issues.push({
        kind: 'envelope_changed',
        path,
        message: `Expected object at ${path}, received ${getTypeCategory(data)}`,
        expected: 'object',
        actual: getTypeCategory(data),
      })
      return
    }
    if (hasUpstreamErrorField(data)) {
      issues.push({
        kind: 'envelope_changed',
        path,
        message: `Received upstream error object at ${path}`,
        expected: 'object',
        actual: 'error_response',
      })
      return
    }

    const expectedFields = contract.fields ?? {}
    // 1. Check required fields and type-check present fields
    for (const [fieldKey, fieldDef] of Object.entries(expectedFields)) {
      const fieldPath = path === '$' ? `$.${fieldKey}` : `${path}.${fieldKey}`
      if (data[fieldKey] === undefined) {
        if (fieldDef.required) {
          issues.push({
            kind: 'field_removed',
            path: fieldPath,
            message: `Required field ${fieldPath} is missing`,
            expected: fieldDef.types.join(' | '),
            actual: 'undefined',
          })
        }
        continue
      }

      const val = data[fieldKey]
      if (val === undefined) {
        continue
      }
      const actualType = getTypeCategory(val)
      const isCompatible = fieldDef.types.some((allowed) =>
        matchesAllowedType(actualType, allowed),
      )

      if (!isCompatible) {
        issues.push({
          kind: 'type_changed',
          path: fieldPath,
          message: `Field ${fieldPath} type changed: expected ${fieldDef.types.join(' | ')}, received ${actualType}`,
          expected: fieldDef.types.join(' | '),
          actual: actualType,
        })
        continue
      }

      if (fieldKey === 'regionId' && isUnknownRegionId(val)) {
        issues.push({
          kind: 'unknown_value',
          path: fieldPath,
          message: `Unknown regionId at ${fieldPath}; update REGION_LABELS after confirming the EA label`,
          expected: 'known regionId',
          actual: String(val),
        })
      }

      // If array or object, recurse
      if (Array.isArray(val) && fieldDef.elementContract) {
        for (let i = 0; i < val.length; i += 1) {
          const item = val[i]
          if (item === undefined) {
            continue
          }
          validateAgainstContract(
            item,
            fieldDef.elementContract,
            `${fieldPath}[${i}]`,
            issues,
          )
        }
      } else if (isJsonObject(val)) {
        if (fieldDef.fields) {
          validateAgainstContract(
            val,
            { kind: 'object', fields: fieldDef.fields },
            fieldPath,
            issues,
          )
        } else if (fieldDef.recordValueContract) {
          for (const subVal of jsonObjectValues(val)) {
            validateAgainstContract(
              subVal,
              fieldDef.recordValueContract,
              `${fieldPath}.*`,
              issues,
            )
          }
        } else if (fieldDef.recordValueTypes) {
          for (const subVal of jsonObjectValues(val)) {
            const subActualType = getTypeCategory(subVal)
            const isSubCompatible = fieldDef.recordValueTypes.some((allowed) =>
              matchesAllowedType(subActualType, allowed),
            )
            if (!isSubCompatible) {
              issues.push({
                kind: 'type_changed',
                path: `${fieldPath}.*`,
                message: `Field ${fieldPath}.* type changed: expected ${fieldDef.recordValueTypes.join(' | ')}, received ${subActualType}`,
                expected: fieldDef.recordValueTypes.join(' | '),
                actual: subActualType,
              })
            }
          }
        }
      }
    }

    // 2. Check for unexpected added fields
    for (const key of Object.keys(data)) {
      if (!Object.hasOwn(expectedFields, key)) {
        const fieldPath = path === '$' ? `$.${key}` : `${path}.${key}`
        const added = data[key]
        issues.push({
          kind: 'field_added',
          path: fieldPath,
          message: `Unexpected field ${fieldPath} added upstream`,
          actual: added === undefined ? 'undefined' : getTypeCategory(added),
        })
      }
    }
  }
}

function membersItemCount(payload: JsonValue): number | undefined {
  if (!isJsonObject(payload)) {
    return undefined
  }
  const members = payload['members']
  if (!Array.isArray(members)) {
    return undefined
  }
  return members.length
}

export function detectDrift(
  endpoint: Endpoint,
  payload: JsonValue,
): EndpointDriftResult {
  const contract = ENDPOINT_CONTRACTS[endpoint]
  const issues: DriftIssue[] = []

  validateAgainstContract(payload, contract, '$', issues)

  let itemCount: number | undefined
  if (Array.isArray(payload)) {
    itemCount = payload.length
  } else {
    itemCount = membersItemCount(payload)
  }

  const isUnverified =
    Array.isArray(payload) && payload.length === 0 && issues.length === 0

  const result: EndpointDriftResult = {
    endpoint,
    status:
      issues.length > 0 ? 'drifted' : isUnverified ? 'unverified' : 'passed',
    issues,
  }
  if (itemCount !== undefined) {
    return { ...result, itemCount }
  }
  return result
}

export function classifyRecommendation(
  results: EndpointDriftResults,
): 'patch' | 'minor' | 'major' | 'manual_review' {
  const allIssues = Object.values(results).flatMap((r) => r.issues)
  if (allIssues.length === 0) {
    const hasUnverified = Object.values(results).some(
      (r) => r.status === 'unverified',
    )
    return hasUnverified ? 'manual_review' : 'patch'
  }

  const hasBreaking = allIssues.some(
    (i) =>
      i.kind === 'field_removed' ||
      i.kind === 'type_changed' ||
      i.kind === 'envelope_changed',
  )
  if (hasBreaking) {
    return 'major'
  }

  const onlyAdded = allIssues.every(
    (i) => i.kind === 'field_added' || i.kind === 'unknown_value',
  )
  if (onlyAdded) {
    return 'minor'
  }

  return 'manual_review'
}

export function generateReport(
  platform: Platform,
  results: EndpointDriftResults,
): CompatibilityReport {
  const hasDrift = Object.values(results).some((r) => r.status === 'drifted')
  const allPassed = Object.values(results).every((r) => r.status === 'passed')

  let status: 'supported' | 'drifted' | 'stopped' | 'unverified'
  if (hasDrift) {
    status = 'drifted'
  } else if (allPassed) {
    status = 'supported'
  } else {
    status = 'unverified'
  }

  return {
    timestamp: new Date().toISOString(),
    platform,
    summary: {
      status,
      recommendation: classifyRecommendation(results),
    },
    endpoints: results,
  }
}
