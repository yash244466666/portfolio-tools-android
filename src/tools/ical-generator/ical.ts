/**
 * Pure RFC 5545 VEVENT generation. Times are floating local times (no TZID
 * and no `Z`), which is valid iCalendar for local-event use and avoids
 * pretending the tool manages a timezone database. Text values escape
 * backslash, semicolon, comma, and newlines — the upstream version escaped
 * only commas, so a semicolon or newline corrupted the property value.
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

/**
 * Formats a `YYYY-MM-DD` (all-day) or `YYYY-MM-DD` + `HH:mm` (timed) input as
 * an RFC 5545 date or date-time. Date-only values are parsed by components,
 * never through `new Date(string)` — that path parses as UTC midnight and
 * shifts the calendar day in timezones west of UTC.
 */
export function formatIcsDate(datePart: string, timePart: string, allDay: boolean): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart.trim())
  if (dateMatch === null) return ""
  if (allDay) {
    return `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}`
  }
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timePart.trim())
  if (timeMatch === null) return ""
  return `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}T${timeMatch[1]}${timeMatch[2]}00`
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

  const start = formatIcsDate(input.startDate, input.startTime, input.allDay)
  if (start === "") {
    return {
      status: "error",
      message: input.allDay
        ? "Enter a start date."
        : "Enter a start date and a start time in HH:mm form.",
    }
  }
  const end = formatIcsDate(input.endDate, input.endTime, input.allDay)
  if (end === "") {
    return {
      status: "error",
      message: input.allDay
        ? "Enter an end date."
        : "Enter an end date and an end time in HH:mm form.",
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
    `DTEND${input.allDay ? ";VALUE=DATE" : ""}:${end}`,
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
    lines.push(`URL:${escapeIcsText(url)}`)
  }
  lines.push("END:VEVENT", "END:VCALENDAR")
  return { status: "ok", calendar: lines.join("\r\n") }
}
