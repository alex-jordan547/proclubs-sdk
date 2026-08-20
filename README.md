# proclubs-sdk

Unofficial TypeScript ESM SDK for the public EA Sports FC Pro Clubs endpoints.
It provides typed inputs, validated responses, retries, and typed errors for
server-side Node.js applications.

> [!WARNING]
> This project is not affiliated with or endorsed by Electronic Arts. The EA
> endpoints are undocumented and may change or become unavailable without
> notice. Use them responsibly and keep request volumes modest.

## Requirements

- Node.js 22 or newer
- ESM

## Installation

```bash
npm install proclubs-sdk
```

## Quick start

```ts
import { ProClubsClient } from 'proclubs-sdk'

const proclubs = new ProClubsClient()
const clubs = await proclubs.clubs.search({ name: 'Paris Eleven' })

if (clubs[0]) {
  const clubId = clubs[0].clubId

  const [info, overallStats, memberStats, careerStats, matches] =
    await Promise.all([
      proclubs.clubs.get({ clubId }),
      proclubs.clubs.overallStats({ clubId }),
      proclubs.members.stats({ clubId }),
      proclubs.members.careerStats({ clubId }),
      proclubs.matches.list({ clubId }),
    ])

  console.log({ info, overallStats, memberStats, careerStats, matches })
}
```

## API

| Method | Input | Result |
| --- | --- | --- |
| `clubs.search` | `{ name, platform? }` | `Promise<ClubSummary[]>` |
| `clubs.get` | `{ clubId, platform? }` | `Promise<ClubInfo \| null>` |
| `clubs.overallStats` | `{ clubId, platform? }` | `Promise<ClubOverallStats \| null>` |
| `members.stats` | `{ clubId, platform? }` | `Promise<ClubMemberStats>` |
| `members.careerStats` | `{ clubId, platform? }` | `Promise<ClubMemberCareerStats>` |
| `matches.list` | `{ clubId, platform?, type?, limit? }` | `Promise<ClubMatch[]>` |

Search names are trimmed and must contain 1 to 32 characters. `clubId` accepts a
non-empty string or an integer. Supported platforms are `common-gen5` (the
default), `common-gen4`, and `nx`.

For `matches.list`, `type` defaults to `leagueMatch` and accepts
`friendlyMatch`, `leagueMatch`, or `playoffMatch`. `limit` is an integer from 1
to 10 and defaults to 10.

Every method accepts `{ signal?: AbortSignal }` as its second argument:

```ts
const controller = new AbortController()

const matches = await proclubs.matches.list(
  { clubId: '12345', type: 'friendlyMatch', limit: 5 },
  { signal: controller.signal },
)
```

## Client options

```ts
const proclubs = new ProClubsClient({
  platform: 'common-gen5',
  timeoutMs: 15_000,
  maxAttempts: 3,
  baseDelayMs: 400,
})
```

- `platform`: default platform for requests; defaults to `common-gen5`.
- `timeoutMs`: positive finite timeout used by the built-in transport; defaults
  to `15_000`.
- `maxAttempts`: total request attempts from 1 to 5; defaults to `3`.
- `baseDelayMs`: non-negative initial retry delay; defaults to `400`.
- `transport`: optional custom `ProClubsTransport` implementation.

The built-in client retries transient network failures and retryable EA
responses with exponential backoff, respecting `Retry-After` when present.

## Typed errors

All SDK errors extend `ProClubsError` and expose a typed `code`:

- `ProClubsValidationError` (`VALIDATION`)
- `ProClubsAbortError` (`ABORTED`)
- `ProClubsTimeoutError` (`TIMEOUT`)
- `ProClubsNetworkError` (`NETWORK`)
- `ProClubsHttpError` (`HTTP`), with `status`, `endpoint`, and optional
  `retryAfterMs` and `bodySnippet`
- `ProClubsResponseError` (`INVALID_RESPONSE`), with `endpoint`

```ts
import { ProClubsError, ProClubsHttpError } from 'proclubs-sdk'

try {
  await proclubs.clubs.get({ clubId: '12345' })
} catch (error) {
  if (error instanceof ProClubsHttpError) {
    console.error(error.status, error.endpoint)
  } else if (error instanceof ProClubsError) {
    console.error(error.code, error.message)
  }
}
```

## License

[MIT](./LICENSE)

## Development

```bash
npm install
npm run check
```

See [docs/sdk-v1-spec.md](./docs/sdk-v1-spec.md) for the SDK v1 specification.

The first npm release is prepared in
[docs/npm-publish.md](./docs/npm-publish.md).
