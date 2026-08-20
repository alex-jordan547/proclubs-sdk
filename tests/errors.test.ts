import { describe, expect, it } from 'vitest'

import {
  ProClubsError,
  ProClubsHttpError,
  ProClubsResponseError,
  ProClubsValidationError,
} from '../src/errors.js'

describe('Pro Clubs errors', () => {
  it('preserves typed context without losing the original cause', () => {
    const cause = new Error('socket closed')
    const error = new ProClubsHttpError('EA rejected the request', {
      status: 429,
      endpoint: 'clubsSearch',
      retryAfterMs: 1_000,
      bodySnippet: 'Too Many Requests',
      cause,
    })

    expect(error).toBeInstanceOf(ProClubsError)
    expect(error).toMatchObject({
      name: 'ProClubsHttpError',
      code: 'HTTP',
      status: 429,
      endpoint: 'clubsSearch',
      retryAfterMs: 1_000,
      bodySnippet: 'Too Many Requests',
      cause,
    })
  })

  it('uses stable codes for validation and response-shape failures', () => {
    expect(new ProClubsValidationError('Invalid input')).toMatchObject({
      name: 'ProClubsValidationError',
      code: 'VALIDATION',
    })
    expect(
      new ProClubsResponseError('Unexpected payload', 'matchesList'),
    ).toMatchObject({
      name: 'ProClubsResponseError',
      code: 'INVALID_RESPONSE',
      endpoint: 'matchesList',
    })
  })
})
