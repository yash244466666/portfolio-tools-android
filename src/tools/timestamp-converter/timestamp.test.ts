import { dateTimeLocalToTimestamp, parseTimestamp } from "@/tools/timestamp-converter/timestamp"

describe("timestamp conversion", () => {
  it("parses Unix seconds without guessing the unit", () => {
    const result = parseTimestamp("0", "seconds")
    expect(result?.iso).toBe("1970-01-01T00:00:00.000Z")
    expect(result?.unixMilliseconds).toBe(0)
  })

  it("parses milliseconds explicitly", () => {
    expect(parseTimestamp("1000", "milliseconds")?.unixSeconds).toBe(1)
  })

  it("rejects decimals, unsafe integers, and non-date values", () => {
    expect(parseTimestamp("1.5", "seconds")).toBeNull()
    expect(parseTimestamp("not-a-date", "seconds")).toBeNull()
    expect(parseTimestamp("999999999999999999999", "milliseconds")).toBeNull()
  })

  it("converts a local date through the platform time zone", () => {
    const result = dateTimeLocalToTimestamp("2024-01-01T00:00")
    expect(result?.unixMilliseconds).toBe(new Date("2024-01-01T00:00").getTime())
  })
})
