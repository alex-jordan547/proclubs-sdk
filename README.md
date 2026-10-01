# proclubs-sdk

![proclubs-sdk: Pro Clubs data, ready for your app](https://raw.githubusercontent.com/alex-jordan547/proclubs-sdk/main/assets/social-card.png)

**Unofficial EA FC Pro Clubs API SDK for TypeScript and Node.js.**

[Documentation](https://proclubs-sdk.mintlify.app/docs) · [Quickstart](https://proclubs-sdk.mintlify.app/docs/quickstart) · [FC 27 API changes](https://proclubs-sdk.mintlify.app/docs/guides/fc27-api-changes) · [npm](https://www.npmjs.com/package/proclubs-sdk)

[![npm version](https://img.shields.io/npm/v/proclubs-sdk.svg)](https://www.npmjs.com/package/proclubs-sdk)
[![npm downloads](https://img.shields.io/npm/dm/proclubs-sdk.svg)](https://www.npmjs.com/package/proclubs-sdk)
[![node](https://img.shields.io/node/v/proclubs-sdk.svg)](https://www.npmjs.com/package/proclubs-sdk)
[![CI](https://github.com/alex-jordan547/proclubs-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/alex-jordan547/proclubs-sdk/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/proclubs-sdk.svg)](./LICENSE)

Read public club stats, player rosters, rankings, and recent matches from EA
Sports FC Pro Clubs in your Node.js app. Inputs and responses are validated,
transient failures use bounded retries, and typed errors identify rejected
requests. Reuse the optional memory cache for repeated queries.

> [!WARNING]
> This project is not affiliated with or endorsed by Electronic Arts. The
> upstream API is undocumented and may change or become unavailable without
> notice.

## Why this exists

EA publishes no Pro Clubs API. The EA Clubs website reads a set of public JSON
endpoints, and every stats site, league tool, and Discord bot ends up calling
them with its own request code. That code breaks in the same three places.

**EA's edge is picky about the client.** Checked on 2026-09-30 against
`proclubs.ea.com` from a home connection: a browser and Node.js `fetch` get the
JSON, while curl gets an HTTP/2 stream reset, and hangs over HTTP/1.1. From
servers, developers report
[intermittent 403s and timeouts](https://forums.ea.com/discussions/fc-26-general-discussion-en/ea-fc-26-pro-clubs-api-returning-403-and-timeouts/13560619).
The default transport is [Impit](https://github.com/apify/impit) with a Chrome
network profile, so requests look like the ones the EA website sends. You can
[inject your own transport](./docs/guides/configuration.mdx) instead, for
example plain `fetch`.

**EA changes the responses without notice.** Every response goes through a Zod
schema, unknown fields are kept, and a
[compatibility probe](./docs/reference/types-and-schemas.mdx) reports drift per
endpoint. That probe is how this README knows `common-gen4` stopped working
with FC 27.

**The data is raw codes.** The SDK keeps the raw value and adds a readable one:

| EA returns | The SDK adds |
| --- | --- |
| `proNationality: "115"` | `nationality: { id: "115", label: "Gabon", isoCode: "GA" }` |
| `regionId: 5457237` | `regionLabel: "Southern Europe"` |
| `namespace: "1"` on a `common-gen5` match | `derivedLabels.exactPlatform: "ps5"` |

The SDK sends no EA credentials or cookies, and it only reads the endpoints the
public website reads. It is built for low request volumes, not for scraping.

## Install

```bash
npm install proclubs-sdk
```

Requires Node.js 22.18.0 or newer and ESM.

## Quick start

```ts
import { ProClubsClient } from 'proclubs-sdk'

const proclubs = new ProClubsClient()
const [club] = await proclubs.clubs.search({ name: 'HEMLE FC' })

if (club) {
  const [info, members, matches, playoffs] = await Promise.all([
    proclubs.clubs.get({ clubId: club.clubId }),
    proclubs.members.stats({ clubId: club.clubId }),
    proclubs.matches.list({ clubId: club.clubId, limit: 5 }),
    proclubs.clubs.playoffAchievements({ clubId: club.clubId }),
  ])

  console.log({ info, members, matches, playoffs })
}
```

The examples use `HEMLE FC` as the test club, and `mrjordan_237` /
`mrjordan237` as test member names.

## API

| Method | Result |
| --- | --- |
| `clubs.search({ name, platform? })` | `Promise<ClubSummary[]>` |
| `clubs.get({ clubId, platform? })` | `Promise<ClubInfo \| null>` |
| `clubs.overallStats({ clubId, platform? })` | `Promise<ClubOverallStats \| null>` |
| `clubs.playoffAchievements({ clubId, platform? })` | `Promise<PlayoffAchievement[]>` |
| `rankings.allTime(input?)` | `Promise<RankingEntry[]>` |
| `rankings.searchAllTime({ name, platform? })` | `Promise<RankingEntry[]>` |
| `rankings.currentSeason(input?)` | `Promise<RankingEntry[]>` |
| `rankings.searchCurrentSeason({ name, platform? })` | `Promise<RankingEntry[]>` |
| `members.stats({ clubId, platform? })` | `Promise<ClubMemberStats>` |
| `members.careerStats({ clubId, platform? })` | `Promise<ClubMemberCareerStats>` |
| `matches.list({ clubId, platform?, type?, limit? })` | `Promise<ClubMatch[]>` |

### Platforms

| Platform | EA label | Status on FC 27 |
| --- | --- | --- |
| `common-gen5` (default) | Crossplatform Current Gen | Supported |
| `nx` | Switch | Supported: Switch and Switch 2 share one pool |
| `common-gen4` | Crossplatform Last Gen | Deprecated: EA rejects it with HTTP 400 |

Platform status was last checked against the live EA endpoints on 2026-09-30.
The SDK still accepts `common-gen4` so existing code keeps compiling, and emits
a `DeprecationWarning` (`PROCLUBS_DEP001`) once per client when a request uses
it.

EA exposes a single `nx` pool and no value that distinguishes Switch from
Switch 2. Players with `namespace: "4"` gain
`derivedLabels.platformFamily: "nintendo"` and, on `nx`,
`derivedLabels.exactPlatform: "switch"`. Here `switch` means the console
family, not a specific hardware generation. The raw `namespace` is preserved;
unknown or friendly-match namespaces remain unresolved.

The Nintendo mapping was added after `0.3.2`. See the
[release notes](https://github.com/alex-jordan547/proclubs-sdk/releases)
for package availability.

### Match types

Supported match types are `friendlyMatch`, `leagueMatch` (default), and
`playoffMatch`.
`friendlyMatch` never exposes player platforms (`namespace` is always `"0"`);
use `leagueMatch` or `playoffMatch` to identify a player's platform.

## Documentation

[Read the online documentation](https://proclubs-sdk.mintlify.app/docs), or start
with a practical guide:

- [Build a club dashboard with Node.js](https://proclubs-sdk.mintlify.app/docs/guides/pro-clubs-api-nodejs)
- [Add Pro Clubs stats to a Discord bot](https://proclubs-sdk.mintlify.app/docs/guides/discord-bot)
- [Troubleshoot FC 27 platform changes and API errors](https://proclubs-sdk.mintlify.app/docs/guides/fc27-api-changes)

Reference pages in this repository:

- [Get started](./docs/index.mdx)
- [Quickstart](./docs/quickstart.mdx)
- [Configuration](./docs/guides/configuration.mdx)
- [Errors and retries](./docs/guides/errors-and-retries.mdx)
- [Cache and observability](./docs/guides/cache-and-observability.mdx)
- [SDK reference](./docs/reference/client.mdx)
- [Clubs reference](./docs/reference/clubs.mdx)
- [Rankings reference](./docs/reference/rankings.mdx)
- [Metadata and crest helpers](./docs/reference/metadata.mdx)
- [Types, schemas, and compatibility](./docs/reference/types-and-schemas.mdx)
- [Regions](./docs/reference/regions.mdx)
- [Nationalities](./docs/reference/nationalities.mdx)
- [Roadmap](./docs/project/roadmap.mdx)
- [Support and limitations](./docs/project/limitations.mdx)

Preview the Mintlify documentation locally with `npx mint dev`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Run `npm run check` before opening a
pull request.

## License

[MIT](./LICENSE)
