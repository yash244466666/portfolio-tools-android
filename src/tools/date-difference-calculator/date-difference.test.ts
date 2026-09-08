import { describe, expect, it } from "vitest"
import {
  businessDaysBetween,
  computeDateDifference,
  daysInMonth,
  diffInDays,
  monthsAndDaysBetween,
  weekdayOf,
} from "./date-difference"

describe("weekdayOf", () => {
  it("matches known weekdays on the UTC anchor", () => {
    // 2026-09-08 is a Tuesday.
    expect(weekdayOf({ year: 2026, month: 9, day: 8 })).toBe(2)
    // 2026-09-06 is a Sunday.
    expect(weekdayOf({ year: 2026, month: 9, day: 6 })).toBe(0)
    // 2026-09-11 is a Friday.
    expect(weekdayOf({ year: 2026, month: 9, day: 11 })).toBe(5)
  })
})

describe("diffInDays", () => {
  it("counts whole days across month and year boundaries", () => {
    expect(diffInDays({ year: 2026, month: 9, day: 1 }, { year: 2026, month: 9, day: 30 })).toBe(29)
    expect(diffInDays({ year: 2025, month: 12, day: 31 }, { year: 2026, month: 1, day: 1 })).toBe(1)
    expect(diffInDays({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 2, day: 28 })).toBe(-1)
  })

  it("handles leap years", () => {
    expect(diffInDays({ year: 2024, month: 2, day: 28 }, { year: 2024, month: 3, day: 1 })).toBe(2)
    expect(diffInDays({ year: 2026, month: 2, day: 28 }, { year: 2026, month: 3, day: 1 })).toBe(1)
  })
})

describe("daysInMonth", () => {
  it("is leap-year aware", () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 1)).toBe(31)
  })
})

describe("businessDaysBetween", () => {
  it("matches a hand-counted known vector", () => {
    // Monday 2026-09-07 through Friday 2026-09-11, exclusive: 5 weekdays.
    const monday = { year: 2026, month: 9, day: 7 }
    expect(businessDaysBetween(monday, 5)).toBe(5)
    // Same span plus the weekend: 7 days -> still 5 business days.
    expect(businessDaysBetween(monday, 7)).toBe(5)
    // 8 days from Monday spans two Monweeks: 6 business days.
    expect(businessDaysBetween(monday, 8)).toBe(6)
  })

  it("counts zero for zero and negative spans", () => {
    expect(businessDaysBetween({ year: 2026, month: 9, day: 7 }, 0)).toBe(0)
    expect(businessDaysBetween({ year: 2026, month: 9, day: 7 }, -3)).toBe(0)
  })
})

describe("monthsAndDaysBetween", () => {
  it("borrows from the end month when the day-of-month is smaller", () => {
    // Jan 31 -> Mar 1: one whole month (Jan 31 -> Feb 28 anchor) + 1 day.
    const result = monthsAndDaysBetween(
      { year: 2026, month: 1, day: 31 },
      { year: 2026, month: 3, day: 1 },
    )
    expect(result).toEqual({ months: 1, days: 1 })
  })

  it("handles whole months across a year boundary", () => {
    const result = monthsAndDaysBetween(
      { year: 2025, month: 10, day: 15 },
      { year: 2026, month: 10, day: 15 },
    )
    expect(result).toEqual({ months: 12, days: 0 })
  })

  it("clamps the monthly anchor to shorter months", () => {
    // Jan 30 -> Mar 30: Jan 30 -> Feb 28/29 anchor is one month, then to
    // Mar 30 is exactly the borrowed anchor, so 2 months 0 days.
    const result = monthsAndDaysBetween(
      { year: 2026, month: 1, day: 30 },
      { year: 2026, month: 3, day: 30 },
    )
    expect(result).toEqual({ months: 2, days: 0 })
  })

  it("returns zeros for inverted ranges", () => {
    expect(
      monthsAndDaysBetween({ year: 2026, month: 3, day: 10 }, { year: 2026, month: 1, day: 5 }),
    ).toEqual({ months: 0, days: 0 })
  })
})

describe("computeDateDifference", () => {
  it("counts exclusive and inclusive modes distinctly", () => {
    const start = { year: 2026, month: 9, day: 7 }
    const end = { year: 2026, month: 9, day: 11 }
    const exclusive = computeDateDifference(start, end, "exclusive")
    expect(exclusive.totalDays).toBe(4)
    expect(exclusive.businessDays).toBe(4)
    const inclusive = computeDateDifference(start, end, "inclusive")
    expect(inclusive.totalDays).toBe(5)
    expect(inclusive.businessDays).toBe(5)
  })

  it("reports weeks plus remainder days", () => {
    const result = computeDateDifference(
      { year: 2026, month: 9, day: 1 },
      { year: 2026, month: 9, day: 15 },
      "exclusive",
    )
    expect(result.weeks).toBe(2)
    expect(result.remainderDays).toBe(0)
  })

  it("orders the dates itself when the end is earlier", () => {
    const reversed = computeDateDifference(
      { year: 2026, month: 9, day: 11 },
      { year: 2026, month: 9, day: 7 },
      "exclusive",
    )
    expect(reversed.totalDays).toBe(4)
    expect(reversed.businessDays).toBe(4)
  })

  it("keeps the calendar-accurate month split with the mode applied to days", () => {
    const result = computeDateDifference(
      { year: 2025, month: 10, day: 15 },
      { year: 2026, month: 10, day: 20 },
      "exclusive",
    )
    expect(result.months).toBe(12)
    expect(result.remainderOfMonths).toBe(5)
    expect(result.totalDays).toBe(370)
  })
})
