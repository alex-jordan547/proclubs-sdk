import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { runCompatibilityCheck } from '../src/compatibility.js'
import type { Endpoint } from '../src/constants.js'

function loadFixture(name: string): string {
  return readFileSync(
    join(process.cwd(), 'tests', 'fixtures', `${name}.json`),
    'utf8',
  )
}

describe('Compatibility runner', () => {
  it('runs all 6 endpoints sequentially on success and produces a sanitized report', async () => {
    const executedCalls: string[] = []
    const progressEvents: Array<{ endpoint: Endpoint; status: string }> = []

    const fixtureMap: Record<string, string> = {
      '/api/fc/allTimeLeaderboard/search': loadFixture('clubs-search'),
      '/api/fc/clubs/info': loadFixture('clubs-get'),
      '/api/fc/clubs/overallStats': loadFixture('clubs-overall-stats'),
      '/api/fc/members/stats': loadFixture('members-stats'),
      '/api/fc/members/career/stats': loadFixture('members-career-stats'),
      '/api/fc/clubs/matches': loadFixture('matches-list'),
    }

    const transport = async (url: string | URL) => {
      const parsed = new URL(url)
      executedCalls.push(parsed.pathname)
      const body = fixtureMap[parsed.pathname] ?? '[]'
      return new Response(body, { status: 200 })
    }

    const result = await runCompatibilityCheck({
      transport,
      onProgress: (endpoint, status) => {
        progressEvents.push({ endpoint, status })
      },
    })

    expect(executedCalls).toEqual([
      '/api/fc/allTimeLeaderboard/search',
      '/api/fc/clubs/info',
      '/api/fc/clubs/overallStats',
      '/api/fc/members/stats',
      '/api/fc/members/career/stats',
      '/api/fc/clubs/matches',
    ])

    expect(result.stoppedEarly).toBe(false)
    expect(result.report.summary.status).toBe('supported')
    expect(result.report.summary.recommendation).toBe('patch')

    // Verify report sanitization (no raw body dumps or sensitive strings)
    const reportString = JSON.stringify(result.report)
    expect(reportString).not.toContain('https://')
    expect(reportString).not.toContain('Wembley')
  })

  it('stops immediately at the first access control or HTTP error without calling remaining endpoints', async () => {
    const executedCalls: string[] = []

    const transport = async (url: string | URL) => {
      const parsed = new URL(url)
      executedCalls.push(parsed.pathname)
      if (parsed.pathname === '/api/fc/allTimeLeaderboard/search') {
        return new Response(loadFixture('clubs-search'), { status: 200 })
      }
      // clubs/info fails with 403
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
      })
    }

    const result = await runCompatibilityCheck({ transport })

    expect(executedCalls).toEqual([
      '/api/fc/allTimeLeaderboard/search',
      '/api/fc/clubs/info',
    ])
    expect(result.stoppedEarly).toBe(true)
    expect(result.stopReason).toContain('403')
    expect(result.report.endpoints.clubsGet.status).toBe('drifted')
    expect(result.report.endpoints.clubsOverallStats.status).toBe('unverified')
  })

  it('stops immediately when upstream returns non-JSON / HTML', async () => {
    const executedCalls: string[] = []

    const transport = async (url: string | URL) => {
      const parsed = new URL(url)
      executedCalls.push(parsed.pathname)
      return new Response(
        '<html><head><title>Cloudflare</title></head></html>',
        {
          status: 200,
        },
      )
    }

    const result = await runCompatibilityCheck({ transport })

    expect(executedCalls).toEqual(['/api/fc/allTimeLeaderboard/search'])
    expect(result.stoppedEarly).toBe(true)
    expect(result.report.endpoints.clubsSearch.status).toBe('drifted')
  })

  it('treats non-access-control HTTP errors as unverified, not drifted', async () => {
    const transport = async () =>
      new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 })

    const result = await runCompatibilityCheck({ transport })

    expect(result.stoppedEarly).toBe(true)
    expect(result.stopReason).toContain('404')
    expect(result.stopReason).not.toContain('Access control')
    expect(result.report.endpoints.clubsSearch.status).toBe('unverified')
    expect(result.report.endpoints.clubsGet.status).toBe('unverified')
  })

  it('reports field-level drift when Zod rejects a captured JSON body', async () => {
    const executedCalls: string[] = []
    const transport = async (url: string | URL) => {
      const parsed = new URL(url)
      executedCalls.push(parsed.pathname)
      return new Response(JSON.stringify([{ wins: '8' }]), { status: 200 })
    }

    const result = await runCompatibilityCheck({ transport })

    expect(executedCalls).toEqual(['/api/fc/allTimeLeaderboard/search'])
    expect(result.stoppedEarly).toBe(true)
    expect(result.report.endpoints.clubsSearch.status).toBe('drifted')
    expect(result.report.endpoints.clubsSearch.issues).toEqual([
      {
        kind: 'field_removed',
        path: '$[0].clubId',
        message: 'Required field $[0].clubId is missing',
        expected: 'id',
        actual: 'undefined',
      },
      {
        kind: 'envelope_changed',
        path: '$',
        message:
          'SDK rejected a JSON payload that matched the structural contract',
        actual: 'schema_rejected',
      },
    ])
    expect(result.stopReason).toContain('drifted')
  })

  it('never marks a Zod rejection as passed, even if the structural contract matches', async () => {
    const executedCalls: string[] = []
    const transport = async (url: string | URL) => {
      const parsed = new URL(url)
      executedCalls.push(parsed.pathname)
      if (parsed.pathname === '/api/fc/allTimeLeaderboard/search') {
        return new Response(loadFixture('clubs-search'), { status: 200 })
      }
      return new Response(JSON.stringify({ '42': { name: 123 } }), {
        status: 200,
      })
    }

    const result = await runCompatibilityCheck({ transport })

    expect(executedCalls).toEqual([
      '/api/fc/allTimeLeaderboard/search',
      '/api/fc/clubs/info',
    ])
    expect(result.stoppedEarly).toBe(true)
    expect(result.report.endpoints.clubsGet.status).toBe('drifted')
    expect(result.report.endpoints.clubsGet.status).not.toBe('passed')
    expect(result.stopReason).toBe('Response drifted from the known contract')
    expect(result.stopReason).not.toContain('non-JSON')
  })

  it('stops gracefully when search returns an empty array', async () => {
    const executedCalls: string[] = []

    const transport = async (url: string | URL) => {
      const parsed = new URL(url)
      executedCalls.push(parsed.pathname)
      return new Response('[]', { status: 200 })
    }

    const result = await runCompatibilityCheck({ transport })

    expect(executedCalls).toEqual(['/api/fc/allTimeLeaderboard/search'])
    expect(result.stoppedEarly).toBe(true)
    expect(result.stopReason).toContain('No clubs returned in search')
  })
})
