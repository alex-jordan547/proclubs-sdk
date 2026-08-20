import { ProClubsClient, type ProClubsTransport } from './client.js'
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

export interface CompatibilityRunnerOptions {
  readonly client?: ProClubsClient
  readonly transport?: ProClubsTransport
  readonly platform?: Platform
  readonly searchQuery?: string
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

export async function runCompatibilityCheck(
  options: CompatibilityRunnerOptions = {},
): Promise<CompatibilityCheckResult> {
  const platform = options.platform ?? DEFAULT_PLATFORM
  const searchQuery = options.searchQuery ?? 'ALL STAR 237'
  const results = createInitialResults()
  const executedEndpoints: Endpoint[] = []

  let lastCapturedJson: unknown

  const capturingTransport: ProClubsTransport = async (url, init) => {
    const baseTransport = options.transport
    const res = baseTransport
      ? await baseTransport(url, init)
      : await fetch(url, init)

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

  const client =
    options.client ??
    new ProClubsClient({
      platform,
      maxAttempts: 1,
      timeoutMs: 15_000,
      transport: capturingTransport,
    })

  let stoppedEarly = false
  let stopReason: string | undefined
  let targetClubId: string | undefined

  const executeEndpoint = async (
    endpoint: Endpoint,
    action: () => Promise<unknown>,
  ): Promise<boolean> => {
    executedEndpoints.push(endpoint)
    options.onProgress?.(endpoint, 'running')

    try {
      await action()
      if (lastCapturedJson !== undefined) {
        results[endpoint] = detectDrift(endpoint, lastCapturedJson)
      } else {
        results[endpoint] = {
          endpoint,
          status: 'unverified',
          issues: [],
        }
      }
      options.onProgress?.(endpoint, results[endpoint].status)
      return true
    } catch (error) {
      stoppedEarly = true
      if (error instanceof ProClubsHttpError) {
        stopReason = `Access control or HTTP error: ${error.status}`
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
      } else if (error instanceof ProClubsResponseError) {
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

  // 1. clubsSearch
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
    return {
      report: generateReport(platform, results),
      stoppedEarly: true,
      ...(stopReason ? { stopReason } : {}),
      executedEndpoints,
    }
  }

  if (!targetClubId) {
    return {
      report: generateReport(platform, results),
      stoppedEarly: true,
      stopReason: 'No clubs returned in search to verify remaining endpoints',
      executedEndpoints,
    }
  }

  const clubId = targetClubId

  // 2. clubsGet
  const getOk = await executeEndpoint('clubsGet', () =>
    client.clubs.get({ clubId, platform }),
  )
  if (!getOk) {
    return {
      report: generateReport(platform, results),
      stoppedEarly: true,
      ...(stopReason ? { stopReason } : {}),
      executedEndpoints,
    }
  }

  // 3. clubsOverallStats
  const overallOk = await executeEndpoint('clubsOverallStats', () =>
    client.clubs.overallStats({ clubId, platform }),
  )
  if (!overallOk) {
    return {
      report: generateReport(platform, results),
      stoppedEarly: true,
      ...(stopReason ? { stopReason } : {}),
      executedEndpoints,
    }
  }

  // 4. membersStats
  const memOk = await executeEndpoint('membersStats', () =>
    client.members.stats({ clubId, platform }),
  )
  if (!memOk) {
    return {
      report: generateReport(platform, results),
      stoppedEarly: true,
      ...(stopReason ? { stopReason } : {}),
      executedEndpoints,
    }
  }

  // 5. membersCareerStats
  const carOk = await executeEndpoint('membersCareerStats', () =>
    client.members.careerStats({ clubId, platform }),
  )
  if (!carOk) {
    return {
      report: generateReport(platform, results),
      stoppedEarly: true,
      ...(stopReason ? { stopReason } : {}),
      executedEndpoints,
    }
  }

  // 6. matchesList
  await executeEndpoint('matchesList', () =>
    client.matches.list({
      clubId,
      platform,
      limit: 5,
    }),
  )

  return {
    report: generateReport(platform, results),
    stoppedEarly,
    ...(stopReason ? { stopReason } : {}),
    executedEndpoints,
  }
}
