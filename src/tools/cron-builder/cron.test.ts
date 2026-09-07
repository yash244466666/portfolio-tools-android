import { describe, expect, it } from "vitest"
import {
  cronFieldRanges,
  cronPresets,
  dayOfWeekNames,
  describeCron,
  monthNames,
  parseCronFields,
  validateCronField,
} from "./cron"

describe("upstream datasets", () => {
  it("keeps the five fields with their documented ranges", () => {
    expect(cronFieldRanges).toEqual([
      { min: 0, max: 59 },
      { min: 0, max: 23 },
      { min: 1, max: 31 },
      { min: 1, max: 12 },
      { min: 0, max: 6 },
    ])
    expect(dayOfWeekNames).toHaveLength(7)
    expect(monthNames[0]).toBe("")
    expect(monthNames).toHaveLength(13)
    expect(cronPresets).toHaveLength(8)
    for (const preset of cronPresets) {
      expect(parseCronFields(preset.value).valid).toBe(true)
    }
  })
})

describe("validateCronField", () => {
  it("accepts every supported syntax", () => {
    expect(validateCronField("*", 0)).toBe("")
    expect(validateCronField("*/15", 0)).toBe("")
    expect(validateCronField("0-30/5", 0)).toBe("")
    expect(validateCronField("0,15,30,45", 0)).toBe("")
    expect(validateCronField("9", 1)).toBe("")
    expect(validateCronField("1-5", 4)).toBe("")
    expect(validateCronField("1,3,5", 4)).toBe("")
    expect(validateCronField("12", 3)).toBe("")
    expect(validateCronField("1", 2)).toBe("")
  })

  it("rejects out-of-range values upstream accepted", () => {
    // Regression: upstream validation only checked the field count, so
    // "99 99 99 99 99" was accepted.
    expect(validateCronField("99", 0)).not.toBe("")
    expect(validateCronField("99", 1)).not.toBe("")
    expect(validateCronField("32", 2)).not.toBe("")
    expect(validateCronField("13", 3)).not.toBe("")
    expect(validateCronField("7", 4)).not.toBe("")
    expect(validateCronField("0", 2)).not.toBe("")
  })

  it("rejects malformed syntax", () => {
    expect(validateCronField("abc", 0)).not.toBe("")
    expect(validateCronField("1/", 0)).not.toBe("")
    expect(validateCronField("/5", 0)).not.toBe("")
    expect(validateCronField("*/0", 0)).not.toBe("")
    expect(validateCronField("59-5", 0)).not.toBe("")
    expect(validateCronField("1-2-3", 0)).not.toBe("")
    expect(validateCronField("1,2,,4", 0)).not.toBe("")
    expect(validateCronField("1.5", 0)).not.toBe("")
    expect(validateCronField("-3", 0)).not.toBe("")
    expect(validateCronField("", 0)).not.toBe("")
  })
})

describe("parseCronFields", () => {
  it("parses valid 5-field expressions", () => {
    const result = parseCronFields("0 9 * * 1-5")
    expect(result.valid).toBe(true)
    expect(result.fields).toEqual(["0", "9", "*", "*", "1-5"])
    expect(result.message).toBe("")
  })

  it("rejects wrong field counts", () => {
    expect(parseCronFields("* * *").valid).toBe(false)
    expect(parseCronFields("* * * * * *").valid).toBe(false)
    expect(parseCronFields("").valid).toBe(false)
    expect(parseCronFields("   ").valid).toBe(false)
  })

  it("surfaces the first invalid field message", () => {
    const result = parseCronFields("0 25 * * *")
    expect(result.valid).toBe(false)
    expect(result.message).toContain("Hour")
  })

  it("rejects oversized expressions", () => {
    expect(parseCronFields("* ".repeat(200)).valid).toBe(false)
  })
})

describe("describeCron", () => {
  it("describes every preset in plain language", () => {
    expect(describeCron(["*", "*", "*", "*", "*"])).toBe("Every minute")
    expect(describeCron(["0", "*", "*", "*", "*"])).toBe("at minute 0")
    expect(describeCron(["0", "0", "*", "*", "*"])).toBe("at 00:00")
    expect(describeCron(["0", "9", "*", "*", "1-5"])).toBe("at 09:00, on Monday through Friday")
    expect(describeCron(["0", "12", "*", "*", "0"])).toBe("at 12:00, on Sunday")
    expect(describeCron(["*/15", "*", "*", "*", "*"])).toBe("every 15 minutes")
    expect(describeCron(["0", "0", "1", "*", "*"])).toBe("at 00:00, on day 1 of the month")
    expect(describeCron(["0", "*/6", "*", "*", "*"])).toBe("every 6 hours")
  })

  it("names months and comma lists", () => {
    expect(describeCron(["0", "0", "1", "1", "*"])).toBe(
      "at 00:00, on day 1 of the month, in January",
    )
    expect(describeCron(["0", "0", "*", "*", "1,3,5"])).toBe(
      "at 00:00, on Monday, Wednesday, Friday",
    )
  })

  it("falls back to raw text for unphrasable fields instead of printing NaN", () => {
    // Regression: upstream rendered dayOfWeekNames[NaN] as "undefined".
    expect(describeCron(["5", "4", "*", "*", "*/2"])).toBe("at 04:05, on day-of-week */2")
    expect(describeCron(["*", "9-17", "*", "*", "*"])).not.toContain("undefined")
    expect(describeCron(["*", "9-17", "*", "*", "*"])).toBe("at hour 9-17")
  })
})
