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
  DEFAULT_CACHE_MAX_ENTRIES,
  DEFAULT_CACHE_TTL_MS,
  MemoryCache,
  type ProClubsCacheMode,
  type ProClubsCacheOptions,
  cloneValue,
} from './cache.js'
import {
  ProClubsAbortError,
  ProClubsHttpError,
  ProClubsNetworkError,
  ProClubsResponseError,
  ProClubsTimeoutError,
  ProClubsValidationError,
  type ProClubsErrorCode,
  type ProClubsHttpErrorOptions,
} from './errors.js'
import type { ProClubsEvent, ProClubsEventHandler } from './events.js'
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
  cache?: boolean | ProClubsCacheOptions
  onEvent?: ProClubsEventHandler
}

export interface ProClubsRequestOptions {
  signal?: AbortSignal
  cache?: ProClubsCacheMode
}

export function createDefaultTransport(timeoutMs: number): ProClubsTransport {
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
  readonly #cache?: MemoryCache<unknown>
  readonly #inFlight = new Map<string, Promise<unknown>>()
  readonly #onEvent: ProClubsEventHandler | undefined

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
    this.#onEvent = options.onEvent

    if (options.cache) {
      const cacheOptions = options.cache === true ? {} : options.cache
      const ttlMs = cacheOptions.ttlMs ?? DEFAULT_CACHE_TTL_MS
      const maxEntries = cacheOptions.maxEntries ?? DEFAULT_CACHE_MAX_ENTRIES
      if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
        throw new ProClubsValidationError(
          'cache.ttlMs must be a positive finite number',
        )
      }
      if (!Number.isInteger(maxEntries) || maxEntries < 1) {
        throw new ProClubsValidationError(
          'cache.maxEntries must be a positive integer',
        )
      }
      this.#cache = new MemoryCache(ttlMs, maxEntries)
    }
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
    if (options?.signal?.aborted) {
      throw new ProClubsAbortError(undefined, {
        cause: options.signal.reason,
      })
    }

    const cacheMode = options?.cache ?? 'default'
    const cacheEnabled = this.#cache !== undefined && cacheMode !== 'bypass'
    const cacheKey = cacheEnabled
      ? this.createCacheKey(endpoint, searchParams)
      : undefined

    if (this.#cache && cacheKey && cacheMode === 'default') {
      const cached = this.#cache.get(cacheKey)
      if (cached !== undefined) {
        this.emit({ type: 'cache:hit', endpoint })
        // SAFETY: cache entries are always stored as T for this endpoint/key.
        return cached as T
      }
      this.emit({ type: 'cache:miss', endpoint })
    }

    const shouldDedupe =
      this.#cache !== undefined &&
      cacheMode !== 'bypass' &&
      options?.signal === undefined
    const existing =
      shouldDedupe && cacheKey ? this.#inFlight.get(cacheKey) : undefined
    if (existing) {
      this.emit({ type: 'dedupe:join', endpoint })
      // SAFETY: in-flight promises are the Promise<T> stored for this cache key.
      return cloneValue(await existing) as T
    }

    const operation = this.performRequest(
      endpoint,
      searchParams,
      schema,
      options,
    )
    if (shouldDedupe && cacheKey) {
      // SAFETY: Map stores heterogeneous endpoint promises behind Promise<unknown>.
      this.#inFlight.set(cacheKey, operation as Promise<unknown>)
    }

    try {
      const result = await operation
      if (this.#cache && cacheKey) {
        this.#cache.set(cacheKey, result)
        this.emit({ type: 'cache:write', endpoint })
        return cloneValue(result)
      }
      return result
    } finally {
      if (
        shouldDedupe &&
        cacheKey &&
        this.#inFlight.get(cacheKey) === operation
      ) {
        this.#inFlight.delete(cacheKey)
      }
    }
  }

  private async performRequest<T>(
    endpoint: Endpoint,
    searchParams: URLSearchParams,
    schema: ZodType<T>,
    options?: ProClubsRequestOptions,
  ): Promise<T> {
    const url = new URL(EA_ROUTES[endpoint], EA_BASE_URL)
    url.search = searchParams.toString()

    for (let attempt = 1; attempt <= this.#maxAttempts; attempt += 1) {
      const startedAt = Date.now()
      let outcomeEmitted = false
      this.emit({ type: 'request:start', endpoint, attempt })
      if (options?.signal?.aborted) {
        const error = new ProClubsAbortError(undefined, {
          cause: options.signal.reason,
        })
        this.emitRequestError(endpoint, attempt, startedAt, error.code)
        throw error
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
        let jsonError: Error | undefined
        try {
          json = JSON.parse(body)
        } catch (error) {
          parsedJson = false
          jsonError = error instanceof Error ? error : undefined
        }

        const parsed = parsedJson ? schema.safeParse(json) : null
        if (response.ok) {
          if (parsed?.success) {
            this.emit({
              type: 'request:success',
              endpoint,
              attempt,
              status: response.status,
              durationMs: this.durationSince(startedAt),
            })
            return parsed.data
          }
          const error = new ProClubsResponseError(
            parsedJson
              ? `EA FC ${endpoint} returned an unexpected payload`
              : `EA FC ${endpoint} returned invalid JSON`,
            endpoint,
            { cause: parsed?.error ?? jsonError },
          )
          this.emitRequestError(
            endpoint,
            attempt,
            startedAt,
            error.code,
            response.status,
          )
          outcomeEmitted = true
          throw error
        }

        if (response.status === 403 && parsed?.success) {
          this.emit({
            type: 'request:success',
            endpoint,
            attempt,
            status: response.status,
            durationMs: this.durationSince(startedAt),
          })
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
          const error = new ProClubsHttpError(
            `EA FC ${endpoint} failed with HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
            errorOptions,
          )
          this.emitRequestError(
            endpoint,
            attempt,
            startedAt,
            error.code,
            response.status,
          )
          outcomeEmitted = true
          throw error
        }

        const backoffMs = this.#baseDelayMs * 2 ** (attempt - 1)
        const delayMs = Math.max(
          backoffMs,
          this.parseRetryAfter(response.headers) ?? 0,
        )
        this.emit({
          type: 'request:retry',
          endpoint,
          attempt,
          status: response.status,
          delayMs,
        })
        await this.delay(delayMs, options?.signal)
      } catch (error) {
        if (
          error instanceof ProClubsResponseError ||
          error instanceof ProClubsHttpError ||
          error instanceof ProClubsAbortError
        ) {
          if (!outcomeEmitted) {
            this.emitRequestError(
              endpoint,
              attempt,
              startedAt,
              error.code,
              error instanceof ProClubsHttpError ? error.status : undefined,
            )
          }
          throw error
        }
        let failure: Error
        if (error instanceof Error) {
          failure = error
        } else {
          failure = new Error(String(error))
          if (
            error !== null &&
            error !== undefined &&
            Object.prototype.toString.call(error) === '[object Object]' &&
            Object.hasOwn(error, 'name')
          ) {
            // SAFETY: plain-object rejection; own `name` confirmed above.
            const rejectionName = (error as { name: unknown }).name
            if (
              Object.prototype.toString.call(rejectionName) ===
              '[object String]'
            ) {
              failure.name = String(rejectionName)
            }
          }
        }
        if (
          this.isNamedError(failure, 'AbortError') ||
          options?.signal?.aborted
        ) {
          const abortError = new ProClubsAbortError(undefined, {
            cause: error,
          })
          this.emitRequestError(endpoint, attempt, startedAt, abortError.code)
          throw abortError
        }
        if (attempt === this.#maxAttempts) {
          const finalError = this.isTimeoutError(failure)
            ? new ProClubsTimeoutError(undefined, { cause: error })
            : new ProClubsNetworkError(undefined, { cause: error })
          this.emitRequestError(endpoint, attempt, startedAt, finalError.code)
          throw finalError
        }
        const errorCode = this.isTimeoutError(failure) ? 'TIMEOUT' : 'NETWORK'
        const delayMs = this.#baseDelayMs * 2 ** (attempt - 1)
        this.emit({
          type: 'request:retry',
          endpoint,
          attempt,
          errorCode,
          delayMs,
        })
        try {
          await this.delay(delayMs, options?.signal)
        } catch (delayError) {
          if (
            !(delayError instanceof ProClubsAbortError) &&
            !options?.signal?.aborted
          ) {
            throw delayError
          }
          const abortError =
            delayError instanceof ProClubsAbortError
              ? delayError
              : new ProClubsAbortError(undefined, {
                  cause: delayError,
                })
          this.emitRequestError(endpoint, attempt, startedAt, abortError.code)
          throw abortError
        }
      }
    }

    throw new ProClubsNetworkError('EA FC request exhausted all attempts')
  }

  private createCacheKey(
    endpoint: Endpoint,
    searchParams: URLSearchParams,
  ): string {
    const params = [...searchParams.entries()].sort(
      ([leftKey, leftValue], [rightKey, rightValue]) =>
        leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
    )
    return JSON.stringify([endpoint, params])
  }

  private durationSince(startedAt: number): number {
    return Math.max(0, Date.now() - startedAt)
  }

  private emitRequestError(
    endpoint: Endpoint,
    attempt: number,
    startedAt: number,
    errorCode: ProClubsErrorCode,
    status?: number,
  ): void {
    if (status === undefined) {
      this.emit({
        type: 'request:error',
        endpoint,
        attempt,
        durationMs: this.durationSince(startedAt),
        errorCode,
      })
      return
    }
    this.emit({
      type: 'request:error',
      endpoint,
      attempt,
      durationMs: this.durationSince(startedAt),
      errorCode,
      status,
    })
  }

  private emit(event: ProClubsEvent): void {
    if (!this.#onEvent) {
      return
    }
    try {
      void Promise.resolve(this.#onEvent(event)).catch(() => undefined)
    } catch {
      // Observability must never change request behavior.
    }
  }

  private parseInput<T>(
    schema: ZodType<T>,
    input: SearchClubsInput | ClubRequest | ListMatchesInput,
  ): T {
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

  private isNamedError(error: Error, name: string): boolean {
    return error.name === name
  }

  private isTimeoutError(error: Error): boolean {
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
