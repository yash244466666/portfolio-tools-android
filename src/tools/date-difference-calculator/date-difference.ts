/**
 * Pure calendar math for the Date Difference Calculator. Dates arrive as
 * validated {year, month, day} components (the component parses them with a
 * strict regex, never `new Date(string)`); all arithmetic runs through
 * `Date.UTC`, which is locale-independent and timezone-free. Original work
 * for this repository; no upstream code is copied.
 */

export interface CalendarDate {
  year: number
  month: number
  day: number
}

export type DayCountMode = "exclusive" | "inclusive"

export interface DateDifference {
  /** Whole days between the dates (inclusive mode adds the end date). */
  totalDays: number
  weeks: number
  /** Days left over after the whole weeks. */
  remainderDays: number
  /** Whole calendar months between the dates, calendar-accurate. */
  months: number
  /** Days left over after the whole months, respecting month lengths. */
  remainderOfMonths: number
  /** Monday-Friday days in the span (per the mode). */
  businessDays: number
}

const millisecondsPerDay = 86_400_000

/** Converts a calendar date to a UTC epoch millis anchor (no timezone drift). */
function toUtcAnchors(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day)
}

/** 0 = Sunday … 6 = Saturday, computed on the UTC anchor. */
export function weekdayOf(date: CalendarDate): number {
  return new Date(toUtcAnchors(date)).getUTCDay()
}

/** Whole days from `start` to `end`; negative when the end is earlier. */
export function diffInDays(start: CalendarDate, end: CalendarDate): number {
  return Math.round((toUtcAnchors(end) - toUtcAnchors(start)) / millisecondsPerDay)
}

/**
 * Counts Monday-Friday days over `dayCount` whole days, counting the start
 * date's own weekday as day one.
 *
 * Algorithm (documented): the weekday cycle repeats every 7 days with 5
 * business days per cycle, so full weeks contribute 5 each; the remainder
 * days are walked one by one over the weekday sequence starting at the
 * anchor. This is the classic closed-form weekday count and is covered by
 * known-vector tests.
 */
export function businessDaysBetween(start: CalendarDate, dayCount: number): number {
  if (dayCount <= 0) return 0
  const fullWeeks = Math.floor(dayCount / 7)
  const remainder = dayCount % 7
  let business = fullWeeks * 5
  let weekday = weekdayOf(start)
  for (let index = 0; index < remainder; index += 1) {
    if (weekday >= 1 && weekday <= 5) business += 1
    weekday = (weekday + 1) % 7
  }
  return business
}

/** Number of days in a month (leap-year aware). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Calendar-accurate month/day split, computed closed-form (no loops, so
 * spans of thousands of years are exact): whole months from the start date,
 * then the leftover days measured from the start date advanced by those
 * months (its day clamped only to the advanced month's length — the
 * addMonths convention, so Jan 30 + 2 months lands on Mar 30).
 */
export function monthsAndDaysBetween(
  start: CalendarDate,
  end: CalendarDate,
): { months: number; days: number } {
  if (toUtcAnchors(end) < toUtcAnchors(start)) return { months: 0, days: 0 }

  let months = (end.year - start.year) * 12 + (end.month - start.month)
  // Step back one month when the anniversary overshoots the end date
  // (the start day-of-month is past the end month's length).
  const endMonthAnchor: CalendarDate = {
    year: end.year,
    month: end.month,
    day: Math.min(start.day, daysInMonth(end.year, end.month)),
  }
  if (toUtcAnchors(endMonthAnchor) > toUtcAnchors(end)) months -= 1
  if (months < 0) return { months: 0, days: 0 }

  const advancedMonthIndex = start.month - 1 + months
  const advancedYear = start.year + Math.floor(advancedMonthIndex / 12)
  const advancedMonth = (advancedMonthIndex % 12) + 1
  const anchor: CalendarDate = {
    year: advancedYear,
    month: advancedMonth,
    day: Math.min(start.day, daysInMonth(advancedYear, advancedMonth)),
  }
  const days = Math.max(0, diffInDays(anchor, end))
  return { months, days }
}

/**
 * Computes the full difference for the mode. Exclusive counts the days
 * strictly between the anchors; inclusive adds the end date itself (and its
 * weekday for the business count when it lands on a Monday-Friday).
 */
export function computeDateDifference(
  start: CalendarDate,
  end: CalendarDate,
  mode: DayCountMode,
): DateDifference {
  const forward =
    toUtcAnchors(end) >= toUtcAnchors(start) ? { from: start, to: end } : { from: end, to: start }

  let totalDays = diffInDays(forward.from, forward.to)
  if (mode === "inclusive") totalDays += 1

  const business =
    mode === "exclusive"
      ? businessDaysBetween(forward.from, totalDays)
      : totalDays > 0
        ? businessDaysBetween(forward.from, totalDays - 1) +
          (weekdayOf(forward.to) >= 1 && weekdayOf(forward.to) <= 5 ? 1 : 0)
        : 0

  const { months, days } = monthsAndDaysBetween(forward.from, forward.to)
  const weeks = Math.floor(totalDays / 7)
  return {
    totalDays,
    weeks,
    remainderDays: totalDays % 7,
    months,
    remainderOfMonths: days,
    businessDays: business,
  }
}
