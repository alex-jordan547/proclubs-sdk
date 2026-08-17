import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  GAME_PROFILES,
  MATCH_TYPES,
  PLATFORMS,
  type GameProfile,
  type MatchType,
  type Platform,
} from '../src/index.js'

describe('public domain constants', () => {
  it('exposes the supported game profile', () => {
    expect(GAME_PROFILES).toEqual(['fc26'])
    expectTypeOf<GameProfile>().toEqualTypeOf<'fc26'>()
  })

  it('exposes known platforms without implying live compatibility', () => {
    expect(PLATFORMS).toEqual(['common-gen5', 'common-gen4', 'nx'])
    expectTypeOf<Platform>().toEqualTypeOf<
      'common-gen5' | 'common-gen4' | 'nx'
    >()
  })

  it('exposes the three known match types', () => {
    expect(MATCH_TYPES).toEqual([
      'friendlyMatch',
      'leagueMatch',
      'playoffMatch',
    ])
    expectTypeOf<MatchType>().toEqualTypeOf<
      'friendlyMatch' | 'leagueMatch' | 'playoffMatch'
    >()
  })
})
