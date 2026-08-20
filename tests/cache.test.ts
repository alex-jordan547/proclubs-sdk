import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ProClubsClient,
  ProClubsValidationError,
  type ProClubsEvent,
  type ProClubsResponse,
} from '../src/index.js'

function clubResponse(name = 'ALL STAR 237'): ProClubsResponse {
  return new Response(JSON.stringify([{ clubId: '42', clubName: name }]), {
    status: 200,
  })
}

describe('ProClubsClient cache and observability', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('enables the beginner defaults with cache: true', async () => {
    vi.useFakeTimers()
    let calls = 0
    const client = new ProClubsClient({
      cache: true,
      transport: async () => {
        calls += 1
        return clubResponse(`version-${calls}`)
      },
    })

    await expect(
      client.clubs.search({ name: 'ALL STAR 237' }),
    ).resolves.toEqual([{ clubId: '42', clubName: 'version-1' }])
    await expect(
      client.clubs.search({ name: 'ALL STAR 237' }),
    ).resolves.toEqual([{ clubId: '42', clubName: 'version-1' }])
    expect(calls).toBe(1)

    vi.advanceTimersByTime(60_000)
    await expect(
      client.clubs.search({ name: 'ALL STAR 237' }),
    ).resolves.toEqual([{ clubId: '42', clubName: 'version-2' }])
    expect(calls).toBe(2)
  })

  it('accepts advanced cache settings and evicts the least recently used entry', async () => {
    let calls = 0
    const client = new ProClubsClient({
      cache: { ttlMs: 10_000, maxEntries: 2 },
      transport: async () => {
        calls += 1
        return clubResponse(`version-${calls}`)
      },
    })

    await client.clubs.search({ name: 'ALL STAR 237' })
    await client.clubs.search({ name: 'HEMLE FC' })
    await client.clubs.search({ name: 'ALL STAR 237' })
    await client.clubs.search({ name: 'THIRD CLUB' })
    await client.clubs.search({ name: 'HEMLE FC' })

    expect(calls).toBe(4)
  })

  it('rejects invalid cache settings', () => {
    expect(() => new ProClubsClient({ cache: { ttlMs: 0 } })).toThrow(
      ProClubsValidationError,
    )
    expect(() => new ProClubsClient({ cache: { ttlMs: Number.NaN } })).toThrow(
      ProClubsValidationError,
    )
    expect(() => new ProClubsClient({ cache: { maxEntries: 0 } })).toThrow(
      ProClubsValidationError,
    )
    expect(() => new ProClubsClient({ cache: { maxEntries: 1.5 } })).toThrow(
      ProClubsValidationError,
    )
  })

  it('keeps cache disabled when the option is false', async () => {
    let calls = 0
    const client = new ProClubsClient({
      cache: false,
      transport: async () => {
        calls += 1
        return clubResponse()
      },
    })

    await client.clubs.search({ name: 'ALL STAR 237' })
    await client.clubs.search({ name: 'ALL STAR 237' })

    expect(calls).toBe(2)
  })

  it('supports bypass and refresh modes without caching errors', async () => {
    let calls = 0
    const client = new ProClubsClient({
      cache: true,
      maxAttempts: 1,
      transport: async (url) => {
        calls += 1
        if (new URL(url).searchParams.get('clubName') === 'HEMLE FC') {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
          })
        }
        return clubResponse(`version-${calls}`)
      },
    })

    await client.clubs.search({ name: 'ALL STAR 237' })
    await client.clubs.search({ name: 'ALL STAR 237' }, { cache: 'bypass' })
    await expect(
      client.clubs.search({ name: 'ALL STAR 237' }),
    ).resolves.toEqual([{ clubId: '42', clubName: 'version-1' }])
    await expect(
      client.clubs.search({ name: 'ALL STAR 237' }, { cache: 'refresh' }),
    ).resolves.toEqual([{ clubId: '42', clubName: 'version-3' }])
    await expect(
      client.clubs.search({ name: 'ALL STAR 237' }),
    ).resolves.toEqual([{ clubId: '42', clubName: 'version-3' }])

    await expect(client.clubs.search({ name: 'HEMLE FC' })).rejects.toThrow()
    await expect(client.clubs.search({ name: 'HEMLE FC' })).rejects.toThrow()
    expect(calls).toBe(5)
  })

  it('deduplicates concurrent calls and protects cached values from mutation', async () => {
    let release!: (response: ProClubsResponse) => void
    const transport = vi.fn(
      () =>
        new Promise<ProClubsResponse>((resolve) => {
          release = resolve
        }),
    )
    const client = new ProClubsClient({ cache: true, transport })

    const first = client.clubs.search({ name: 'ALL STAR 237' })
    await Promise.resolve()
    const second = client.clubs.search({ name: 'ALL STAR 237' })
    await Promise.resolve()

    expect(transport).toHaveBeenCalledTimes(1)
    release(clubResponse())
    const [firstResult, secondResult] = await Promise.all([first, second])
    expect(firstResult).toEqual(secondResult)

    const firstClub = firstResult[0]
    expect(firstClub).toBeDefined()
    if (firstClub) {
      firstClub.clubName = 'MUTATED'
    }
    await expect(
      client.clubs.search({ name: 'ALL STAR 237' }),
    ).resolves.toEqual([{ clubId: '42', clubName: 'ALL STAR 237' }])
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('does not deduplicate calls that carry abort signals', async () => {
    const firstController = new AbortController()
    const secondController = new AbortController()
    const signals: AbortSignal[] = []
    const transport = vi.fn(
      async (_url: string | URL, init?: { signal?: AbortSignal }) => {
        if (init?.signal) {
          signals.push(init.signal)
        }
        return clubResponse()
      },
    )
    const client = new ProClubsClient({ cache: true, transport })

    await Promise.all([
      client.clubs.search(
        { name: 'ALL STAR 237' },
        { signal: firstController.signal },
      ),
      client.clubs.search(
        { name: 'ALL STAR 237' },
        { signal: secondController.signal },
      ),
    ])

    expect(transport).toHaveBeenCalledTimes(2)
    expect(signals).toEqual([firstController.signal, secondController.signal])
  })

  it('emits typed, redacted events and isolates hook failures', async () => {
    const events: ProClubsEvent[] = []
    const client = new ProClubsClient({
      cache: true,
      onEvent: (event) => {
        events.push(event)
        throw new Error('observer failure')
      },
      transport: async () => clubResponse(),
    })

    await client.clubs.search({ name: 'ALL STAR 237' })
    await client.clubs.search({ name: 'ALL STAR 237' })

    expect(events.map(({ type }) => type)).toEqual([
      'cache:miss',
      'request:start',
      'request:success',
      'cache:write',
      'cache:hit',
    ])
    expect(JSON.stringify(events)).not.toContain('ALL STAR 237')
    expect(JSON.stringify(events)).not.toContain('42')
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'request:success',
          endpoint: 'clubsSearch',
          status: 200,
        }),
      ]),
    )
  })

  it('emits retry and final error metadata without response details', async () => {
    const events: ProClubsEvent[] = []
    let calls = 0
    const client = new ProClubsClient({
      cache: true,
      maxAttempts: 2,
      baseDelayMs: 0,
      onEvent: (event) => {
        events.push(event)
      },
      transport: async () => {
        calls += 1
        return calls === 1
          ? new Response('Too Many Requests', { status: 429 })
          : new Response(JSON.stringify({ error: 'Forbidden' }), {
              status: 403,
            })
      },
    })

    await expect(
      client.clubs.search({ name: 'ALL STAR 237' }),
    ).rejects.toMatchObject({ code: 'HTTP', status: 403 })

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'request:retry',
          status: 429,
          delayMs: 0,
        }),
        expect.objectContaining({
          type: 'request:error',
          status: 403,
          errorCode: 'HTTP',
        }),
      ]),
    )
    expect(JSON.stringify(events)).not.toContain('Forbidden')
  })
})
