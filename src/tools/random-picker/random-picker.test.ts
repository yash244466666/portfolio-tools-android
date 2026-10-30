import { describe, expect, it } from "vitest"
import {
  flipCoin,
  maximumItemChars,
  maximumItems,
  maximumListChars,
  maximumRangeSpan,
  parseIntegerInput,
  parseList,
  parseRange,
  pickFromList,
  randomBelow,
  randomInteger,
  type RandomByteSource,
} from "./random-picker"

function fixedSource(values: readonly number[]): RandomByteSource {
  let index = 0
  return {
    bytes(length) {
      const result = new Uint8Array(length)
      for (let offset = 0; offset < length; offset += 1) {
        result[offset] = values[index] ?? 0
        index += 1
      }
      return result
    },
  }
}

describe("randomBelow", () => {
  it("rejects values at or above the largest multiple of the bound", () => {
    // 256 / 3 = 85 remainder 1, so bytes 255 must be redrawn.
    expect(randomBelow(3, fixedSource([255, 2]))).toBe(2)
    // 256 / 200 = 1 remainder 56, so bytes 200..255 must be redrawn.
    expect(randomBelow(200, fixedSource([200, 199]))).toBe(199)
    expect(randomBelow(2, fixedSource([1]))).toBe(1)
    expect(randomBelow(1, fixedSource([255]))).toBe(0)
    expect(randomBelow(256, fixedSource([255]))).toBe(255)
    expect(randomBelow(65_536, fixedSource([255, 255]))).toBe(65_535)
    expect(randomBelow(4_294_967_296, fixedSource([255, 255, 255, 255]))).toBe(4_294_967_295)
  })

  it("maps the accepted single-byte range uniformly", () => {
    const counts = [0, 0, 0]
    // Values 0..254 are accepted for bound 3; each face appears 85 times.
    for (let byte = 0; byte < 255; byte += 1) {
      counts[randomBelow(3, fixedSource([byte]))]! += 1
    }
    expect(counts).toEqual([85, 85, 85])
  })

  it("rejects invalid bounds and a wrong-width byte source", () => {
    for (const bound of [0, -1, 1.5, 4_294_967_297]) {
      expect(() => randomBelow(bound, fixedSource([0]))).toThrow(RangeError)
    }
    expect(() => randomBelow(10, { bytes: () => new Uint8Array(0) })).toThrow(
      "wrong number of bytes",
    )
  })
})

describe("list picking", () => {
  it("selects the indexed item and preserves duplicates", () => {
    const items = parseList("a\nb\nb\nc")
    expect(items).toEqual({ status: "ok", items: ["a", "b", "b", "c"] })
    expect(pickFromList(["a", "b", "c"], fixedSource([1]))).toBe("b")
    expect(pickFromList(["a", "b", "c"], fixedSource([2]))).toBe("c")
    expect(() => pickFromList([], fixedSource([0]))).toThrow(RangeError)
  })

  it("checks item count, line length, and total length", () => {
    expect(parseList("only one")).toEqual({
      status: "error",
      message: "Add at least two items, one per line.",
    })
    expect(parseList(Array.from({ length: maximumItems + 1 }, () => "x").join("\n")).status).toBe(
      "error",
    )
    expect(parseList(`a\n${"x".repeat(maximumItemChars + 1)}`)).toEqual({
      status: "error",
      message: `Line 2 exceeds ${maximumItemChars} characters.`,
    })
    expect(parseList("x".repeat(maximumListChars + 1)).status).toBe("error")
    expect(parseList(" a \n\n b\n")).toEqual({ status: "ok", items: ["a", "b"] })
  })
})

describe("coin and integer ranges", () => {
  it("maps two faces uniformly and rejects bad coins", () => {
    expect(flipCoin(fixedSource([0]))).toBe("Heads")
    expect(flipCoin(fixedSource([1]))).toBe("Tails")
  })

  it("parses and validates inclusive integer ranges", () => {
    expect(parseRange("1", "10")).toEqual({ status: "ok", minimum: 1, maximum: 10 })
    expect(parseRange("-5", "5")).toEqual({ status: "ok", minimum: -5, maximum: 5 })
    expect(parseRange("9", "1").status).toBe("error")
    expect(parseRange("1.5", "3").status).toBe("error")
    expect(parseRange("0", String(maximumRangeSpan + 1)).status).toBe("error")
    expect(parseRange("0", String(maximumRangeSpan)).status).toBe("ok")
  })

  it("returns inclusive endpoints and validates bounds", () => {
    expect(randomInteger(5, 5, fixedSource([255]))).toBe(5)
    expect(randomInteger(-2, 2, fixedSource([0]))).toBe(-2)
    expect(randomInteger(-2, 2, fixedSource([4]))).toBe(2)
    expect(() => randomInteger(2, 1, fixedSource([0]))).toThrow(RangeError)
  })

  it("parses safe integer input only", () => {
    expect(parseIntegerInput(" 42 ")).toBe(42)
    expect(parseIntegerInput("-7")).toBe(-7)
    expect(parseIntegerInput("1.5")).toBeNull()
    expect(parseIntegerInput("1e3")).toBeNull()
    expect(parseIntegerInput("9007199254740992")).toBeNull()
  })
})
