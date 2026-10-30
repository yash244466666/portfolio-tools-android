import { describe, expect, it } from "vitest"
import {
  clampBreakMinutes,
  clampWorkMinutes,
  computeRemainingMs,
  defaultBreakMinutes,
  defaultWorkMinutes,
  formatClock,
  migrateTimer,
  phaseDurationMs,
  pomodoroSchemaVersion,
  reconstructTimer,
  serializeTimer,
  type StoredTimer,
} from "./pomodoro"

function storedTimer(overrides: Partial<StoredTimer> = {}): StoredTimer {
  return {
    schemaVersion: pomodoroSchemaVersion,
    mode: "work",
    state: "idle",
    workMinutes: defaultWorkMinutes,
    breakMinutes: defaultBreakMinutes,
    sessions: 0,
    notifyEnabled: false,
    startedAtMs: 0,
    remainingMs: phaseDurationMs("work", defaultWorkMinutes, defaultBreakMinutes),
    updatedAt: new Date("2026-09-07T00:00:00Z").toISOString(),
    ...overrides,
  }
}

describe("pomodoro duration bounds", () => {
  it("clamps work and break minutes to their documented ranges", () => {
    expect(clampWorkMinutes(25)).toBe(25)
    expect(clampWorkMinutes(0)).toBe(1)
    expect(clampWorkMinutes(61)).toBe(60)
    expect(clampWorkMinutes(10.4)).toBe(10)
    expect(clampWorkMinutes(Number.NaN)).toBe(defaultWorkMinutes)
    expect(clampBreakMinutes(5)).toBe(5)
    expect(clampBreakMinutes(0)).toBe(1)
    expect(clampBreakMinutes(31)).toBe(30)
    expect(clampBreakMinutes(Number.POSITIVE_INFINITY)).toBe(defaultBreakMinutes)
  })

  it("computes phase durations in milliseconds", () => {
    expect(phaseDurationMs("work", 25, 5)).toBe(25 * 60_000)
    expect(phaseDurationMs("break", 25, 5)).toBe(5 * 60_000)
  })
})

describe("remaining-time arithmetic", () => {
  it("derives remaining time from the wall-clock anchor", () => {
    const startedAt = 1_000_000
    expect(computeRemainingMs(startedAt, 60_000, startedAt)).toBe(60_000)
    expect(computeRemainingMs(startedAt, 60_000, startedAt + 10_000)).toBe(50_000)
    expect(computeRemainingMs(startedAt, 60_000, startedAt + 60_000)).toBe(0)
    // Time never goes negative and a backwards clock never adds time.
    expect(computeRemainingMs(startedAt, 60_000, startedAt + 120_000)).toBe(0)
    expect(computeRemainingMs(startedAt, 60_000, startedAt - 5_000)).toBe(60_000)
  })

  it("formats the clock display with ceiling seconds", () => {
    expect(formatClock(0)).toBe("00:00")
    expect(formatClock(1)).toBe("00:01")
    expect(formatClock(59_999)).toBe("01:00")
    expect(formatClock(60_000)).toBe("01:00")
    expect(formatClock(25 * 60_000)).toBe("25:00")
    expect(formatClock(150_000)).toBe("02:30")
  })
})

describe("stored timer migration", () => {
  it("round-trips a serialized timer", () => {
    const timer = serializeTimer(
      {
        mode: "break",
        state: "running",
        workMinutes: 30,
        breakMinutes: 10,
        sessions: 4,
        notifyEnabled: true,
        startedAtMs: 1_000,
        remainingMs: 600_000,
      },
      new Date("2026-09-07T01:00:00Z"),
    )
    expect(migrateTimer(timer)).toEqual({ status: "ok", timer })
  })

  it("refuses newer schema versions", () => {
    expect(migrateTimer({ ...storedTimer(), schemaVersion: pomodoroSchemaVersion + 1 })).toEqual({
      status: "newer-schema",
    })
  })

  it("treats corrupt payloads as invalid", () => {
    for (const corrupt of [
      null,
      "running",
      7,
      {},
      { schemaVersion: 1 },
      { ...storedTimer(), mode: "nap" },
      { ...storedTimer(), state: "exploded" },
      { ...storedTimer(), workMinutes: 61 },
      { ...storedTimer(), workMinutes: 0 },
      { ...storedTimer(), breakMinutes: 31 },
      { ...storedTimer(), sessions: -1 },
      { ...storedTimer(), sessions: Infinity },
      { ...storedTimer(), sessions: 1.5 },
      { ...storedTimer(), startedAtMs: Infinity },
      { ...storedTimer(), remainingMs: Infinity },
      { ...storedTimer(), notifyEnabled: "yes" },
      { ...storedTimer(), remainingMs: -1 },
      { ...storedTimer(), state: "running", startedAtMs: 0 },
      { ...storedTimer(), state: "running", remainingMs: 0 },
    ]) {
      expect(migrateTimer(corrupt)).toEqual({ status: "invalid" })
    }
  })
})

describe("process-away reconstruction", () => {
  it("keeps an in-progress running phase on its original anchor", () => {
    const timer = storedTimer({ state: "running", startedAtMs: 1_000_000, remainingMs: 600_000 })
    const now = 1_000_000 + 100_000
    expect(reconstructTimer(timer, now)).toBe(timer)
  })

  it("completes at most one boundary when the phase expired while away", () => {
    const timer = storedTimer({ state: "running", startedAtMs: 1_000_000, remainingMs: 600_000 })
    const longAfter = 1_000_000 + 3_600_000
    const result = reconstructTimer(timer, longAfter)
    expect(result).toEqual({
      ...timer,
      mode: "break",
      state: "idle",
      sessions: 1,
      startedAtMs: 0,
      remainingMs: phaseDurationMs("break", defaultWorkMinutes, defaultBreakMinutes),
    })
  })

  it("does not count a session when a break expired while away", () => {
    const timer = storedTimer({
      mode: "break",
      state: "running",
      startedAtMs: 1_000_000,
      remainingMs: 300_000,
      sessions: 2,
    })
    const result = reconstructTimer(timer, 1_000_000 + 3_600_000)
    expect(result.mode).toBe("work")
    expect(result.state).toBe("idle")
    expect(result.sessions).toBe(2)
  })

  it("leaves paused timers untouched", () => {
    const timer = storedTimer({ state: "paused", remainingMs: 123_456 })
    expect(reconstructTimer(timer, Date.now())).toBe(timer)
  })
})
