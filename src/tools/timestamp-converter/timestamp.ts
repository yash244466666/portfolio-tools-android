export type TimestampUnit = "seconds" | "milliseconds"

export interface TimestampDetails {
  unixSeconds: number
  unixMilliseconds: number
  iso: string
  utc: string
  local: string
}

export function parseTimestamp(input: string, unit: TimestampUnit): TimestampDetails | null {
  const trimmed = input.trim()
  if (!/^-?\d+$/.test(trimmed)) return null

  const raw = Number(trimmed)
  if (!Number.isSafeInteger(raw)) return null
  const milliseconds = unit === "seconds" ? raw * 1000 : raw
  const date = new Date(milliseconds)
  if (Number.isNaN(date.getTime())) return null

  return {
    unixSeconds: Math.floor(milliseconds / 1000),
    unixMilliseconds: milliseconds,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString(),
  }
}

export function dateTimeLocalToTimestamp(input: string): TimestampDetails | null {
  const date = new Date(input)
  if (!input || Number.isNaN(date.getTime())) return null
  return parseTimestamp(String(date.getTime()), "milliseconds")
}
