# ADR 0014: Pomodoro Wall-Clock Timer and Best-Effort Alerts

- Status: Accepted
- Date: 2026-09-07
- Owner: Yash Sikdar
- Revisit when: exact-alarm delivery is ever approved (a separate permission/UX review per ADR 0002 rules), another timed tool ships, or device testing shows Doze delays that make `allowWhileIdle: false` alerts useless in practice.

## Context

The audited upstream Pomodoro decrements a counter once per `setInterval` tick and calls `new Notification` directly. Both are defects on Android: WebView timers throttle in the background (a 25-minute session counted in ticks drifts badly or stops entirely), and direct notification construction bypasses the platform contract — tools must use `NotificationService`, and `POST_NOTIFICATIONS` may only be requested when the user enables notification behavior. The plan requires timers to reconstruct from timestamps, distinguish monotonic/wall time, and never promise exact alarm delivery.

## Decision

Enable the `pomodoro-timer` tool with an anchor-based model:

- **Wall-clock anchor** (`pomodoro.ts`): a running phase is stored as `startedAtMs` plus the remaining time at start; remaining time is always derived from `Date.now()`, never from counted ticks. The 250 ms interval refreshes the display and detects completion — background throttling can delay the _display_ but never drift the _timer_. Clock skew backwards cannot add time (elapsed clamped at zero).
- **Durable reconstruction**: the same versioned-payload pattern as ADR 0013 (`schemaVersion: 1` with a migration gate) stores phase, state, durations, session count, alert preference, and anchor in the `PreferenceStore` under `pomodoro:timer`. On process recreation, a phase still in progress keeps its original anchor; a phase that expired while away completes **at most one boundary** and lands idle in the next phase — missed in-app completions and missed notifications are not replayed.
- **Best-effort alerts through the contract**: the off-by-default "Alert me at phase end" toggle requests permission only when enabled. Granted → one notification is scheduled at the anchor-derived end time through `NotificationService.schedule` (stable id `pomodoro-phase`, `timers` channel); denied → a recovery message with no schedule. Pause, reset, and phase switches cancel deterministically; in-app completion cancels and reschedules for the next phase. No exact alarms, no foreground service, no new permission beyond the already-budgeted `POST_NOTIFICATIONS` (only exercised after the toggle).
- **Honest wording**: the UI states that the timer runs from the device clock and stays accurate in the background, and that alerts are best-effort with no guaranteed delivery time.
- Duration inputs (work 1–60, break 1–30 minutes) clamp to their documented ranges; migration rejects out-of-range payloads as corrupt.

## Alternatives considered

- **Tick counting (upstream)**: rejected; background throttling makes it inaccurate and it cannot survive process death.
- **Exact alarms (`USE_EXACT_ALARM`/`SCHEDULE_EXACT_ALARM`)**: rejected for version 1 by the permission budget and policy (AGENT.md Section 15); best-effort scheduling is the approved posture.
- **Foreground service for reliability**: rejected; adds a permanent notification and a review surface for a utility timer.
- **Counting every boundary missed while away**: rejected; multi-boundary reconstruction invites clock-skew abuse and false session counts. One boundary is the honest minimum.

## Consequences

- The timer is accurate across backgrounding, Doze-limited throttling, and process death; only the _notification_ is best-effort, as documented.
- A user away for hours loses the intermediate phases (one boundary only); sessions count only completed work phases that the app observed or can prove expired.
- The web adapter intentionally reports scheduling as unavailable (typed unsupported state), keeping browser development honest.
- Device evidence (real Doze behavior, notification delivery timing, POST_NOTIFICATIONS flow, TalkBack on the timer/progress) remains assigned to issues #17/#18; automated, E2E, and artifact gates pass.
