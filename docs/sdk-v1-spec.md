# SDK v0.1 contract

`proclubs-sdk` is an unofficial, server-side TypeScript client for the public
endpoints used by EA Sports FC Pro Clubs. Its purpose is to hide unstable route
names, query parameters, response-envelope checks, and the HTTP client behavior
required to make ordinary low-volume requests reliably.

The package is not affiliated with or endorsed by Electronic Arts. The upstream
API is undocumented and can change without notice.

## Runtime and distribution

- Node.js 22 or newer
- ESM only
- TypeScript declarations included
- no credentials, cookies, proxy, hosted relay, cache, or telemetry
- direct requests to `https://proclubs.ea.com/api/fc/`
- `Impit` with a Chrome network profile as the default server-side transport

The transport may be injected for tests or custom server runtimes. Browser use
is outside the v0.1 contract.

## Public client

```ts
import { ProClubsClient } from 'proclubs-sdk'

const client = new ProClubsClient()
```

`common-gen5` is the default platform. The client also accepts `common-gen4`
and `nx`, globally or per call.

```ts
new ProClubsClient({
  platform: 'common-gen5',
  timeoutMs: 15_000,
  maxAttempts: 3,
  baseDelayMs: 400,
  transport,
})
```

`maxAttempts` must be an integer from 1 through 5. `baseDelayMs` must be a
non-negative finite number, and `timeoutMs` must be a positive finite number.
Invalid client options raise `ProClubsValidationError`.

## Endpoint surface

| SDK method | EA route | Required input | Defaults |
| --- | --- | --- | --- |
| `clubs.search` | `allTimeLeaderboard/search` | `name` | default platform |
| `clubs.get` | `clubs/info` | `clubId` | default platform |
| `clubs.overallStats` | `clubs/overallStats` | `clubId` | default platform |
| `members.stats` | `members/stats` | `clubId` | default platform |
| `members.careerStats` | `members/career/stats` | `clubId` | default platform |
| `matches.list` | `clubs/matches` | `clubId` | `leagueMatch`, limit 10, default platform |

Every method accepts `{ signal?: AbortSignal }` as its second argument.
`matches.list` accepts `friendlyMatch`, `leagueMatch`, or `playoffMatch`, and a
limit from 1 through 10.

The methods preserve upstream fields after validating the known response
envelope. Objects are deliberately open because EA may add fields. `clubs.get`
and `clubs.overallStats` unwrap the selected club and return `null` when the
upstream response contains no matching item. Collection methods return `[]`
when EA returns an empty collection.

## Transport and resilience

The default transport uses Impit's Chrome profile instead of manually copying
browser headers. This addresses failures caused by TLS or HTTP-client
fingerprints while keeping the package local and dependency-light.

The client retries network failures and these transient statuses:

- `403` when the body does not match the requested endpoint schema
- `429`
- `502`
- `503`
- `504`

Retries use exponential backoff from `baseDelayMs` and respect `Retry-After`
when it requests a longer delay. An EA response with status `403` is accepted
only when its JSON body validates as the endpoint's expected response. This
handles EA's observed false-403 behavior without treating an actual forbidden
error as successful.

Abort errors are never retried. Timeouts and other network failures are retried
up to `maxAttempts`, then converted into stable SDK errors.

## Error contract

All stable SDK errors extend `ProClubsError` and expose a `code`:

| Class | Code | Meaning |
| --- | --- | --- |
| `ProClubsValidationError` | `VALIDATION` | Invalid local input |
| `ProClubsAbortError` | `ABORTED` | Caller or transport aborted the request |
| `ProClubsTimeoutError` | `TIMEOUT` | Attempts ended in a timeout |
| `ProClubsNetworkError` | `NETWORK` | Attempts ended in another transport failure |
| `ProClubsHttpError` | `HTTP` | EA returned a rejected HTTP response |
| `ProClubsResponseError` | `INVALID_RESPONSE` | A successful response contained invalid JSON or an unexpected shape |

HTTP errors include the endpoint, status, optional retry delay, and a short
sanitized body excerpt. Response errors include the endpoint. Original errors
are available through `cause` where applicable.

## Non-goals

- authenticating to an EA account or handling private endpoints
- bypassing authorization, access controls, or rate limits
- running a shared proxy or relay
- bulk scraping, club enumeration, or data warehousing
- normalizing every undocumented EA field into a new domain model
- guaranteeing upstream availability or long-term schema stability
- browser, CommonJS, React Native, Deno, or edge-runtime support in v0.1

Consumers should keep request volume modest, cache data in their own
application when appropriate, and follow all applicable EA terms and laws.

## Release criteria

The v0.1 package is ready to publish when:

1. all six methods build and are exported with declarations;
2. deterministic tests cover URL construction, validation, retries, false 403,
   aborts, timeouts, network failures, HTTP errors, and malformed responses;
3. formatting, linting, type checking, tests, build, and package dry-run pass;
4. the README examples compile against the actual public API;
5. the repository contains an OSS license and no credentials or live fixtures;
6. publishing remains a separate, explicit maintainer action.
