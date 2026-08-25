# proclubs-sdk

[![npm version](https://img.shields.io/npm/v/proclubs-sdk.svg)](https://www.npmjs.com/package/proclubs-sdk)
[![CI](https://github.com/alex-jordan547/proclubs-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/alex-jordan547/proclubs-sdk/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/proclubs-sdk.svg)](./LICENSE)

A small, typed Node.js SDK for the public endpoints used by EA Sports FC Pro
Clubs. It validates inputs and responses, retries transient failures, and exposes
stable error classes without requiring EA credentials, cookies, or a hosted
relay. An optional local memory cache helps repeated requests stay lightweight.

> [!WARNING]
> This project is not affiliated with or endorsed by Electronic Arts. The
> upstream API is undocumented and may change or become unavailable without
> notice.

## Install

```bash
npm install proclubs-sdk
```

Requires Node.js 22 or newer and ESM.

## Quick start

```ts
import { ProClubsClient } from 'proclubs-sdk'

const proclubs = new ProClubsClient()
const [club] = await proclubs.clubs.search({ name: 'ALL STAR 237' })

if (club) {
  const [info, members, matches] = await Promise.all([
    proclubs.clubs.get({ clubId: club.clubId }),
    proclubs.members.stats({ clubId: club.clubId }),
    proclubs.matches.list({ clubId: club.clubId, limit: 5 }),
  ])

  console.log({ info, members, matches })
}
```

The examples use `ALL STAR 237` and `HEMLE FC` as test clubs, and
`mrjordan_237` / `mrjordan237` as test member names.

## API

| Method | Result |
| --- | --- |
| `clubs.search({ name, platform? })` | `Promise<ClubSummary[]>` |
| `clubs.get({ clubId, platform? })` | `Promise<ClubInfo \| null>` |
| `clubs.overallStats({ clubId, platform? })` | `Promise<ClubOverallStats \| null>` |
| `rankings.allTime(input?)` | `Promise<RankingEntry[]>` |
| `rankings.searchAllTime({ name, platform? })` | `Promise<RankingEntry[]>` |
| `rankings.currentSeason(input?)` | `Promise<RankingEntry[]>` |
| `rankings.searchCurrentSeason({ name, platform? })` | `Promise<RankingEntry[]>` |
| `members.stats({ clubId, platform? })` | `Promise<ClubMemberStats>` |
| `members.careerStats({ clubId, platform? })` | `Promise<ClubMemberCareerStats>` |
| `matches.list({ clubId, platform?, type?, limit? })` | `Promise<ClubMatch[]>` |

Supported platforms are `common-gen5` (default), `common-gen4`, and `nx`.
Supported match types are `friendlyMatch`, `leagueMatch` (default), and
`playoffMatch`.

## Documentation

- [Get started](./docs/index.mdx)
- [Quickstart](./docs/quickstart.mdx)
- [Configuration](./docs/guides/configuration.mdx)
- [Errors and retries](./docs/guides/errors-and-retries.mdx)
- [Cache and observability](./docs/guides/cache-and-observability.mdx)
- [SDK reference](./docs/reference/client.mdx)
- [Regions](./docs/reference/regions.mdx)
- [Roadmap](./docs/project/roadmap.mdx)
- [Support and limitations](./docs/project/limitations.mdx)

Preview the Mintlify documentation locally with `npx mint dev`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Run `npm run check` before opening a
pull request.

## License

[MIT](./LICENSE)
