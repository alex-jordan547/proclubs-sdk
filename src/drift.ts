import { z } from 'zod'

import type { Endpoint, Platform } from './constants.js'
import {
  clubInfoSchema,
  clubInfoResponseSchema,
  clubMatchesResponseSchema,
  clubMemberStatsSchema,
  clubOverallStatsSchema,
  clubOverallStatsResponseSchema,
  clubSearchResponseSchema,
} from './schemas.js'

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

export type ContractNode = {
  /** Discriminates root envelope shapes when present. */
  readonly kind?: 'array' | 'object' | 'record'
  readonly types: readonly AllowedType[]
  readonly required?: boolean
  readonly elementContract?: ContractNode
  readonly fields?: Readonly<Record<string, ContractNode>>
  readonly recordValueContract?: ContractNode
  readonly recordValueTypes?: readonly AllowedType[]
}

/**
 * A contract node describing an object shape (fields) or a collection
 * envelope (kind + children). Root endpoint contracts always set kind.
 */
export type ShapeContract = ContractNode & {
  readonly kind: 'array' | 'object' | 'record'
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

type AnySchema = z.ZodType

function unwrapOptional(schema: AnySchema): {
  inner: AnySchema
  optional: boolean
} {
  const def = schema.def as { type: string; innerType?: AnySchema }
  if (def.type === 'optional' && def.innerType) {
    return { inner: def.innerType, optional: true }
  }
  return { inner: schema, optional: false }
}

function deriveAllowedTypes(inner: AnySchema): AllowedType[] {
  const type = (inner.def as { type: string }).type
  if (type === 'union') {
    const options = (
      (inner.def as { options?: readonly AnySchema[] }).options ?? []
    ).map((o) => (o.def as { type: string }).type)
    if (
      options.includes('string') &&
      options.includes('number') &&
      options.includes('null')
    ) {
      return ['numberLike']
    }
    if (options.includes('string') && options.includes('number')) {
      return ['id']
    }
  }
  if (type === 'array') {
    return ['array']
  }
  if (type === 'record') {
    return ['record']
  }
  if (type === 'object') {
    return ['object']
  }
  return [type as AllowedType]
}

export function deriveFieldContract(schema: AnySchema): ContractNode {
  const { inner, optional } = unwrapOptional(schema)
  const types = deriveAllowedTypes(inner)
  const contract: {
    -readonly [K in keyof ContractNode]: ContractNode[K]
  } = {
    types,
    ...(optional ? {} : { required: true }),
  }
  const def = inner.def as {
    type: string
    shape?: Readonly<Record<string, AnySchema>>
    element?: AnySchema
    valueType?: AnySchema
  }
  const type = def.type

  if (type === 'object' && def.shape) {
    contract.fields = Object.fromEntries(
      Object.entries(def.shape).map(([key, child]) => [
        key,
        deriveFieldContract(child),
      ]),
    )
  } else if (type === 'array' && def.element) {
    contract.elementContract = deriveShapeContract(def.element)
  } else if (type === 'record' && def.valueType) {
    contract.recordValueContract = deriveShapeContract(def.valueType)
  }

  return contract
}

export function deriveShapeContract(schema: AnySchema): ShapeContract {
  const { inner } = unwrapOptional(schema)
  const field = deriveFieldContract(schema)
  let kind: 'array' | 'object' | 'record'
  const t = (inner.def as { type: string }).type
  if (t === 'array') {
    kind = 'array'
  } else if (t === 'record') {
    kind = 'record'
  } else if (field.fields) {
    kind = 'object'
  } else {
    // Primitive value schema used as a record/array element: keep the leaf
    // types so the parent validator checks value types directly instead of
    // recursing into an object contract.
    const { fields: _omit, ...leaf } = field
    return { ...leaf, kind: 'object' }
  }
  return { ...field, kind }
}

/**
 * Single source of truth: endpoint contracts are derived from the Zod
 * response schemas. Adding a field to a schema automatically extends the
 * drift contract; there is no second declaration to keep in sync.
 */
export const ENDPOINT_CONTRACTS: Record<Endpoint, ShapeContract> = {
  clubsSearch: deriveShapeContract(clubSearchResponseSchema),
  clubsGet: deriveRecordContract(clubInfoResponseSchema),
  clubsOverallStats: deriveShapeContract(clubOverallStatsResponseSchema),
  membersStats: deriveShapeContract(clubMemberStatsSchema),
  membersCareerStats: deriveShapeContract(clubMemberStatsSchema),
  matchesList: deriveShapeContract(clubMatchesResponseSchema),
}

function deriveRecordContract(schema: AnySchema): ShapeContract {
  const def = schema.def as { type?: string; valueType?: AnySchema }
  if (def.type === 'record' && def.valueType) {
    return {
      kind: 'record',
      types: ['record'],
      recordValueContract: deriveShapeContract(def.valueType),
    }
  }
  return deriveShapeContract(schema)
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
  contract: ContractNode & { kind?: 'array' | 'object' | 'record' },
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
      const valueContract = contract.recordValueContract
      if (valueContract.fields) {
        for (const val of Object.values(rec)) {
          validateAgainstContract(val, valueContract, `${path}.*`, issues)
        }
      } else {
        for (const val of Object.values(rec)) {
          const actualType = getTypeCategory(val)
          const ok = valueContract.types.some((allowed) =>
            matchesAllowedType(actualType, allowed),
          )
          if (!ok) {
            issues.push({
              kind: 'type_changed',
              path: `${path}.*`,
              message: `Record value at ${path}.* type changed: expected ${valueContract.types.join(' | ')}, received ${actualType}`,
              expected: valueContract.types.join(' | '),
              actual: actualType,
            })
          }
        }
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
            {
              kind: 'object',
              types: ['object'],
              fields: fieldDef.fields,
            },
            fieldPath,
            issues,
          )
        } else if (fieldDef.recordValueContract) {
          const valueContract = fieldDef.recordValueContract
          if (valueContract.fields) {
            for (const subVal of Object.values(
              val as Record<string, unknown>,
            )) {
              validateAgainstContract(
                subVal,
                valueContract,
                `${fieldPath}.*`,
                issues,
              )
            }
          } else {
            // Leaf record values: check types directly.
            for (const subVal of Object.values(
              val as Record<string, unknown>,
            )) {
              const subActualType = getTypeCategory(subVal)
              const ok = valueContract.types.some((allowed) =>
                matchesAllowedType(subActualType, allowed),
              )
              if (!ok) {
                issues.push({
                  kind: 'type_changed',
                  path: `${fieldPath}.*`,
                  message: `Field ${fieldPath}.* type changed: expected ${valueContract.types.join(' | ')}, received ${subActualType}`,
                  expected: valueContract.types.join(' | '),
                  actual: subActualType,
                })
              }
            }
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
