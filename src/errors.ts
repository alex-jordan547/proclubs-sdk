import type { Endpoint } from './constants.js'

export type ProClubsErrorCode =
  | 'VALIDATION'
  | 'ABORTED'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'HTTP'
  | 'INVALID_RESPONSE'

export class ProClubsError extends Error {
  readonly code: ProClubsErrorCode

  constructor(
    message: string,
    code: ProClubsErrorCode,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ProClubsError'
    this.code = code
  }
}

export class ProClubsValidationError extends ProClubsError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'VALIDATION', options)
    this.name = 'ProClubsValidationError'
  }
}

export class ProClubsAbortError extends ProClubsError {
  constructor(
    message = 'The EA FC request was aborted',
    options?: ErrorOptions,
  ) {
    super(message, 'ABORTED', options)
    this.name = 'ProClubsAbortError'
  }
}

export class ProClubsTimeoutError extends ProClubsError {
  constructor(message = 'The EA FC request timed out', options?: ErrorOptions) {
    super(message, 'TIMEOUT', options)
    this.name = 'ProClubsTimeoutError'
  }
}

export class ProClubsNetworkError extends ProClubsError {
  constructor(message = 'The EA FC request failed', options?: ErrorOptions) {
    super(message, 'NETWORK', options)
    this.name = 'ProClubsNetworkError'
  }
}

export interface ProClubsHttpErrorOptions extends ErrorOptions {
  status: number
  endpoint: Endpoint
  retryAfterMs?: number
  bodySnippet?: string
}

export class ProClubsHttpError extends ProClubsError {
  readonly status: number
  readonly endpoint: Endpoint
  readonly retryAfterMs?: number
  readonly bodySnippet?: string

  constructor(message: string, options: ProClubsHttpErrorOptions) {
    super(message, 'HTTP', options)
    this.name = 'ProClubsHttpError'
    this.status = options.status
    this.endpoint = options.endpoint
    if (options.retryAfterMs !== undefined) {
      this.retryAfterMs = options.retryAfterMs
    }
    if (options.bodySnippet !== undefined) {
      this.bodySnippet = options.bodySnippet
    }
  }
}

export class ProClubsResponseError extends ProClubsError {
  readonly endpoint: Endpoint

  constructor(message: string, endpoint: Endpoint, options?: ErrorOptions) {
    super(message, 'INVALID_RESPONSE', options)
    this.name = 'ProClubsResponseError'
    this.endpoint = endpoint
  }
}
