# Contributing

Start from an open GitHub issue and keep each change scoped to one verifiable outcome.

## Local checks

```bash
npm install
npm run check
```

Pull requests must keep the default test suite offline and deterministic. Test behavior through the public SDK interface and inject the transport at the network boundary.

Do not commit cookies, tokens, complete response dumps, personal data, or fixtures that have not been manually sanitized. Live compatibility probes must remain explicit, sequential, and low volume. Never use them as required CI checks.

## Scope

`proclubs-sdk` is a small Node.js library. Changes should not add a hosted relay, database, cache, browser automation, authentication flow, or telemetry to the core package.
