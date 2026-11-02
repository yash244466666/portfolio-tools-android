# ADR 0027: Internet Speed Meter (38 → 39) and a Second Network Provider

- Status: **Accepted** — approved by the product owner on 2026-11-02.
- Date: 2026-11-02
- Owner: Yash Sikdar (product owner; approved 2026-11-02 by selecting "Both" and "Add as 39th v1 tool")
- Supersedes: the **38-tool count** of [ADR 0026](0026-permission-free-sensor-tools.md) only. ADR 0026's sensor platform, ADR 0023's 70-tool cut disposition, ADR 0021's YouTube Downloader exclusion, and every earlier architecture, permission, and privacy decision remain in force, except that version 1 now has a **second reviewed network provider** as described below.
- Revisit when: Cloudflare changes or removes the speed-test endpoints, its terms or CORS behavior change, an owner-approved replacement provider exists, or a device matrix shows unusable meter/provider behavior.

## Context

The product owner asked for an Internet Speed Meter that shows the real internet speed with other connection details. Two different capabilities answer that request, and they have very different privacy costs:

1. **Live device throughput** — Android publishes device-wide received/transmitted byte counters through `TrafficStats` (no permission) and active-network properties through `ConnectivityManager` (`ACCESS_NETWORK_STATE`, already in the reviewed permission budget). Sampling these gives a genuine current download/upload rate, connection type, metered/VPN/validated state, the operating system's link-speed estimate, local interface addresses, DNS servers, MTU, and signal strength. It works offline, contacts no third party, needs no new permission, and never sees another app's content. It does **not** measure the maximum capacity of the internet line.
2. **On-demand throughput test** — a latency/download/upload measurement against a public endpoint measures maximum throughput, but the payloads go to a third party. The existing version-1 posture allows exactly one provider (Frankfurter for Currency Converter). Adding a speed-test origin requires a provider review, CSP change, Data Safety change, privacy disclosure, and release-owner approval.

The owner selected **Both**, and selected **Add as 39th v1 tool**. This ADR records that decision and the boundaries that keep the second capability compatible with the app's privacy posture.

## Decision

Add one tool, **Internet Speed Meter** (`internet-speed-meter`), with two visibly separate modes:

| Mode                | Network                       | Provider                                               | What it shows                                                                                                                                          |
| ------------------- | ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Live connection** | Offline                       | None                                                   | Current device-wide download/upload rate, connection type, metered/validated/VPN state, OS link estimate, interface, local addresses, DNS, MTU, signal |
| **Speed test**      | Internet, user-initiated only | Cloudflare Speed Test (`https://speed.cloudflare.com`) | Latency, jitter, download Mbps, upload Mbps, edge location, bytes transferred; explicit data-use disclosure                                            |

The tool is `enabled` in the registry after its Definition of Done, under category `core`, giving the public catalog 13 Core tools and **39 enabled tools** in total.

### Live meter design

- A new `ConnectionService` platform contract exposes `details()` and `traffic()`. Tools never import `ConnectivityManager`, `TrafficStats`, or `navigator.connection` directly.
- The app-owned `NetworkDiagnostics` Android plugin returns a versioned, bounded snapshot:
  - transport (`wifi`, `cellular`, `ethernet`, `vpn`, `bluetooth`, `other`, `none`), metered, validated, internet-capable, VPN;
  - link downstream/upstream kbps, interface name, MTU, signal strength (API 29+; unknown is `null`);
  - at most eight local addresses and eight DNS server addresses, each length-bounded;
  - device-wide `rxBytes`/`txBytes` and `SystemClock.elapsedRealtime()`.
- The plugin declares **no permission**, starts no service, reads no subscriber/SSID/telephony identifier, logs nothing, and persists nothing.
- The tool samples at **1 Hz only while mounted and foregrounded**, stops on lifecycle inactive/unmount, and keeps at most 60 in-memory samples for the sparkline. Counter resets, negative deltas, and zero elapsed time produce an honest "—" instead of a fabricated rate.
- The web adapter publishes `navigator.connection` estimates where available and reports live traffic counters as **unsupported**; the tool shows that state rather than pretending to measure.
- The tool states that counters are **device-wide**, not per-app, and that the OS link estimate is not a measured speed.

### Speed-test design

- Provider: **Cloudflare Speed Test**, origin `https://speed.cloudflare.com`, endpoints `GET /__down?bytes=N`, `POST /__up`, and small `GET /__down?bytes=1` latency probes. CORS was re-verified on 2026-11-02 (`Access-Control-Allow-Origin: *` on the download, upload preflight, and latency paths).
- This is an **undocumented public endpoint used by Cloudflare's own speed test**, not a contracted API. It is accepted for the closed beta only subject to the provider review in issue #33; if Cloudflare's terms or behavior change, the speed test is removed or repointed to an owner-approved provider.
- Requests are HTTPS-only to that exact origin, `credentials: "omit"`, `referrerPolicy: "no-referrer"`, `cache: "no-store"`, `redirect: "error"`. The CSP `connect-src` allowlist gains exactly `https://speed.cloudflare.com`.
- Hard bounds: five latency probes of 1 KiB, download **≤ 8 MiB or 15 s**, upload **≤ 4 MiB or 15 s**, total **≤ 45 s**. All phases use `AbortController`; navigation cancels the run. There are no retries, no automatic or periodic tests, no background tests, and no cache of results.
- The UI discloses, before the first run, that the test sends payloads to Cloudflare, that Cloudflare sees ordinary connection metadata including the IP address, that the test consumes data (with a stronger warning on a metered connection), and that nothing is saved. Only the edge location (`cf-meta-colo`) is read from the response headers; IP/geo headers are ignored.
- The provider is the second and last network provider in version 1. No API key, account, telemetry, or identifier is sent.

### Scope bookkeeping

| Group                    | Before |  After |
| ------------------------ | -----: | -----: |
| Everyday money and math  |     11 |     11 |
| Time                     |      7 |      7 |
| Everyday text            |      5 |      5 |
| Files and media          |      4 |      4 |
| Privacy and security     |      2 |      2 |
| Sharing and utility      |      4 |      4 |
| Sensors and measurement  |      5 |      5 |
| Network and connectivity |      0 |      1 |
| **Total**                | **38** | **39** |

Work-item manifest: **40 managed tools** (39 version-1 tools plus the excluded YouTube Downloader), **152 total issues**, Core 13 / Math 14 / Developer 5 / Text 5 / Media 1 / Security 1, tier counts **27/10/1/2**, 34 implemented-tool history entries, a 39-tool launch epic, and a **"39-Tool Closed Beta"** milestone adopted in place via `renamedFrom: "38-Tool Closed Beta"`.

## Alternatives considered

- **Live meter only.** Rejected by the owner: it cannot report the line's maximum speed.
- **Cloudflare only.** Rejected by the owner: it wastes the offline, permission-free device data and makes a third-party request necessary just to see connection details.
- **LibreSpeed or community speed-test servers.** Rejected: server availability, CORS, TLS, and terms vary per instance, and choosing one silently would be less accountable than a single named provider.
- **Self-hosted measurement endpoint.** Rejected for version 1: it would add operational infrastructure and a new availability/privacy obligation without an owner-approved host.
- **Periodic or background monitoring via a foreground service or VPN service.** Rejected: it needs new permissions/components, drains battery, and conflicts with the version-1 no-background posture. The live meter runs only while the screen is open.
- **Per-app traffic attribution.** Rejected: `NetworkStatsManager` usage attribution needs additional privileged access; the tool measures the whole device and says so.

## Consequences

1. **Registry** — one new `enabled` entry with a lazy component; 39 `enabled` + 70 `removed`; the registry oracle becomes 39.
2. **Platform** — new `ConnectionService`, shared validators, a new app-owned `NetworkDiagnostics` plugin, web/Android adapters, and native policy tests. Permission budget is unchanged at eight reviewed permissions.
3. **Network** — `https://speed.cloudflare.com` joins Frankfurter in the CSP allowlist and the provider review. Data Safety and the privacy policy must disclose test payloads and connection metadata.
4. **Evidence** — pure meter/rate/test math, schema validation, adapter contract tests, component states, a mocked E2E path, emulator live-counter and provider probes, connected instrumentation, and physical-device matrix rows (real cellular/Wi-Fi counters, metered behavior, provider reachability, OEM variation).
5. **Release** — the tool is implemented and enabled for closed-beta candidate builds, but the provider review (#33), physical-device evidence (#18/#20/#25), and owner release gates (#27–#41) remain open. No production candidate is approved.

## Approval

Accepted by the product owner, **Yash Sikdar**, on **2026-11-02**, by selecting "Both" for the measurement approach and "Add as 39th v1 tool" for the release scope.
