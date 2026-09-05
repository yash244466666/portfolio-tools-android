# Source Provenance

> Created: 2026-09-05  
> Upstream repository: `/home/yash/Desktop/yash/portfolio-v2`  
> Analyzed upstream commit: `61e54c64edbeffc9487239b6dae399e255c6a71d`

The Android repository is a separate codebase. The upstream path is recorded for local development convenience only and is never a build/runtime dependency.

## Foundation mapping

| Android artifact                     | Upstream reference                                                                    | Treatment                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/tools/unit-converter/`          | `components/tools/core/unit-converter.tsx`, `lib/tools/unit-data.ts`                  | Reworked into pure typed data/logic plus mobile UI; increased conversion precision and removed variable month/year durations |
| `src/tools/timestamp-converter/`     | `components/tools/core/timestamp-converter.tsx`                                       | Reworked to require explicit seconds/milliseconds instead of length guessing; pure conversion functions added                |
| `src/tools/hash-generator/`          | `components/tools/core/hash-generator.tsx`, `components/tools/shared/crypto-utils.ts` | Reworked to Web Crypto SHA algorithms only; MD5 custom implementation intentionally not copied                               |
| `src/tools/registry.ts`              | `lib/content/tools/index.ts`, `lib/content/tools/types.ts`                            | New Android-specific typed milestone registry; only the 12-tool vertical slice is represented initially                      |
| `ANDROID_APP_IMPLEMENTATION_PLAN.md` | same filename in upstream working tree                                                | Exact reference copy at foundation creation time                                                                             |

## Licensing/provenance rules

- Before copying a dependency, asset, or dataset, record source version/commit, license, transformation, and attribution requirement.
- Golden behavior fixtures must be synthetic or published standard vectors.
- Do not copy portfolio images, branding, fonts, or animation assets unless the app needs them and licensing/size/accessibility are reviewed.
- When upstream code contains an accuracy or platform problem, preserve the intended feature rather than the defect and record the divergence here.

## Future migration log template

| Date       | Tool/data | Upstream commit/path | Android change | Tests/oracle      | License/attribution | Upstream follow-up |
| ---------- | --------- | -------------------- | -------------- | ----------------- | ------------------- | ------------------ |
| YYYY-MM-DD | tool ID   | commit + paths       | summary        | fixture/reference | status              | issue/none         |
