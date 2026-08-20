import impit from 'impit'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ProClubsAbortError,
  ProClubsClient,
  type ProClubsHttpError,
  ProClubsNetworkError,
  type ProClubsResponseError,
  ProClubsTimeoutError,
  ProClubsValidationError,
} from '../src/index.js'

const { ConnectTimeout, ReadTimeout } = impit

describe('ProClubsClient', () => {
  it('searches clubs with a browser-capable transport and sensible defaults', async () => {
    const requestedUrls: string[] = []
    const client = new ProClubsClient({
      transport: async (url) => {
        requestedUrls.push(url.toString())
        return new Response(
          JSON.stringify([{ clubId: '42', clubName: 'Paris Eleven' }]),
          { status: 200 },
        )
      },
    })

    const clubs = await client.clubs.search({ name: 'Paris Eleven' })

    expect(clubs).toEqual([{ clubId: '42', clubName: 'Paris Eleven' }])
    expect(requestedUrls).toEqual([
      'https://proclubs.ea.com/api/fc/allTimeLeaderboard/search?clubName=Paris+Eleven&platform=common-gen5',
    ])
  })

  it('provides the complete Pro Clubs endpoint surface', async () => {
    const requestedUrls: string[] = []
    const client = new ProClubsClient({
      transport: async (url) => {
        const parsedUrl = new URL(url)
        requestedUrls.push(`${parsedUrl.pathname}${parsedUrl.search}`)

        const bodies: Record<string, unknown> = {
          '/api/fc/clubs/info': {
            '42': { clubId: 42, name: 'Paris Eleven' },
          },
          '/api/fc/clubs/overallStats': [{ clubId: '42', wins: '8' }],
          '/api/fc/members/stats': { members: [], positionCount: {} },
          '/api/fc/members/career/stats': { members: [], positionCount: {} },
          '/api/fc/clubs/matches': [],
        }

        return new Response(JSON.stringify(bodies[parsedUrl.pathname]), {
          status: 200,
        })
      },
    })

    const club = await client.clubs.get({ clubId: '42' })
    const overall = await client.clubs.overallStats({ clubId: '42' })
    const members = await client.members.stats({ clubId: '42' })
    const careers = await client.members.careerStats({ clubId: '42' })
    const matches = await client.matches.list({ clubId: '42' })

    expect({ club, overall, members, careers, matches, requestedUrls }).toEqual(
      {
        club: { clubId: 42, name: 'Paris Eleven' },
        overall: { clubId: '42', wins: '8' },
        members: { members: [], positionCount: {} },
        careers: { members: [], positionCount: {} },
        matches: [],
        requestedUrls: [
          '/api/fc/clubs/info?clubIds=42&platform=common-gen5',
          '/api/fc/clubs/overallStats?clubIds=42&platform=common-gen5',
          '/api/fc/members/stats?clubId=42&platform=common-gen5',
          '/api/fc/members/career/stats?clubId=42&platform=common-gen5',
          '/api/fc/clubs/matches?clubIds=42&platform=common-gen5&matchType=leagueMatch&maxResultCount=10',
        ],
      },
    )
  })

  it('retries transient EA responses before returning validated data', async () => {
    let attempts = 0
    const client = new ProClubsClient({
      maxAttempts: 2,
      baseDelayMs: 0,
      transport: async () => {
        attempts += 1
        if (attempts === 1) {
          return new Response('Too Many Requests', { status: 429 })
        }
        return new Response(
          JSON.stringify([{ clubId: '42', clubName: 'Paris Eleven' }]),
          { status: 200 },
        )
      },
    })

    const clubs = await client.clubs.search({ name: 'Paris Eleven' })

    expect({ attempts, clubs }).toEqual({
      attempts: 2,
      clubs: [{ clubId: '42', clubName: 'Paris Eleven' }],
    })
  })

  it('accepts an EA false 403 only when its payload matches the endpoint schema', async () => {
    const client = new ProClubsClient({
      maxAttempts: 1,
      transport: async () =>
        new Response(
          JSON.stringify([{ clubId: '42', clubName: 'Paris Eleven' }]),
          { status: 403 },
        ),
    })

    await expect(
      client.clubs.search({ name: 'Paris Eleven' }),
    ).resolves.toEqual([{ clubId: '42', clubName: 'Paris Eleven' }])
  })

  it('rejects a forbidden member-stats body instead of treating it as an empty roster', async () => {
    const client = new ProClubsClient({
      maxAttempts: 1,
      transport: async () =>
        new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    await expect(client.members.stats({ clubId: '42' })).rejects.toMatchObject({
      name: 'ProClubsHttpError',
      code: 'HTTP',
      status: 403,
      endpoint: 'membersStats',
    } satisfies Partial<ProClubsHttpError>)
  })

  it('supports per-call platform overrides and cancellation signals', async () => {
    const controller = new AbortController()
    let requestedUrl = ''
    let requestedSignal: AbortSignal | undefined
    const client = new ProClubsClient({
      transport: async (url, init) => {
        requestedUrl = url.toString()
        requestedSignal = init?.signal
        return new Response('[]', { status: 200 })
      },
    })

    await client.clubs.search(
      { name: 'Paris Eleven', platform: 'nx' },
      { signal: controller.signal },
    )

    expect({ requestedUrl, requestedSignal }).toEqual({
      requestedUrl:
        'https://proclubs.ea.com/api/fc/allTimeLeaderboard/search?clubName=Paris+Eleven&platform=nx',
      requestedSignal: controller.signal,
    })
  })

  it('rejects invalid inputs locally with a stable validation error', async () => {
    let requested = false
    const client = new ProClubsClient({
      transport: async () => {
        requested = true
        return new Response('[]', { status: 200 })
      },
    })

    await expect(client.clubs.search({ name: '' })).rejects.toBeInstanceOf(
      ProClubsValidationError,
    )
    expect(requested).toBe(false)
  })

  it('rejects invalid constructor options with ProClubsValidationError', () => {
    expect(() => new ProClubsClient({ maxAttempts: 0 })).toThrow(
      ProClubsValidationError,
    )
    expect(() => new ProClubsClient({ maxAttempts: 6 })).toThrow(
      ProClubsValidationError,
    )
    expect(() => new ProClubsClient({ maxAttempts: 1.5 })).toThrow(
      ProClubsValidationError,
    )
    expect(() => new ProClubsClient({ baseDelayMs: -1 })).toThrow(
      ProClubsValidationError,
    )
    expect(
      () => new ProClubsClient({ baseDelayMs: Number.POSITIVE_INFINITY }),
    ).toThrow(ProClubsValidationError)
    expect(() => new ProClubsClient({ timeoutMs: 0 })).toThrow(
      ProClubsValidationError,
    )
    expect(() => new ProClubsClient({ timeoutMs: -5 })).toThrow(
      ProClubsValidationError,
    )
    expect(() => new ProClubsClient({ timeoutMs: Number.NaN })).toThrow(
      ProClubsValidationError,
    )
  })

  it('rejects a real EA 403 with actionable HTTP context', async () => {
    const client = new ProClubsClient({
      maxAttempts: 1,
      transport: async () =>
        new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    await expect(
      client.clubs.search({ name: 'Paris Eleven' }),
    ).rejects.toMatchObject({
      name: 'ProClubsHttpError',
      code: 'HTTP',
      status: 403,
      endpoint: 'clubsSearch',
      bodySnippet: '{"error":"Forbidden"}',
    } satisfies Partial<ProClubsHttpError>)
  })

  it('reports malformed successful payloads as upstream response errors', async () => {
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
    })

    await expect(
      client.clubs.search({ name: 'Paris Eleven' }),
    ).rejects.toMatchObject({
      name: 'ProClubsResponseError',
      code: 'INVALID_RESPONSE',
      endpoint: 'clubsSearch',
    } satisfies Partial<ProClubsResponseError>)
  })

  it('reports an aborted request without retrying it', async () => {
    let attempts = 0
    const client = new ProClubsClient({
      maxAttempts: 3,
      baseDelayMs: 0,
      transport: async () => {
        attempts += 1
        throw new DOMException('Aborted', 'AbortError')
      },
    })

    await expect(
      client.clubs.search({ name: 'Paris Eleven' }),
    ).rejects.toBeInstanceOf(ProClubsAbortError)
    expect(attempts).toBe(1)
  })

  it('turns exhausted timeouts and network failures into stable SDK errors', async () => {
    const timeoutClient = new ProClubsClient({
      maxAttempts: 1,
      transport: async () => {
        throw new DOMException('Timed out', 'TimeoutError')
      },
    })
    const networkClient = new ProClubsClient({
      maxAttempts: 2,
      baseDelayMs: 0,
      transport: async () => {
        throw new TypeError('fetch failed')
      },
    })

    await expect(
      timeoutClient.clubs.search({ name: 'Paris Eleven' }),
    ).rejects.toBeInstanceOf(ProClubsTimeoutError)
    await expect(
      networkClient.clubs.search({ name: 'Paris Eleven' }),
    ).rejects.toBeInstanceOf(ProClubsNetworkError)
  })

  it('maps body-read transport failures into the exported SDK errors', async () => {
    let abortAttempts = 0
    const abortClient = new ProClubsClient({
      maxAttempts: 3,
      baseDelayMs: 0,
      transport: async () => {
        abortAttempts += 1
        return {
          status: 200,
          statusText: 'OK',
          ok: true,
          headers: new Headers(),
          text: async () => {
            throw new DOMException('Aborted', 'AbortError')
          },
        }
      },
    })

    let timeoutAttempts = 0
    const timeoutClient = new ProClubsClient({
      maxAttempts: 2,
      baseDelayMs: 0,
      transport: async () => {
        timeoutAttempts += 1
        return {
          status: 200,
          statusText: 'OK',
          ok: true,
          headers: new Headers(),
          text: async () => {
            throw new DOMException('Timed out', 'TimeoutError')
          },
        }
      },
    })

    let networkAttempts = 0
    const networkClient = new ProClubsClient({
      maxAttempts: 2,
      baseDelayMs: 0,
      transport: async () => {
        networkAttempts += 1
        return {
          status: 200,
          statusText: 'OK',
          ok: true,
          headers: new Headers(),
          text: async () => {
            throw new TypeError('failed to read body')
          },
        }
      },
    })

    await expect(
      abortClient.clubs.search({ name: 'Paris Eleven' }),
    ).rejects.toBeInstanceOf(ProClubsAbortError)
    expect(abortAttempts).toBe(1)

    await expect(
      timeoutClient.clubs.search({ name: 'Paris Eleven' }),
    ).rejects.toBeInstanceOf(ProClubsTimeoutError)
    expect(timeoutAttempts).toBe(2)

    await expect(
      networkClient.clubs.search({ name: 'Paris Eleven' }),
    ).rejects.toBeInstanceOf(ProClubsNetworkError)
    expect(networkAttempts).toBe(2)
  })

  it('maps Impit TimeoutError subclasses to ProClubsTimeoutError', async () => {
    for (const error of [
      new ConnectTimeout('connect timed out'),
      new ReadTimeout('read timed out'),
    ]) {
      const client = new ProClubsClient({
        maxAttempts: 1,
        transport: async () => {
          throw error
        },
      })

      await expect(
        client.clubs.search({ name: 'Paris Eleven' }),
      ).rejects.toBeInstanceOf(ProClubsTimeoutError)
    }
  })

  it('returns null from clubs.overallStats when no clubId matches', async () => {
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify([{ clubId: '99', wins: '3' }]), {
          status: 200,
        }),
    })

    await expect(client.clubs.overallStats({ clubId: '42' })).resolves.toBe(
      null,
    )
  })

  it('aborts without another transport attempt after a retryable response', async () => {
    let attempts = 0
    const controller = new AbortController()
    const client = new ProClubsClient({
      maxAttempts: 3,
      baseDelayMs: 25,
      transport: async () => {
        attempts += 1
        controller.abort()
        return new Response('Too Many Requests', {
          status: 429,
          headers: { 'Retry-After': '1' },
        })
      },
    })

    await expect(
      client.clubs.search(
        { name: 'Paris Eleven' },
        { signal: controller.signal },
      ),
    ).rejects.toBeInstanceOf(ProClubsAbortError)
    expect(attempts).toBe(1)
  })

  it('exposes Retry-After on ProClubsHttpError and waits before retrying', async () => {
    vi.useFakeTimers()
    let attempts = 0
    const client = new ProClubsClient({
      maxAttempts: 2,
      baseDelayMs: 0,
      transport: async () => {
        attempts += 1
        if (attempts === 1) {
          return new Response('Too Many Requests', {
            status: 429,
            headers: { 'Retry-After': '2' },
          })
        }
        return new Response(
          JSON.stringify([{ clubId: '42', clubName: 'Paris Eleven' }]),
          { status: 200 },
        )
      },
    })

    const pending = client.clubs.search({ name: 'Paris Eleven' })
    await vi.advanceTimersByTimeAsync(1_999)
    expect(attempts).toBe(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(pending).resolves.toEqual([
      { clubId: '42', clubName: 'Paris Eleven' },
    ])
    expect(attempts).toBe(2)

    const exhausted = new ProClubsClient({
      maxAttempts: 1,
      transport: async () =>
        new Response('Too Many Requests', {
          status: 429,
          headers: { 'Retry-After': '3' },
        }),
    })

    await expect(
      exhausted.clubs.search({ name: 'Paris Eleven' }),
    ).rejects.toMatchObject({
      name: 'ProClubsHttpError',
      status: 429,
      retryAfterMs: 3_000,
    } satisfies Partial<ProClubsHttpError>)
  })
})

afterEach(() => {
  vi.useRealTimers()
})
