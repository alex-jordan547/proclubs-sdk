import type { Endpoint, Platform } from './constants.js'

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

export interface DriftIssue {
  readonly kind: DriftIssueKind
  readonly path: string
  readonly message: string
  readonly expected?: string
  readonly actual?: string
}

export interface FieldContract {
  readonly types: readonly AllowedType[]
  readonly required?: boolean
  readonly elementContract?: ShapeContract
  readonly fields?: Readonly<Record<string, FieldContract>>
  readonly recordValueContract?: ShapeContract
  readonly recordValueTypes?: readonly AllowedType[]
}

export interface ShapeContract {
  readonly kind: 'array' | 'object' | 'record'
  readonly required?: boolean
  readonly elementContract?: ShapeContract
  readonly fields?: Readonly<Record<string, FieldContract>>
  readonly recordValueContract?: ShapeContract
  readonly recordValueTypes?: readonly AllowedType[]
}

export interface EndpointDriftResult {
  readonly endpoint: Endpoint
  readonly status: 'passed' | 'drifted' | 'unverified'
  readonly issues: readonly DriftIssue[]
  readonly itemCount?: number
}

export interface CompatibilityReport {
  readonly timestamp: string
  readonly platform: Platform
  readonly summary: {
    readonly status: 'supported' | 'drifted' | 'stopped' | 'unverified'
    readonly recommendation: 'patch' | 'minor' | 'major' | 'manual_review'
  }
  readonly endpoints: Readonly<Record<Endpoint, EndpointDriftResult>>
}

const customKitFields: Record<string, FieldContract> = {
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
}

const clubInfoFields: Record<string, FieldContract> = {
  name: { types: ['string'] },
  clubId: { types: ['id'] },
  regionId: { types: ['numberLike'] },
  teamId: { types: ['numberLike'] },
  customKit: {
    types: ['object'],
    fields: customKitFields,
  },
}

const clubSummaryFields: Record<string, FieldContract> = {
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
}

const clubOverallStatsFields: Record<string, FieldContract> = {
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
}

const clubMemberFields: Record<string, FieldContract> = {
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
}

const matchClubDetailsFields: Record<string, FieldContract> = {
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
}

const matchPlayerStatsFields: Record<string, FieldContract> = {
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
}

const matchAggregateStatsFields: Record<string, FieldContract> = {
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
}

export const ENDPOINT_CONTRACTS: Record<Endpoint, ShapeContract> = {
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
}

function getTypeCategory(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  const t = typeof value
  if (t === 'string') return 'string'
  if (t === 'number') return 'number'
  if (t === 'boolean') return 'boolean'
  if (t === 'object') return 'object'
  return t
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

function validateAgainstContract(
  data: unknown,
  contract: ShapeContract,
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
        validateAgainstContract(
          data[i],
          contract.elementContract,
          `${path}[${i}]`,
          issues,
        )
      }
    }
    return
  }

  if (contract.kind === 'record') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      issues.push({
        kind: 'envelope_changed',
        path,
        message: `Expected record map at ${path}, received ${getTypeCategory(data)}`,
        expected: 'record',
        actual: getTypeCategory(data),
      })
      return
    }
    if ((data as { error?: unknown }).error !== undefined) {
      issues.push({
        kind: 'envelope_changed',
        path,
        message: `Received upstream error object at ${path} instead of valid record`,
        expected: 'record',
        actual: 'error_response',
      })
      return
    }
    const rec = data as Record<string, unknown>
    if (contract.recordValueContract) {
      for (const val of Object.values(rec)) {
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
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      issues.push({
        kind: 'envelope_changed',
        path,
        message: `Expected object at ${path}, received ${getTypeCategory(data)}`,
        expected: 'object',
        actual: getTypeCategory(data),
      })
      return
    }
    if ((data as { error?: unknown }).error !== undefined) {
      issues.push({
        kind: 'envelope_changed',
        path,
        message: `Received upstream error object at ${path}`,
        expected: 'object',
        actual: 'error_response',
      })
      return
    }

    const obj = data as Record<string, unknown>
    const expectedFields = contract.fields ?? {}
    // 1. Check required fields and type-check present fields
    for (const [fieldKey, fieldDef] of Object.entries(expectedFields)) {
      const fieldPath = path === '$' ? `$.${fieldKey}` : `${path}.${fieldKey}`
      if (obj[fieldKey] === undefined) {
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

      const val = obj[fieldKey]
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

      // If array or object, recurse
      if (Array.isArray(val) && fieldDef.elementContract) {
        for (let i = 0; i < val.length; i += 1) {
          validateAgainstContract(
            val[i],
            fieldDef.elementContract,
            `${fieldPath}[${i}]`,
            issues,
          )
        }
      } else if (
        typeof val === 'object' &&
        val !== null &&
        !Array.isArray(val)
      ) {
        if (fieldDef.fields) {
          validateAgainstContract(
            val,
            { kind: 'object', fields: fieldDef.fields },
            fieldPath,
            issues,
          )
        } else if (fieldDef.recordValueContract) {
          for (const subVal of Object.values(val as Record<string, unknown>)) {
            validateAgainstContract(
              subVal,
              fieldDef.recordValueContract,
              `${fieldPath}.*`,
              issues,
            )
          }
        } else if (fieldDef.recordValueTypes) {
          for (const subVal of Object.values(val as Record<string, unknown>)) {
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
    for (const key of Object.keys(obj)) {
      if (!(key in expectedFields)) {
        const fieldPath = path === '$' ? `$.${key}` : `${path}.${key}`
        issues.push({
          kind: 'field_added',
          path: fieldPath,
          message: `Unexpected field ${fieldPath} added upstream`,
          actual: getTypeCategory(obj[key]),
        })
      }
    }
  }
}

export function detectDrift(
  endpoint: Endpoint,
  payload: unknown,
): EndpointDriftResult {
  const contract = ENDPOINT_CONTRACTS[endpoint]
  const issues: DriftIssue[] = []

  validateAgainstContract(payload, contract, '$', issues)

  let itemCount: number | undefined
  if (Array.isArray(payload)) {
    itemCount = payload.length
  } else if (
    typeof payload === 'object' &&
    payload !== null &&
    'members' in payload &&
    Array.isArray((payload as { members?: unknown }).members)
  ) {
    itemCount = (payload as { members: unknown[] }).members.length
  }

  const isUnverified =
    Array.isArray(payload) && payload.length === 0 && issues.length === 0

  return {
    endpoint,
    status:
      issues.length > 0 ? 'drifted' : isUnverified ? 'unverified' : 'passed',
    issues,
    ...(itemCount !== undefined ? { itemCount } : {}),
  }
}

export function classifyRecommendation(
  results: Record<Endpoint, EndpointDriftResult>,
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

  const onlyAdded = allIssues.every((i) => i.kind === 'field_added')
  if (onlyAdded) {
    return 'minor'
  }

  return 'manual_review'
}

export function generateReport(
  platform: Platform,
  results: Record<Endpoint, EndpointDriftResult>,
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
