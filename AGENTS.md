# AGENTS.md

## Cursor Cloud specific instructions

`proclubs-sdk` is a single TypeScript library (ESM, Node >= 22). There is no server, database, or
long-running service to start — "running the app" means importing the built SDK and calling it, or
running the test suite. Standard commands live in `package.json` (`scripts`); use those rather than
duplicating them here.

- Dependency install and the full verification gate are already documented (`npm ci`, then
  `npm run check`, which chains `format:check → lint → typecheck → test → build → pack:check`).
- The default test suite (`npm test`, vitest) is fully offline and deterministic: it injects the
  transport at the network boundary using fixtures in `tests/fixtures/`. Tests do NOT require
  network access — do not add live API calls to the default suite.
- Only `npm run check:compatibility` (opt-in) reaches the live EA API. Never wire it into a
  required CI gate.
- The SDK's actual runtime (and `check:compatibility`) makes outbound HTTPS requests to
  `https://proclubs.ea.com`; no credentials/cookies are needed. This egress works in the cloud VM,
  so a real end-to-end call (e.g. `proclubs.clubs.search({ name: 'ALL STAR 237' })`) succeeds. If a
  future environment blocks outbound network, fall back to constructing `ProClubsClient` with a
  custom `transport` (see `ProClubsClientOptions.transport` in `src/client.ts`) backed by the
  fixtures to exercise the SDK end-to-end.
- The HTTP transport dependency `impit` ships a native binary (Chrome impersonation); it installs
  via `npm ci` with no extra system packages in this environment.
- `biome lint` reporting only "infos" exits 0 and is considered passing.
