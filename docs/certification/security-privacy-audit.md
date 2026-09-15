# Security, privacy, dependency, license, notices, and SBOM audit

> Reconciled: 2026-09-08 against the current `main` candidate (registry at 100
> enabled tools; app source at `79ef271`). Regenerate the SBOM with
> `node scripts/build-sbom.mjs` after any dependency change.

## 1. Threat model and boundary reconciliation

The runtime boundary is unchanged from `docs/ARCHITECTURE.md` and was
re-verified against the current source:

- All application HTML/JS is bundled and loaded from the production local
  origin `https://app.yash.tools`; no remote code loading, live-update SDK,
  `eval`, or remote JavaScript exists (`src/` contains no `eval` and the CSP
  meta policy blocks script sources other than self).
- Tools depend only on `src/platform/contracts.ts`; no tool imports
  `@capacitor/*` (enforced by lint/registry invariants and adapter tests).
- Hostile-input tools (Regex Tester) run in terminable Workers with
  wall-clock budgets (ADR 0010); Markdown/SVG render through DOMPurify with
  a narrow reviewed policy; JSON/YAML/XML parsers are size/depth-bounded and
  covered by hostile-corpus tests.
- The YAML to JSON tool's runtime `js-yaml` was bumped to 4.3.1 (PR #195) to
  clear two HIGH quadratic-CPU advisories (GHSA-52cp-r559-cp3m,
  GHSA-5p4m-2wfm-xmqj) that applied to user-controlled YAML, and then to 4.3.2
  (PR #209) to clear a third HIGH (GHSA-2883-xcg3-v3hh, `maxTotalMergeKeys`
  does not limit CPU use for empty merge sources), which also reached the
  runtime parse path; the parser bounds remain.
- Cleartext traffic is disabled (manifest + Network Security Configuration),
  backup/device transfer is excluded, the FileProvider exposes only
  `cache/share/`, WebView debugging is disabled in production, and external
  links are HTTPS-only through `ExternalBrowserService`.

## 2. Permission and exported-component budget

`scripts/check-android-manifest.mjs` (local + CI) verifies the merged
manifests of all three variants against the reviewed allowlist:

- Each variant reports 8 reviewed permissions (`INTERNET`,
  `ACCESS_NETWORK_STATE`, `VIBRATE`, `WAKE_LOCK`, `POST_NOTIFICATIONS`,
  `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, and the package-scoped
  dynamic-receiver permission) and exactly one exported component (launcher
  Activity), re-verified at this commit across debug/internal/release.
  Exact allowlist contents are recorded in
  `IMPLEMENTATION_TRACKER.md` section 3 and re-checked per gate run.
- Release: same reviewed budget; the release AAB is intentionally unsigned
  (no signing material exists in the repository).
- No broad storage/media, contacts, location, camera, phone, SMS, package
  visibility, advertising ID, VPN, accessibility-service, exact-alarm, or
  share-target capability is present.

Gate evidence at this commit: `pnpm android:manifest:check debug`,
`... internal`, `... release` all passed in the batch-16 and matrix gate
runs (see `docs/certification/regression-matrix.md`).

## 3. Data inventory (device-local only)

| Data class        | Location                                     | Backup/transfer | Cleared by                                   |
| ----------------- | -------------------------------------------- | --------------- | -------------------------------------------- |
| Preferences       | `yash-tools:v1:` namespaced store            | Excluded        | Uninstall, clear storage, settings Clear All |
| Notes (durable)   | Versioned preference payload                 | Excluded        | Explicit in-tool clear or uninstall          |
| Pomodoro state    | Versioned preference (safe metadata only)    | Excluded        | Uninstall/clear                              |
| Favorites/Recents | Device-local IDs                             | Excluded        | Explicit clear actions                       |
| Generated files   | `cache/share/`, `cache/save/<op>/` (janitor) | Disposable      | Retention policy, uninstall                  |
| Sensitive session | Never persisted (secrets, JWT, recordings)   | n/a             | Cleared on navigation/unload                 |

- No analytics, advertising, accounts, cloud sync, purchases, telemetry, or
  crash uploads exist in any variant; no third-party SDK is initialized.
- Logging never contains raw tool input, clipboard values, filenames, notes,
  generated secrets, or parser exception text; Capacitor bridge logging is
  disabled in every variant.
- Android backup, device transfer, view-hierarchy persistence, Autofill,
  and Content Capture are excluded for WebView content.

## 4. Network providers

Exactly two HTTPS origins are allowlisted (CSP `connect-src` in `index.html`
and the adapter code agree):

| Provider       | Origin                        | Purpose                  | Terms/privacy (re-verified 2026-09-08)                                                                                                                                                                                           |
| -------------- | ----------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frankfurter    | `https://api.frankfurter.dev` | Currency Converter rates | Free/open-source, no API key, commercial use explicitly allowed; ECB + 84 central-bank sources; no quotas beyond abuse rate limits; public instance runs behind Cloudflare (basic analytics).                                    |
| Cloudflare DoH | `https://cloudflare-dns.com`  | DNS Lookup queries       | Query names appear in 25-hour resolver logs; client IP never stored in non-volatile storage (truncated and deleted within 25 h); no sale/sharing for ad targeting; APNIC sees anonymized metadata only; outside audit published. |

Both tools display the provider name, sent-field scope, freshness, and
typed offline/timeout/rate-limit/malformed states; ordinary connection
metadata (TLS-visible IP) goes to the provider as with any HTTPS client.
Only user-entered queries (a currency pair or a domain name) are sent; no
identifiers, tokens, or tool history are transmitted.

## 5. Dependencies and vulnerability posture

- `pnpm audit --prod` at this commit: **no known vulnerabilities**. `pnpm audit`
  (including dev dependencies): **0 critical, 0 high, 1 moderate** — the
  moderate is `uuid <11.1.1` (GHSA-w5hq-g745-h8pq) reached only through the
  dev-time `@capacitor/cli > xcode` path. It never ships in the app bundle,
  and the vulnerable v3/v5/v6 `buf` argument is unreachable from CLI usage.
  Accepted dev-only exposure; revisit on the next Capacitor CLI update.
- The js-yaml HIGH advisories were fixed by PR #195 and PR #209 (runtime
  dependency of the YAML to JSON tool). A later advisory
  (GHSA-2883-xcg3-v3hh) reappeared against 4.3.1 and is cleared by the 4.3.2
  pin in PR #209; the runtime path is clean again, and the tool remains the
  only production dependency that parses hostile user input.
- Exact dependency pins and the pnpm-only lockfile policy are unchanged; both
  js-yaml lockfile diffs contained only js-yaml.

## 6. Licenses and notices (production bundle)

`pnpm licenses list --prod` at this commit: 83 production packages over 10
license kinds, all permissive — 64 MIT, 10 ISC, 2 BSD-3-Clause
(`diff` direct, `moo` via sql-formatter), plus:

| Package             | License                   | Path into bundle              | Notice action                     |
| ------------------- | ------------------------- | ----------------------------- | --------------------------------- |
| `pdfjs-dist`        | Apache-2.0                | PDF Converter worker          | Apache-2.0 notice in release docs |
| `dompurify`         | (MPL-2.0 OR Apache-2.0)   | Markdown/sanitization         | Notice in release docs            |
| `jszip`             | (MIT OR GPL-3.0-or-later) | PDF Converter archive         | MIT option exercised (no GPL)     |
| `pako`              | (MIT AND Zlib)            | via jszip                     | zlib notice in release docs       |
| `argparse`          | Python-2.0                | via js-yaml and sql-formatter | PSF notice in release docs        |
| `railroad-diagrams` | CC0-1.0                   | via sql-formatter > nearley   | Public domain; optional notice    |
| `tslib`             | 0BSD                      | via pdfjs-dist                | 0BSD (permissive)                 |

No copyleft license is exercised; the final third-party-notices document is
a release-preparation item under #32 alongside store content.

## 7. Provenance

`docs/SOURCE_PROVENANCE.md` remains the copied-code/data/asset map (upstream
analyzed commit `61e54c64edbeffc9487239b6dae399e255c6a71d`); every migrated
tool and dataset records source, transformation, and license. The ADR 0022
additions are original work with no upstream source.

## 8. SBOM

`docs/certification/sbom/cyclonedx.json` is a CycloneDX 1.5 SBOM of the
production dependency tree (92 deduplicated `name@version` components with
package URLs and best-effort license expressions), generated by
`node scripts/build-sbom.mjs` from `pnpm ls --prod --json`. Regenerate after
any dependency change; `pnpm licenses list --prod` remains the authoritative
license inventory.

## 9. Secret scan

No secret-scanning tool is installed in this environment. Scan performed
2026-09-08 over all tracked files with a high-signal pattern
(`(api_?key|secret|password|token)\s*[:=]\s*<16+ chars>`), excluding
lockfiles and tests: **no matches**. The repository contains no keystores,
`.env` values, service-account JSON, API keys, or recovery codes; signing
material does not exist by design. GitHub secret scanning remains available
on the repository once enabled by the owner.

## 10. Residual items

- Critical/high vulnerabilities: none remaining (see section 5).
- Data-loss defects: none known; durable tools carry versioned schemas,
  migration gates, export, and tested recovery.
- The remaining open gates are physical-device/OEM evidence (#18/#25) and
  product-owner release decisions (#27–#41), not security findings.
