/**
 * Pure date arithmetic for the Date Calculator.
 *
 * Dates are validated real calendar dates and converted to a proleptic
 * Gregorian day number (Howard Hinnant's civil-date algorithms), so adding
 * days is exact without timezone or DST drift and years below 100 are not
 * remapped by `Date.UTC`. Month and year steps clamp the day to the target
 * month's length (Jan 31 + 1 month = Feb 28/29). Business-day steps count
 * Monday–Friday only and ignore public holidays; the UI says so.
 *
 * Original work for this repository; no upstream code is copied.
 */

export interface CalendarDate {
  year: number
  month: number
  day: number
}

export type DateOperation = "add" | "subtract"
export type DateUnit = "days" | "weeks" | "months" | "years" | "business-days"

export const maximumDateAmount = 100_000
export const minimumYear = 1
export const maximumYear = 9999

export const dateUnits: ReadonlyArray<{ id: DateUnit; label: string }> = [
  { id: "days", label: "Days" },
  { id: "weeks", label: "Weeks" },
  { id: "months", label: "Months" },
  { id: "years", label: "Years" },
  { id: "business-days", label: "Business days" },
]

const weekdayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

/** Leap-year-aware month length. */
export function daysInMonth(year: number, month: number): number {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return lengths[month - 1] ?? 0
}

/** Strict `YYYY-MM-DD` parse with a real-calendar check and a 1–9999 year range. */
export function parseDateInput(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value.trim())
  if (match === null) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < minimumYear || year > maximumYear) return null
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

export function formatIsoDate(date: CalendarDate): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, "0")
  return `${pad(date.year, 4)}-${pad(date.month)}-${pad(date.day)}`
}

/** Days since 1970-01-01 in the proleptic Gregorian calendar. */
function daysFromCivil(date: CalendarDate): number {
  const month = date.month
  const adjustedYear = date.year - (month <= 2 ? 1 : 0)
  const era = Math.floor(adjustedYear / 400)
  const yearOfEra = adjustedYear - era * 400
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + date.day - 1
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear
  return era * 146097 + dayOfEra - 719468
}

/** Inverse of `daysFromCivil`. */
function civilFromDays(dayNumber: number): CalendarDate {
  const z = dayNumber + 719468
  const era = Math.floor(z / 146097)
  const dayOfEra = z - era * 146097
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  )
  const year = yearOfEra + era * 400
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100))
  const mp = Math.floor((5 * dayOfYear + 2) / 153)
  const day = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1
  const month = mp + (mp < 10 ? 3 : -9)
  return { year: year + (month <= 2 ? 1 : 0), month, day }
}

function inSupportedRange(date: CalendarDate): boolean {
  return date.year >= minimumYear && date.year <= maximumYear
}

/** Adds whole calendar days; returns null outside years 1–9999. */
export function addDays(date: CalendarDate, days: number): CalendarDate | null {
  if (!Number.isSafeInteger(days)) return null
  const result = civilFromDays(daysFromCivil(date) + days)
  return inSupportedRange(result) ? result : null
}

/** Adds whole months, clamping the day to the target month's length. */
export function addMonthsClamped(date: CalendarDate, months: number): CalendarDate | null {
  if (!Number.isSafeInteger(months)) return null
  const total = date.year * 12 + (date.month - 1) + months
  const year = Math.floor(total / 12)
  const month = (((total % 12) + 12) % 12) + 1
  const day = Math.min(date.day, daysInMonth(year, month))
  const result = { year, month, day }
  return inSupportedRange(result) ? result : null
}

/** 0 = Sunday … 6 = Saturday, independent of host timezone. */
export function weekdayIndex(date: CalendarDate): number {
  return (((daysFromCivil(date) + 4) % 7) + 7) % 7
}

export function weekdayLabel(date: CalendarDate): string {
  return weekdayLabels[weekdayIndex(date)] ?? ""
}

/** Adds or subtracts weekdays (Monday–Friday); holidays are not considered. */
export function addBusinessDays(
  date: CalendarDate,
  amount: number,
  direction: 1 | -1,
): CalendarDate | null {
  if (!Number.isSafeInteger(amount) || amount < 0) return null
  let current = date
  let remaining = amount
  while (remaining > 0) {
    const next = addDays(current, direction)
    if (next === null) return null
    current = next
    const weekday = weekdayIndex(current)
    if (weekday >= 1 && weekday <= 5) remaining -= 1
  }
  return current
}

export interface DateCalculation {
  start: CalendarDate
  result: CalendarDate
  iso: string
  weekday: string
  /** Signed calendar-day movement from the start date. */
  totalDays: number
  operation: DateOperation
  unit: DateUnit
  amount: number
}

export type DateCalculationResult =
  { status: "ok"; calculation: DateCalculation } | { status: "error"; message: string }

export function parseAmount(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/u.test(trimmed)) return null
  const amount = Number(trimmed)
  if (!Number.isSafeInteger(amount) || amount > maximumDateAmount) return null
  return amount
}

/**
 * Applies one operation and unit to a start date. Zero amount returns the start
 * date unchanged, including when it falls on a weekend.
 */
export function calculateDate(input: {
  start: string
  operation: DateOperation
  amount: string
  unit: DateUnit
}): DateCalculationResult {
  const start = parseDateInput(input.start)
  if (start === null) {
    return { status: "error", message: "Enter a real start date as YYYY-MM-DD." }
  }
  const amount = parseAmount(input.amount)
  if (amount === null) {
    return {
      status: "error",
      message: `Enter a whole number between 0 and ${maximumDateAmount.toLocaleString("en-US")}.`,
    }
  }
  const direction = input.operation === "add" ? 1 : -1
  let result: CalendarDate | null = null
  switch (input.unit) {
    case "days":
      result = addDays(start, direction * amount)
      break
    case "weeks":
      result = addDays(start, direction * amount * 7)
      break
    case "months":
      result = addMonthsClamped(start, direction * amount)
      break
    case "years":
      result = addMonthsClamped(start, direction * amount * 12)
      break
    case "business-days":
      result = addBusinessDays(start, amount, direction)
      break
  }
  if (result === null) {
    return {
      status: "error",
      message: "The result is outside the supported years 1–9999.",
    }
  }
  return {
    status: "ok",
    calculation: {
      start,
      result,
      iso: formatIsoDate(result),
      weekday: weekdayLabel(result),
      totalDays: daysFromCivil(result) - daysFromCivil(start),
      operation: input.operation,
      unit: input.unit,
      amount,
    },
  }
}

/** Today in the device's local calendar, for the "Use today" action. */
export function todayCalendarDate(now: Date): CalendarDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
}
