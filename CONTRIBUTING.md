# Contributing

This project is pre-alpha. Start from an open GitHub issue and keep each change scoped to one verifiable outcome.

## Local checks

```bash
npm install
npm run check
```

Pull requests must keep the default test suite offline and deterministic. Do not commit cookies, tokens, complete response dumps, personal data, or fixtures that have not been manually sanitized.

Live endpoint work must follow the limits in the [v1 specification](./docs/sdk-v1-spec.md): sequential requests, no automatic retries, and immediate stop on access-control or rate-limit responses.
