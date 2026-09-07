# ADR 0017: Currency Converter on the Frankfurter v2 Endpoint

- Status: Accepted
- Date: 2026-09-07
- Owner: Yash Sikdar
- Revisit when: Frankfurter publishes a v3 or deprecates v2, the rate-limit terms change materially, or DNS Lookup joins the network allowlist (its own review).

## Context

Currency Converter (issue #43) is the first network tool. The plan allows exactly two version-1 providers: Frankfurter for exchange rates and Cloudflare DoH for DNS. The audited upstream called `https://api.frankfurter.dev/v1/latest?base=…` with no timeout, no response validation, a localStorage cache, and a hardcoded 32-currency list; the repository's plan and CSP still named the old `api.frankfurter.app` origin.

Provider review performed 2026-09-07 (recorded here because it gates enablement):

- `api.frankfurter.app/latest` now 301-redirects to `api.frankfurter.dev/v1/latest` — the old hostname is stale in both the plan and `index.html` CSP.
- Frankfurter is free and open-source (no API key), documented at `https://frankfurter.dev`, source `github.com/lineofflight/frankfurter`.
- v1 (ECB-only) covers ~30 currencies and **does not include BDT**; the provider documents v1 as superseded.
- v2 `https://api.frankfurter.dev/v2/rates?base=X` returns a bounded flat array (~10 KiB for all 165 quotes), each row `{date, base, quote, rate}` with per-row data dates; HTTP 422 with a JSON error for invalid currencies, 429 for rate limiting; `access-control-allow-origin: *` confirmed by direct probe, so CORS works from the packaged production origin `https://app.yash.tools` (the second CSP layer enforces the same allowlist).

## Decision

Enable `currency-converter` on Frankfurter **v2**:

- **Endpoint**: `GET https://api.frankfurter.dev/v2/rates?base=<code>` only — an HTTPS-only exact-origin request built by `buildRatesUrl` from catalog-validated codes. The CSP `connect-src` allowlist moves from `api.frankfurter.app` to `api.frankfurter.dev`.
- **v2 over v1**: v1 is superseded and excludes 53 quoted currencies including BDT; v2's per-row dates make freshness honest per conversion instead of per response. The response (~10 KiB for all quotes) is bounded and validated by `parseRatesResponse` before it reaches React.
- **Request rules**: 15 s hard timeout via `AbortController`, user-cancelable, provider failures typed (`offline`/`timeout`/`rate-limited`/`provider-failure`/`malformed`/`no-record`/`cancelled`) and each mapped to its own recovery state. No API secrets exist.
- **Static catalog**: the 165-currency code/name list is a snapshot of `/v2/currencies` recorded in `catalog.ts`, refreshed deliberately, never derived at runtime — so selection works fully offline and hostile responses cannot alter the selectable set.
- **Cache**: versioned payload under `yash-tools:v1:currency:rates` through the PreferenceStore (ADR 0013 pattern), at most 8 bases with oldest-first eviction, 24 h TTL aligned with the provider's `max-age=86400`. A stale table remains usable offline but is always labeled stale.
- **Disclosure**: the tool states that it requires internet, names the provider, states that only the base currency code is sent (amounts never leave the device), and links to frankfurter.dev through the external-browser contract.
- **Privacy wording**: the settings screen now distinguishes offline tools from Currency Converter instead of claiming all enabled tools are local, satisfying the plan's precise-labeling requirement.

## Alternatives considered

- **Keeping v1** (upstream parity): rejected — superseded by the provider, missing BDT, and its single `date` field would misrepresent mixed-freshness data anyway.
- **Fetching `/v2/currencies` at runtime**: rejected; a second request and a second schema to validate for data that changes rarely, and currency selection would break offline.
- **Sending amounts to the provider** (some converters do): rejected; conversion is computed locally from rates so no amount ever leaves the device.
- **Trusting the response shape**: rejected; every row is validated (positive finite rate, ISO date, known codes) and a malformed body is a typed state, never silently rendered arithmetic.

## Consequences

- The tool proves the network path end to end: E2E intercepts the exact request URL `https://api.frankfurter.dev/v2/rates?base=USD` and verifies conversion, freshness labeling, and provider attribution on both device profiles.
- Offline behavior is cache-first: stale tables are labeled and usable, and reconnect guidance appears when no cache exists.
- Device evidence (real carrier/offline transitions, WebView fetch behavior, Data Safety answers) remains assigned to issues #17/#18; automated, E2E, and artifact gates pass.
- DNS Lookup (#44) will follow the same pattern (exact-host CSP, typed failures, disclosure) and inherits this ADR's provider-review template.
