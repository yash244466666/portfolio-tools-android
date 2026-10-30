/**
 * Pure RFC 5545 VEVENT generation. Times are floating local times (no TZID
 * and no `Z`), which is valid iCalendar for local-event use and avoids
 * pretending the tool manages a timezone database. Text values escape
 * backslash, semicolon, comma, and newlines — the upstream version escaped
 * only commas, so a semicolon or newline corrupted the property value.
 *
 * Dates are validated as real calendar dates and events must end after they
 * start. The form's all-day end date is inclusive (a one-day event uses the
 * same date twice), while the emitted `DTEND;VALUE=DATE` is the exclusive
 * following day that RFC 5545 requires.
 */

export interface IcsEventInput {
  title: string
  startDate: string
  /** `HH:mm`; ignored for all-day events. */
  startTime: string
  endDate: string
  /** `HH:mm`; ignored for all-day events. */
  endTime: string
  location: string
  description: string
  url: string
  allDay: boolean
}

export interface IcsClock {
  /** RFC 5545 UID for the VEVENT (already globally unique). */
  uid: string
  /** Formatted DTSTAMP for "now". */
  now: string
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n")
    .replace(/\r|\n/g, "\\n")
}

export interface IcsDateParts {
  year: number
  month: number
  day: number
}

function daysInMonth(year: number, month: number): number {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return lengths[month - 1] ?? 0
}

/**
 * Parses and validates a real calendar date. Components only, never
 * `new Date(string)` — that path parses as UTC midnight and shifts the
 * calendar day in timezones west of UTC. A non-existent date such as
 * 2026-02-30 is rejected instead of being emitted into the calendar.
 */
export function parseIcsDate(datePart: string): IcsDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart.trim())
  if (match === null) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

function formatDateParts(date: IcsDateParts): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, "0")
  return `${pad(date.year, 4)}${pad(date.month)}${pad(date.day)}`
}

function addOneDay(date: IcsDateParts): IcsDateParts | null {
  let { year, month, day } = date
  day += 1
  if (day > daysInMonth(year, month)) {
    day = 1
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return year > 9999 ? null : { year, month, day }
}

/**
 * Formats a `YYYY-MM-DD` (all-day) or `YYYY-MM-DD` + `HH:mm` (timed) input as
 * an RFC 5545 date or date-time. The date must exist in the calendar.
 */
export function formatIcsDate(datePart: string, timePart: string, allDay: boolean): string {
  const date = parseIcsDate(datePart)
  if (date === null) return ""
  if (allDay) return formatDateParts(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timePart.trim())
  if (timeMatch === null) return ""
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (hour > 23 || minute > 59) return ""
  return `${formatDateParts(date)}T${timeMatch[1]}${timeMatch[2]}00`
}

/** UTC timestamp in RFC 5545 form for DTSTAMP. */
export function formatIcsStamp(date: Date): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, "0")
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/** Strips separators from a RandomService UUID for a compact unique UID. */
export function icsUidFromUuid(uuid: string): string {
  return uuid.replace(/-/g, "")
}

export type IcsResult = { status: "ok"; calendar: string } | { status: "error"; message: string }

export function buildIcsCalendar(input: IcsEventInput, clock: IcsClock): IcsResult {
  const title = input.title.trim()
  if (title === "") return { status: "error", message: "Enter an event title." }

  const startDate = parseIcsDate(input.startDate)
  const start = formatIcsDate(input.startDate, input.startTime, input.allDay)
  if (start === "" || startDate === null) {
    return {
      status: "error",
      message: input.allDay
        ? "Enter a real start date."
        : "Enter a real start date and a start time in HH:mm form.",
    }
  }
  const endDate = parseIcsDate(input.endDate)
  const end = formatIcsDate(input.endDate, input.endTime, input.allDay)
  if (end === "" || endDate === null) {
    return {
      status: "error",
      message: input.allDay
        ? "Enter a real end date."
        : "Enter a real end date and an end time in HH:mm form.",
    }
  }

  let exclusiveEnd = end
  if (input.allDay) {
    // The form treats the end date as inclusive; RFC 5545's DTEND for a DATE
    // value is exclusive, so a one-day event starts and ends on the same form
    // date and is stored with the following day as DTEND.
    if (end < start) {
      return { status: "error", message: "The end date cannot be before the start date." }
    }
    const nextDay = addOneDay(endDate)
    if (nextDay === null) {
      return { status: "error", message: "The end date is out of range." }
    }
    exclusiveEnd = formatDateParts(nextDay)
  } else if (end <= start) {
    return {
      status: "error",
      message: "The end date and time must be after the start date and time.",
    }
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Yash Tools//EN",
    "BEGIN:VEVENT",
    `UID:${clock.uid}`,
    `DTSTAMP:${clock.now}`,
    `DTSTART${input.allDay ? ";VALUE=DATE" : ""}:${start}`,
    `DTEND${input.allDay ? ";VALUE=DATE" : ""}:${exclusiveEnd}`,
    `SUMMARY:${escapeIcsText(title)}`,
  ]
  const location = input.location.trim()
  if (location !== "") lines.push(`LOCATION:${escapeIcsText(location)}`)
  const description = input.description.trim()
  if (description !== "") lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
  const url = input.url.trim()
  if (url !== "") {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return { status: "error", message: "Enter an https URL for the event link." }
    }
    if (parsed.protocol !== "https:") {
      return { status: "error", message: "Enter an https URL for the event link." }
    }
    // URL is a URI value, not TEXT: RFC 5545 does not apply the backslash
    // escaping to it, and escaping commas/semicolons corrupts legal URIs.
    lines.push(`URL:${parsed.href}`)
  }
  lines.push("END:VEVENT", "END:VCALENDAR")
  // RFC 5545's icalobject grammar terminates the object with CRLF.
  return { status: "ok", calendar: `${lines.join("\r\n")}\r\n` }
}
