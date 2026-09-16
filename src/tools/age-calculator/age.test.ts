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

describe("computeAge month-end boundaries", () => {
  it("never borrows past a short month into a negative day count", () => {
    // Regression: the borrow added only the length of the month before `now`
    // and never re-checked, so a Jan 31 birth checked on Mar 1 returned
    // "36 years 1 month -2 days".
    const jan31 = computeAge("1990-01-31", new Date(2026, 2, 1, 12))
    expect(jan31!.years).toBe(36)
    expect(jan31!.months).toBe(1)
    expect(jan31!.days).toBe(1)

    const mar30 = computeAge("1985-03-30", new Date(2026, 2, 1, 12))
    expect(mar30!.years).toBe(40)
    expect(mar30!.months).toBe(11)
    expect(mar30!.days).toBe(1)
  })

  it("keeps a clamped end-of-month anniversary consistent the next day", () => {
    const nextDay = computeAge("1990-01-31", new Date(2026, 2, 2, 12))
    expect(nextDay!.years).toBe(36)
    expect(nextDay!.months).toBe(1)
    expect(nextDay!.days).toBe(2)
  })

  it("stays inside a valid calendar decomposition across month boundaries", () => {
    for (const birthDay of [28, 29, 30, 31]) {
      for (let month = 0; month < 12; month++) {
        const birth = `1990-${String(month + 1).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`
        if (parseIsoDate(birth) === null) continue
        for (let checkMonth = 0; checkMonth < 12; checkMonth++) {
          for (const checkDay of [1, 2, 3, 15, 27, 28]) {
            const result = computeAge(birth, new Date(2026, checkMonth, checkDay, 12))
            if (!result) continue
            expect(result.days).toBeGreaterThanOrEqual(0)
            expect(result.days).toBeLessThan(31)
            expect(result.months).toBeGreaterThanOrEqual(0)
            expect(result.months).toBeLessThan(12)
          }
        }
      }
    }
  })
})
