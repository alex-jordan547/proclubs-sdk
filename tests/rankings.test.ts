import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  ProClubsClient,
  type ProClubsEvent,
  type ProClubsResponse,
  ProClubsValidationError,
} from '../src/index.js'

function loadFixture(name: string): string {
  return readFileSync(
    join(process.cwd(), 'tests', 'fixtures', `${name}.json`),
    'utf8',
  )
}

function rankingResponse(rank: number): ProClubsResponse {
  return new Response(JSON.stringify([{ clubId: '42', rank }]), {
    status: 200,
  })
}

describe('ProClubsClient rankings', () => {
  it('uses the four ranking routes with default and explicit platforms', async () => {
    const requestedUrls: string[] = []
    const client = new ProClubsClient({
      transport: async (url) => {
        requestedUrls.push(url.toString())
        return new Response('[]', { status: 200 })
      },
    })

    await client.rankings.allTime()
    await client.rankings.searchAllTime({ name: 'ALL STAR 237' })
    await client.rankings.currentSeason({ platform: 'nx' })
    await client.rankings.searchCurrentSeason({
      name: 'HEMLE FC',
      platform: 'common-gen4',
    })

    expect(requestedUrls).toEqual([
      'https://proclubs.ea.com/api/fc/allTimeLeaderboard?platform=common-gen5',
      'https://proclubs.ea.com/api/fc/allTimeLeaderboard/search?clubName=ALL+STAR+237&platform=common-gen5',
      'https://proclubs.ea.com/api/fc/currentSeasonLeaderboard?platform=nx',
      'https://proclubs.ea.com/api/fc/currentSeasonLeaderboard/search?clubName=HEMLE+FC&platform=common-gen4',
    ])
  })

  it('trims and encodes ranking search names and rejects empty names locally', async () => {
    const requestedUrls: string[] = []
    const client = new ProClubsClient({
      transport: async (url) => {
        requestedUrls.push(url.toString())
        return new Response('[]', { status: 200 })
      },
    })

    await client.rankings.searchAllTime({ name: '  A&B / FC  ' })

    expect(requestedUrls).toEqual([
      'https://proclubs.ea.com/api/fc/allTimeLeaderboard/search?clubName=A%26B+%2F+FC&platform=common-gen5',
    ])
    await expect(
      client.rankings.searchCurrentSeason({ name: '' }),
    ).rejects.toBeInstanceOf(ProClubsValidationError)
    expect(requestedUrls).toHaveLength(1)
  })

  it('returns full boards in EA order and keeps optional averages absent', async () => {
    const allTimeFixture = loadFixture('rankings-all-time')
    const currentSeasonFixture = loadFixture('rankings-current-season')
    const client = new ProClubsClient({
      transport: async (url) => {
        const pathname = new URL(url).pathname
        const body = pathname.endsWith('/currentSeasonLeaderboard')
          ? currentSeasonFixture
          : allTimeFixture
        return new Response(body, { status: 200 })
      },
    })

    const allTime = await client.rankings.allTime()
    const currentSeason = await client.rankings.currentSeason()

    expect(allTime.map(({ rank }) => rank)).toEqual([1, 2])
    expect(allTime.map(({ clubName }) => clubName)).toEqual([
      'ALL STAR 237',
      'HEMLE FC',
    ])
    expect(allTime[0]?.skillRating).toBe('3034')
    expect(currentSeason[1]?.clubName).toBe('HEMLE FC')
    expect(currentSeason[1]).not.toHaveProperty('goalsPerGame')
    expect(currentSeason[1]).not.toHaveProperty('goalsAgainstPerGame')
  })

  it('returns search hits without rank and an empty array for no matches', async () => {
    const hitFixture = loadFixture('rankings-search-all-time')
    const emptyFixture = loadFixture('rankings-search-empty')
    const client = new ProClubsClient({
      transport: async (url) => {
        const name = new URL(url).searchParams.get('clubName')
        const body = name === 'HEMLE FC' ? emptyFixture : hitFixture
        return new Response(body, { status: 200 })
      },
    })

    const hits = await client.rankings.searchAllTime({
      name: 'ALL STAR 237',
    })
    const empty = await client.rankings.searchCurrentSeason({
      name: 'HEMLE FC',
    })

    expect(hits).toHaveLength(1)
    expect(hits[0]?.clubName).toBe('ALL STAR 237')
    expect(hits[0]).not.toHaveProperty('rank')
    expect(empty).toEqual([])
  })

  it('preserves unknown EA fields at every ranking object depth', async () => {
    const payload = [
      {
        clubId: '42',
        rank: 1,
        unknownRankingField: 'kept',
        clubInfo: {
          clubId: 42,
          unknownClubInfoField: true,
          customKit: {
            unknownKitField: { value: 7 },
          },
        },
      },
    ]
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(payload), { status: 200 }),
    })

    const [entry] = await client.rankings.allTime()

    expect(entry?.['unknownRankingField']).toBe('kept')
    expect(entry?.clubInfo?.['unknownClubInfoField']).toBe(true)
    expect(entry?.clubInfo?.customKit?.['unknownKitField']).toEqual({
      value: 7,
    })
  })

  it('supports cache defaults, bypass, and refresh for all-time rankings', async () => {
    let calls = 0
    const client = new ProClubsClient({
      cache: true,
      transport: async () => {
        calls += 1
        return rankingResponse(calls)
      },
    })

    await expect(client.rankings.allTime()).resolves.toEqual([
      { clubId: '42', rank: 1 },
    ])
    await expect(client.rankings.allTime()).resolves.toEqual([
      { clubId: '42', rank: 1 },
    ])
    await expect(
      client.rankings.allTime(undefined, { cache: 'bypass' }),
    ).resolves.toEqual([{ clubId: '42', rank: 2 }])
    await expect(client.rankings.allTime()).resolves.toEqual([
      { clubId: '42', rank: 1 },
    ])
    await expect(
      client.rankings.allTime(undefined, { cache: 'refresh' }),
    ).resolves.toEqual([{ clubId: '42', rank: 3 }])
    await expect(client.rankings.allTime()).resolves.toEqual([
      { clubId: '42', rank: 3 },
    ])
    expect(calls).toBe(3)
  })

  it('keeps clubs.search and rankings.searchAllTime cache keys distinct', async () => {
    let calls = 0
    const client = new ProClubsClient({
      cache: true,
      transport: async () => {
        calls += 1
        return new Response(
          JSON.stringify([{ clubId: String(calls), clubName: 'ALL STAR 237' }]),
          { status: 200 },
        )
      },
    })

    const clubs = await client.clubs.search({ name: 'ALL STAR 237' })
    const rankings = await client.rankings.searchAllTime({
      name: 'ALL STAR 237',
    })

    expect(calls).toBe(2)
    expect(clubs).toEqual([{ clubId: '1', clubName: 'ALL STAR 237' }])
    expect(rankings).toEqual([{ clubId: '2', clubName: 'ALL STAR 237' }])
  })

  it('deduplicates concurrent all-time ranking requests', async () => {
    let release!: (response: ProClubsResponse) => void
    const transport = vi.fn(
      () =>
        new Promise<ProClubsResponse>((resolve) => {
          release = resolve
        }),
    )
    const client = new ProClubsClient({ cache: true, transport })

    const first = client.rankings.allTime()
    await Promise.resolve()
    const second = client.rankings.allTime()
    await Promise.resolve()

    expect(transport).toHaveBeenCalledTimes(1)
    release(rankingResponse(1))
    await expect(Promise.all([first, second])).resolves.toEqual([
      [{ clubId: '42', rank: 1 }],
      [{ clubId: '42', rank: 1 }],
    ])
  })

  it('emits ranking endpoint ids without names or query parameters', async () => {
    const events: ProClubsEvent[] = []
    const client = new ProClubsClient({
      onEvent: (event) => {
        events.push(event)
      },
      transport: async () => new Response('[]', { status: 200 }),
    })

    await client.rankings.allTime()
    await client.rankings.searchAllTime({ name: 'ALL STAR 237' })
    await client.rankings.currentSeason()
    await client.rankings.searchCurrentSeason({ name: 'HEMLE FC' })

    expect(
      events
        .filter(({ type }) => type === 'request:success')
        .map(({ endpoint }) => endpoint),
    ).toEqual([
      'rankingsAllTime',
      'rankingsSearchAllTime',
      'rankingsCurrentSeason',
      'rankingsSearchCurrentSeason',
    ])
    const serialized = JSON.stringify(events)
    expect(serialized).not.toContain('ALL STAR 237')
    expect(serialized).not.toContain('HEMLE FC')
    expect(serialized).not.toContain('clubName')
    expect(serialized).not.toContain('platform')
  })
})
