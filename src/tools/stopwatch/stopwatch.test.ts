import { describe, expect, it } from "vitest"
import { computeElapsedMs, formatStopwatchTime, markExtremes, recordLap } from "./stopwatch"

describe("computeElapsedMs", () => {
  it("reconstructs elapsed time from the wall-clock anchor", () => {
    const anchor = { startedAtMs: 1_000, elapsedAtStartMs: 5_000 }
    expect(computeElapsedMs(anchor, 0, 3_500)).toBe(7_500)
  })

  it("resumes correctly and never loses anchored time on clock jumps", () => {
    const anchor = { startedAtMs: 10_000, elapsedAtStartMs: 1_000 }
    expect(computeElapsedMs(anchor, 0, 9_000)).toBe(1_000)
    expect(computeElapsedMs(anchor, 0, 12_000)).toBe(3_000)
    expect(computeElapsedMs(null, 4_200, 999)).toBe(4_200)
  })
})

describe("formatStopwatchTime", () => {
  it("formats minutes, seconds, and centiseconds", () => {
    expect(formatStopwatchTime(0)).toBe("00:00.00")
    expect(formatStopwatchTime(65_432)).toBe("01:05.43")
  })

  it("rolls into hours for long runs", () => {
    expect(formatStopwatchTime(3_723_456)).toBe("01:02:03.45")
  })

  it("never shows a negative time", () => {
    expect(formatStopwatchTime(-5)).toBe("00:00.00")
  })
})

describe("recordLap and markExtremes", () => {
  it("records newest-first with per-lap and total times", () => {
    const first = recordLap([], 10_000, "1")
    const second = recordLap(first, 25_000, "2")
    expect(second.map((lap) => lap.lapTime)).toEqual([15_000, 10_000])
    expect(second.map((lap) => lap.totalTime)).toEqual([25_000, 10_000])
  })

  it("marks best and worst laps and stays neutral for a single lap", () => {
    const laps = recordLap(recordLap(recordLap([], 5_000, "1"), 12_000, "2"), 20_000, "3")
    const marks = markExtremes(laps)
    expect(marks[0]).toEqual({ isBest: false, isWorst: true })
    expect(marks[1]).toEqual({ isBest: false, isWorst: false })
    expect(marks[2]).toEqual({ isBest: true, isWorst: false })
    expect(markExtremes(recordLap([], 5_000, "1"))[0]).toEqual({
      isBest: false,
      isWorst: false,
    })
  })
})
