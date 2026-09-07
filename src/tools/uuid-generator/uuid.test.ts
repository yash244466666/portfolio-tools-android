import { describe, expect, it } from "vitest"
import { clampUuidCount, formatUuid, stripHyphens, uuidPattern } from "./uuid"
import { secureRandomService } from "@/platform/shared/random"

describe("uuidPattern", () => {
  it("is the RFC 4122 version-4 shape", () => {
    expect(uuidPattern.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
    expect(uuidPattern.test("550e8400-e29b-41d4-4166-446655440000")).toBe(false)
    expect(uuidPattern.test("550e8400e29b41d4a716446655440000")).toBe(false)
  })
})

describe("platform random service", () => {
  it("emits valid, unique v4 UUIDs", () => {
    const seen = new Set<string>()
    for (let index = 0; index < 200; index += 1) {
      const uuid = secureRandomService.uuid()
      expect(uuidPattern.test(uuid)).toBe(true)
      seen.add(uuid)
    }
    expect(seen.size).toBe(200)
  })
})

describe("formatUuid", () => {
  it("applies the uppercase and hyphen options", () => {
    expect(formatUuid("550e8400-e29b-41d4-a716-446655440000", false, true)).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    )
    expect(formatUuid("550e8400-e29b-41d4-a716-446655440000", true, true)).toBe(
      "550E8400-E29B-41D4-A716-446655440000",
    )
    expect(formatUuid("550e8400-e29b-41d4-a716-446655440000", false, false)).toBe(
      "550e8400e29b41d4a716446655440000",
    )
  })

  it("strips hyphens without changing the hex digits", () => {
    expect(stripHyphens("550e8400-e29b-41d4-a716-446655440000")).toHaveLength(32)
  })
})

describe("clampUuidCount", () => {
  it("clamps into the 1-100 range", () => {
    expect(clampUuidCount(0)).toBe(1)
    expect(clampUuidCount(1)).toBe(1)
    expect(clampUuidCount(100)).toBe(100)
    expect(clampUuidCount(1000)).toBe(100)
    expect(clampUuidCount(3.7)).toBe(4)
    expect(clampUuidCount(Number.NaN)).toBe(1)
  })
})
