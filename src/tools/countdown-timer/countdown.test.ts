import { describe, expect, it } from "vitest"
import {
  computeCountdownRemainingSeconds,
  countdownDeadlineMs,
  countdownPresets,
  countdownProgressPercent,
  formatCountdownDisplay,
  maximumHours,
  maximumMinutesOrSeconds,
  parseCountdownFields,
} from "./countdown"

describe("parseCountdownFields", () => {
  it("sums clamped integer fields", () => {
    expect(parseCountdownFields({ hours: "1", minutes: "2", seconds: "3" })).toBe(3723)
  })

  it("rejects garbage and out-of-range input", () => {
    expect(parseCountdownFields({ hours: "abc", minutes: "2.5", seconds: "-4" })).toBe(0)
    expect(
      parseCountdownFields({ hours: String(maximumHours + 1), minutes: "60", seconds: "60" }),
    ).toBe(maximumHours * 3600 + maximumMinutesOrSeconds * 60 + maximumMinutesOrSeconds)
  })
})

describe("formatCountdownDisplay", () => {
  it("formats zero-padded hours, minutes, and seconds", () => {
    expect(formatCountdownDisplay(0)).toBe("00:00:00")
    expect(formatCountdownDisplay(3723)).toBe("01:02:03")
    expect(formatCountdownDisplay(-10)).toBe("00:00:00")
  })
})

describe("progress and deadline", () => {
  it("computes percentage progress clamped to the countdown bounds", () => {
    expect(countdownProgressPercent(50, 100)).toBe(50)
    expect(countdownProgressPercent(0, 100)).toBe(100)
    expect(countdownProgressPercent(150, 100)).toBe(0)
    expect(countdownProgressPercent(5, 0)).toBe(0)
  })

  it("derives remaining seconds from the wall-clock deadline", () => {
    const deadline = countdownDeadlineMs(10_000, 60)
    expect(deadline).toBe(70_000)
    expect(computeCountdownRemainingSeconds(deadline, 10_000)).toBe(60)
    expect(computeCountdownRemainingSeconds(deadline, 39_501)).toBe(31)
    expect(computeCountdownRemainingSeconds(deadline, 80_000)).toBe(0)
  })
})

describe("presets", () => {
  it("exposes the six quick presets", () => {
    expect(countdownPresets.map((preset) => preset.label)).toEqual([
      "1 min",
      "5 min",
      "10 min",
      "15 min",
      "30 min",
      "1 hour",
    ])
  })
})
