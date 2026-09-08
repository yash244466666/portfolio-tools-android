/**
 * Pure time-zone conversion for the Time Zone Converter, built entirely on
 * `Intl.DateTimeFormat` with an explicit `timeZone` and fixed ISO component
 * parsing — never locale-dependent `new Date(string)` parsing. Original work
 * for this repository; no upstream code is copied.
 *
 * Zone data provenance: the zone IDs come from the IANA Time Zone Database
 * (public domain); the ~40-zone curated subset is embedded as data in this
 * repository so the selects work offline with no runtime listing.
 */

export interface ZoneOption {
  id: string
  label: string
}

/**
 * Curated IANA zone subset (public-domain identifiers, curated here).
 * Grouped roughly by region for a predictable select order.
 */
export const ianaZones: readonly ZoneOption[] = [
  { id: "UTC", label: "UTC" },
  { id: "Africa/Cairo", label: "Africa/Cairo (Egypt)" },
  { id: "Africa/Johannesburg", label: "Africa/Johannesburg (South Africa)" },
  { id: "Africa/Lagos", label: "Africa/Lagos (Nigeria)" },
  { id: "America/Bogota", label: "America/Bogota (Colombia)" },
  { id: "America/Buenos_Aires", label: "America/Buenos_Aires (Argentina)" },
  { id: "America/Chicago", label: "America/Chicago (US Central)" },
  { id: "America/Denver", label: "America/Denver (US Mountain)" },
  { id: "America/Halifax", label: "America/Halifax (Canada Atlantic)" },
  { id: "America/Lima", label: "America/Lima (Peru)" },
  { id: "America/Los_Angeles", label: "America/Los_Angeles (US Pacific)" },
  { id: "America/Mexico_City", label: "America/Mexico_City (Mexico)" },
  { id: "America/New_York", label: "America/New_York (US Eastern)" },
  { id: "America/Phoenix", label: "America/Phoenix (no DST)" },
  { id: "America/Santiago", label: "America/Santiago (Chile)" },
  { id: "America/Sao_Paulo", label: "America/Sao_Paulo (Brazil)" },
  { id: "America/Toronto", label: "America/Toronto (Canada Eastern)" },
  { id: "America/Vancouver", label: "America/Vancouver (Canada Pacific)" },
  { id: "Asia/Bangkok", label: "Asia/Bangkok (Thailand)" },
  { id: "Asia/Dhaka", label: "Asia/Dhaka (Bangladesh)" },
  { id: "Asia/Dubai", label: "Asia/Dubai (UAE)" },
  { id: "Asia/Hong_Kong", label: "Asia/Hong_Kong" },
  { id: "Asia/Jakarta", label: "Asia/Jakarta (Indonesia)" },
  { id: "Asia/Jerusalem", label: "Asia/Jerusalem (Israel)" },
  { id: "Asia/Kathmandu", label: "Asia/Kathmandu (Nepal)" },
  { id: "Asia/Kolkata", label: "Asia/Kolkata (India)" },
  { id: "Asia/Manila", label: "Asia/Manila (Philippines)" },
  { id: "Asia/Seoul", label: "Asia/Seoul (South Korea)" },
  { id: "Asia/Shanghai", label: "Asia/Shanghai (China)" },
  { id: "Asia/Singapore", label: "Asia/Singapore" },
  { id: "Asia/Tehran", label: "Asia/Tehran (Iran)" },
  { id: "Asia/Tokyo", label: "Asia/Tokyo (Japan)" },
  { id: "Australia/Adelaide", label: "Australia/Adelaide (DST)" },
  { id: "Australia/Brisbane", label: "Australia/Brisbane (no DST)" },
  { id: "Australia/Melbourne", label: "Australia/Melbourne (DST)" },
  { id: "Australia/Perth", label: "Australia/Perth (no DST)" },
  { id: "Australia/Sydney", label: "Australia/Sydney (DST)" },
  { id: "Europe/Amsterdam", label: "Europe/Amsterdam (Netherlands)" },
  { id: "Europe/Berlin", label: "Europe/Berlin (Germany)" },
  { id: "Europe/Dublin", label: "Europe/Dublin (Ireland)" },
  { id: "Europe/Helsinki", label: "Europe/Helsinki (Finland)" },
  { id: "Europe/Istanbul", label: "Europe/Istanbul (Türkiye)" },
  { id: "Europe/Lisbon", label: "Europe/Lisbon (Portugal)" },
  { id: "Europe/London", label: "Europe/London (United Kingdom)" },
  { id: "Europe/Madrid", label: "Europe/Madrid (Spain)" },
  { id: "Europe/Moscow", label: "Europe/Moscow (Russia)" },
  { id: "Europe/Paris", label: "Europe/Paris (France)" },
  { id: "Europe/Warsaw", label: "Europe/Warsaw (Poland)" },
  { id: "Pacific/Auckland", label: "Pacific/Auckland (New Zealand)" },
  { id: "Pacific/Honolulu", label: "Pacific/Honolulu (Hawaii, no DST)" },
]

export interface ZoneWallTime {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export type TimeZoneConversion =
  | {
      status: "ok"
      /** The resolved absolute instant, in epoch milliseconds. */
      instantMs: number
      /** Wall time in the target zone. */
      converted: ZoneWallTime
      /** "YYYY-MM-DD HH:mm" rendering of `converted` (fixed-format parts). */
      formatted: string
    }
  | {
      status: "skipped"
      instantMs: number
      converted: ZoneWallTime
      formatted: string
      /** The wall time the input actually maps to in the from-zone. */
      actualFromWall: string
      note: string
    }
  | {
      status: "ambiguous"
      instantMs: number
      converted: ZoneWallTime
      formatted: string
      note: string
    }
  | { status: "error"; message: string }

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    partsFormatterCache.set(timeZone, formatter)
  }
  return formatter
}

/** Reads the wall-clock components a zone shows at one absolute instant. */
export function wallTimeInZone(instantMs: number, timeZone: string): ZoneWallTime | null {
  try {
    const parts = formatterFor(timeZone).formatToParts(new Date(instantMs))
    const read = (type: Intl.DateTimeFormatPartTypes): number | null => {
      const value = Number(parts.find((part) => part.type === type)?.value ?? "")
      return Number.isFinite(value) ? value : null
    }
    const year = read("year")
    const month = read("month")
    const day = read("day")
    // hourCycle h23 can still emit "24" for midnight on some platforms.
    const hourRaw = read("hour") ?? 0
    const hour = hourRaw === 24 ? 0 : hourRaw
    const minute = read("minute")
    if (year === null || month === null || day === null || minute === null) return null
    return { year, month, day, hour, minute }
  } catch {
    return null
  }
}

/** The zone's offset from UTC, in minutes, at one absolute instant. */
export function offsetMinutes(instantMs: number, timeZone: string): number | null {
  const wall = wallTimeInZone(instantMs, timeZone)
  if (!wall) return null
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute)
  return Math.round((asUtc - instantMs) / 60_000)
}

function wallToUtc(wall: ZoneWallTime): number {
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute)
}

function sameWall(left: ZoneWallTime, right: ZoneWallTime): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  )
}

function formatWall(wall: ZoneWallTime): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, "0")
  return `${pad(wall.year, 4)}-${pad(wall.month)}-${pad(wall.day)} ${pad(wall.hour)}:${pad(wall.minute)}`
}

/**
 * Converts wall-clock components in `fromZone` into the wall time shown in
 * `toZone`. DST edges are surfaced honestly:
 *
 * - a wall time that does not exist in the from-zone (spring-forward gap)
 *   resolves to a "skipped" status carrying the wall time the input actually
 *   maps back to;
 * - a wall time that happens twice (fall-back overlap) resolves to the
 *   earlier interpretation and an "ambiguous" status;
 * - an unknown zone id resolves to an "error".
 */
export function convertTimeZone(
  input: ZoneWallTime,
  fromZone: string,
  toZone: string,
): TimeZoneConversion {
  if (
    !Number.isInteger(input.month) ||
    input.month < 1 ||
    input.month > 12 ||
    !Number.isInteger(input.day) ||
    input.day < 1 ||
    input.day > 31 ||
    !Number.isInteger(input.hour) ||
    input.hour < 0 ||
    input.hour > 23 ||
    !Number.isInteger(input.minute) ||
    input.minute < 0 ||
    input.minute > 59 ||
    !Number.isInteger(input.year)
  ) {
    return { status: "error", message: "Enter a valid date and time." }
  }

  // Two-pass resolution: the zone offset at the naive instant may differ
  // from the offset at the resolved instant (DST edges), so iterate once.
  const naive = wallToUtc(input)
  let instant: number
  try {
    const firstOffset = offsetMinutes(naive, fromZone)
    if (firstOffset === null) {
      return { status: "error", message: `Unknown time zone "${fromZone}".` }
    }
    const firstGuess = naive - firstOffset * 60_000
    const secondOffset = offsetMinutes(firstGuess, fromZone) ?? firstOffset
    instant = naive - secondOffset * 60_000
  } catch {
    return { status: "error", message: `Unknown time zone "${fromZone}".` }
  }

  const converted = wallTimeInZone(instant, toZone)
  if (!converted) {
    return { status: "error", message: `Unknown time zone "${toZone}".` }
  }
  const formatted = formatWall(converted)

  // Round-trip the resolved instant back into the from-zone to detect a
  // spring-forward gap.
  const actualFrom = wallTimeInZone(instant, fromZone)
  if (!actualFrom || !sameWall(actualFrom, input)) {
    return {
      status: "skipped",
      instantMs: instant,
      converted,
      formatted,
      actualFromWall: actualFrom ? formatWall(actualFrom) : "",
      note: `That local time does not exist in ${fromZone} (daylight-saving spring-forward). It was interpreted as ${actualFrom ? formatWall(actualFrom) : "the next valid time"}.`,
    }
  }

  // Fall-back overlap: the same wall time occurs one hour earlier or later.
  const earlier = wallTimeInZone(instant - 3_600_000, fromZone)
  const later = wallTimeInZone(instant + 3_600_000, fromZone)
  if ((earlier && sameWall(earlier, input)) || (later && sameWall(later, input))) {
    return {
      status: "ambiguous",
      instantMs: instant,
      converted,
      formatted,
      note: `That local time happens twice in ${fromZone} (daylight-saving fall-back). The earlier interpretation was used.`,
    }
  }

  return { status: "ok", instantMs: instant, converted, formatted }
}
