import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { computeAge, parseIsoDate, todayIso } from "./age"

describe("parseIsoDate", () => {
  it("accepts padded ISO dates", () => {
    expect(parseIsoDate("1990-05-20")).toEqual({ year: 1990, month: 5, day: 20 })
  })

  it("rejects impossible civil dates instead of normalizing them", () => {
    expect(parseIsoDate("2026-02-30")).toBeNull()
    expect(parseIsoDate("2025-02-29")).toBeNull()
    expect(parseIsoDate("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 })
  })

  it("rejects malformed and unpadded text", () => {
    expect(parseIsoDate("not-a-date")).toBeNull()
    expect(parseIsoDate("2026-1-1")).toBeNull()
    expect(parseIsoDate("2026-01-01T00:00:00")).toBeNull()
    expect(parseIsoDate("")).toBeNull()
  })
})

describe("computeAge", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 7, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("computes years, months, and days with calendar borrowing", () => {
    const result = computeAge("1990-05-20", new Date(2026, 8, 7, 12, 0, 0))
    expect(result).not.toBeNull()
    expect(result!.years).toBe(36)
    expect(result!.months).toBe(3)
    expect(result!.days).toBe(18)
  })

  it("computes exact day, hour, and minute totals", () => {
    const result = computeAge("1990-05-20", new Date(2026, 8, 7, 12, 0, 0))
    expect(result!.totalDays).toBe(13259)
    expect(result!.totalHours).toBe(318228)
    expect(result!.totalMinutes).toBe(19093680)
  })

  it("counts the next birthday after today with Math.ceil rounding", () => {
    const result = computeAge("1990-05-20", new Date(2026, 8, 7, 12, 0, 0))
    // Sep 7 12:00 → May 20 2027 00:00 is 254.5 days; Math.ceil rounds up.
    expect(result!.daysUntilBirthday).toBe(255)
    expect(result!.nextBirthdayAge).toBe(37)
    expect(result!.nextBirthdayIso).toBe("2027-05-20")
  })

  it("rolls the birthday to next year when today is the birthday", () => {
    const result = computeAge("2000-09-07", new Date(2026, 8, 7, 12, 0, 0))
    expect(result!.years).toBe(26)
    expect(result!.months).toBe(0)
    expect(result!.days).toBe(0)
    expect(result!.daysUntilBirthday).toBe(365)
    expect(result!.nextBirthdayAge).toBe(27)
  })

  it("normalizes a February 29 birthday to March 1 in common years", () => {
    const result = computeAge("2000-02-29", new Date(2026, 8, 7, 12, 0, 0))
    expect(result!.nextBirthdayIso).toBe("2027-03-01")
    expect(result!.daysUntilBirthday).toBe(175)
    expect(result!.nextBirthdayAge).toBe(27)
  })

  it("rejects future dates and invalid input", () => {
    expect(computeAge("2027-01-01", new Date(2026, 8, 7, 12, 0, 0))).toBeNull()
    expect(computeAge("2026-02-30", new Date(2026, 8, 7, 12, 0, 0))).toBeNull()
    expect(computeAge("garbage", new Date(2026, 8, 7, 12, 0, 0))).toBeNull()
    expect(computeAge("", new Date(2026, 8, 7, 12, 0, 0))).toBeNull()
  })
})

describe("todayIso", () => {
  it("formats the local calendar date as the date input does", () => {
    expect(todayIso(new Date(2026, 8, 7, 23, 59, 59))).toBe("2026-09-07")
    expect(todayIso(new Date(2026, 0, 3))).toBe("2026-01-03")
  })
})
