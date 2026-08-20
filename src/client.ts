import impit from 'impit'
import type { ZodType } from 'zod'

import {
  DEFAULT_PLATFORM,
  EA_BASE_URL,
  EA_ROUTES,
  type Endpoint,
  type Platform,
} from './constants.js'
import {
  ProClubsAbortError,
  ProClubsHttpError,
  ProClubsNetworkError,
  ProClubsResponseError,
  ProClubsTimeoutError,
  ProClubsValidationError,
  type ProClubsHttpErrorOptions,
} from './errors.js'
import {
  clubInfoResponseSchema,
  clubMatchesResponseSchema,
  clubMemberStatsSchema,
  clubOverallStatsResponseSchema,
  clubSearchResponseSchema,
  clubRequestSchema,
  listMatchesInputSchema,
  searchClubsInputSchema,
  type ClubInfo,
  type ClubMatch,
  type ClubMemberCareerStats,
  type ClubMemberStats,
  type ClubOverallStats,
  type ClubRequest,
  type ClubSummary,
  type ListMatchesInput,
  type SearchClubsInput,
} from './schemas.js'

const { Impit, TimeoutError: ImpitTimeoutError } = impit

export interface ProClubsResponse {
  readonly status: number
  readonly statusText: string
  readonly ok: boolean
  readonly headers: Headers
  text(): Promise<string>
}

export interface ProClubsRequestInit {
  method?: 'GET'
  signal?: AbortSignal
}

export type ProClubsTransport = (
  url: string | URL,
  init?: ProClubsRequestInit,
) => Promise<ProClubsResponse>

export interface ProClubsClientOptions {
  platform?: Platform
  timeoutMs?: number
  maxAttempts?: number
  baseDelayMs?: number
  transport?: ProClubsTransport
}

export interface ProClubsRequestOptions {
  signal?: AbortSignal
}

function createDefaultTransport(timeoutMs: number): ProClubsTransport {
  const client = new Impit({ browser: 'chrome', timeout: timeoutMs })
  return (url, init) => client.fetch(url, init)
}

export class ProClubsClient {
  readonly clubs = {
    search: (
      input: SearchClubsInput,
      options?: ProClubsRequestOptions,
    ): Promise<ClubSummary[]> => this.searchClubs(input, options),
    get: (
      input: ClubRequest,
      options?: ProClubsRequestOptions,
    ): Promise<ClubInfo | null> => this.getClub(input, options),
    overallStats: (
      input: ClubRequest,
      options?: ProClubsRequestOptions,
    ): Promise<ClubOverallStats | null> =>
      this.getClubOverallStats(input, options),
  }

  readonly members = {
    stats: (
      input: ClubRequest,
      options?: ProClubsRequestOptions,
    ): Promise<ClubMemberStats> => this.getMemberStats(input, options),
    careerStats: (
      input: ClubRequest,
      options?: ProClubsRequestOptions,
    ): Promise<ClubMemberCareerStats> =>
      this.getMemberCareerStats(input, options),
  }

  readonly matches = {
    list: (
      input: ListMatchesInput,
      options?: ProClubsRequestOptions,
    ): Promise<ClubMatch[]> => this.listMatches(input, options),
  }

  readonly #platform: Platform
  readonly #transport: ProClubsTransport
  readonly #maxAttempts: number
  readonly #baseDelayMs: number

  constructor(options: ProClubsClientOptions = {}) {
    const timeoutMs = options.timeoutMs ?? 15_000
    const maxAttempts = options.maxAttempts ?? 3
    const baseDelayMs = options.baseDelayMs ?? 400
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
      throw new ProClubsValidationError(
        'maxAttempts must be an integer between 1 and 5',
      )
    }
    if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
      throw new ProClubsValidationError(
        'baseDelayMs must be a non-negative finite number',
      )
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new ProClubsValidationError(
        'timeoutMs must be a positive finite number',
      )
    }
    this.#platform = options.platform ?? DEFAULT_PLATFORM
    this.#transport = options.transport ?? createDefaultTransport(timeoutMs)
    this.#maxAttempts = maxAttempts
    this.#baseDelayMs = baseDelayMs
  }

  private async searchClubs(
    input: SearchClubsInput,
    options?: ProClubsRequestOptions,
  ): Promise<ClubSummary[]> {
    const parsed = this.parseInput(searchClubsInputSchema, input)
    const url = new URL(EA_ROUTES.clubsSearch, EA_BASE_URL)
    url.searchParams.set('clubName', parsed.name)
    url.searchParams.set('platform', parsed.platform ?? this.#platform)

    return this.request(
      'clubsSearch',
      url.searchParams,
      clubSearchResponseSchema,
      options,
    )
  }

  private async getClub(
    input: ClubRequest,
    options?: ProClubsRequestOptions,
  ): Promise<ClubInfo | null> {
    const parsed = this.parseInput(clubRequestSchema, input)
    const clubId = String(parsed.clubId)
    const data = await this.request(
      'clubsGet',
      new URLSearchParams({
        clubIds: clubId,
        platform: parsed.platform ?? this.#platform,
      }),
      clubInfoResponseSchema,
      options,
    )
    return data[clubId] ?? null
  }

  private async getClubOverallStats(
    input: ClubRequest,
    options?: ProClubsRequestOptions,
  ): Promise<ClubOverallStats | null> {
    const parsed = this.parseInput(clubRequestSchema, input)
    const clubId = String(parsed.clubId)
    const data = await this.request(
      'clubsOverallStats',
      new URLSearchParams({
        clubIds: clubId,
        platform: parsed.platform ?? this.#platform,
      }),
      clubOverallStatsResponseSchema,
      options,
    )
    return data.find((item) => String(item.clubId) === clubId) ?? null
  }

  private async getMemberStats(
    input: ClubRequest,
    options?: ProClubsRequestOptions,
  ): Promise<ClubMemberStats> {
    return this.getMembers('membersStats', input, options)
  }

  private async getMemberCareerStats(
    input: ClubRequest,
    options?: ProClubsRequestOptions,
  ): Promise<ClubMemberCareerStats> {
    return this.getMembers('membersCareerStats', input, options)
  }

  private async getMembers(
    endpoint: 'membersStats' | 'membersCareerStats',
    input: ClubRequest,
    options?: ProClubsRequestOptions,
  ): Promise<ClubMemberStats> {
    const parsed = this.parseInput(clubRequestSchema, input)
    return this.request(
      endpoint,
      new URLSearchParams({
        clubId: String(parsed.clubId),
        platform: parsed.platform ?? this.#platform,
      }),
      clubMemberStatsSchema,
      options,
    )
  }

  private async listMatches(
    input: ListMatchesInput,
    options?: ProClubsRequestOptions,
  ): Promise<ClubMatch[]> {
    const parsed = this.parseInput(listMatchesInputSchema, input)
    return this.request(
      'matchesList',
      new URLSearchParams({
        clubIds: String(parsed.clubId),
        platform: parsed.platform ?? this.#platform,
        matchType: parsed.type ?? 'leagueMatch',
        maxResultCount: String(parsed.limit ?? 10),
      }),
      clubMatchesResponseSchema,
      options,
    )
  }

  private async request<T>(
    endpoint: Endpoint,
    searchParams: URLSearchParams,
    schema: ZodType<T>,
    options?: ProClubsRequestOptions,
  ): Promise<T> {
    const url = new URL(EA_ROUTES[endpoint], EA_BASE_URL)
    url.search = searchParams.toString()

    for (let attempt = 1; attempt <= this.#maxAttempts; attempt += 1) {
      if (options?.signal?.aborted) {
        throw new ProClubsAbortError(undefined, {
          cause: options.signal.reason,
        })
      }

      let response: ProClubsResponse
      try {
        const requestInit: ProClubsRequestInit = { method: 'GET' }
        if (options?.signal) {
          requestInit.signal = options.signal
        }
        response = await this.#transport(url, requestInit)
        const body = await response.text()
        let json: unknown
        let parsedJson = true
        let jsonError: unknown
        try {
          json = JSON.parse(body) as unknown
        } catch (error) {
          parsedJson = false
          jsonError = error
        }

        const parsed = parsedJson ? schema.safeParse(json) : null
        if (response.ok) {
          if (parsed?.success) {
            return parsed.data
          }
          throw new ProClubsResponseError(
            parsedJson
              ? `EA FC ${endpoint} returned an unexpected payload`
              : `EA FC ${endpoint} returned invalid JSON`,
            endpoint,
            { cause: parsed?.error ?? jsonError },
          )
        }

        if (response.status === 403 && parsed?.success) {
          return parsed.data
        }

        if (
          !this.shouldRetry(response.status) ||
          attempt === this.#maxAttempts
        ) {
          const errorOptions: ProClubsHttpErrorOptions = {
            status: response.status,
            endpoint,
          }
          const retryAfterMs = this.parseRetryAfter(response.headers)
          if (retryAfterMs !== undefined) {
            errorOptions.retryAfterMs = retryAfterMs
          }
          const bodySnippet = this.truncateBody(body)
          if (bodySnippet) {
            errorOptions.bodySnippet = bodySnippet
          }
          throw new ProClubsHttpError(
            `EA FC ${endpoint} failed with HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
            errorOptions,
          )
        }

        const backoffMs = this.#baseDelayMs * 2 ** (attempt - 1)
        await this.delay(
          Math.max(backoffMs, this.parseRetryAfter(response.headers) ?? 0),
          options?.signal,
        )
      } catch (error) {
        if (
          error instanceof ProClubsResponseError ||
          error instanceof ProClubsHttpError ||
          error instanceof ProClubsAbortError
        ) {
          throw error
        }
        if (
          this.isNamedError(error, 'AbortError') ||
          options?.signal?.aborted
        ) {
          throw new ProClubsAbortError(undefined, { cause: error })
        }
        if (attempt === this.#maxAttempts) {
          if (this.isTimeoutError(error)) {
            throw new ProClubsTimeoutError(undefined, { cause: error })
          }
          throw new ProClubsNetworkError(undefined, { cause: error })
        }
        await this.delay(
          this.#baseDelayMs * 2 ** (attempt - 1),
          options?.signal,
        )
      }
    }

    throw new ProClubsNetworkError('EA FC request exhausted all attempts')
  }

  private parseInput<T>(schema: ZodType<T>, input: unknown): T {
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      throw new ProClubsValidationError(
        parsed.error.issues[0]?.message ?? 'Invalid input',
        {
          cause: parsed.error,
        },
      )
    }
    return parsed.data
  }

  private shouldRetry(status: number): boolean {
    return [403, 429, 502, 503, 504].includes(status)
  }

  private parseRetryAfter(headers: Headers): number | undefined {
    const value = headers.get('retry-after')?.trim()
    if (!value) {
      return undefined
    }
    const seconds = Number(value)
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1_000
    }
    const date = Date.parse(value)
    if (Number.isNaN(date)) {
      return undefined
    }
    return Math.max(0, date - Date.now())
  }

  private truncateBody(body: string): string {
    const compact = body.replace(/\s+/g, ' ').trim()
    return compact.length <= 200 ? compact : `${compact.slice(0, 200)}…`
  }

  private isNamedError(error: unknown, name: string): boolean {
    return error instanceof Error && error.name === name
  }

  private isTimeoutError(error: unknown): boolean {
    return (
      error instanceof ImpitTimeoutError ||
      this.isNamedError(error, 'TimeoutError')
    )
  }

  private async delay(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new ProClubsAbortError(undefined, { cause: signal.reason })
    }
    if (ms <= 0) {
      return
    }
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timeoutId)
        if (signal) {
          signal.removeEventListener('abort', onAbort)
        }
        reject(new ProClubsAbortError(undefined, { cause: signal?.reason }))
      }
      const timeoutId = setTimeout(() => {
        if (signal) {
          signal.removeEventListener('abort', onAbort)
        }
        resolve()
      }, ms)

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true })
      }
    })
  }
}
