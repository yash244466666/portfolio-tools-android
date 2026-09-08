import { describe, expect, it } from "vitest"
import { convertTimeZone, ianaZones, offsetMinutes, wallTimeInZone } from "./time-zones"

describe("zone data", () => {
  it("curates a fixed offline list of about 40 unique IANA zones", () => {
    expect(ianaZones.length).toBeGreaterThanOrEqual(40)
    expect(ianaZones.length).toBeLessThan(60)
    expect(new Set(ianaZones.map((zone) => zone.id)).size).toBe(ianaZones.length)
    // The two hubs used in tests must always be present.
    expect(ianaZones.some((zone) => zone.id === "UTC")).toBe(true)
    expect(ianaZones.some((zone) => zone.id === "America/New_York")).toBe(true)
    expect(ianaZones.some((zone) => zone.id === "Asia/Dhaka")).toBe(true)
  })
})

describe("wallTimeInZone and offsetMinutes", () => {
  it("reads fixed offsets for UTC", () => {
    // 2026-09-08T12:00:00Z.
    expect(wallTimeInZone(Date.UTC(2026, 8, 8, 12, 0), "UTC")).toEqual({
      year: 2026,
      month: 9,
      day: 8,
      hour: 12,
      minute: 0,
    })
    expect(offsetMinutes(Date.UTC(2026, 8, 8, 12, 0), "UTC")).toBe(0)
  })

  it("reads known offsets for New York in and out of DST", () => {
    const summer = Date.UTC(2026, 7, 15, 16, 0) // 12:00 EDT = 16:00Z
    expect(offsetMinutes(summer, "America/New_York")).toBe(-240)
    const winter = Date.UTC(2026, 0, 15, 17, 0) // 12:00 EST = 17:00Z
    expect(offsetMinutes(winter, "America/New_York")).toBe(-300)
  })

  it("returns null for unknown zone ids", () => {
    expect(wallTimeInZone(0, "Mars/Olympus_Mons")).toBeNull()
    expect(offsetMinutes(0, "Mars/Olympus_Mons")).toBeNull()
  })
})

describe("convertTimeZone", () => {
  it("converts a winter instant across zones with known offsets", () => {
    const result = convertTimeZone(
      { year: 2026, month: 1, day: 15, hour: 12, minute: 0 },
      "America/New_York",
      "Asia/Dhaka",
    )
    // 12:00 EST (UTC-5) = 17:00 UTC = 23:00 +06.
    expect(result.status).toBe("ok")
    if (result.status === "ok") {
      expect(result.formatted).toBe("2026-01-15 23:00")
    }
  })

  it("converts a summer instant across zones with known offsets", () => {
    const result = convertTimeZone(
      { year: 2026, month: 7, day: 15, hour: 12, minute: 0 },
      "America/New_York",
      "UTC",
    )
    // 12:00 EDT (UTC-4) = 16:00 UTC.
    expect(result.status).toBe("ok")
    if (result.status === "ok") expect(result.formatted).toBe("2026-07-15 16:00")
  })

  it("keeps no-DST zones fixed year-round", () => {
    for (const month of [1, 7]) {
      const result = convertTimeZone(
        { year: 2026, month, day: 15, hour: 12, minute: 0 },
        "Asia/Dhaka",
        "UTC",
      )
      expect(result.status).toBe("ok")
      if (result.status === "ok") expect(result.formatted.endsWith("06:00")).toBe(true)
    }
  })

  it("surfaces a spring-forward gap as a skipped status", () => {
    // 2026-03-08 02:30 does not exist in America/New_York (2:00 -> 3:00).
    const result = convertTimeZone(
      { year: 2026, month: 3, day: 8, hour: 2, minute: 30 },
      "America/New_York",
      "UTC",
    )
    expect(result.status).toBe("skipped")
    if (result.status === "skipped") {
      expect(result.note).toMatch(/does not exist/)
      expect(result.actualFromWall).not.toBe("2026-03-08 02:30")
    }
  })

  it("surfaces a fall-back overlap as an ambiguous status", () => {
    // 2026-11-01 01:30 happens twice in America/New_York.
    const result = convertTimeZone(
      { year: 2026, month: 11, day: 1, hour: 1, minute: 30 },
      "America/New_York",
      "UTC",
    )
    expect(result.status).toBe("ambiguous")
    if (result.status === "ambiguous") {
      expect(result.note).toMatch(/happens twice/)
    }
  })

  it("rejects malformed components and unknown zones", () => {
    expect(
      convertTimeZone({ year: 2026, month: 13, day: 1, hour: 0, minute: 0 }, "UTC", "UTC").status,
    ).toBe("error")
    expect(
      convertTimeZone({ year: 2026, month: 1, day: 1, hour: 25, minute: 0 }, "UTC", "UTC").status,
    ).toBe("error")
    expect(
      convertTimeZone({ year: 2026, month: 1, day: 1, hour: 0, minute: 60 }, "UTC", "UTC").status,
    ).toBe("error")
    expect(
      convertTimeZone({ year: 2026, month: 1, day: 1, hour: 0, minute: 0 }, "Mars/Olympus", "UTC")
        .status,
    ).toBe("error")
  })
})
