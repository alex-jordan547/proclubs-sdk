import impit from 'impit'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ProClubsAbortError,
  ProClubsClient,
  type JsonValue,
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
          JSON.stringify([{ clubId: '42', clubName: 'ALL STAR 237' }]),
          { status: 200 },
        )
      },
    })

    const clubs = await client.clubs.search({ name: 'ALL STAR 237' })

    expect(clubs).toEqual([{ clubId: '42', clubName: 'ALL STAR 237' }])
    expect(requestedUrls).toEqual([
      'https://proclubs.ea.com/api/fc/allTimeLeaderboard/search?clubName=ALL+STAR+237&platform=common-gen5',
    ])
  })

  it('provides the complete Pro Clubs endpoint surface', async () => {
    const requestedUrls: string[] = []
    const client = new ProClubsClient({
      transport: async (url) => {
        const parsedUrl = new URL(url)
        requestedUrls.push(`${parsedUrl.pathname}${parsedUrl.search}`)

        const bodies = {
          '/api/fc/clubs/info': {
            '42': { clubId: 42, name: 'ALL STAR 237' },
          },
          '/api/fc/clubs/overallStats': [{ clubId: '42', wins: '8' }],
          '/api/fc/members/stats': {
            members: [{ name: 'mrjordan_237', goals: '7' }],
            positionCount: { forward: 1 },
          },
          '/api/fc/members/career/stats': {
            members: [{ name: 'mrjordan237', gamesPlayed: 12 }],
            positionCount: { midfield: 1 },
          },
          '/api/fc/clubs/matches': [],
        } satisfies Record<string, JsonValue>

        let body: JsonValue | undefined
        switch (parsedUrl.pathname) {
          case '/api/fc/clubs/info':
            body = bodies['/api/fc/clubs/info']
            break
          case '/api/fc/clubs/overallStats':
            body = bodies['/api/fc/clubs/overallStats']
            break
          case '/api/fc/members/stats':
            body = bodies['/api/fc/members/stats']
            break
          case '/api/fc/members/career/stats':
            body = bodies['/api/fc/members/career/stats']
            break
          case '/api/fc/clubs/matches':
            body = bodies['/api/fc/clubs/matches']
            break
        }
        return new Response(JSON.stringify(body), {
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
        club: { clubId: 42, name: 'ALL STAR 237' },
        overall: { clubId: '42', wins: '8' },
        members: {
          members: [{ name: 'mrjordan_237', goals: '7' }],
          positionCount: { forward: 1 },
        },
        careers: {
          members: [{ name: 'mrjordan237', gamesPlayed: 12 }],
          positionCount: { midfield: 1 },
        },
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
          JSON.stringify([{ clubId: '42', clubName: 'ALL STAR 237' }]),
          { status: 200 },
        )
      },
    })

    const clubs = await client.clubs.search({ name: 'ALL STAR 237' })

    expect({ attempts, clubs }).toEqual({
      attempts: 2,
      clubs: [{ clubId: '42', clubName: 'ALL STAR 237' }],
    })
  })

  it('accepts an EA false 403 only when its payload matches the endpoint schema', async () => {
    const client = new ProClubsClient({
      maxAttempts: 1,
      transport: async () =>
        new Response(
          JSON.stringify([{ clubId: '42', clubName: 'ALL STAR 237' }]),
          { status: 403 },
        ),
    })

    await expect(
      client.clubs.search({ name: 'ALL STAR 237' }),
    ).resolves.toEqual([{ clubId: '42', clubName: 'ALL STAR 237' }])
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
      { name: 'HEMLE FC', platform: 'nx' },
      { signal: controller.signal },
    )

    expect({ requestedUrl, requestedSignal }).toEqual({
      requestedUrl:
        'https://proclubs.ea.com/api/fc/allTimeLeaderboard/search?clubName=HEMLE+FC&platform=nx',
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
      client.clubs.search({ name: 'ALL STAR 237' }),
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
      client.clubs.search({ name: 'ALL STAR 237' }),
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
      client.clubs.search({ name: 'ALL STAR 237' }),
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
      timeoutClient.clubs.search({ name: 'ALL STAR 237' }),
    ).rejects.toBeInstanceOf(ProClubsTimeoutError)
    await expect(
      networkClient.clubs.search({ name: 'ALL STAR 237' }),
    ).rejects.toBeInstanceOf(ProClubsNetworkError)
  })

  it('preserves AbortError and TimeoutError names from non-Error rejections', async () => {
    const abortClient = new ProClubsClient({
      maxAttempts: 3,
      baseDelayMs: 0,
      transport: async () => {
        throw { name: 'AbortError', message: 'aborted' }
      },
    })
    const timeoutClient = new ProClubsClient({
      maxAttempts: 1,
      transport: async () => {
        throw { name: 'TimeoutError', message: 'timed out' }
      },
    })

    await expect(
      abortClient.clubs.search({ name: 'ALL STAR 237' }),
    ).rejects.toBeInstanceOf(ProClubsAbortError)
    await expect(
      timeoutClient.clubs.search({ name: 'ALL STAR 237' }),
    ).rejects.toBeInstanceOf(ProClubsTimeoutError)
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
      abortClient.clubs.search({ name: 'ALL STAR 237' }),
    ).rejects.toBeInstanceOf(ProClubsAbortError)
    expect(abortAttempts).toBe(1)

    await expect(
      timeoutClient.clubs.search({ name: 'ALL STAR 237' }),
    ).rejects.toBeInstanceOf(ProClubsTimeoutError)
    expect(timeoutAttempts).toBe(2)

    await expect(
      networkClient.clubs.search({ name: 'ALL STAR 237' }),
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
        client.clubs.search({ name: 'ALL STAR 237' }),
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
        { name: 'ALL STAR 237' },
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
          JSON.stringify([{ clubId: '42', clubName: 'ALL STAR 237' }]),
          { status: 200 },
        )
      },
    })

    const pending = client.clubs.search({ name: 'ALL STAR 237' })
    await vi.advanceTimersByTimeAsync(1_999)
    expect(attempts).toBe(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(pending).resolves.toEqual([
      { clubId: '42', clubName: 'ALL STAR 237' },
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
      exhausted.clubs.search({ name: 'ALL STAR 237' }),
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
