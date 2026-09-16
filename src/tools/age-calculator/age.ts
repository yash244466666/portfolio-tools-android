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
 * A second divergence: the upstream borrow arithmetic
 * (`days += length of the month before the current month`) borrowed a single
 * month's length and never re-checked, so a birth on the 30th or 31st
 * evaluated in the first days of a shorter month returned a negative day
 * count — Jan 31 checked on Mar 1 rendered "36 years 1 month -2 days". The
 * anniversary is now advanced by whole months with the day clamped to the
 * target month's length, and the leftover days are counted between civil
 * dates, so the day count can never be negative and cannot move with a clock
 * change.
 *
 * Upstream parity kept: the wall-clock millisecond totals, the next-birthday
 * roll-forward, and the `Math.ceil` rounding of days until the next birthday.
 * Wall-clock totals count DST transitions as missing or repeated hours, so
 * "total days" is exact only across intervals without clock changes.
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

  // Calendar age: step the birth date forward by whole months, clamping the
  // day to the target month's length so a Jan 31 birthday has a Feb 28
  // anniversary in common years, and stop at the last anniversary that is not
  // in the future. Whole months then decompose into years and months, and the
  // leftover days are counted between civil dates rather than between instants
  // so neither a short month nor a clock change can skew them.
  const daysInMonth = (year: number, monthIndex: number) =>
    new Date(year, monthIndex + 1, 0).getDate()
  const anniversary = (totalMonths: number) => {
    const monthIndex = birth.getMonth() + totalMonths
    const year = birth.getFullYear() + Math.floor(monthIndex / 12)
    const month = ((monthIndex % 12) + 12) % 12
    return new Date(year, month, Math.min(birth.getDate(), daysInMonth(year, month)))
  }
  const civilDays = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())

  let totalMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  let anchor = anniversary(totalMonths)
  // Terminates at totalMonths = 0, whose anniversary is the birth date itself,
  // which is never in the future because future inputs are rejected above.
  while (anchor.getTime() > now.getTime()) {
    totalMonths -= 1
    anchor = anniversary(totalMonths)
  }
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  const days = Math.round((civilDays(now) - civilDays(anchor)) / (1000 * 60 * 60 * 24))

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
