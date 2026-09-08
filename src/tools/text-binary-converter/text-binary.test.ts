import { describe, expect, it } from "vitest"
import {
  baseFor,
  byteDelimiters,
  decodeText,
  encodeText,
  maximumTextCharacters,
  numberBases,
} from "./text-binary"

describe("encodeText / decodeText round trips", () => {
  const vectors: Array<{ label: string; text: string }> = [
    { label: "ascii", text: "Hello, World!" },
    { label: "two-byte accented", text: "café naïve" },
    { label: "three-byte cjk", text: "東京タワー" },
    { label: "four-byte emoji", text: "hi 👋🏽 done" },
    { label: "mixed multibyte", text: "Aé☃𐍈" },
    { label: "whitespace-heavy", text: "  lines\tand\ntabs  " },
  ]

  for (const base of numberBases) {
    for (const delimiter of byteDelimiters) {
      for (const vector of vectors) {
        it(`round-trips the ${vector.label} vector in ${base} with ${delimiter} delimiters`, () => {
          const encoded = encodeText(vector.text, base, delimiter)
          const decoded = decodeText(encoded, base, delimiter)
          expect(decoded).toEqual({
            status: "ok",
            text: vector.text,
            byteCount: new TextEncoder().encode(vector.text).length,
          })
        })
      }
    }
  }

  it("knows known UTF-8 byte values", () => {
    // "é" is 0xC3 0xA9 in UTF-8.
    expect(encodeText("é", "decimal", "space")).toBe("195 169")
    expect(encodeText("é", "binary", "space")).toBe("11000011 10101001")
    expect(encodeText("é", "octal", "space")).toBe("303 251")
    // "€" is 0xE2 0x82 0xAC.
    expect(encodeText("€", "decimal", "space")).toBe("226 130 172")
  })

  it("decodes known byte vectors back to text", () => {
    expect(decodeText("195 169", "decimal", "space")).toEqual({
      status: "ok",
      text: "é",
      byteCount: 2,
    })
    expect(decodeText("11000011 10101001", "binary", "space")).toEqual({
      status: "ok",
      text: "é",
      byteCount: 2,
    })
    expect(decodeText("226130172", "decimal", "none")).toEqual({
      status: "ok",
      text: "€",
      byteCount: 3,
    })
  })

  it("encodes empty text to an empty string and back", () => {
    expect(encodeText("", "binary", "space")).toBe("")
    const decoded = decodeText("", "binary", "space")
    expect(decoded.status).toBe("error")
  })
})

describe("decode failure modes", () => {
  it("rejects malformed tokens with a typed message", () => {
    const failure = decodeText("11000011 banana", "binary", "space")
    expect(failure.status).toBe("error")
    if (failure.status === "error") expect(failure.message).toMatch(/not a valid binary/)
  })

  it("rejects out-of-range tokens per base", () => {
    expect(decodeText("300", "decimal", "space").status).toBe("error")
    expect(decodeText("777", "octal", "space").status).toBe("error")
    expect(decodeText("2", "binary", "space").status).toBe("error")
  })

  it("fails closed on a fixed-width remainder with the none delimiter", () => {
    // 7 binary characters cannot form a complete byte.
    const failure = decodeText("1100001", "binary", "none")
    expect(failure.status).toBe("error")
    if (failure.status === "error") {
      expect(failure.message).toMatch(/multiple of 8 characters/i)
    }
  })

  it("rejects decimal fractions instead of truncating them into bytes", () => {
    const failure = decodeText("12.5 105", "decimal", "space")
    expect(failure.status).toBe("error")
    if (failure.status === "error") {
      expect(failure.message).toMatch(/not a valid decimal/)
    }
  })

  it("normalizes pasted CRLF, tabs, and NBSP before splitting", () => {
    // CRLF pasted into the space-delimited panel still decodes.
    expect(decodeText("72\r\n105", "decimal", "space")).toEqual({
      status: "ok",
      text: "Hi",
      byteCount: 2,
    })
    // Tabs act as the newline delimiter, and NBSP acts as whitespace.
    expect(decodeText("72\t105", "decimal", "newline")).toEqual({
      status: "ok",
      text: "Hi",
      byteCount: 2,
    })
    expect(decodeText("72\u00A0105", "decimal", "space")).toEqual({
      status: "ok",
      text: "Hi",
      byteCount: 2,
    })
  })

  it("fails closed on invalid UTF-8 byte sequences", () => {
    // A lone 0xFF byte is never valid UTF-8.
    const failure = decodeText("255", "decimal", "space")
    expect(failure.status).toBe("error")
    if (failure.status === "error") expect(failure.message).toMatch(/not valid UTF-8/)
  })
})

describe("bounds and options", () => {
  it("keeps the documented option sets", () => {
    expect(numberBases).toEqual(["binary", "octal", "decimal"])
    expect(byteDelimiters).toEqual(["space", "newline", "none"])
    expect(baseFor("binary")).toBe(2)
    expect(baseFor("octal")).toBe(8)
    expect(baseFor("decimal")).toBe(10)
    expect(maximumTextCharacters).toBe(10_000)
  })

  it("handles newline delimiters that split across lines", () => {
    const encoded = encodeText("ab", "decimal", "newline")
    expect(encoded).toBe("97\n98")
    expect(decodeText(encoded, "decimal", "newline")).toEqual({
      status: "ok",
      text: "ab",
      byteCount: 2,
    })
  })
})
