# Production network provider review

> Re-verified: 2026-09-08 (terms fetched directly from both providers; CORS
> and state behavior exercised on the installed artifact). Product-owner
> approval of the production provider set remains recorded in the
> implementation plan; this dossier is the executable evidence for issue
> #33.

## Providers in use

| Provider    | Origin                        | Used by            | Sent fields                                                                 |
| ----------- | ----------------------------- | ------------------ | --------------------------------------------------------------------------- |
| Frankfurter | `https://api.frankfurter.dev` | Currency Converter | The user's base/currency pair in the query string; no identifiers or tokens |
| Cloudflare  | `https://cloudflare-dns.com`  | DNS Lookup         | The user-entered domain name in a DoH JSON query; no identifiers or tokens  |

- The CSP meta policy `connect-src` allowlist is exactly
  `'self' https://api.frankfurter.dev https://cloudflare-dns.com` — no other
  origin is connectable, and the adapters reference only these constants
  (`currency.ts`/`dns.ts` `apiOrigin`).
- `INTERNET` is the app's only network permission; requests are plain HTTPS
  GETs with no secrets (per section 14 of `AGENT.md`).

## Packaged-origin CORS proof

The checklist driver's 100-tool runs executed both network tools inside the
installed debug artifact on the bundled production origin
(`https://app.yash.tools`, verified `isSecureContext`) against the live
providers with attribution displayed — proving the packaged origin's CORS
behavior end to end. The most recent run (2026-09-15 at `bd5b310`, artifact
`febb136f…`) recorded `tool.currency-converter: live rate plus provider
attribution` and `tool.dns-lookup` live. **The browser harness
(`pnpm test:e2e`) does not drive live provider calls**: both provider
scenarios install `page.route(...)` and `route.fulfill(...)` so the E2E run
stays deterministic, and only the request _shape_ is asserted. This dossier
previously claimed live E2E calls, which was false. Cold/offline/stale/error
states are covered by the driver's airplane-mode rows (offline state for both
tools and recovery after connectivity returns) and by typed-client tests.

## Terms, privacy, rates, and country availability (re-verified 2026-09-08)

- **Frankfurter** (`frankfurter.dev`): free, open-source, no API key;
  commercial use explicitly allowed; rates from the ECB plus up to 84
  central-bank sources with optional `providers=ECB` scoping; no daily or
  monthly quotas (only abuse-prevention rate limiting); no country
  restrictions; the public instance runs behind Cloudflare (basic analytics
  collected by Cloudflare). The app sends only its documented query
  parameters and caches responses client-side.
- **Cloudflare Public DNS Resolver** (`cloudflare-dns.com`): query names,
  types, and response metadata are retained up to 25 hours; client source
  IPs are truncated (last octet IPv4 / last 80 bits IPv6), never stored in
  non-volatile storage, and deleted within 25 hours; no sale/sharing for ad
  targeting; APNIC receives anonymized metadata under a research agreement;
  an outside accounting firm audits these practices with a public report.
  No country restrictions; no content filtering on the standard resolver.

## Client behavior contract

| Aspect             | Currency Converter                                                                                                             | DNS Lookup                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Timeout            | 15 s `AbortController` (`requestTimeoutMs`)                                                                                    | 15 s `AbortController` (`requestTimeoutMs`)                                     |
| Caching            | Versioned durable rates cache, 24 h TTL aligned with the provider's advertised `max-age=86400`, bounded to 8 cached bases      | Provider TTLs surfaced per record; no client-side response cache                |
| Stale presentation | Shows the provider data date and stale state past expiry                                                                       | Record TTLs shown; re-query refreshes                                           |
| Typed failures     | Offline / timeout / rate limit / malformed response / provider failure / cancellation are distinct states with recovery advice | Same, with strict response-schema validation (integer TTL ≥ 0, bounded records) |
| Attribution        | Provider name + homepage displayed with results and freshness timestamp                                                        | Same, plus disclosure that query names reach Cloudflare's resolver              |

## Fallback, removal, and review triggers

- No third provider exists; removing or replacing a provider is a
  superseding-decision change (ADR + CSP `connect-src` + Data Safety +
  store-claim updates).
- Review triggers: any provider origin/domain change, response-schema
  change, terms change, rate-limit enforcement against the app, or a new
  network tool.
- Offline-first rule holds: every other tool works with the provider hosts
  unreachable (verified on the installed artifact under airplane mode).
