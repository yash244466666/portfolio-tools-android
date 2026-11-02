# Production network provider review

> Re-verified: 2026-11-02 for the ADR 0027 addition. Frankfurter terms were last
> re-verified on 2026-09-08; Cloudflare Speed Test endpoints and CORS were
> checked on 2026-11-02. Product-owner approval of the production provider set
> remains recorded in the implementation plan and ADRs; this dossier is the
> executable evidence for issue #33. ADR 0023 narrowed the set to Frankfurter
> by cutting DNS Lookup; ADR 0027 (approved 2026-11-02) adds the Cloudflare
> Speed Test used only by an explicit Internet Speed Meter run.

## Providers in use

| Provider              | Origin                         | Used by              | Sent fields                                                                                                                 |
| --------------------- | ------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Frankfurter           | `https://api.frankfurter.dev`  | Currency Converter   | The user's base/currency pair in the query string; no identifiers or tokens                                                 |
| Cloudflare Speed Test | `https://speed.cloudflare.com` | Internet Speed Meter | 5 × 1-byte latency probes, up to 8 MiB download payload, up to 4 MiB upload payload; no identifier, credential, or referrer |

- ADR 0023 cut DNS Lookup, so the Cloudflare Public DNS Resolver
  (`https://cloudflare-dns.com`) is no longer a shipped provider; the ADR 0018
  review that cleared it is off the release path, and its findings below are
  retained as historical record only.
- The CSP meta policy `connect-src` allowlist is exactly
  `'self' https://api.frankfurter.dev https://speed.cloudflare.com`. No other
  origin is connectable. The currency adapter references only its `apiOrigin`
  constant; the speed test references only `speedTestOrigin`, and both request
  paths set `credentials: "omit"`, `referrerPolicy: "no-referrer"`,
  `redirect: "error"`, and `cache: "no-store"`.
- `INTERNET` is the app's only network permission; all requests are HTTPS with
  no secrets (per section 14 of `AGENT.md`).
- Data Safety now covers two providers. Ordinary connection metadata for those
  HTTPS origins is the only network disclosure. The speed test additionally
  consumes the disclosed payload budget, which is shown with a stronger warning
  on a metered connection.

## Cloudflare Speed Test evidence (2026-11-02)

Endpoints and observed behavior, fetched with `Origin: https://app.yash.tools`:

| Probe                       | Result                                                                                                                                                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /__down?bytes=1000`    | HTTP 200, `Content-Type: application/octet-stream`, `Content-Length: 1000`, `Access-Control-Allow-Origin: *`, `Cache-Control: no-store, no-transform`, `Access-Control-Expose-Headers` includes `cf-meta-colo`/`cf-meta-ip`/geo fields, `Timing-Allow-Origin: *` |
| `OPTIONS /__up` (preflight) | HTTP 204, `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, allowed headers include `content-type`, `Access-Control-Max-Age: 86400`                                                                                          |
| `GET /meta`                 | `{}` (not used)                                                                                                                                                                                                                                                  |

- The response exposes `cf-meta-ip`, geolocation, and ASN headers. The app reads
  **only** `cf-meta-colo` (validated as 1–8 alphanumeric/hyphen characters) and
  ignores the rest, so no IP or geolocation value is stored, displayed, or
  logged.
- These are the public endpoints used by Cloudflare's own speed test. They are
  **not a documented third-party API and carry no published SLA, quota, or
  support commitment.** ADR 0027 accepts them for the closed beta subject to
  the product owner's provider approval in #33. If Cloudflare changes or
  removes them, the tool must be repointed to an owner-approved provider or the
  speed-test mode disabled; the live meter is unaffected.
- Country availability follows Cloudflare's public network; no account, token,
  API key, or commercial agreement is involved. No rate-limit response has been
  observed, but HTTP 429 is mapped to a distinct "rate-limited" state.

## Packaged-origin CORS proof

The checklist driver's installed-artifact runs execute network tools inside the
debug artifact on the bundled production origin (`https://app.yash.tools`,
verified `isSecureContext`) against the live providers with attribution
displayed. Before ADR 0023 those runs covered Currency Converter and DNS
Lookup; the 38-tool runs carry the currency row forward and filter out the cut
DNS probe. The 2026-11-02 39-tool run adds `tool.internet-speed-meter`, which
performs a real Cloudflare measurement on the installed artifact, plus the
`offline.speedTestState` row under airplane mode.
**The browser harness (`pnpm test:e2e`) does not drive live provider calls**:
the currency and speed-test scenarios install `page.route(...)` and
`route.fulfill(...)` so the E2E run stays deterministic, and only request shape
and UI state are asserted. Cold/offline/stale/error states are covered by the
driver's airplane-mode rows and by typed-client tests.

## Terms, privacy, rates, and country availability (re-verified 2026-09-08)

The Cloudflare Public DNS entry is retained as historical record only; DNS
Lookup was cut by ADR 0023.

- **Frankfurter** (`frankfurter.dev`): free, open-source, no API key;
  commercial use explicitly allowed; rates from the ECB plus up to 84
  central-bank sources with optional `providers=ECB` scoping; no daily or
  monthly quotas (only abuse-prevention rate limiting); no country
  restrictions; the public instance runs behind Cloudflare (basic analytics
  collected by Cloudflare). The app sends only its documented query
  parameters and caches responses client-side.
- **Cloudflare Speed Test** (`speed.cloudflare.com`): a free public
  measurement service. The app sends only test payload bytes; Cloudflare sees
  the client IP and ordinary TLS metadata, as any HTTPS server does. No
  account, identifier, or result is transmitted. The app does not rely on a
  documented API contract; see the risk note above.
- **Cloudflare Public DNS Resolver** (`cloudflare-dns.com`, retired): query
  names, types, and response metadata are retained up to 25 hours; client
  source IPs are truncated (last octet IPv4 / last 80 bits IPv6), never stored
  in non-volatile storage, and deleted within 25 hours; no sale/sharing for ad
  targeting; APNIC receives anonymized metadata under a research agreement; an
  outside accounting firm audits these practices with a public report. No
  country restrictions; no content filtering on the standard resolver.

## Client behavior contract

| Aspect             | Currency Converter                                                                                                             | Internet Speed Meter (Cloudflare mode)                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger            | User action / cached refresh                                                                                                   | Explicit user action only; never automatic, periodic, or background                                                                                        |
| Budget             | 15 s `AbortController` (`requestTimeoutMs`); bounded JSON body                                                                 | 5 × 1-byte latency probes; ≤8 MiB download or 15 s; ≤4 MiB upload or 15 s; ≤40 s total; 4 KiB response caps; `AbortController` per phase and on navigation |
| Caching            | Versioned durable rates cache, 24 h TTL aligned with the provider's advertised `max-age=86400`, bounded to 8 cached bases      | No cache, no persistence, no result history                                                                                                                |
| Stale presentation | Shows the provider data date and stale state past expiry                                                                       | Not applicable; every run is a fresh measurement                                                                                                           |
| Typed failures     | Offline / timeout / rate limit / malformed response / provider failure / cancellation are distinct states with recovery advice | The same six states, plus typed partial-download disclosure                                                                                                |
| Attribution        | Provider name + homepage displayed with results and freshness timestamp                                                        | Provider and origin disclosed before the run; edge location shown after                                                                                    |

## Fallback, removal, and review triggers

- Two providers remain: Frankfurter and Cloudflare Speed Test. Removing or
  replacing either is a superseding-decision change (ADR + CSP `connect-src` +
  Data Safety + store-claim updates).
- Review triggers: any provider origin/domain change, response-schema or terms
  change, rate-limit enforcement against the app, endpoint deprecation, or a
  new network tool.
- Offline-first rule holds: every tool except the two provider calls works with
  the provider hosts unreachable (the live speed meter included, and verified
  on the installed artifact under airplane mode).
