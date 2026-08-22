import {
  ProClubsClient,
  createDefaultTransport,
  type ProClubsTransport,
} from './client.js'
import { DEFAULT_PLATFORM, type Endpoint, type Platform } from './constants.js'
import {
  detectDrift,
  generateReport,
  type CompatibilityReport,
  type EndpointDriftResult,
} from './drift.js'
import {
  ProClubsAbortError,
  ProClubsHttpError,
  ProClubsNetworkError,
  ProClubsResponseError,
  ProClubsTimeoutError,
} from './errors.js'

const ACCESS_CONTROL_STATUSES = new Set([401, 403, 429])

export interface CompatibilityRunnerOptions {
  readonly transport?: ProClubsTransport
  readonly platform?: Platform
  readonly searchQuery?: string
  readonly timeoutMs?: number
  readonly onProgress?: (endpoint: Endpoint, status: string) => void
}

export interface CompatibilityCheckResult {
  readonly report: CompatibilityReport
  readonly stoppedEarly: boolean
  readonly stopReason?: string
  readonly executedEndpoints: readonly Endpoint[]
}

function createInitialResults(): Record<Endpoint, EndpointDriftResult> {
  return {
    clubsSearch: {
      endpoint: 'clubsSearch',
      status: 'unverified',
      issues: [],
    },
    clubsGet: { endpoint: 'clubsGet', status: 'unverified', issues: [] },
    clubsOverallStats: {
      endpoint: 'clubsOverallStats',
      status: 'unverified',
      issues: [],
    },
    membersStats: {
      endpoint: 'membersStats',
      status: 'unverified',
      issues: [],
    },
    membersCareerStats: {
      endpoint: 'membersCareerStats',
      status: 'unverified',
      issues: [],
    },
    matchesList: {
      endpoint: 'matchesList',
      status: 'unverified',
      issues: [],
    },
  }
}

function markSchemaRejected(
  endpoint: Endpoint,
  existing: EndpointDriftResult,
): EndpointDriftResult {
  const schemaRejectedIssue = {
    kind: 'envelope_changed' as const,
    path: '$',
    message: 'SDK rejected a JSON payload that matched the structural contract',
    actual: 'schema_rejected',
  }
  if (existing.issues.some((issue) => issue.actual === 'schema_rejected')) {
    return existing
  }
  return {
    endpoint,
    status: 'drifted',
    issues: [...existing.issues, schemaRejectedIssue],
    ...(existing.itemCount === undefined
      ? {}
      : { itemCount: existing.itemCount }),
  }
}

export async function runCompatibilityCheck(
  options: CompatibilityRunnerOptions = {},
): Promise<CompatibilityCheckResult> {
  const platform = options.platform ?? DEFAULT_PLATFORM
  const searchQuery = options.searchQuery ?? 'ALL STAR 237'
  const timeoutMs = options.timeoutMs ?? 15_000
  const results = createInitialResults()
  const executedEndpoints: Endpoint[] = []

  let lastCapturedJson: unknown
  const innerTransport = options.transport ?? createDefaultTransport(timeoutMs)

  const capturingTransport: ProClubsTransport = async (url, init) => {
    const res = await innerTransport(url, init)
    const originalText = await res.text()
    try {
      lastCapturedJson = JSON.parse(originalText)
    } catch {
      lastCapturedJson = undefined
    }

    return {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      headers: res.headers,
      text: async () => originalText,
    }
  }

  const client = new ProClubsClient({
    platform,
    maxAttempts: 1,
    timeoutMs,
    transport: capturingTransport,
  })

  let stoppedEarly = false
  let stopReason: string | undefined
  let targetClubId: string | undefined

  const recordCapturedDrift = (endpoint: Endpoint): void => {
    if (lastCapturedJson !== undefined) {
      results[endpoint] = detectDrift(endpoint, lastCapturedJson)
      return
    }
    results[endpoint] = {
      endpoint,
      status: 'unverified',
      issues: [],
    }
  }

  const executeEndpoint = async (
    endpoint: Endpoint,
    action: () => Promise<unknown>,
  ): Promise<boolean> => {
    executedEndpoints.push(endpoint)
    options.onProgress?.(endpoint, 'running')
    lastCapturedJson = undefined

    try {
      await action()
      recordCapturedDrift(endpoint)
      options.onProgress?.(endpoint, results[endpoint].status)
      return true
    } catch (error) {
      stoppedEarly = true
      if (error instanceof ProClubsResponseError) {
        if (lastCapturedJson !== undefined) {
          recordCapturedDrift(endpoint)
          results[endpoint] = markSchemaRejected(endpoint, results[endpoint])
          stopReason = 'Response drifted from the known contract'
        } else {
          stopReason = 'Invalid response or non-JSON body received'
          results[endpoint] = {
            endpoint,
            status: 'drifted',
            issues: [
              {
                kind: 'envelope_changed',
                path: '$',
                message:
                  'Upstream returned invalid response structure or non-JSON',
                actual: 'invalid_response',
              },
            ],
          }
        }
      } else if (error instanceof ProClubsHttpError) {
        if (ACCESS_CONTROL_STATUSES.has(error.status)) {
          stopReason = `Access control or rate limit error: ${error.status}`
          results[endpoint] = {
            endpoint,
            status: 'drifted',
            issues: [
              {
                kind: 'envelope_changed',
                path: '$',
                message: `Endpoint returned HTTP ${error.status}`,
                actual: `HTTP ${error.status}`,
              },
            ],
          }
        } else {
          stopReason = `Unexpected HTTP error: ${error.status}`
          results[endpoint] = {
            endpoint,
            status: 'unverified',
            issues: [],
          }
        }
      } else if (
        error instanceof ProClubsTimeoutError ||
        error instanceof ProClubsNetworkError ||
        error instanceof ProClubsAbortError
      ) {
        stopReason = `Network or timeout failure: ${(error as Error).name}`
        results[endpoint] = {
          endpoint,
          status: 'unverified',
          issues: [],
        }
      } else {
        stopReason = 'Unexpected execution error'
      }
      options.onProgress?.(endpoint, 'stopped')
      return false
    }
  }

  const buildResult = (): CompatibilityCheckResult => ({
    report: generateReport(platform, results),
    stoppedEarly,
    ...(stopReason ? { stopReason } : {}),
    executedEndpoints,
  })

  const searchOk = await executeEndpoint('clubsSearch', async () => {
    const clubs = await client.clubs.search({
      name: searchQuery,
      platform,
    })
    if (clubs.length > 0 && clubs[0]?.clubId) {
      targetClubId = String(clubs[0].clubId)
    }
  })

  if (!searchOk) {
    return buildResult()
  }

  if (!targetClubId) {
    stoppedEarly = true
    stopReason = 'No clubs returned in search to verify remaining endpoints'
    options.onProgress?.('clubsSearch', 'stopped')
    return buildResult()
  }

  const clubId = targetClubId

  const remainingSteps: ReadonlyArray<{
    endpoint: Endpoint
    action: () => Promise<unknown>
  }> = [
    {
      endpoint: 'clubsGet',
      action: () => client.clubs.get({ clubId, platform }),
    },
    {
      endpoint: 'clubsOverallStats',
      action: () => client.clubs.overallStats({ clubId, platform }),
    },
    {
      endpoint: 'membersStats',
      action: () => client.members.stats({ clubId, platform }),
    },
    {
      endpoint: 'membersCareerStats',
      action: () => client.members.careerStats({ clubId, platform }),
    },
    {
      endpoint: 'matchesList',
      action: () => client.matches.list({ clubId, platform, limit: 5 }),
    },
  ]

  for (const step of remainingSteps) {
    const ok = await executeEndpoint(step.endpoint, step.action)
    if (!ok) {
      return buildResult()
    }
  }

  return buildResult()
}
