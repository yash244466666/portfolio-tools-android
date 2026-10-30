import { describe, expect, it } from "vitest"
import {
  addBusinessDays,
  addDays,
  addMonthsClamped,
  calculateDate,
  daysInMonth,
  formatIsoDate,
  parseAmount,
  parseDateInput,
  todayCalendarDate,
  weekdayLabel,
} from "./date-calculator"

const date = (year: number, month: number, day: number) => ({ year, month, day })

describe("calendar parsing", () => {
  it("accepts real dates and rejects non-existent or out-of-range dates", () => {
    expect(parseDateInput("2024-02-29")).toEqual(date(2024, 2, 29))
    expect(parseDateInput("2026-02-29")).toBeNull()
    expect(parseDateInput("2026-13-01")).toBeNull()
    expect(parseDateInput("2026-04-31")).toBeNull()
    expect(parseDateInput("0000-01-01")).toBeNull()
    expect(parseDateInput("10000-01-01")).toBeNull()
    expect(parseDateInput("2026-9-1")).toBeNull()
  })

  it("computes leap-aware month lengths", () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2000, 2)).toBe(29)
    expect(daysInMonth(1900, 2)).toBe(28)
    expect(daysInMonth(2026, 4)).toBe(30)
  })
})

describe("day and month arithmetic", () => {
  it("adds and subtracts calendar days across month and year boundaries", () => {
    expect(addDays(date(2024, 2, 28), 1)).toEqual(date(2024, 2, 29))
    expect(addDays(date(2024, 2, 29), 1)).toEqual(date(2024, 3, 1))
    expect(addDays(date(2024, 12, 31), 1)).toEqual(date(2025, 1, 1))
    expect(addDays(date(2025, 1, 1), -1)).toEqual(date(2024, 12, 31))
  })

  it("clamps the day when adding months and years", () => {
    expect(addMonthsClamped(date(2026, 1, 31), 1)).toEqual(date(2026, 2, 28))
    expect(addMonthsClamped(date(2024, 1, 31), 1)).toEqual(date(2024, 2, 29))
    expect(addMonthsClamped(date(2024, 2, 29), 12)).toEqual(date(2025, 2, 28))
    expect(addMonthsClamped(date(2026, 1, 31), -1)).toEqual(date(2025, 12, 31))
    expect(addMonthsClamped(date(2026, 12, 31), 1)).toEqual(date(2027, 1, 31))
  })

  it("reports the weekday independently of the host timezone", () => {
    expect(weekdayLabel(date(1970, 1, 1))).toBe("Thursday")
    expect(weekdayLabel(date(2000, 1, 1))).toBe("Saturday")
    expect(weekdayLabel(date(2024, 2, 29))).toBe("Thursday")
    expect(weekdayLabel(date(2026, 10, 30))).toBe("Friday")
  })

  it("stays inside the supported year range", () => {
    expect(addDays(date(9999, 12, 31), 1)).toBeNull()
    expect(addDays(date(1, 1, 1), -1)).toBeNull()
  })
})

describe("business days", () => {
  it("skips weekends in both directions", () => {
    // 2026-10-30 is a Friday.
    expect(addBusinessDays(date(2026, 10, 30), 1, 1)).toEqual(date(2026, 11, 2))
    expect(addBusinessDays(date(2026, 10, 31), 1, 1)).toEqual(date(2026, 11, 2))
    expect(addBusinessDays(date(2026, 11, 2), 1, -1)).toEqual(date(2026, 10, 30))
    expect(addBusinessDays(date(2026, 11, 1), 1, -1)).toEqual(date(2026, 10, 30))
    expect(addBusinessDays(date(2026, 10, 31), 0, 1)).toEqual(date(2026, 10, 31))
  })
})

describe("parseAmount", () => {
  it("accepts bounded non-negative whole numbers only", () => {
    expect(parseAmount("7")).toBe(7)
    expect(parseAmount("0007")).toBe(7)
    expect(parseAmount("100000")).toBe(100000)
    expect(parseAmount("100001")).toBeNull()
    expect(parseAmount("-1")).toBeNull()
    expect(parseAmount("1.5")).toBeNull()
    expect(parseAmount("")).toBeNull()
  })
})

describe("calculateDate", () => {
  it("adds months with clamping and reports the result", () => {
    const result = calculateDate({
      start: "2026-01-31",
      operation: "add",
      amount: "1",
      unit: "months",
    })
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.calculation.iso).toBe("2026-02-28")
    expect(result.calculation.weekday).toBe("Saturday")
    expect(result.calculation.totalDays).toBe(28)
  })

  it("subtracts weeks and years", () => {
    const weeks = calculateDate({
      start: "2026-03-31",
      operation: "subtract",
      amount: "2",
      unit: "weeks",
    })
    expect(weeks.status).toBe("ok")
    if (weeks.status === "ok") expect(weeks.calculation.iso).toBe("2026-03-17")

    const leap = calculateDate({
      start: "2024-02-29",
      operation: "add",
      amount: "1",
      unit: "years",
    })
    expect(leap.status).toBe("ok")
    if (leap.status === "ok") expect(leap.calculation.iso).toBe("2025-02-28")
  })

  it("adds business days across a weekend", () => {
    const result = calculateDate({
      start: "2026-10-30",
      operation: "add",
      amount: "1",
      unit: "business-days",
    })
    expect(result.status).toBe("ok")
    if (result.status === "ok") {
      expect(result.calculation.iso).toBe("2026-11-02")
      expect(result.calculation.weekday).toBe("Monday")
    }
  })

  it("returns the start date for a zero amount", () => {
    const result = calculateDate({
      start: "2026-10-31",
      operation: "add",
      amount: "0",
      unit: "business-days",
    })
    expect(result.status).toBe("ok")
    if (result.status === "ok") expect(result.calculation.iso).toBe("2026-10-31")
  })

  it("rejects invalid dates, amounts, and out-of-range results", () => {
    expect(
      calculateDate({ start: "2026-02-30", operation: "add", amount: "1", unit: "days" }).status,
    ).toBe("error")
    expect(
      calculateDate({ start: "2026-02-28", operation: "add", amount: "x", unit: "days" }).status,
    ).toBe("error")
    const overflow = calculateDate({
      start: "9999-12-31",
      operation: "add",
      amount: "1",
      unit: "days",
    })
    expect(overflow).toEqual({
      status: "error",
      message: "The result is outside the supported years 1–9999.",
    })
  })
})

describe("todayCalendarDate and formatting", () => {
  it("uses local calendar components and formats ISO dates", () => {
    expect(todayCalendarDate(new Date(2026, 9, 30, 23, 59))).toEqual(date(2026, 10, 30))
    expect(formatIsoDate(date(1, 2, 3))).toBe("0001-02-03")
    expect(formatIsoDate(date(9999, 12, 31))).toBe("9999-12-31")
  })
})
