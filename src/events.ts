import type { ProClubsErrorCode } from './errors.js'
import type { ProClubsEndpoint } from './constants.js'

export type { ProClubsEndpoint } from './constants.js'

export type ProClubsEvent =
  | {
      readonly type: 'cache:hit' | 'cache:miss' | 'cache:write'
      readonly endpoint: ProClubsEndpoint
    }
  | {
      readonly type: 'dedupe:join'
      readonly endpoint: ProClubsEndpoint
    }
  | {
      readonly type: 'request:start'
      readonly endpoint: ProClubsEndpoint
      readonly attempt: number
    }
  | {
      readonly type: 'request:success'
      readonly endpoint: ProClubsEndpoint
      readonly attempt: number
      readonly status: number
      readonly durationMs: number
    }
  | {
      readonly type: 'request:retry'
      readonly endpoint: ProClubsEndpoint
      readonly attempt: number
      readonly delayMs: number
      readonly status?: number
      readonly errorCode?: ProClubsErrorCode
    }
  | {
      readonly type: 'request:error'
      readonly endpoint: ProClubsEndpoint
      readonly attempt: number
      readonly durationMs: number
      readonly status?: number
      readonly errorCode?: ProClubsErrorCode
    }

export type ProClubsEventHandler = (
  event: ProClubsEvent,
) => void | Promise<void>
