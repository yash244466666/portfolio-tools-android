/**
 * Age calculation on the proleptic Gregorian calendar.
 *
 * Divergence from upstream: the portfolio tool parsed a "YYYY-MM-DD" input
 * with `new Date(birthDate)`, which JavaScript reads as UTC midnight. On
 * devices west of UTC the birth day-of-month could shift by one day before
 * the age arithmetic ran. The input is decomposed into year, month, and day
 * here and reconstructed as a local calendar date instead, so the day counts
 * always reflect the entered civil date.
 *
 * Upstream parity kept: the years/months/days borrow arithmetic, the
 * wall-clock millisecond totals, the next-birthday roll-forward, and the
 * `Math.ceil` rounding of days until the next birthday. Wall-clock totals
 * count DST transitions as missing or repeated hours, so "total days" is
 * exact only across intervals without clock changes.
 */

export interface ParsedDate {
  year: number
  /** 1-based month. */
  month: number
  day: number
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

/**
 * Strict ISO date parsing. The native date input provides "YYYY-MM-DD", but
 * the same string is also validated for accessibility labels and tests, so
 * impossible civil dates (2026-02-30) and malformed text are rejected instead
 * of being silently normalized.
 */
export function parseIsoDate(input: string): ParsedDate | null {
  if (!isoDatePattern.test(input)) return null
  const year = Number(input.slice(0, 4))
  const month = Number(input.slice(5, 7))
  const day = Number(input.slice(8, 10))
  const probe = new Date(year, month - 1, day)
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    return null
  }
  return { year, month, day }
}

export interface AgeResult {
  years: number
  months: number
  days: number
  totalDays: number
  totalHours: number
  totalMinutes: number
  daysUntilBirthday: number
  /** Age the person reaches on the next birthday. */
  nextBirthdayAge: number
  nextBirthdayIso: string
}

/**
 * Computes the calendar age at `now` for a birth date string, or null when
 * the input is not a valid civil date or lies in the future.
 */
export function computeAge(birthDate: string, now: Date): AgeResult | null {
  const parsed = parseIsoDate(birthDate)
  if (!parsed) return null
  const birth = new Date(parsed.year, parsed.month - 1, parsed.day)
  if (birth.getTime() > now.getTime()) return null

  // Calendar age: borrow days from the length of the month before the
  // current month, then borrow twelve months from the year.
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  let days = now.getDate() - birth.getDate()
  if (days < 0) {
    months--
    const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    days += previousMonth.getDate()
  }
  if (months < 0) {
    years--
    months += 12
  }

  const diffMs = now.getTime() - birth.getTime()
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
  const totalMinutes = Math.floor(diffMs / (1000 * 60))

  // Upstream parity: a February 29 birthday rolls to March 1 in common years
  // because Date normalizes the overflow day.
  let nextBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate())
  if (nextBirthday.getTime() <= now.getTime()) {
    nextBirthday = new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate())
  }
  const daysUntilBirthday = Math.ceil(
    (nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  )

  return {
    years,
    months,
    days,
    totalDays,
    totalHours,
    totalMinutes,
    daysUntilBirthday,
    nextBirthdayAge: nextBirthday.getFullYear() - birth.getFullYear(),
    nextBirthdayIso: `${nextBirthday.getFullYear()}-${String(nextBirthday.getMonth() + 1).padStart(2, "0")}-${String(nextBirthday.getDate()).padStart(2, "0")}`,
  }
}

/**
 * Today's date as the same "YYYY-MM-DD" string the date input produces, in
 * local time, so the input's maximum cannot select a future date.
 */
export function todayIso(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}
