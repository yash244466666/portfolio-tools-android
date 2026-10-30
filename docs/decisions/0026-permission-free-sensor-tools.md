# ADR 0026: Permission-Free Sensor Tools (33 → 38)

- Status: **Accepted** — approved by the product owner on 2026-10-30.
- Date: 2026-10-30
- Owner: Yash Sikdar (product owner; approved 2026-10-30)
- Supersedes: the **33-tool count** of [ADR 0025](0025-daily-utility-scope-expansion.md) only. The sensor platform it introduces is new; ADR 0023's 70-tool cut disposition, ADR 0021's YouTube Downloader exclusion, and every earlier architecture/permission decision remain in force.
- Revisit when: a sensor tool needs a new permission, a device matrix shows unusable behavior, or the catalog focus changes.

## Context

The product owner asked for tools that use the phone's sensors and selected the permission-free set. These sensors are readable through Android's `SensorManager` without a runtime permission: accelerometer, linear acceleration, magnetometer, pressure (barometer), and ambient light. They cover common phone tasks — checking whether a surface is level, reading a heading, estimating altitude, checking ambient light, and measuring vibration.

The application deliberately does **not** have a sensor service yet. Tools may not import Android or browser sensor APIs directly, so a new capability contract, native bridge, web/test adapter, lifecycle handling, calibration, and unsupported-device states are required. This is a new global pattern, so it needs the representative implementation and this decision record.

## Decision

Add **five** tools and a versioned **`SensorService`** capability:

| Tool                     | ID                | Sensors                      | Why it is phone-native                                                                                                         |
| ------------------------ | ----------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Level & Angle**        | `level`           | accelerometer                | Check furniture, shelves, photos, and slopes; calibrate a zero reference and read roll/pitch/tilt.                             |
| **Compass**              | `compass`         | magnetometer + accelerometer | Tilt-compensated magnetic heading with cardinal direction, accuracy, and interference guidance; no location.                   |
| **Barometer & Altitude** | `barometer`       | pressure                     | Pressure and a standard-atmosphere altitude from a user-entered sea-level reference; unsupported on phones without the sensor. |
| **Light Meter**          | `light-meter`     | ambient light                | Rough lux and a text level with session min/max; unsupported where the sensor is absent.                                       |
| **Vibration Meter**      | `vibration-meter` | linear acceleration          | RMS and peak vibration over a rolling second; a still phone reads near zero.                                                   |

The public catalog gains a **Sensors & measurement** group of five. The app's coarse catalog filter keeps them under **Core**, because adding a fifth filter for five tools would fragment an otherwise small catalog; search and tags expose the sensor nature.

| Group                   | Before |  After |
| ----------------------- | -----: | -----: |
| Everyday money and math |     11 |     11 |
| Time                    |      7 |      7 |
| Everyday text           |      5 |      5 |
| Files and media         |      4 |      4 |
| Privacy and security    |      2 |      2 |
| Sharing and utility     |      4 |      4 |
| Sensors and measurement |      0 |      5 |
| **Total**               | **33** | **38** |

### Platform design

- `SensorService` exposes `availability()` and one `start({ kinds, intervalMs, onSample })` session. Kinds are `accelerometer`, `linear-acceleration`, `magnetometer`, `barometer`, and `light`.
- The app-owned Android plugin reads `SensorManager` directly, caps the interval at **20–500 ms (2–50 Hz)**, emits only requested kinds, reports accuracy, stops on Activity pause/destroy, and never logs or persists samples. It declares **no permission** and starts no background service.
- The web adapter supports `DeviceMotion` (accelerometer/linear acceleration) for development; it reports the other kinds unavailable. Tools surface honest unsupported states in the browser.
- Samples are validated at the bridge boundary (kind, value count, finite numbers, accuracy), and invalid payloads are dropped.
- Tools stop sampling on lifecycle inactive/unmount; no background collection exists.

### Explicitly excluded

The approval covers the permission-free set only. These remain out:

- **Sound Level Meter** — microphone; `RECORD_AUDIO` is currently scoped to Audio Recorder by ADR 0020 and would need a new permission/privacy review.
- **Pedometer / step counter** — `ACTIVITY_RECOGNITION` (runtime, dangerous) is outside the version-1 permission budget.
- **Heart rate** — `BODY_SENSORS` (dangerous and medical-adjacent).
- **GPS speedometer/altimeter** — location permission is prohibited in version 1.
- **Metal detector** — magnetometer-based readings are unreliable and gimmick-prone.
- **Flashlight / camera scanners** — camera permission is prohibited.

Adding any of those requires a separate permission/privacy/Play decision and a new ADR.

## Alternatives considered

- **One representative sensor tool first.** Rejected by the owner in favour of the full permission-free set; the shared service keeps the marginal cost of each additional tool bounded.
- **Use the W3C Generic Sensor API in the WebView.** Rejected as the primary path: availability and permission policy vary across WebView/OEM versions, and the native bridge gives consistent lifecycle control and testable availability. DeviceMotion remains a development-only fallback.
- **Add a fifth catalog category.** Deferred; Core with tags avoids fragmenting the catalog and keeps the work-item category/epic structure stable.

## Consequences

1. **Registry** — five `enabled` entries plus the 33 from ADRs 0023/0025, for **38 enabled**; the 70 `removed` entries are unchanged. The registry oracle becomes 38.
2. **Work-item manifest** — 39 managed tools (38 + excluded YouTube Downloader), 151 total issues, core 12 / math 14, tier counts 27/9/1/2, 33 implemented, a 38-tool launch epic, and a "38-Tool Closed Beta" milestone adopted in place via `renamedFrom`. Live GitHub provisioning remains a separate, explicitly authorized apply run.
3. **Documentation** — `CLAUDE.md`/`AGENT.md` (byte-identical), README, architecture, work-management, provenance, tracker, store claims, certification dossiers, device checklist, E2E, and the emulator driver move to 38. The sensor platform and permission-free claim are documented; no Data Safety microphone/location/activity declaration is added.
4. **Evidence** — adapter policy tests, pure logic tests for every tool, component tests with synthetic sensor streams, E2E route/unsupported coverage, and installed-artifact probes on the API 35 emulator. Real sensor accuracy, calibration, OEM variation, and background-stop behavior require the physical-device matrix (#18/#25); emulator injection is only a smoke test.
5. **Release** — this changes scope and adds a platform capability, not release readiness. No production candidate is approved; physical-device/OEM evidence and the owner release gates remain open.

## Approval

Accepted by the product owner, **Yash Sikdar**, on **2026-10-30**, by selecting all permission-free sensor tools from the proposal. The excluded permission-gated and prohibited tools are not approved by this decision.
