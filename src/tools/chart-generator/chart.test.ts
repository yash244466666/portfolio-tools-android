import { describe, expect, it } from "vitest"
import {
  buildChartSummary,
  formatChartSummaryLine,
  maximumDataPoints,
  nextPointLabel,
  nextDemoValue,
  parseChartValue,
} from "./chart"

describe("parseChartValue", () => {
  it("parses bounded non-negative numbers", () => {
    expect(parseChartValue("42")).toBe(42)
    expect(parseChartValue(" 0 ")).toBe(0)
    expect(parseChartValue("2e3")).toBe(2000)
  })

  it("rejects garbage and negatives", () => {
    expect(parseChartValue("")).toBeNull()
    expect(parseChartValue("abc")).toBeNull()
    expect(parseChartValue("-1")).toBeNull()
    expect(parseChartValue("NaN")).toBeNull()
    expect(parseChartValue("Infinity")).toBeNull()
  })

  it("caps extreme values at the documented maximum", () => {
    expect(parseChartValue("99999999")).toBe(1_000_000)
  })
})

describe("point generation", () => {
  it("derives deterministic letter labels", () => {
    expect(nextPointLabel(0)).toBe("A")
    expect(nextPointLabel(2)).toBe("C")
    expect(nextPointLabel(26)).toBe("A")
  })

  it("derives the demo value from platform bytes within [10, 100]", () => {
    expect(nextDemoValue(new Uint8Array([0]))).toBe(10)
    expect(nextDemoValue(new Uint8Array([90]))).toBe(100)
    expect(nextDemoValue(new Uint8Array([255]))).toBe(10 + (255 % 91))
  })
})

describe("buildChartSummary", () => {
  it("computes each point's rounded share of the total", () => {
    const rows = buildChartSummary([
      { label: "A", value: 30 },
      { label: "B", value: 10 },
      { label: "C", value: 60 },
    ])
    expect(rows.map((row) => row.sharePercent)).toEqual([30, 10, 60])
  })

  it("reports zero shares when every value is zero", () => {
    const rows = buildChartSummary([
      { label: "A", value: 0 },
      { label: "B", value: 0 },
    ])
    expect(rows.every((row) => row.sharePercent === 0)).toBe(true)
  })

  it("formats a single sentence for the live status", () => {
    const line = formatChartSummaryLine(
      buildChartSummary([
        { label: "A", value: 30 },
        { label: "B", value: 70 },
      ]),
      "pie",
    )
    expect(line).toBe("Pie chart with 2 data points: A: 30 (30%), B: 70 (70%).")
  })

  it("handles the empty data set", () => {
    expect(formatChartSummaryLine([], "bar")).toBe("Bar chart with no data points.")
  })
})

describe("bounds", () => {
  it("documents the point-count maximum", () => {
    expect(maximumDataPoints).toBeGreaterThanOrEqual(1)
  })
})
