# EA Sports FC Pro Clubs API SDK

Unofficial, server-side TypeScript SDK for the internal endpoints used by EA Sports FC Pro Clubs.

> [!WARNING]
> This project is not affiliated with or endorsed by Electronic Arts. The upstream endpoints are undocumented, may reject automated clients, and may change or disappear without notice.

## Status

The project is in pre-alpha. The package is private and cannot be published until the npm name, license, compatibility evidence, and responsible-use gates are approved.

The implementation contract lives in [the v1 specification](./docs/sdk-v1-spec.md).

## Requirements

- Node.js 22 or newer
- npm 10 or newer

## Development

```bash
npm install
npm run check
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run format` | Format supported files with Biome |
| `npm run lint` | Run Biome lint rules |
| `npm run typecheck` | Type-check source and tests |
| `npm test` | Run the deterministic test suite |
| `npm run build` | Build the ESM package and declarations |
| `npm run pack:check` | Inspect the package tarball without publishing |

Live calls to EA are never part of the default test suite. Any future smoke test must be opt-in, sequential, low-volume, and stop on access-control or rate-limit responses.

## License

No license has been selected. All rights are reserved until the release-readiness decision is completed.
