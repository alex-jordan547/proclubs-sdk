import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  ProClubsAbortError,
  ProClubsClient,
  type ProClubsEvent,
  type ProClubsResponse,
  ProClubsValidationError,
  resolveSeasonLabel,
} from '../src/index.js'

function loadFixture(name: string): string {
  return readFileSync(
    join(process.cwd(), 'tests', 'fixtures', `${name}.json`),
    'utf8',
  )
}

function playoffResponse(seasonId: string): ProClubsResponse {
  return new Response(
    JSON.stringify([
      {
        seasonId,
        seasonName: `CLUBS_LEAGUE_SEASON_0${seasonId}`,
        bestDivision: '3',
        bestFinishGroup: '1',
      },
    ]),
    { status: 200 },
  )
}

describe('ProClubsClient playoff achievements', () => {
  it('uses the documented route and platform defaults', async () => {
    const requestedUrls: string[] = []
    const client = new ProClubsClient({
      transport: async (url) => {
        requestedUrls.push(url.toString())
        return new Response('[]', { status: 200 })
      },
    })

    await client.clubs.playoffAchievements({ clubId: '42' })
    await client.clubs.playoffAchievements(
      { clubId: 79548, platform: 'nx' },
      { cache: 'bypass' },
    )

    expect(requestedUrls).toEqual([
      'https://proclubs.ea.com/api/fc/club/playoffAchievements?platform=common-gen5&clubId=42',
      'https://proclubs.ea.com/api/fc/club/playoffAchievements?platform=nx&clubId=79548',
    ])
  })

  it('preserves EA values, order, nested information, and adds labels', async () => {
    const rawFixture = loadFixture('playoff-achievements')
    const client = new ProClubsClient({
      transport: async () => new Response(rawFixture, { status: 200 }),
    })

    const result = await client.clubs.playoffAchievements({ clubId: '42' })

    expect(result.map(({ seasonId }) => seasonId)).toEqual(['7', '6'])
    expect(result[0]).toMatchObject({
      seasonId: '7',
      seasonName: 'CLUBS_LEAGUE_SEASON_07',
      bestDivision: '3',
      bestFinishGroup: '1',
      divisionLabel: 'Division 2',
      finishLabel: 'Champion',
      seasonLabel: 'Season 7',
    })
    expect(result[1]).toMatchObject({
      divisionLabel: 'Division 3',
      finishLabel: 'Runner-Up',
      seasonLabel: 'Season 6',
    })
    expect(result[0]?.clubInfo?.regionLabel).toBe('Southern Europe')
    expect(result[0]?.clubInfo?.customKit?.crestAssetId).toBe('99140109')
  })

  it('keeps unknown IDs and fields without requiring a closed season enum', async () => {
    const payload = [
      {
        seasonId: '9',
        seasonName: 'EA_NEW_SEASON_FORMAT',
        bestDivision: '99',
        bestFinishGroup: '99',
        unknownField: { nested: true },
        clubInfo: {
          clubId: '42',
          unknownClubField: 'preserved',
        },
      },
    ]
    const client = new ProClubsClient({
      transport: async () =>
        new Response(JSON.stringify(payload), { status: 200 }),
    })

    const [result] = await client.clubs.playoffAchievements({ clubId: '42' })

    expect(result).toMatchObject({
      seasonId: '9',
      seasonName: 'EA_NEW_SEASON_FORMAT',
      bestDivision: '99',
      bestFinishGroup: '99',
      seasonLabel: 'Season 9',
      unknownField: { nested: true },
      clubInfo: { unknownClubField: 'preserved' },
    })
    expect(result).not.toHaveProperty('divisionLabel')
    expect(result).not.toHaveProperty('finishLabel')
    expect(resolveSeasonLabel('EA_NEW_SEASON_FORMAT', '9')).toBe('Season 9')
  })

  it('preserves upstream fields that collide with derived label names', async () => {
    const rawFixture = loadFixture('playoff-achievements-collision')
    const client = new ProClubsClient({
      transport: async () => new Response(rawFixture, { status: 200 }),
    })

    const [result] = await client.clubs.playoffAchievements({ clubId: '42' })

    expect(result).toMatchObject({
      divisionLabel: 'EA raw division label',
      finishLabel: 'Champion',
      seasonLabel: 'Season 7',
      derivedLabels: {
        divisionLabel: 'Division 2',
        existingLabel: 'preserved',
      },
    })
  })

  it('returns an empty history and rejects upstream error objects', async () => {
    const client = new ProClubsClient({
      transport: async (url) => {
        if (new URL(url).searchParams.get('clubId') === '42') {
          return new Response('[]', { status: 200 })
        }
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 200,
        })
      },
    })

    await expect(
      client.clubs.playoffAchievements({ clubId: '42' }),
    ).resolves.toEqual([])
    await expect(
      client.clubs.playoffAchievements({ clubId: '43' }),
    ).rejects.toBeInstanceOf(Error)
  })

  it('supports cache, refresh, deduplication, and endpoint-safe events', async () => {
    let calls = 0
    const events: ProClubsEvent[] = []
    const client = new ProClubsClient({
      cache: true,
      onEvent: (event) => {
        events.push(event)
      },
      transport: async () => {
        calls += 1
        return playoffResponse(String(calls))
      },
    })

    const first = await client.clubs.playoffAchievements({ clubId: '42' })
    const cached = await client.clubs.playoffAchievements({ clubId: '42' })
    const refreshed = await client.clubs.playoffAchievements(
      { clubId: '42' },
      { cache: 'refresh' },
    )
    const concurrent = await Promise.all([
      client.clubs.playoffAchievements({ clubId: '43' }),
      client.clubs.playoffAchievements({ clubId: '43' }),
    ])

    expect(calls).toBe(3)
    expect(first[0]?.seasonId).toBe('1')
    expect(cached[0]?.seasonId).toBe('1')
    expect(refreshed[0]?.seasonId).toBe('2')
    expect(concurrent[0]).toEqual(concurrent[1])
    expect(
      events.every((event) => event.endpoint === 'clubsPlayoffAchievements'),
    ).toBe(true)
    expect(JSON.stringify(events)).not.toContain('clubId')
    expect(JSON.stringify(events)).not.toContain('platform')
  })

  it('validates the club ID locally and supports cancellation', async () => {
    const controller = new AbortController()
    controller.abort()
    const client = new ProClubsClient({
      transport: vi.fn(async () => new Response('[]', { status: 200 })),
    })

    await expect(
      client.clubs.playoffAchievements({ clubId: '' }),
    ).rejects.toBeInstanceOf(ProClubsValidationError)
    await expect(
      client.clubs.playoffAchievements(
        { clubId: '42' },
        { signal: controller.signal },
      ),
    ).rejects.toBeInstanceOf(ProClubsAbortError)
  })
})
