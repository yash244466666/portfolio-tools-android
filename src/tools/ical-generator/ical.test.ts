import { describe, expect, it } from "vitest"
import {
  buildIcsCalendar,
  escapeIcsText,
  formatIcsDate,
  formatIcsStamp,
  icsUidFromUuid,
} from "./ical"

const baseInput = {
  title: "Team sync",
  startDate: "2026-09-10",
  startTime: "09:00",
  endDate: "2026-09-10",
  endTime: "10:00",
  location: "",
  description: "",
  url: "",
  allDay: false,
}

describe("escapeIcsText", () => {
  it("escapes backslash, semicolon, comma, and newlines", () => {
    expect(escapeIcsText("a\\b;c,d")).toBe("a\\\\b\\;c\\,d")
    expect(escapeIcsText("line1\nline2")).toBe("line1\\nline2")
  })
})

describe("formatIcsDate", () => {
  it("formats all-day dates without parsing through Date", () => {
    expect(formatIcsDate("2026-09-10", "", true)).toBe("20260910")
  })

  it("formats timed date-times with a zero seconds field", () => {
    expect(formatIcsDate("2026-09-10", "09:30", false)).toBe("20260910T093000")
  })

  it("rejects malformed dates and times", () => {
    expect(formatIcsDate("09/10/2026", "09:00", true)).toBe("")
    expect(formatIcsDate("2026-09-10", "9am", false)).toBe("")
  })
})

describe("formatIcsStamp and icsUidFromUuid", () => {
  it("formats a UTC DTSTAMP", () => {
    expect(formatIcsStamp(new Date("2026-09-08T01:02:03Z"))).toBe("20260908T010203Z")
  })

  it("strips UUID separators", () => {
    expect(icsUidFromUuid("a1b2c3d4-e5f6-7890-abcd-ef0123456789")).toBe(
      "a1b2c3d4e5f67890abcdef0123456789",
    )
  })
})

describe("buildIcsCalendar", () => {
  const clock = { uid: "abcd1234", now: "20260908T010203Z" }

  it("builds a CRLF-terminated VCALENDAR with the required properties", () => {
    const result = buildIcsCalendar(baseInput, clock)
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.calendar.split("\r\n")).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Yash Tools//EN",
      "BEGIN:VEVENT",
      "UID:abcd1234",
      "DTSTAMP:20260908T010203Z",
      "DTSTART:20260910T090000",
      "DTEND:20260910T100000",
      "SUMMARY:Team sync",
      "END:VEVENT",
      "END:VCALENDAR",
    ])
  })

  it("marks all-day events with VALUE=DATE and skips time fields", () => {
    const result = buildIcsCalendar(
      { ...baseInput, allDay: true, startDate: "2026-09-10", endDate: "2026-09-11" },
      clock,
    )
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.calendar).toContain("DTSTART;VALUE=DATE:20260910")
    expect(result.calendar).toContain("DTEND;VALUE=DATE:20260911")
  })

  it("includes optional properties and escapes their text", () => {
    const result = buildIcsCalendar(
      {
        ...baseInput,
        title: "Sync, part 2",
        location: "Room B; floor 1",
        description: "Bring\nnotes",
      },
      clock,
    )
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.calendar).toContain("SUMMARY:Sync\\, part 2")
    expect(result.calendar).toContain("LOCATION:Room B\\; floor 1")
    expect(result.calendar).toContain("DESCRIPTION:Bring\\nnotes")
  })

  it("accepts only https URLs", () => {
    const https = buildIcsCalendar({ ...baseInput, url: "https://example.com/meeting" }, clock)
    expect(https.status).toBe("ok")
    const http = buildIcsCalendar({ ...baseInput, url: "http://example.com/meeting" }, clock)
    expect(http).toEqual({ status: "error", message: "Enter an https URL for the event link." })
  })

  it("reports specific errors for missing title and dates", () => {
    expect(buildIcsCalendar({ ...baseInput, title: "  " }, clock).status).toBe("error")
    const noDate = buildIcsCalendar({ ...baseInput, startDate: "" }, clock)
    expect(noDate).toEqual({
      status: "error",
      message: "Enter a start date and a start time in HH:mm form.",
    })
  })
})