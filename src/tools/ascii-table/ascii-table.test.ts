import { describe, expect, it } from "vitest"
import { asciiData } from "./ascii-data"
import {
  asciiCopyText,
  filterAsciiEntries,
  isControlCode,
  toAsciiHex,
  toAsciiOctal,
} from "./ascii-table"

describe("ASCII dataset integrity", () => {
  it("covers every code point 0–127 exactly once", () => {
    expect(asciiData.length).toBe(128)
    expect(asciiData.map((entry) => entry.dec)).toEqual(
      Array.from({ length: 128 }, (_, index) => index),
    )
  })

  it("matches independent oracle rows", () => {
    expect(asciiData[0]).toEqual({ dec: 0, char: "NUL", description: "Null" })
    expect(asciiData[65]).toEqual({ dec: 65, char: "A", description: "Uppercase A" })
    expect(asciiData[97]).toEqual({ dec: 97, char: "a", description: "Lowercase a" })
    expect(asciiData[127]).toEqual({ dec: 127, char: "DEL", description: "Delete" })
  })

  it("marks control codes and derives copy text accordingly", () => {
    for (const entry of asciiData) {
      if (entry.dec < 32 || entry.dec === 127) {
        expect(isControlCode(entry.dec)).toBe(true)
        expect(asciiCopyText(entry)).toBe(String.fromCharCode(entry.dec))
      } else {
        expect(isControlCode(entry.dec)).toBe(false)
        expect(asciiCopyText(entry)).toBe(entry.char)
      }
    }
  })
})

describe("base conversions", () => {
  it("formats hex and octal with independent vectors", () => {
    expect(toAsciiHex(0)).toBe("00")
    expect(toAsciiHex(10)).toBe("0A")
    expect(toAsciiHex(65)).toBe("41")
    expect(toAsciiHex(127)).toBe("7F")
    expect(toAsciiOctal(0)).toBe("000")
    expect(toAsciiOctal(65)).toBe("101")
    expect(toAsciiOctal(127)).toBe("177")
  })
})

describe("filterAsciiEntries", () => {
  it("returns the full dataset for an empty query", () => {
    expect(filterAsciiEntries("")).toEqual(asciiData)
  })

  it("matches decimal, hex, octal, mnemonic, and description", () => {
    expect(filterAsciiEntries("65").map((entry) => entry.dec)).toEqual([53, 65, 101, 117])
    expect(filterAsciiEntries("41").map((entry) => entry.dec)).toEqual([33, 41, 65, 97])
    expect(filterAsciiEntries("0x41").map((entry) => entry.dec)).toEqual([33, 41, 65, 97])
    expect(filterAsciiEntries("101").map((entry) => entry.dec)).toEqual([65, 101])
    expect(filterAsciiEntries("NUL").map((entry) => entry.dec)).toEqual([0])
    expect(filterAsciiEntries("line feed").map((entry) => entry.dec)).toEqual([10])
  })
})
