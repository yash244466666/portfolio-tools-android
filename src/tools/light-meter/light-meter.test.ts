import { describe, expect, it } from "vitest"
import { formatLux, lightLevel } from "./light-meter"

describe("lightLevel", () => {
  it("labels each documented band", () => {
    expect(lightLevel(0)?.label).toBe("Very dark")
    expect(lightLevel(9.9)?.label).toBe("Very dark")
    expect(lightLevel(10)?.label).toBe("Dim")
    expect(lightLevel(50)?.label).toBe("Indoor")
    expect(lightLevel(200)?.label).toBe("Bright indoor")
    expect(lightLevel(1000)?.label).toBe("Overcast")
    expect(lightLevel(10_000)?.label).toBe("Daylight")
  })

  it("rejects invalid values", () => {
    expect(lightLevel(-1)).toBeNull()
    expect(lightLevel(Number.NaN)).toBeNull()
  })
})

describe("formatLux", () => {
  it("formats small and large values", () => {
    expect(formatLux(0.54)).toBe("0.5 lx")
    expect(formatLux(42)).toBe("42 lx")
    expect(formatLux(12345)).toBe("12,345 lx")
    expect(formatLux(-2)).toBe("")
  })
})
