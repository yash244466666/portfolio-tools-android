# ADR 0018: DNS Lookup on the Cloudflare DNS-over-HTTPS JSON API

- Status: Accepted
- Date: 2026-09-07
- Owner: Yash Sikdar
- Revisit when: Cloudflare changes the DoH JSON contract, its terms/privacy posture, or CORS behavior, or when a second DNS provider is considered.

## Context

DNS Lookup (issue #81) is the second network tool and the last pre-approved version-1 provider. The audited upstream called `https://cloudflare-dns.com/dns-query` with the `application/dns-json` accept header, no timeout, no response validation, no client-side name validation, and errors collapsed into thrown strings.

Provider review performed 2026-09-07 (recorded here because it gates enablement):

- Cloudflare 1.1.1.1 DNS-over-HTTPS is free, requires no API key, and is documented at `https://developers.cloudflare.com/1.1.1.1/`; the JSON API (`accept: application/dns-json`) is a documented interface.
- Every probed response carries `access-control-allow-origin: *`, so CORS works from the packaged production origin `https://app.yash.tools` (the CSP `connect-src` entry `https://cloudflare-dns.com` has been present since the foundation as the second layer).
- Successful queries return HTTP 200 with a DNS rcode payload: `Status` (integer), optional `Answer` rows `{name, type, TTL, data}`, and `Authority`/`Question` sections.
- A non-existent domain is **rcode 3 (NXDOMAIN) inside HTTP 200**, not an HTTP error.
- Invalid query names and invalid query types return **HTTP 400 with a JSON `{"error": …}` body**.
- An empty `name` parameter is silently accepted server-side (rcode 0, empty question) — the provider performs no useful client-side validation, so the client must.

## Decision

Enable `dns-lookup` on the Cloudflare DoH JSON API:

- **Endpoint**: `GET https://cloudflare-dns.com/dns-query?name=<name>&type=<mnemonic>` only — HTTPS-only, exact origin, built by `buildQueryUrl` after `validateDomainName`. The CSP `connect-src` entry stays as is.
- **Client-side validation**: RFC 1035 presentation rules (labels 1–63 chars of letters/digits/underscores with inner hyphens only, name ≤ 253 chars, one trailing dot tolerated, underscore service labels such as `_dmarc.example.com` accepted). Empty, spaced, punctuated, and oversized names are rejected before any request, covering the provider's silent acceptance of empty names.
- **Record types**: `A`, `AAAA`, `CNAME`, `MX`, `NS`, `TXT` — the upstream set, unchanged; unknown provider types are rejected by the URL builder.
- **Response gate**: `parseDnsResponse` validates the `Status` integer and every `Answer` row (string name, integer type, non-negative integer TTL, string data) and drops hostile rows; a body over 128 KiB is rejected before JSON parsing; at most 64 records are kept and displayed. NXDOMAIN and other rcodes map to typed `dns-error` outcomes with human descriptions rather than exceptions.
- **Request rules**: 15 s hard timeout via `AbortController`, user-cancelable, failures typed (`offline`/`timeout`/`rate-limited`/`provider-failure`/`malformed`/`invalid-query`/`cancelled`), the provider's HTTP 400 mapped to its own `invalid-query` state.
- **No persistence**: lookups, domains, and answers are never stored; the tool holds no cache because TTLs are displayed per record and a fresh lookup is cheap and always more accurate.
- **Disclosure**: the tool states that it requires internet, names Cloudflare's 1.1.1.1 resolver, states that only the domain name and record type are sent, and links to the provider through the external-browser contract. The settings privacy summary names the second network tool and what it sends.

## Alternatives considered

- **Trusting the provider's 200/400 split alone** (upstream parity): rejected — the provider accepts empty and some malformed names silently, so client-side hostname validation is mandatory before any request.
- **Rendering the raw JSON body** (upstream behavior on unknown shapes): rejected; rows that fail schema validation are dropped and a malformed body is a typed state, never partially rendered.
- **Caching answers by domain/type**: rejected for v1; it would persist query history, which is private behavioral data, and TTL honesty would require per-row expiry bookkeeping with no user benefit.
- **A second resolver as fallback** (for example Google DoH): rejected; the plan allows exactly two version-1 providers, and multi-provider fallback would send query names to a host the disclosure does not name.

## Consequences

- The second network path is proven end to end: E2E intercepts the exact request URL `https://cloudflare-dns.com/dns-query?name=example.com&type=A` and verifies the answer table and provider attribution on both device profiles.
- The tool inherits ADR 0017's network-tool template (exact-host CSP, typed failures, bounded validated responses, disclosure); any future network tool must repeat this provider review before enablement.
- Device evidence (real resolver behavior on carrier networks, captive portals, WebView fetch behavior) remains assigned to issues #17/#18; automated, E2E, and artifact gates pass.
- Upstream parity gaps (no timeout, no validation, error swallowing) are deliberate divergences recorded in `docs/SOURCE_PROVENANCE.md`.
