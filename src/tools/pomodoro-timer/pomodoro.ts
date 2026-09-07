/**
 * Pure Pomodoro timer model.
 *
 * The timer never counts ticks: a running phase is stored as a wall-clock anchor
 * (`startedAtMs` plus the remaining time at start), so remaining time stays correct when
 * the WebView throttles timers in the background or the process dies and is recreated.
 * Phase-end notifications are best-effort by design — exact alarm delivery is never
 * promised.
 */

export const minimumWorkMinutes = 1
export const maximumWorkMinutes = 60
export const minimumBreakMinutes = 1
export const maximumBreakMinutes = 30
export const defaultWorkMinutes = 25
export const defaultBreakMinutes = 5

/** Durable timer metadata key inside the `yash-tools:v1:` preference namespace. */
export const pomodoroStorageKey = "pomodoro:timer"
export const pomodoroSchemaVersion = 1

/** Stable notification id so every cancellation is deterministic. */
export const pomodoroNotificationId = "pomodoro-phase"

export type TimerMode = "work" | "break"
export type TimerState = "idle" | "running" | "paused"

export interface StoredTimer {
  schemaVersion: typeof pomodoroSchemaVersion
  mode: TimerMode
  state: TimerState
  workMinutes: number
  breakMinutes: number
  /** Completed work sessions. */
  sessions: number
  /** Whether the user asked for phase-end alerts. */
  notifyEnabled: boolean
  /** Wall-clock epoch ms when the current run started; 0 when not running. */
  startedAtMs: number
  /** Remaining ms at `startedAtMs` (running) or at pause time (paused). */
  remainingMs: number
  updatedAt: string
}

export type TimerMigrationResult =
  { status: "ok"; timer: StoredTimer } | { status: "newer-schema" } | { status: "invalid" }

export function clampWorkMinutes(value: number): number {
  if (!Number.isFinite(value)) return defaultWorkMinutes
  return Math.min(maximumWorkMinutes, Math.max(minimumWorkMinutes, Math.round(value)))
}

export function clampBreakMinutes(value: number): number {
  if (!Number.isFinite(value)) return defaultBreakMinutes
  return Math.min(maximumBreakMinutes, Math.max(minimumBreakMinutes, Math.round(value)))
}

export function phaseDurationMs(
  mode: TimerMode,
  workMinutes: number,
  breakMinutes: number,
): number {
  return (mode === "work" ? workMinutes : breakMinutes) * 60_000
}

/**
 * Remaining milliseconds for a running phase. Clamped at zero; a clock that jumps
 * backwards cannot make the timer gain time.
 */
export function computeRemainingMs(
  startedAtMs: number,
  remainingAtStartMs: number,
  nowMs: number,
): number {
  const elapsed = Math.max(0, nowMs - startedAtMs)
  return Math.max(0, remainingAtStartMs - elapsed)
}

export function formatClock(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function serializeTimer(
  timer: Omit<StoredTimer, "schemaVersion" | "updatedAt">,
  now: Date,
): StoredTimer {
  return { ...timer, schemaVersion: pomodoroSchemaVersion, updatedAt: now.toISOString() }
}

export function migrateTimer(raw: unknown): TimerMigrationResult {
  if (typeof raw !== "object" || raw === null) return { status: "invalid" }
  const record = raw as Record<string, unknown>
  if (typeof record.schemaVersion !== "number" || !Number.isInteger(record.schemaVersion)) {
    return { status: "invalid" }
  }
  if (record.schemaVersion > pomodoroSchemaVersion) return { status: "newer-schema" }
  if (record.schemaVersion < pomodoroSchemaVersion) return { status: "invalid" }
  if (record.mode !== "work" && record.mode !== "break") return { status: "invalid" }
  if (record.state !== "idle" && record.state !== "running" && record.state !== "paused") {
    return { status: "invalid" }
  }
  const workMinutes = clampWorkMinutes(Number(record.workMinutes))
  const breakMinutes = clampBreakMinutes(Number(record.breakMinutes))
  if (record.workMinutes !== workMinutes || record.breakMinutes !== breakMinutes) {
    return { status: "invalid" }
  }
  if (typeof record.sessions !== "number" || record.sessions < 0) return { status: "invalid" }
  if (typeof record.notifyEnabled !== "boolean") return { status: "invalid" }
  if (typeof record.startedAtMs !== "number" || record.startedAtMs < 0) return { status: "invalid" }
  if (typeof record.remainingMs !== "number" || record.remainingMs < 0) return { status: "invalid" }
  if (record.state === "running" && (record.startedAtMs === 0 || record.remainingMs === 0)) {
    return { status: "invalid" }
  }
  return {
    status: "ok",
    timer: {
      schemaVersion: pomodoroSchemaVersion,
      mode: record.mode,
      state: record.state,
      workMinutes,
      breakMinutes,
      sessions: Math.floor(record.sessions),
      notifyEnabled: record.notifyEnabled,
      startedAtMs: record.startedAtMs,
      remainingMs: record.remainingMs,
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
    },
  }
}

/**
 * Rebuilds the canonical timer after the process was away. A running phase whose time
 * expired while away completes at most one boundary (honest best-effort: the in-app
 * completion and its notification may have been missed) and lands idle in the next
 * phase. Phases still in progress keep their original anchor, so no time is lost or
 * gained.
 */
export function reconstructTimer(stored: StoredTimer, nowMs: number): StoredTimer {
  if (stored.state !== "running") return stored
  const remaining = computeRemainingMs(stored.startedAtMs, stored.remainingMs, nowMs)
  if (remaining > 0) return stored
  const nextMode: TimerMode = stored.mode === "work" ? "break" : "work"
  return {
    ...stored,
    mode: nextMode,
    state: "idle",
    sessions: stored.mode === "work" ? stored.sessions + 1 : stored.sessions,
    startedAtMs: 0,
    remainingMs: phaseDurationMs(nextMode, stored.workMinutes, stored.breakMinutes),
  }
}
